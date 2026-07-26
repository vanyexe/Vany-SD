'use client'
import { getISTDateString } from '@/lib/dateUtils';

import React, { useMemo, useEffect, useState } from 'react'
import {
  TrendingUp, Flame, CheckCircle2, Clock, Code2, Target,
  CalendarDays, Brain, Loader2, BookOpen, ChevronRight, Activity, Trophy
} from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import { useDsaProblems } from '@/lib/hooks/useDsaProblems'
import { useHabits } from '@/lib/hooks/useHabits'
import { useTasks } from '@/lib/hooks/useTasks'
import { useSettings } from '@/lib/hooks/useSettings'
import { useFitness } from '@/lib/hooks/useFitness'
import { useAchievements } from '@/lib/hooks/useAchievements'
import { useGoals } from '@/lib/hooks/useGoals'
import { DSA_TOPICS, HABITS } from '@/lib/data/seed'

/* ── helpers ── */
function isoDate(d: Date) {
  return getISTDateString(d)
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function startOfWeek(d: Date) {
  const r = new Date(d)
  const day = r.getDay()
  const diff = day === 0 ? -6 : 1 - day
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

/* ── Skeleton ── */
function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded', className)} />
}

/* ── Empty State ── */
function EmptyCard({ icon: Icon, title, desc, href, linkLabel }: {
  icon: React.ElementType, title: string, desc: string, href?: string, linkLabel?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--color-jade-dim)' }}>
        <Icon size={22} style={{ color: 'var(--color-jade)' }} />
      </div>
      <div>
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="text-xs text-muted mt-1">{desc}</p>
      </div>
      {href && linkLabel && (
        <Link href={href} className="btn btn-jade btn-sm mt-1">
          {linkLabel} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

/* ── SVG Donut ── */
function Donut({ pct, size = 80, stroke = 10, color = 'var(--color-jade)' }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        style={{ strokeDasharray: circ, strokeDashoffset: offset, transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  )
}

export default function AnalyticsPage() {
  // ── Real hooks ──
  const { problems, totalSolved, solvedThisWeek, countByTopic } = useDsaProblems()
  const { logs: habitLogs, isDone, loading: habitsLoading, customHabits } = useHabits()
  const { tasks, loading: tasksLoading } = useTasks()
  const { currentPhase, dayNumber } = useSettings()
  
  // Phase 2 new hooks
  const { workouts, loading: fitnessLoading } = useFitness()
  const { achievements, total: totalAchievements, loading: achievementsLoading } = useAchievements()
  const { goals, loading: goalsLoading } = useGoals()
  
  const [focusMinutes, setFocusMinutes] = useState<number | null>(null)

  // Fetch focus sessions
  useEffect(() => {
    fetch('/api/focus-sessions')
      .then(r => r.ok ? r.json() : [])
      .then((sessions: { actual_min?: number; completed?: boolean }[]) => {
        const total = sessions.reduce((s, x) => s + (x.completed ? (x.actual_min ?? 0) : 0), 0)
        setFocusMinutes(total)
      })
      .catch(() => setFocusMinutes(0))
  }, [])

  const today = isoDate(new Date())

  // ── DSA weekly chart: last 8 weeks ──
  const dsaWeekly = useMemo(() => {
    const weeks: { label: string; count: number; start: Date; end: Date }[] = []
    for (let w = 7; w >= 0; w--) {
      const weekStart = startOfWeek(addDays(new Date(), -w * 7))
      const weekEnd = addDays(weekStart, 6)
      weeks.push({
        label: w === 0 ? 'This week' : `W${8 - w}`,
        count: 0,
        start: weekStart,
        end: weekEnd,
      })
    }
    for (const p of problems) {
      const pDate = new Date(p.date_solved)
      for (const w of weeks) {
        if (pDate >= w.start && pDate <= w.end) {
          w.count++
          break
        }
      }
    }
    return weeks
  }, [problems])

  const maxWeekly = Math.max(...dsaWeekly.map(w => w.count), 1)

  // ── Difficulty breakdown ──
  const diffBreak = useMemo(() => {
    const easy = problems.filter(p => p.difficulty === 'easy').length
    const medium = problems.filter(p => p.difficulty === 'medium').length
    const hard = problems.filter(p => p.difficulty === 'hard').length
    const total = easy + medium + hard || 1
    return { easy, medium, hard, total }
  }, [problems])

  // ── Habit heatmap: real logs, last 84 days ──
  const heatmapData = useMemo(() => {
    // Build date → count map from actual habit logs
    const map: Record<string, number> = {}
    for (const log of habitLogs) {
      if (log.done) {
        map[log.log_date] = (map[log.log_date] ?? 0) + 1
      }
    }
    // Build 84-day grid starting from 12 weeks ago (Monday)
    const gridStart = startOfWeek(addDays(new Date(), -83))
    const cells: { date: string; count: number; isToday: boolean; isFuture: boolean }[] = []
    for (let i = 0; i < 84; i++) {
      const d = addDays(gridStart, i)
      const ds = isoDate(d)
      const now = new Date(today)
      cells.push({
        date: ds,
        count: map[ds] ?? 0,
        isToday: ds === today,
        isFuture: d > now,
      })
    }
    return cells
  }, [habitLogs, today])

  // Group cells into weeks (columns of 7)
  const heatmapWeeks = useMemo(() => {
    const weeks: typeof heatmapData[] = []
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7))
    }
    return weeks
  }, [heatmapData])

  const [scorePeriod, setScorePeriod] = useState<'today' | 'week' | 'year'>('today')

  // ── Productivity Score (real) ──
  const productivityScoreData = useMemo(() => {
    let days = 1;
    let startDate = today;
    
    if (scorePeriod === 'week') {
      days = 7;
      startDate = isoDate(addDays(new Date(), -6));
    } else if (scorePeriod === 'year') {
      days = 365;
      startDate = isoDate(addDays(new Date(), -364));
    }

    // Habits score
    const totalActiveHabits = HABITS.length + (customHabits?.length || 0);
    const totalPossibleHabits = totalActiveHabits * days;
    const completedHabits = habitLogs.filter(l => l.done && l.log_date >= startDate && l.log_date <= today).length;
    const habitPct = totalPossibleHabits > 0 ? completedHabits / totalPossibleHabits : 0;
    
    // DSA score (count days with at least 1 problem solved)
    const dsaDays = new Set(problems.filter(p => p.date_solved >= startDate && p.date_solved <= today).map(p => p.date_solved)).size;
    const dsaPct = dsaDays / days;

    // Tasks score (count days with at least 1 task completed)
    const taskDays = new Set(tasks.filter(t => {
      const d = t.completed_at?.slice(0, 10);
      return d && d >= startDate && d <= today && t.status === 'done';
    }).map(t => t.completed_at?.slice(0, 10))).size;
    const taskPct = taskDays / days;

    const score = Math.round(habitPct * 40 + dsaPct * 35 + taskPct * 25);
    
    return {
      score,
      habitVal: Math.round(habitPct * 40),
      dsaVal: Math.round(dsaPct * 35),
      taskVal: Math.round(taskPct * 25)
    };
  }, [scorePeriod, today, habitLogs, problems, tasks, customHabits])

  const productivityScore = productivityScoreData.score;

  const scoreLabel =
    productivityScore >= 80 ? 'Excellent' :
    productivityScore >= 60 ? 'On Track' :
    productivityScore >= 30 ? 'Building' :
    productivityScore > 0 ? 'Getting Started' : 'Let\'s Go!'

  const scoreColor =
    productivityScore >= 80 ? 'var(--color-jade)' :
    productivityScore >= 60 ? 'var(--color-gold)' :
    productivityScore >= 30 ? 'var(--color-amber)' :
    'var(--color-brick)'

  // ── Tasks stats ──
  const taskStats = useMemo(() => {
    const sevenDaysAgo = isoDate(addDays(new Date(), -7))
    const total = tasks.length
    const completedThisWeek = tasks.filter(t =>
      t.status === 'done' && t.completed_at && t.completed_at.slice(0, 10) >= sevenDaysAgo
    ).length
    const overdue = tasks.filter(t =>
      t.due_date && t.due_date < today && t.status !== 'done'
    ).length
    const completionRate = total > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / total) * 100) : 0
    return { total, completedThisWeek, overdue, completionRate }
  }, [tasks, today])

  // ── Top DSA Topics ──
  const topTopics = useMemo(() => {
    return DSA_TOPICS
      .map(t => ({ ...t, solved: countByTopic[t.id] ?? 0 }))
      .filter(t => t.targetCount > 0)
      .sort((a, b) => b.solved - a.solved)
      .slice(0, 6)
  }, [countByTopic])

  // ── Best habit streak (across all habits) ──
  const bestStreak = useMemo(() => {
    const map: Record<string, number> = {}
    for (const log of habitLogs) {
      if (log.done) {
        map[log.log_date] = (map[log.log_date] ?? 0) + 1
      }
    }
    // Find the longest streak of consecutive days with at least 1 habit done
    const sortedDates = Object.keys(map).filter(d => map[d] > 0).sort()
    if (sortedDates.length === 0) return 0
    let best = 1, cur = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / 86400000
      if (diff === 1) { cur++; if (cur > best) best = cur }
      else cur = 1
    }
    return best
  }, [habitLogs])

  const focusHours = focusMinutes !== null ? (focusMinutes / 60).toFixed(1) : null
  const isLoading = habitsLoading || tasksLoading

  return (
    <div
      id="analytics-page"
      className="min-h-dvh"
      style={{ background: 'var(--color-ink)' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-display text-primary mb-1" style={{ fontSize: '1.9rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Analytics
          </h1>
          <p className="text-sm text-muted">
            Day {dayNumber} · Phase {currentPhase} · Your real progress, updated live
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'DSA Solved',
              value: totalSolved,
              sub: `${solvedThisWeek} this week`,
              icon: Code2,
              color: 'var(--color-jade)',
              dim: 'var(--color-jade-dim)',
            },
            {
              label: 'Best Streak',
              value: bestStreak,
              sub: 'days consecutive',
              icon: Flame,
              color: 'var(--color-brick)',
              dim: 'var(--color-brick-dim)',
            },
            {
              label: 'Tasks Done',
              value: taskStats.completedThisWeek,
              sub: `${taskStats.total} total · ${taskStats.overdue} overdue`,
              icon: CheckCircle2,
              color: 'var(--color-gold)',
              dim: 'var(--color-gold-dim)',
            },
            {
              label: 'Focus Time',
              value: focusHours !== null ? `${focusHours}h` : '—',
              sub: 'this week',
              icon: Clock,
              color: 'var(--color-amber)',
              dim: 'var(--color-amber-dim)',
            },
          ].map(card => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                id={`stat-card-${card.label.toLowerCase().replace(/ /g, '-')}`}
                className="card-raised rounded-xl p-5 flex items-start gap-4"
                style={{ borderLeft: `3px solid ${card.color}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: card.dim }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <div className="min-w-0">
                  <div
                    className="font-mono font-bold leading-none"
                    style={{ fontSize: '1.7rem', letterSpacing: '-0.04em', color: 'var(--color-primary)' }}
                  >
                    {isLoading ? <Skeleton className="w-12 h-7" /> : card.value}
                  </div>
                  <div className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1">{card.label}</div>
                  <div className="text-[11px] text-secondary mt-0.5 truncate">{card.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* ── Left: charts ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* DSA Bar Chart */}
            <section id="dsa-weekly-chart" className="card-raised rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: 'var(--color-jade)' }} />
                  <h2 className="text-sm font-semibold text-primary">DSA Problems — Last 8 Weeks</h2>
                </div>
                <span className="font-mono text-xs text-muted">{totalSolved} total</span>
              </div>
              {problems.length === 0 ? (
                <EmptyCard
                  icon={Code2}
                  title="No problems logged yet"
                  desc="Start solving and logging problems to see your weekly progress here."
                  href="/dsa"
                  linkLabel="Open DSA Tracker"
                />
              ) : (
                <div className="h-44 flex items-end gap-2" id="dsa-bar-chart">
                  {dsaWeekly.map((week, i) => {
                    const heightPct = maxWeekly > 0 ? (week.count / maxWeekly) * 100 : 0
                    const isCurrent = i === dsaWeekly.length - 1
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                        <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                          {week.count === 0 ? (
                            <div
                              className="w-full max-w-[36px] rounded-sm"
                              style={{ height: '4px', background: 'var(--color-surface-raised)' }}
                            />
                          ) : (
                            <div
                              className="w-full max-w-[36px] rounded-t transition-all duration-700 ease-out relative"
                              style={{
                                height: `${Math.max(heightPct, 4)}%`,
                                background: isCurrent ? 'var(--color-jade)' : 'var(--color-jade-dim)',
                                border: isCurrent ? '1px solid var(--color-jade)' : 'none',
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-raised border border-border rounded px-2 py-1 text-xs font-mono text-primary whitespace-nowrap z-10">
                                {week.count} solved
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={clsx(
                          'text-[10px] font-mono',
                          isCurrent ? 'text-jade font-semibold' : 'text-muted'
                        )}>
                          {isCurrent ? 'Now' : `W${i + 1}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Habit Heatmap */}
            <section id="habit-heatmap" className="card-raised rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} style={{ color: 'var(--color-gold)' }} />
                  <h2 className="text-sm font-semibold text-primary">Habit Consistency — Last 12 Weeks</h2>
                </div>
                <span className="font-mono text-xs text-muted">{habitLogs.filter(l => l.done).length} total check-ins</span>
              </div>

              {habitLogs.length === 0 && !habitsLoading ? (
                <EmptyCard
                  icon={CalendarDays}
                  title="No habit check-ins yet"
                  desc="Check off your habits daily to see your consistency heatmap grow."
                  href="/habits"
                  linkLabel="Open Habits"
                />
              ) : (
                <>
                  {/* Day labels */}
                  <div className="flex gap-1 mb-1 pl-8">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="font-mono text-[9px] text-muted" style={{ width: 14, textAlign: 'center' }}>{d}</div>
                    ))}
                  </div>

                  <div className="flex gap-1 overflow-x-auto" id="heatmap-grid">
                    {heatmapWeeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-1">
                        {week.map((cell) => {
                          const opacity = cell.isFuture ? 0 : cell.count === 0 ? 0.08 :
                            cell.count === 1 ? 0.25 :
                            cell.count === 2 ? 0.45 :
                            cell.count === 3 ? 0.65 :
                            cell.count === 4 ? 0.82 : 1

                          return (
                            <div
                              key={cell.date}
                              title={cell.isFuture ? '' : `${cell.date}: ${cell.count} habit${cell.count !== 1 ? 's' : ''}`}
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                background: cell.isFuture
                                  ? 'transparent'
                                  : `rgba(63, 167, 147, ${opacity})`,
                                outline: cell.isToday ? '2px solid var(--color-jade)' : 'none',
                                outlineOffset: 1,
                                cursor: 'default',
                              }}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-[10px] text-muted font-mono">Less</span>
                    {[0.08, 0.25, 0.45, 0.65, 0.82, 1].map(op => (
                      <div key={op} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(63,167,147,${op})` }} />
                    ))}
                    <span className="text-[10px] text-muted font-mono">More</span>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* ── Right: score + difficulty ── */}
          <div className="space-y-6">

            {/* Productivity Score */}
            <section id="productivity-score" className="card-raised rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Target size={16} style={{ color: scoreColor }} />
                  <h2 className="text-sm font-semibold text-primary">Score</h2>
                </div>
                <select
                  value={scorePeriod}
                  onChange={(e) => setScorePeriod(e.target.value as any)}
                  className="bg-surface border border-border text-xs text-primary rounded px-2 py-1 outline-none focus:border-jade transition-colors"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
                  <Donut pct={productivityScore} size={140} stroke={12} color={scoreColor} />
                  <div className="absolute flex flex-col items-center">
                    <span className="font-mono font-bold" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {productivityScore}
                    </span>
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1">{scoreLabel}</span>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="w-full space-y-4 mt-2">
                  {[
                    { label: 'Habits', val: productivityScoreData.habitVal, max: 40, color: 'var(--color-jade)' },
                    { label: 'DSA', val: productivityScoreData.dsaVal, max: 35, color: 'var(--color-gold)' },
                    { label: 'Tasks', val: productivityScoreData.taskVal, max: 25, color: 'var(--color-amber)' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-secondary">{item.label}</span>
                        <span className="font-mono text-xs text-muted">{item.val} <span className="text-[9px] opacity-70">/ {item.max} pts</span></span>
                      </div>
                      <div className="progress-bar" style={{ height: 5 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${(item.val / item.max) * 100}%`, background: item.color, height: '100%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {productivityScore === 0 && (
                  <p className="text-xs text-center text-muted">
                    Complete some habits, solve a DSA problem, or finish a task to earn points!
                  </p>
                )}
              </div>
            </section>

            {/* Difficulty breakdown */}
            <section id="difficulty-breakdown" className="card-raised rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Brain size={16} style={{ color: 'var(--color-jade)' }} />
                <h2 className="text-sm font-semibold text-primary">By Difficulty</h2>
              </div>

              {totalSolved === 0 ? (
                <p className="text-xs text-muted text-center py-6">Log DSA problems to see your difficulty breakdown.</p>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Easy',   count: diffBreak.easy,   color: 'var(--color-jade)' },
                    { label: 'Medium', count: diffBreak.medium, color: 'var(--color-gold)' },
                    { label: 'Hard',   count: diffBreak.hard,   color: 'var(--color-brick)' },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-secondary">{row.label}</span>
                        <span className="font-mono text-xs" style={{ color: row.color }}>{row.count}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(row.count / diffBreak.total) * 100}%`,
                            background: row.color,
                            height: '100%',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted text-right font-mono pt-1">{diffBreak.total} total logged</p>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ── Bottom: Topic Progress + Task Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Topic progress */}
          <section id="topic-progress" className="card-raised rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={16} style={{ color: 'var(--color-jade)' }} />
              <h2 className="text-sm font-semibold text-primary">DSA Topics Progress</h2>
            </div>

            {totalSolved === 0 ? (
              <EmptyCard
                icon={Code2}
                title="No problems logged"
                desc="Solve and log DSA problems to track your topic coverage."
                href="/dsa"
                linkLabel="Log a Problem"
              />
            ) : (
              <div className="space-y-4">
                {topTopics.map(topic => {
                  const pct = Math.min(Math.round((topic.solved / topic.targetCount) * 100), 100)
                  return (
                    <div key={topic.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-secondary">{topic.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted">{topic.solved}/{topic.targetCount}</span>
                          <span className={clsx('font-mono text-[10px] px-1.5 py-0.5 rounded', pct >= 100 ? 'text-jade bg-jade-dim' : 'text-muted bg-surface-raised')}>{pct}%</span>
                        </div>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: pct >= 100 ? 'var(--color-jade)' : pct >= 50 ? 'var(--color-gold)' : 'var(--color-brick-dim)',
                            transition: 'width 1s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Tasks stats */}
          <section id="task-stats" className="card-raised rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 size={16} style={{ color: 'var(--color-gold)' }} />
              <h2 className="text-sm font-semibold text-primary">Task Overview</h2>
            </div>

            {tasksLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : taskStats.total === 0 ? (
              <EmptyCard
                icon={CheckCircle2}
                title="No tasks yet"
                desc="Add tasks and complete them to track your productivity here."
                href="/tasks"
                linkLabel="Add Tasks"
              />
            ) : (
              <div className="space-y-5">
                {/* Donut + stats */}
                <div className="flex items-center gap-6">
                  <div className="relative flex-shrink-0">
                    <Donut pct={taskStats.completionRate} size={96} stroke={10} color="var(--color-gold)" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-primary" style={{ fontSize: '1.2rem' }}>{taskStats.completionRate}%</span>
                      <span className="font-mono text-[9px] text-muted">done</span>
                    </div>
                  </div>
                  <div className="space-y-4 flex-1">
                    {[
                      { label: 'Total Tasks',       val: taskStats.total,              color: 'var(--color-primary)' },
                      { label: 'Done This Week',     val: taskStats.completedThisWeek, color: 'var(--color-jade)' },
                      { label: 'Overdue',            val: taskStats.overdue,           color: taskStats.overdue > 0 ? 'var(--color-brick)' : 'var(--color-muted)' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-4">
                        <span className="text-xs text-secondary w-28">{row.label}</span>
                        <span className="font-mono text-sm font-semibold" style={{ color: row.color }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Phase 2 New Sections: Fitness, Goals, Achievements ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Fitness Stats */}
          <section id="fitness-stats" className="card-raised rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={16} style={{ color: 'var(--color-jade)' }} />
              <h2 className="text-sm font-semibold text-primary">Fitness</h2>
            </div>
            {fitnessLoading ? (
              <div className="space-y-3"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-full" /></div>
            ) : workouts.length === 0 ? (
              <EmptyCard icon={Activity} title="No workouts" desc="Start logging your fitness." href="/fitness" linkLabel="Log Workout" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-[10px] font-mono text-muted uppercase">Total Workouts</div>
                    <div className="text-3xl font-display font-bold text-primary">{workouts.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-muted uppercase">Hours Logged</div>
                    <div className="text-xl font-display text-primary">{Math.round(workouts.reduce((acc, w) => acc + (w.duration_min || 0), 0) / 60)}h</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-muted">Recent Workouts</div>
                  {workouts.slice(0, 3).map(w => (
                    <div key={w.id} className="flex justify-between items-center text-sm p-2 rounded bg-surface border border-border">
                      <span className="font-medium text-primary truncate pr-2">{w.title || w.exerciseName || 'Workout'}</span>
                      <span className="text-xs text-muted font-mono shrink-0">{new Date(w.date || w.workout_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Goals Stats */}
          <section id="goals-stats" className="card-raised rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target size={16} style={{ color: 'var(--color-sky, #5B9BD4)' }} />
              <h2 className="text-sm font-semibold text-primary">Goals Progress</h2>
            </div>
            {goalsLoading ? (
              <div className="space-y-3"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-full" /></div>
            ) : goals.length === 0 ? (
              <EmptyCard icon={Target} title="No goals set" desc="Set long-term objectives." href="/goals" linkLabel="Set Goals" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative flex-shrink-0">
                    <Donut pct={goals.filter(g => g.status === 'completed').length / goals.length * 100 || 0} size={80} stroke={8} color="var(--color-sky, #5B9BD4)" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-primary">{goals.filter(g => g.status === 'completed').length}</span>
                      <span className="font-mono text-[8px] text-muted uppercase">done</span>
                    </div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-secondary w-28">Active</span>
                      <span className="font-mono text-sm">{goals.filter(g => g.status === 'active').length}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-secondary w-28">Avg Progress</span>
                      <span className="font-mono text-sm">{Math.round(goals.filter(g => g.status === 'active').reduce((acc, g) => acc + g.progress_pct, 0) / (goals.filter(g => g.status === 'active').length || 1))}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-muted">Active Goals</div>
                  {goals.filter(g => g.status === 'active').slice(0, 3).map(g => (
                    <div key={g.id} className="text-sm p-2 rounded bg-surface border border-border">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate">{g.title}</span>
                        <span className="font-mono text-xs" style={{ color: g.color }}>{g.progress_pct}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${g.progress_pct}%`, backgroundColor: g.color }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Achievements Stats */}
          <section id="achievements-stats" className="card-raised rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Trophy size={16} style={{ color: 'var(--color-gold)' }} />
              <h2 className="text-sm font-semibold text-primary">Vault Achievements</h2>
            </div>
            {achievementsLoading ? (
              <div className="space-y-3"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-full" /></div>
            ) : totalAchievements === 0 ? (
              <EmptyCard icon={Trophy} title="No achievements" desc="Document your major wins." href="/vault" linkLabel="Open Vault" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-[10px] font-mono text-muted uppercase">Total Earned</div>
                    <div className="text-3xl font-display font-bold text-gold">{totalAchievements}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-muted">Recent Achievements</div>
                  {achievements.slice(0, 3).map(a => (
                    <div key={a.id} className="flex gap-3 items-center p-2 rounded bg-surface border border-border">
                      <div className="w-8 h-8 rounded bg-surface-raised flex items-center justify-center shrink-0">
                        {a.category_icon || '🏆'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-primary truncate">{a.title}</div>
                        <div className="text-xs text-muted font-mono truncate">{new Date(a.achievement_date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  )
}
