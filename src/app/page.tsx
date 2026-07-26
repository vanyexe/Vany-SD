'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RouteVisualization from '@/components/route/RouteVisualization'
import { useDsaProblems } from '@/lib/hooks/useDsaProblems'
import { getISTDateString } from '@/lib/dateUtils';
import { useHabits } from '@/lib/hooks/useHabits'
import { useSettings } from '@/lib/hooks/useSettings'
import { useTrailer } from '@/lib/hooks/useTrailer'
import { useTasks } from '@/lib/hooks/useTasks'
import { HABITS, SAMPLE_QUOTES, PHASES } from '@/lib/data/seed'
import {
  CheckCircle2, Circle, Flame, BookOpen, Timer, ChevronRight, Target, Loader2, Plus, Zap, Check, ListTodo, Presentation, PlaySquare, CalendarDays, Dumbbell, Award
} from 'lucide-react'
import clsx from 'clsx'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDailyQuote(): string {
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return SAMPLE_QUOTES[dayOfYear % SAMPLE_QUOTES.length]
}

export default function HomePage() {
  const router = useRouter()
  const { settings, loading: settingsLoading, dayNumber, currentPhase, phaseProgress } = useSettings()
  const { dueForReview, solvedThisWeek, totalSolved, loading: dsaLoading } = useDsaProblems()
  const { isDone, toggle, today, getStreak, loading: habitsLoading } = useHabits()
  const { daysToDeadline } = useTrailer()
  const { tasks, createTask, updateTask, loading: tasksLoading } = useTasks()

  const [newTaskTitle, setNewTaskTitle] = useState('')

  const greeting = getGreeting()
  const dailyQuote = getDailyQuote()
  const dsaStreak = getStreak(2) // habit_id 2 = DSA block

  const currentPhaseData = PHASES[currentPhase - 1] ?? PHASES[0]

  const todayChecklist = HABITS.map(h => ({
    habit: h,
    done: isDone(h.id, today),
  }))
  const allDone = todayChecklist.length > 0 && todayChecklist.every(t => t.done)
  const doneCount = todayChecklist.filter(t => t.done).length
  const dailyCompletionPct = todayChecklist.length ? (doneCount / todayChecklist.length) * 100 : 0

  const handlePhaseClick = (phaseId: number) => router.push("/phases/" + phaseId)

  const handleAddTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      await createTask({ title: newTaskTitle.trim(), status: 'todo' })
      setNewTaskTitle('')
    }
  }

  const todayTasks = tasks.filter(t => t.status !== 'archived')
  const topTasks = todayTasks.slice(0, 3)

  // Real weekly data: count habits done per day for last 7 days
  const weeklyData = useMemo(() => {
    const days = Array.from({length: 7}, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return getISTDateString(d)
    })
    return days.map(date => {
      // count how many of the 5 habits were done on that date
      return HABITS.filter(h => isDone(h.id, date)).length
    })
  }, [isDone])

  const [fitnessToday, setFitnessToday] = useState<{workouts: number; duration: number} | null>(null)
  useEffect(() => {
    const todayStr = getISTDateString();
    fetch(`/api/fitness/workouts?from=${todayStr}&to=${todayStr}`)
      .then(r => r.ok ? r.json() : {workouts: [], total: 0})
      .then(d => setFitnessToday({ workouts: d.total, duration: d.workouts.reduce((s: number, w: any) => s + (w.duration_min || 0), 0) }))
      .catch(() => setFitnessToday({ workouts: 0, duration: 0 }))
  }, [])

  const [recentAchievement, setRecentAchievement] = useState<{title: string; category_name: string; achievement_date: string} | null>(null)
  useEffect(() => {
    fetch('/api/achievements?limit=1')
      .then(r => r.ok ? r.json() : {achievements: []})
      .then(d => setRecentAchievement(d.achievements[0] || null))
      .catch(() => {})
  }, [])

  if (settingsLoading) {
    return (
      <div className="min-h-dvh bg-ink flex items-center justify-center">
        <Loader2 size={32} className="text-jade animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink">
      <div className="max-w-7xl mx-auto px-5 pt-10 pb-16 space-y-8">
        
        {/* MOBILE STICKY HEADER */}
        <div className="md:hidden sticky top-0 z-10 bg-ink/90 backdrop-blur-md py-3 border-b border-border flex justify-between items-center -mx-5 px-5">
           <span className="font-mono text-sm text-gold">Day {dayNumber}</span>
           <span className="badge badge-jade text-xs px-2 py-0.5">Phase {currentPhase}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* -- LEFT COLUMN (Middle Part, 66%) -- */}
          <div className="md:col-span-8 space-y-8">
            
            {/* 1. Hero Header */}
            <div className="space-y-4 animate-slide-in-up">
              <div>
                <h1 className="font-display text-4xl md:text-5xl font-semibold text-primary tracking-tight">
                  {greeting}, Vansh
                </h1>
                <p className="text-secondary text-lg mt-3 font-mono flex items-center gap-3">
                  <span>Day <span className="text-gold font-bold">{dayNumber}</span> of your journey</span>
                  <span className="opacity-40">&bull;</span>
                  <span className="badge badge-jade px-2.5 py-1 text-sm bg-jade/10 text-jade border-jade/20 border flex items-center gap-2 font-medium">
                    <span>Phase {String(currentPhase).padStart(2, '0')}</span>
                    <span className="opacity-50">|</span>
                    <span>{currentPhaseData.title}</span>
                  </span>
                </p>
              </div>
              <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-jade to-gold h-full rounded-full transition-all duration-1000" style={{ width: String(phaseProgress * 100) + '%' }} />
              </div>
            </div>

            {/* 2. Today's Habits */}
            <div className="card p-6 border border-border/50 bg-gradient-to-br from-surface to-surface-raised shadow-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl text-primary flex items-center gap-2">
                  <Zap className="text-gold" size={20} /> Today's Habits
                </h2>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-secondary">
                    {habitsLoading ? '...' : String(doneCount) + '/5 done'}
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-surface-raised flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-raised stroke-current"
                        strokeWidth="3" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-jade stroke-current transition-all duration-1000"
                        strokeWidth="3" strokeDasharray={String(dailyCompletionPct) + ", 100"} fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-[10px] font-mono text-primary">{Math.round(dailyCompletionPct)}%</span>
                  </div>
                </div>
              </div>

              {allDone && doneCount > 0 && (
                <div className="mb-4 bg-jade/10 border border-jade/20 rounded-lg p-3 flex items-center gap-2 text-jade text-sm animate-scale-in">
                  <span className="text-lg">??</span> Perfect Day! All habits complete.
                </div>
              )}

              <div className="space-y-2">
                {habitsLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted" /></div>
                ) : (
                  todayChecklist.map(({ habit, done }) => (
                    <button
                      key={habit.id}
                      onClick={() => toggle(habit.id, today)}
                      className={clsx(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 border group',
                        done ? 'bg-jade/5 border-jade/30 text-jade' : 'bg-surface hover:bg-surface-raised border-border text-secondary'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-200 border", done ? 'bg-jade border-jade text-ink' : 'border-muted group-hover:border-primary text-transparent')}>
                          <Check size={14} className={done ? 'opacity-100' : 'opacity-0'} />
                        </div>
                        <span className={clsx('font-body text-base', done && 'line-through opacity-70')}>{habit.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-raised border border-border">
                          {getStreak(habit.id)} streak
                        </span>
                        <span className="text-xl opacity-60 grayscale group-hover:grayscale-0 transition-all">{habit.icon}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 3. Quick Add Task & 4. Agenda */}
            <div className="card p-6 shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2 className="font-display text-xl text-primary mb-4 flex items-center gap-2">
                <ListTodo className="text-brick" size={20} /> Today's Agenda
              </h2>
              
              <div className="relative mb-5">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Plus size={16} className="text-muted" />
                </div>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleAddTask}
                  placeholder="What do you need to do today? (Press Enter)"
                  className="w-full bg-surface-raised border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-jade/50 transition-colors"
                />
              </div>

              {tasksLoading || dsaLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted" /></div>
              ) : (
                <div className="space-y-4">
                  {topTasks.length === 0 && dueForReview.length === 0 ? (
                    <div className="text-center py-6 text-muted text-sm border border-dashed border-border rounded-xl">
                      Your schedule is clear today ?
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised transition-colors border border-transparent hover:border-border group">
                           <button onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}>
                             <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", task.status === 'done' ? 'bg-jade border-jade text-ink' : 'border-muted text-transparent')}>
                               <Check size={10} />
                             </div>
                           </button>
                           <span className={clsx("text-sm flex-1", task.status === 'done' ? "text-muted line-through" : "text-primary")}>{task.title}</span>
                        </div>
                      ))}
                      {dueForReview.length > 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-brick/5 border border-brick/20 group">
                           <Target size={16} className="text-brick" />
                           <span className="text-sm text-primary flex-1">{dueForReview.length} DSA problem{dueForReview.length > 1 ? 's' : ''} due for review</span>
                           <Link href="/dsa#review" className="text-xs text-brick hover:underline font-mono">View</Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fitness Quick Card */}
            <div className="card p-6 shadow-lg animate-fade-in" style={{ animationDelay: '0.22s' }}>
              <h2 className="font-display text-xl text-primary mb-4 flex items-center gap-2">
                <Dumbbell className="text-jade" size={20} /> Fitness Status
              </h2>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised border border-border">
                <div className="flex flex-col gap-1">
                  {fitnessToday && fitnessToday.workouts > 0 ? (
                    <span className="text-sm text-primary font-medium">Today: {fitnessToday.workouts} workout(s), {fitnessToday.duration} min</span>
                  ) : (
                    <span className="text-sm text-muted">No workout logged today</span>
                  )}
                </div>
                <Link href={fitnessToday && fitnessToday.workouts > 0 ? "/fitness" : "/fitness/log"} className="text-xs font-mono text-jade hover:underline">
                  {fitnessToday && fitnessToday.workouts > 0 ? "View" : "Log"}
                </Link>
              </div>
            </div>

            {/* Recent Achievement Card */}
            <div className="card p-6 shadow-lg animate-fade-in" style={{ animationDelay: '0.24s' }}>
              <h2 className="font-display text-xl text-primary mb-4 flex items-center gap-2">
                <Award className="text-gold" size={20} /> Recent Achievement
              </h2>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised border border-border">
                <div className="flex flex-col gap-1">
                  {recentAchievement ? (
                    <>
                      <span className="text-sm text-primary font-medium">{recentAchievement.title}</span>
                      <span className="text-xs text-muted font-mono">{recentAchievement.category_name} &middot; {new Date(recentAchievement.achievement_date).toLocaleDateString()}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted">No achievements yet. Add your first!</span>
                  )}
                </div>
                <Link href="/achievements" className="text-xs font-mono text-gold hover:underline">
                  View
                </Link>
              </div>
            </div>

            {/* 5. The Route */}
            <div className="card p-6 shadow-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-primary flex items-center gap-2">
                  <Presentation className="text-jade" size={20} /> The Route
                </h2>
                <Link
                  href={"/phases/" + currentPhase}
                  className="text-xs font-mono text-secondary hover:text-jade transition-colors flex items-center gap-1 bg-surface-raised px-3 py-1.5 rounded-full"
                >
                  Phase {currentPhase} detail <ChevronRight size={12} />
                </Link>
              </div>
              <RouteVisualization
                currentPhase={currentPhase}
                phaseProgress={phaseProgress}
                completedMilestones={Array.from({ length: (currentPhase - 1) * 4 }, (_, i) => i + 1)}
                onPhaseClick={handlePhaseClick}
              />
            </div>
            
          </div>

          {/* -- RIGHT COLUMN (33%) -- */}
          <div className="md:col-span-4 space-y-8">
            
            {/* 6. Stats Dashboard */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <StatCard label="DSA Streak" value={dsaStreak} unit="days" icon={<Flame size={16} />} color="gold" href="/habits" />
              <StatCard label="This Week" value={solvedThisWeek} unit="solved" icon={<Zap size={16} />} color="jade" href="/dsa" />
              <StatCard label="Trailer Due" value={daysToDeadline} unit="days" icon={<PlaySquare size={16} />} color="brick" href="/trailer" />
              <StatCard label="Total Solved" value={totalSolved || 0} unit="probs" icon={<BookOpen size={16} />} color="secondary" href="/dsa" />
            </div>

            {/* 7. Upcoming Reviews */}
            <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-lg text-primary">Upcoming Reviews</h3>
                <span className="badge badge-muted text-[10px]">{dueForReview.length}</span>
              </div>
              
              {dueForReview.length === 0 ? (
                <div className="text-center py-6 text-muted text-sm border border-dashed border-border rounded-xl">
                  No reviews due today ?
                </div>
              ) : (
                <div className="space-y-3">
                  {dueForReview.slice(0, 5).map(problem => (
                    <div key={problem.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-surface-raised transition-all border border-transparent hover:border-border">
                      <div className="flex items-center gap-3">
                        <span className={clsx("w-2 h-2 rounded-full", problem.difficulty === 'easy' ? 'bg-jade' : problem.difficulty === 'medium' ? 'bg-gold' : 'bg-brick')} />
                        <span className="text-sm text-primary line-clamp-1">{problem.title}</span>
                      </div>
                      <Link href={"/dsa"} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-jade hover:underline">
                        Review
                      </Link>
                    </div>
                  ))}
                  {dueForReview.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href="/dsa#review" className="text-xs font-mono text-muted hover:text-primary">
                        + {dueForReview.length - 5} more
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 8. Weekly Progress */}
            <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.35s' }}>
              <div className="flex items-center gap-2 mb-6">
                <CalendarDays size={18} className="text-gold" />
                <h3 className="font-display text-lg text-primary">Weekly Progress</h3>
              </div>
              <div className="flex items-end justify-between h-32 px-2 pb-2 border-b border-border">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                  const val = weeklyData[idx]
                  const isToday = idx === 6
                  const height = (val / 5) * 100
                  let colorClass = 'fill-surface-raised'
                  if (val === 5) colorClass = 'fill-jade'
                  else if (val >= 3) colorClass = 'fill-gold'
                  else if (val > 0) colorClass = 'fill-muted/50'

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 w-full">
                      <div className="w-full flex justify-center h-full items-end relative group">
                        <svg width="24" height="100%" viewBox="0 0 24 100" preserveAspectRatio="none" className="overflow-visible">
                          <rect 
                            x="4" y={100 - height} width="16" height={height} rx="4"
                            className={clsx("transition-all duration-500 hover:opacity-80", colorClass)}
                          />
                        </svg>
                        <div className="absolute -top-6 bg-ink border border-border text-[10px] text-primary px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none">
                          {val}/5
                        </div>
                      </div>
                      <span className={clsx("text-xs font-mono", isToday ? "text-primary font-bold" : "text-muted")}>{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 9. Field Note / Daily Quote */}
            <div className="card p-6 bg-surface-raised border-l-4 border-l-gold animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.4s' }}>
              <div className="absolute top-0 right-0 p-4 opacity-5 text-gold group-hover:opacity-10 transition-opacity">
                <BookOpen size={64} />
              </div>
              <span className="text-xs font-mono text-gold uppercase tracking-widest mb-3 block">Field Note</span>
              <blockquote className="font-display text-xl text-primary leading-relaxed italic relative z-10">
                &ldquo;{dailyQuote}&rdquo;
              </blockquote>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, unit, icon, color, href }: {
  label: string; value: number; unit: string; icon: React.ReactNode; color: 'gold' | 'jade' | 'brick' | 'secondary'; href: string
}) {
  const colorMap = { gold: 'text-gold', jade: 'text-jade', brick: 'text-brick', secondary: 'text-primary' }
  const bgMap = { gold: 'bg-gold/10', jade: 'bg-jade/10', brick: 'bg-brick/10', secondary: 'bg-surface-raised' }
  
  return (
    <Link href={href} className="card p-5 flex flex-col gap-3 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 border border-transparent hover:border-border">
      <div className="flex items-center justify-between">
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", bgMap[color], colorMap[color])}>
          {icon}
        </div>
        <ChevronRight size={14} className="text-muted" />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className={clsx('font-display text-3xl font-semibold tracking-tight', colorMap[color])}>{value}</span>
          <span className="font-mono text-xs text-muted">{unit}</span>
        </div>
        <div className="text-xs font-mono text-secondary uppercase tracking-wider">
          {label}
        </div>
      </div>
    </Link>
  )
}


