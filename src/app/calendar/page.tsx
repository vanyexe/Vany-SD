'use client'

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, Code2, Flame, X } from 'lucide-react';
import clsx from 'clsx';
import { useTasks } from '@/lib/hooks/useTasks';
import { useDsaProblems } from '@/lib/hooks/useDsaProblems';
import { useHabits } from '@/lib/hooks/useHabits';
import { HABITS } from '@/lib/data/seed';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Real data hooks ──
  const { tasks } = useTasks();
  const { dueForReview, problems } = useDsaProblems();
  const { isDone, today } = useHabits();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month]);

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(null); };

  const isToday = (date: Date) => isoDate(date) === today;

  // Build events per date
  const getEventsForDay = (date: Date) => {
    const ds = isoDate(date);
    const dayTasks = tasks
      .filter(t => t.due_date?.startsWith(ds) && t.status !== 'done')
      .map(t => ({ id: t.id, title: t.title, type: 'task' as const }));
    const dayDsa = dueForReview
      .filter(p => p.next_review_date?.startsWith(ds))
      .map(p => ({ id: p.id, title: p.title, type: 'dsa' as const }));
    // Count habits done that day
    const habitsCount = HABITS.filter(h => isDone(h.id, ds)).length;
    return { tasks: dayTasks, dsa: dayDsa, habitsCount, total: dayTasks.length + dayDsa.length };
  };

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : null;

  // Stats for header
  const thisMonthTasks = tasks.filter(t =>
    t.due_date && t.due_date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && t.status !== 'done'
  ).length;
  const thisMonthDsa = dueForReview.length;
  const dsaSolvedThisMonth = problems.filter(p =>
    p.date_solved?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  ).length;

  return (
    <div className="min-h-dvh bg-ink pb-16">
      <div className="max-w-5xl mx-auto px-5 pt-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-primary">Calendar</h1>
            <p className="text-sm text-muted font-mono mt-1">Tasks, DSA reviews & habit tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="btn btn-ghost btn-sm text-xs font-mono">Today</button>
            <button onClick={prevMonth} className="btn btn-ghost btn-sm p-2"><ChevronLeft size={16}/></button>
            <span className="font-display text-lg text-primary min-w-[140px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="btn btn-ghost btn-sm p-2"><ChevronRight size={16}/></button>
          </div>
        </div>

        {/* Month Stats */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          {[
            { label: 'Tasks Due', value: thisMonthTasks, color: 'text-gold' },
            { label: 'DSA Reviews', value: thisMonthDsa, color: 'text-brick' },
            { label: 'Problems Solved', value: dsaSolvedThisMonth, color: 'text-jade' },
          ].map(s => (
            <div key={s.label} className="card-raised p-4 text-center">
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-mono text-muted mt-1 uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="card-raised rounded-2xl overflow-hidden animate-fade-in">
          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-border bg-surface">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-mono text-muted uppercase tracking-widest">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 bg-border gap-[1px]">
            {daysInMonth.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="bg-ink min-h-[90px]" />;
              const events = getEventsForDay(date);
              const todayCell = isToday(date);
              const isSelected = selectedDay && isoDate(selectedDay) === isoDate(date);
              const isFuture = isoDate(date) > today;

              return (
                <div
                  key={isoDate(date)}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={clsx(
                    'min-h-[90px] p-2 cursor-pointer flex flex-col gap-1 transition-colors',
                    isSelected ? 'bg-jade/10' : todayCell ? 'bg-surface-raised' : 'bg-surface hover:bg-surface-raised'
                  )}
                >
                  <span className={clsx(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 self-start',
                    todayCell ? 'bg-jade text-ink font-bold' : isFuture ? 'text-muted' : 'text-primary'
                  )}>
                    {date.getDate()}
                  </span>

                  {/* Task dots */}
                  {events.tasks.slice(0, 2).map(t => (
                    <div key={t.id} className="text-[10px] px-1.5 py-0.5 rounded truncate bg-gold/10 text-gold border border-gold/20">
                      {t.title}
                    </div>
                  ))}

                  {/* DSA review dots */}
                  {events.dsa.slice(0, 1).map(d => (
                    <div key={d.id} className="text-[10px] px-1.5 py-0.5 rounded truncate bg-brick/10 text-brick border border-brick/20">
                      {d.title}
                    </div>
                  ))}

                  {/* Habit dot */}
                  {!isFuture && events.habitsCount > 0 && (
                    <div className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded font-mono',
                      events.habitsCount === HABITS.length ? 'bg-jade/20 text-jade' : 'bg-surface text-secondary'
                    )}>
                      {events.habitsCount}/{HABITS.length} habits
                    </div>
                  )}

                  {events.total > 3 && (
                    <div className="text-[10px] text-muted pl-1">+{events.total - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-muted">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gold/30 border border-gold/40" /> Task due</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brick/30 border border-brick/40" /> DSA review</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-jade/30 border border-jade/40" /> Habits done</span>
        </div>
      </div>

      {/* Selected Day Drawer */}
      {selectedDay && selectedEvents && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-surface-raised border-l border-border p-6 shadow-2xl z-50 overflow-y-auto animate-fade-in flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-primary">
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h2>
            <button onClick={() => setSelectedDay(null)} className="p-2 text-muted hover:text-primary rounded-lg hover:bg-surface transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Habits */}
          <div>
            <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Flame size={12} className="text-jade" /> Habits
            </h3>
            <div className="space-y-1">
              {HABITS.map(h => {
                const done = isDone(h.id, isoDate(selectedDay));
                return (
                  <div key={h.id} className={clsx('flex items-center gap-2 p-2 rounded-lg text-sm', done ? 'text-jade' : 'text-muted')}>
                    <span>{done ? '✓' : '○'}</span>
                    <span>{h.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks */}
          {selectedEvents.tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-gold" /> Tasks Due
              </h3>
              <div className="space-y-2">
                {selectedEvents.tasks.map(t => (
                  <div key={t.id} className="card p-3 text-sm text-primary flex items-center gap-2 border border-gold/20">
                    <CheckCircle2 size={14} className="text-gold flex-shrink-0" />
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DSA */}
          {selectedEvents.dsa.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Code2 size={12} className="text-brick" /> DSA Reviews
              </h3>
              <div className="space-y-2">
                {selectedEvents.dsa.map(d => (
                  <div key={d.id} className="card p-3 text-sm text-primary flex items-center gap-2 border border-brick/20">
                    <Clock size={14} className="text-brick flex-shrink-0" />
                    {d.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEvents.total === 0 && selectedEvents.habitsCount === 0 && (
            <p className="text-sm text-muted text-center py-6">Nothing logged for this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
