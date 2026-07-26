'use client';
import { getISTDateString } from '@/lib/dateUtils';

import { useState, useMemo, useCallback } from 'react';
import { useHabits } from '@/lib/hooks/useHabits';
import { HABITS } from '@/lib/data/seed';
import {
  ChevronLeft, ChevronRight, CheckCheck,
  BookOpen, Code, Brain, Heart, Layers, Plus, X, Trash2,
  Star, Flame, Zap, Music, Coffee, Moon, Sun, Dumbbell,
  Leaf, Target, Wind, Droplets, Pencil, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatWeekRange(dates: string[]): string {
  const first = new Date(dates[0]);
  const last = new Date(dates[6]);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[first.getMonth()]} ${first.getDate()}–${last.getDate()}`;
}

// ── Fixed habit icons ──────────────────────────────────────────
const FIXED_ICONS: Record<number, React.ReactNode> = {
  1: <BookOpen size={18} className="text-jade" />,
  2: <Code size={18} className="text-gold" />,
  3: <Brain size={18} className="text-primary" />,
  4: <Heart size={18} className="text-brick" />,
  5: <Layers size={18} className="text-sky-400" />,
};

// ── Available icons for custom habits ─────────────────────────
const ICON_OPTIONS: { name: string; component: React.ElementType }[] = [
  { name: 'Star', component: Star },
  { name: 'Flame', component: Flame },
  { name: 'Zap', component: Zap },
  { name: 'Music', component: Music },
  { name: 'Coffee', component: Coffee },
  { name: 'Moon', component: Moon },
  { name: 'Sun', component: Sun },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Leaf', component: Leaf },
  { name: 'Target', component: Target },
  { name: 'Wind', component: Wind },
  { name: 'Droplets', component: Droplets },
  { name: 'Pencil', component: Pencil },
  { name: 'Heart', component: Heart },
  { name: 'Brain', component: Brain },
  { name: 'BookOpen', component: BookOpen },
];

function getIconComponent(name: string): React.ElementType {
  return ICON_OPTIONS.find(i => i.name === name)?.component ?? Star;
}

const COLOR_OPTIONS = [
  { label: 'Jade',   value: '#3FA793' },
  { label: 'Gold',   value: '#D6A24C' },
  { label: 'Brick',  value: '#C4675A' },
  { label: 'Violet', value: '#8B7FD4' },
  { label: 'Sky',    value: '#5B9BD4' },
  { label: 'Amber',  value: '#E8975A' },
];

export default function HabitsPage() {
  const toast = useToast();
  const {
    weekDates, today, weekOffset, setWeekOffset,
    toggle, isDone, getStreak, getBestStreak, todayAllDone,
    loading, logs, customHabits, addCustomHabit, deleteCustomHabit
  } = useHabits();

  // Add custom habit form state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('Star');
  const [newHabitColor, setNewHabitColor] = useState('#3FA793');
  const [addingHabit, setAddingHabit] = useState(false);

  const isCurrentWeek = weekOffset === 0;
  const weekRange = formatWeekRange(weekDates);

  // ── All habits (fixed + custom) ────────────────────────────
  const allHabits = useMemo(() => [
    ...HABITS.map(h => ({ ...h, isCustom: false as const })),
    ...customHabits.map(h => ({ id: h.id, name: h.name, icon: h.icon, color: h.color, isCustom: true as const })),
  ], [customHabits]);

  // ── Stats ──────────────────────────────────────────────────
  const totalCompletionsThisMonth = useMemo(() => {
    const d = new Date(today);
    const year = d.getFullYear();
    const month = d.getMonth();
    return logs.filter(l => {
      if (!l.done) return false;
      const ld = new Date(l.log_date);
      return ld.getFullYear() === year && ld.getMonth() === month;
    }).length;
  }, [logs, today]);

  const bestStreakOverall = useMemo(() => {
    return Math.max(0, ...allHabits.map(h => getBestStreak(h.id)));
  }, [allHabits, getBestStreak]);

  const perfectDaysThisWeek = useMemo(() => {
    return weekDates.filter(d =>
      d <= today && HABITS.every(h => isDone(h.id, d))
    ).length;
  }, [weekDates, today, isDone]);

  // ── Heatmap ────────────────────────────────────────────────
  const heatmapDays = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const reference = new Date(today);
    const dayOfWeek = reference.getDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    reference.setDate(reference.getDate() + daysToSunday);
    for (let i = 83; i >= 0; i--) {
      const d = new Date(reference);
      d.setDate(d.getDate() - i);
      const dateStr = getISTDateString(d);
      const count = dateStr <= today ? HABITS.filter(h => isDone(h.id, dateStr)).length : 0;
      days.push({ date: dateStr, count });
    }
    return days;
  }, [today, isDone]);

  // ── Handlers ───────────────────────────────────────────────
  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    setAddingHabit(true);
    try {
      await addCustomHabit({
        name: newHabitName.trim(),
        icon: newHabitIcon,
        color: newHabitColor,
      });
      setShowAddCustom(false);
      setNewHabitName('');
      setNewHabitIcon('Star');
      setNewHabitColor('#3FA793');
      toast.success('Custom habit added!');
    } catch {
      toast.error('Failed to add habit');
    } finally {
      setAddingHabit(false);
    }
  };

  const handleDeleteCustom = async (id: string) => {
    try {
      await deleteCustomHabit(id);
      toast.success('Habit removed');
    } catch {
      toast.error('Failed to remove habit');
    }
  };

  const renderWeekDots = (habitId: number | string) => (
    <div className="flex items-center gap-1">
      {weekDates.map(date => {
        const done = isDone(habitId, date);
        const isFuture = date > today;
        return (
          <div key={date} title={date} className={clsx(
            'text-[10px] w-3 text-center select-none',
            isFuture ? 'text-border opacity-50' : done ? 'text-jade' : 'text-brick'
          )}>
            {isFuture ? '◌' : done ? '✓' : '○'}
          </div>
        );
      })}
    </div>
  );

  const getMilestoneBadge = (streak: number) => {
    if (streak >= 100) return <span className="ml-1 text-[10px] font-mono text-sky-400 border border-sky-400/30 px-1 rounded">100d</span>;
    if (streak >= 30)  return <span className="ml-1 text-[10px] font-mono text-jade border border-jade/30 px-1 rounded">30d</span>;
    if (streak >= 7)   return <span className="ml-1 text-[10px] font-mono text-gold border border-gold/30 px-1 rounded">7d</span>;
    return null;
  };

  return (
    <div className="min-h-dvh bg-ink">
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-10 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">This week</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-secondary font-mono text-sm">{weekRange}</p>
              {todayAllDone && isCurrentWeek && (
                <span className="badge badge-jade text-[10px] flex items-center gap-1">
                  <CheckCheck size={10} />
                  Day complete
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(w => w - 1)} className="btn btn-ghost py-2 px-2 h-auto">
              <ChevronLeft size={16} />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} className="btn btn-ghost py-1 px-3 h-auto text-xs font-mono">
                Today
              </button>
            )}
            <button
              onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
              className={clsx('btn btn-ghost py-2 px-2 h-auto', isCurrentWeek && 'opacity-30 cursor-not-allowed')}
              disabled={isCurrentWeek}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          <div className="card p-4 text-center">
            <div className="font-mono text-2xl text-jade font-bold">{perfectDaysThisWeek}</div>
            <div className="text-xs text-muted font-mono mt-1">Perfect days</div>
          </div>
          <div className="card p-4 text-center">
            <div className="font-mono text-2xl text-gold font-bold">{bestStreakOverall}</div>
            <div className="text-xs text-muted font-mono mt-1">Best streak</div>
          </div>
          <div className="card p-4 text-center">
            <div className="font-mono text-2xl text-primary font-bold">{totalCompletionsThisMonth}</div>
            <div className="text-xs text-muted font-mono mt-1">This month</div>
          </div>
        </div>

        {/* ── Habit List ── */}
        <div className="card p-5 animate-fade-in space-y-4">
          <div className="flex justify-between items-center">
            <span className="label !mb-0">Habits</span>
            <button
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="btn btn-ghost btn-sm text-xs py-1 flex items-center gap-1"
            >
              <Plus size={14} /> Add custom
            </button>
          </div>

          {/* ── Add Custom Habit Form ── */}
          {showAddCustom && (
            <form onSubmit={handleAddCustom} className="p-4 rounded-xl bg-surface-raised border border-jade/20 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-jade uppercase tracking-widest">New Custom Habit</span>
                <button type="button" onClick={() => setShowAddCustom(false)} className="text-muted hover:text-primary">
                  <X size={14} />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="label">Habit Name</label>
                <input
                  className="input w-full text-sm"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  placeholder="e.g. Read 10 pages, Cold shower..."
                  required
                  autoFocus
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="label">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(({ name, component: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewHabitIcon(name)}
                      title={name}
                      className={clsx(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-all border',
                        newHabitIcon === name
                          ? 'border-jade bg-jade/10 text-jade'
                          : 'border-border bg-surface text-muted hover:border-secondary hover:text-secondary'
                      )}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setNewHabitColor(c.value)}
                      className={clsx(
                        'w-7 h-7 rounded-full border-2 transition-all',
                        newHabitColor === c.value ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border">
                {(() => {
                  const Icon = getIconComponent(newHabitIcon);
                  return <Icon size={18} style={{ color: newHabitColor }} />;
                })()}
                <span className="text-sm text-primary">{newHabitName || 'Habit preview'}</span>
              </div>

              <button type="submit" disabled={addingHabit} className="btn btn-jade text-sm w-full">
                {addingHabit ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={14} /> Add Habit</>}
              </button>
            </form>
          )}

          {/* ── Habit Rows ── */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 skeleton rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {allHabits.map(habit => {
                const streak = getStreak(habit.id);
                const bestStreak = getBestStreak(habit.id);
                const doneToday = isDone(habit.id, today);

                let IconEl: React.ReactNode;
                if (!habit.isCustom) {
                  IconEl = FIXED_ICONS[habit.id as number];
                } else {
                  const IconComp = getIconComponent(habit.icon);
                  IconEl = <IconComp size={18} style={{ color: habit.color }} />;
                }

                return (
                  <div
                    key={String(habit.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggle(habit.id, today)}
                        disabled={!isCurrentWeek}
                        className={clsx(
                          'w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0',
                          doneToday ? 'bg-jade border-jade text-ink' : 'border-border hover:border-primary text-transparent',
                          !isCurrentWeek && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <CheckCheck size={14} />
                      </button>

                      {/* Icon */}
                      <div className="w-7 flex justify-center shrink-0">{IconEl}</div>

                      {/* Name + week dots */}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-primary">{habit.name}</span>
                          {getMilestoneBadge(streak)}
                        </div>
                        <div className="hidden sm:block mt-0.5">
                          {renderWeekDots(habit.id)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className={clsx('text-sm font-mono font-semibold', streak >= 7 ? 'text-jade' : 'text-primary')}>
                          {streak}<span className="text-xs text-muted font-normal ml-1">streak</span>
                        </div>
                        <div className="text-[10px] text-muted font-mono">Best: {bestStreak}</div>
                      </div>
                      {habit.isCustom && (
                        <button
                          onClick={() => handleDeleteCustom(habit.id as string)}
                          className="text-muted hover:text-brick opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Remove habit"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 12-Week Heatmap ── */}
        <div className="card p-5 animate-fade-in">
          <div className="label mb-3">12-Week Activity</div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-[3px] text-[10px] text-muted font-mono justify-between py-1">
              <span>Mo</span>
              <span>We</span>
              <span>Fr</span>
            </div>
            <div className="flex gap-[3px] flex-1 overflow-hidden">
              {Array.from({ length: 12 }).map((_, weekIdx) => {
                const weekDaysSlice = heatmapDays.slice(weekIdx * 7, (weekIdx + 1) * 7);
                return (
                  <div key={weekIdx} className="flex flex-col gap-[3px]">
                    {weekDaysSlice.map(day => {
                      const intensity = Math.min(day.count, 5);
                      let colorClass = 'bg-surface-raised';
                      if (intensity === 1) colorClass = 'bg-jade/20';
                      else if (intensity === 2) colorClass = 'bg-jade/40';
                      else if (intensity === 3) colorClass = 'bg-jade/60';
                      else if (intensity === 4) colorClass = 'bg-jade/80';
                      else if (intensity >= 5) colorClass = 'bg-jade';
                      return (
                        <div
                          key={day.date}
                          title={`${day.date}: ${day.count} habits`}
                          className={clsx('w-[14px] h-[14px] rounded-[2px]', colorClass)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="text-[10px] text-muted">Less</span>
            {['bg-surface-raised', 'bg-jade/20', 'bg-jade/40', 'bg-jade/60', 'bg-jade/80', 'bg-jade'].map((cls, i) => (
              <div key={i} className={clsx('w-3 h-3 rounded-[2px]', cls)} />
            ))}
            <span className="text-[10px] text-muted">More</span>
          </div>
        </div>

      </div>
    </div>
  );
}
