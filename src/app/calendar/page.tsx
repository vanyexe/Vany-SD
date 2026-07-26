'use client'

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, Code2, Flame, X, Plus, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useTasks } from '@/lib/hooks/useTasks';
import { useDsaProblems } from '@/lib/hooks/useDsaProblems';
import { useHabits } from '@/lib/hooks/useHabits';
import { useCalendarEvents, CalendarEvent } from '@/lib/hooks/useCalendarEvents';
import { HABITS } from '@/lib/data/seed';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', description: '', color: '#3FA793' });

  // ── Real data hooks ──
  const { tasks } = useTasks();
  const { dueForReview, problems } = useDsaProblems();
  const { isDone, today } = useHabits();
  const { events: customEvents, createEvent, updateEvent, deleteEvent } = useCalendarEvents();

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
    const dayCustom = customEvents.filter(e => e.event_date === ds);
    
    // Count habits done that day
    const habitsCount = HABITS.filter(h => isDone(h.id, ds)).length;
    return { 
      tasks: dayTasks, 
      dsa: dayDsa, 
      custom: dayCustom,
      habitsCount, 
      total: dayTasks.length + dayDsa.length + dayCustom.length 
    };
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

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim() || !selectedDay) return;
    
    if (editingEvent) {
      await updateEvent(editingEvent.id, {
        title: eventForm.title,
        description: eventForm.description,
        color: eventForm.color,
        event_date: isoDate(selectedDay)
      });
    } else {
      await createEvent({
        title: eventForm.title,
        description: eventForm.description,
        color: eventForm.color,
        event_date: isoDate(selectedDay)
      });
    }
    closeEventModal();
  };

  const openNewEventModal = () => {
    setEditingEvent(null);
    setEventForm({ title: '', description: '', color: '#3FA793' });
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({ title: event.title, description: event.description || '', color: event.color });
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="min-h-dvh bg-ink pb-16">
      <div className="max-w-5xl mx-auto px-5 pt-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-primary">Calendar</h1>
            <p className="text-sm text-muted font-mono mt-1">Tasks, events, DSA reviews & habits</p>
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
        <div className="card-raised rounded-2xl overflow-hidden animate-fade-in relative z-0">
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
                    'min-h-[100px] p-2 cursor-pointer flex flex-col gap-1 transition-colors relative overflow-hidden',
                    isSelected ? 'bg-jade/10' : todayCell ? 'bg-surface-raised' : 'bg-surface hover:bg-surface-raised'
                  )}
                >
                  <span className={clsx(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 self-start',
                    todayCell ? 'bg-jade text-ink font-bold' : isFuture ? 'text-muted' : 'text-primary'
                  )}>
                    {date.getDate()}
                  </span>

                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {/* Custom events */}
                    {events.custom.slice(0, 2).map(c => (
                      <div key={c.id} className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium" style={{ backgroundColor: `${c.color}20`, color: c.color, border: `1px solid ${c.color}40` }}>
                        {c.title}
                      </div>
                    ))}
                    
                    {/* Task dots */}
                    {events.tasks.slice(0, 2 - Math.min(2, events.custom.length)).map(t => (
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
                  </div>

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
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface border border-border" /> Event</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gold/30 border border-gold/40" /> Task due</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brick/30 border border-brick/40" /> DSA review</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-jade/30 border border-jade/40" /> Habits</span>
        </div>
      </div>

      {/* Selected Day Drawer */}
      {selectedDay && selectedEvents && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-surface-raised border-l border-border shadow-2xl z-[60] animate-fade-in flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-surface-raised z-10">
            <h2 className="font-display text-xl text-primary">
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={openNewEventModal} className="p-2 text-jade hover:bg-jade/10 rounded-lg transition-colors tooltip" data-tip="Add Event">
                <Plus size={18} />
              </button>
              <button onClick={() => setSelectedDay(null)} className="p-2 text-muted hover:text-primary rounded-lg hover:bg-surface transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            
            {/* Custom Events */}
            {selectedEvents.custom.length > 0 && (
              <div>
                <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <CalendarIcon size={12} className="text-primary" /> Events
                </h3>
                <div className="space-y-2">
                  {selectedEvents.custom.map(c => (
                    <div key={c.id} className="card p-4 border relative group overflow-hidden" style={{ borderColor: `${c.color}30` }}>
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: c.color }} />
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-primary font-medium">{c.title}</div>
                          {c.description && <div className="text-xs text-muted mt-1 whitespace-pre-wrap">{c.description}</div>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditEventModal(c)} className="p-1.5 text-muted hover:text-primary hover:bg-surface rounded-md">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteEvent(c.id)} className="p-1.5 text-muted hover:text-brick hover:bg-brick/10 rounded-md">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {selectedEvents.tasks.length > 0 && (
              <div>
                <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-gold" /> Tasks Due
                </h3>
                <div className="space-y-2">
                  {selectedEvents.tasks.map(t => (
                    <div key={t.id} className="card p-3 text-sm text-primary flex items-center gap-3 border border-gold/20">
                      <CheckCircle2 size={16} className="text-gold flex-shrink-0" />
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DSA */}
            {selectedEvents.dsa.length > 0 && (
              <div>
                <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Code2 size={12} className="text-brick" /> DSA Reviews
                </h3>
                <div className="space-y-2">
                  {selectedEvents.dsa.map(d => (
                    <div key={d.id} className="card p-3 text-sm text-primary flex items-center gap-3 border border-brick/20">
                      <Clock size={16} className="text-brick flex-shrink-0" />
                      {d.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Habits */}
            <div>
              <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Flame size={12} className="text-jade" /> Habits
              </h3>
              <div className="space-y-1 bg-surface rounded-xl p-2 border border-border">
                {HABITS.map(h => {
                  const done = isDone(h.id, isoDate(selectedDay));
                  return (
                    <div key={h.id} className={clsx('flex items-center gap-3 p-2 rounded-lg text-sm', done ? 'text-jade' : 'text-muted')}>
                      <div className={clsx('w-4 h-4 rounded flex items-center justify-center border', done ? 'bg-jade border-jade text-ink' : 'border-muted')}>
                        {done && <CheckCircle2 size={10} />}
                      </div>
                      <span>{h.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedEvents.total === 0 && selectedEvents.habitsCount === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <CalendarIcon size={32} className="mb-3 text-muted" />
                <p className="text-sm text-muted">Nothing logged for this day.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Modal Overlay */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="card-raised w-full max-w-md p-6 rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl text-primary">{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
              <button onClick={closeEventModal} className="text-muted hover:text-primary"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase">Event Title</label>
                <input 
                  type="text" 
                  value={eventForm.title}
                  onChange={e => setEventForm({...eventForm, title: e.target.value})}
                  placeholder="E.g. Doctor's Appointment"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:border-jade/50"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase">Description (Optional)</label>
                <textarea 
                  value={eventForm.description}
                  onChange={e => setEventForm({...eventForm, description: e.target.value})}
                  placeholder="Notes, location, or details..."
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm text-primary min-h-[100px] resize-y focus:outline-none focus:border-jade/50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted mb-2 uppercase">Color</label>
                <div className="flex gap-2">
                  {['#3FA793', '#F9A826', '#E76F51', '#3A86FF', '#8338EC', '#8A9A9D'].map(color => (
                    <button
                      key={color}
                      onClick={() => setEventForm({...eventForm, color})}
                      className={clsx(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        eventForm.color === color ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={closeEventModal} className="btn btn-ghost">Cancel</button>
                <button 
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title.trim()}
                  className="btn btn-primary bg-jade text-ink hover:bg-jade/90 disabled:opacity-50"
                >
                  {editingEvent ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
