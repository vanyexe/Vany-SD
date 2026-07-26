'use client';
import { getISTDateString } from '@/lib/dateUtils';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Calendar, Filter, Trash2, Dumbbell, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

type FitnessWorkoutSet = { id?: string; exercise_name: string; set_number: number; reps?: number; weight_kg?: number; distance_km?: number; duration_min?: number; }
type FitnessWorkout = { id: string; workout_date: string; title?: string; notes?: string; mood?: number; duration_min?: number; sets?: FitnessWorkoutSet[]; }

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded', className)} />
}

export default function WorkoutHistoryPage() {
  const [workouts, setWorkouts] = useState<FitnessWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('Last 3 Months');
  const [exFilter, setExFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/fitness/workouts')
      .then(r => r.ok ? r.json() : { workouts: [] })
      .then(data => setWorkouts(data.workouts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const uniqueExercises = useMemo(() => {
    const s = new Set<string>();
    workouts.forEach(w => w.sets?.forEach(set => s.add(set.exercise_name)));
    return Array.from(s).sort();
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    return workouts.filter(w => {
      // Date filter
      const wd = new Date(w.workout_date);
      if (dateRange === 'This Week') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        if (wd < d) return false;
      } else if (dateRange === 'This Month') {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        if (wd < d) return false;
      } else if (dateRange === 'Last 3 Months') {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        if (wd < d) return false;
      }
      
      // Exercise filter
      if (exFilter !== 'All') {
        if (!w.sets?.some(s => s.exercise_name === exFilter)) return false;
      }

      // Search filter
      if (search && !(w.notes?.toLowerCase().includes(search.toLowerCase()) || w.title?.toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }

      return true;
    });
  }, [workouts, dateRange, exFilter, search]);

  const pagedWorkouts = filteredWorkouts.slice((page - 1) * 10, page * 10);
  const totalPages = Math.ceil(filteredWorkouts.length / 10);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workout?')) return;
    try {
      const res = await fetch(`/api/fitness/workouts/${id}`, { method: 'DELETE' });
      if (res.ok) setWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (e) { console.error(e); }
  };

  // Heatmap prep
  const heatmapDays = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const ref = new Date(today);
    ref.setDate(ref.getDate() + daysToSunday);
    
    // 12 weeks = 84 days
    for (let i = 83; i >= 0; i--) {
      const d = new Date(ref);
      d.setDate(d.getDate() - i);
      const ds = getISTDateString(d);
      const count = workouts.filter(w => w.workout_date === ds).length;
      days.push({ date: ds, count });
    }
    return days;
  }, [workouts]);

  return (
    <div className="min-h-dvh bg-ink pb-20">
      <div className="max-w-4xl mx-auto px-5 pt-8 space-y-6">
        
        <div className="flex items-center gap-3">
          <Link href="/fitness" className="p-2 -ml-2 rounded-lg hover:bg-surface-raised transition-colors"><ChevronLeft size={20}/></Link>
          <h1 className="font-display text-2xl font-semibold text-primary">Workout History</h1>
        </div>

        {/* Heatmap */}
        <div className="card p-5 animate-fade-in hidden sm:block">
          <div className="label mb-3">12-Week Activity</div>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <div className="flex gap-2">
              <div className="flex flex-col gap-[3px] text-[10px] text-muted font-mono justify-between py-1">
                <span>Mo</span><span>We</span><span>Fr</span>
              </div>
              <div className="flex gap-[3px] flex-1 overflow-x-auto custom-scrollbar pb-2">
                {Array.from({ length: 12 }).map((_, weekIdx) => {
                  const weekDays = heatmapDays.slice(weekIdx * 7, (weekIdx + 1) * 7);
                  return (
                    <div key={weekIdx} className="flex flex-col gap-[3px]">
                      {weekDays.map(day => {
                        let colorClass = "bg-surface-raised";
                        if (day.count === 1) colorClass = "bg-jade/40";
                        else if (day.count >= 2) colorClass = "bg-jade";
                        const isToday = day.date === getISTDateString();
                        return (
                          <div key={day.date} title={`${day.date}: ${day.count} workouts`}
                            className={clsx("w-[14px] h-[14px] rounded-[2px]", colorClass, isToday && "ring-1 ring-jade ring-offset-1 ring-offset-ink")} 
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <select className="input text-sm flex-1 min-w-[120px]" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option>This Week</option><option>This Month</option><option>Last 3 Months</option><option>All Time</option>
          </select>
          <select className="input text-sm flex-1 min-w-[120px]" value={exFilter} onChange={e => setExFilter(e.target.value)}>
            <option value="All">All Exercises</option>
            {uniqueExercises.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="text" placeholder="Search notes..." className="input text-sm flex-2 min-w-[150px]" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* List */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full"/><Skeleton className="h-16 w-full"/></div>
          ) : filteredWorkouts.length === 0 ? (
            <div className="card p-10 text-center flex flex-col items-center justify-center">
              <Dumbbell size={32} className="text-muted mb-4" />
              <p className="text-primary mb-2 text-sm">No workouts found.</p>
              <Link href="/fitness/log" className="text-xs text-jade hover:underline font-mono">Start logging!</Link>
            </div>
          ) : (
            <>
              {pagedWorkouts.map(w => {
                const exNames = Array.from(new Set((w.sets || []).map(s => s.exercise_name)));
                return (
                  <details key={w.id} className="card bg-surface-raised group border border-border [&_summary::-webkit-details-marker]:hidden relative">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface transition-colors pr-12">
                      <div className="flex items-center gap-4">
                        <div className="px-2 py-1 bg-surface rounded text-center border border-border">
                          <div className="text-[9px] font-mono text-muted uppercase">{new Date(w.workout_date).toLocaleString('default', {month:'short'})}</div>
                          <div className="text-sm font-display text-primary">{new Date(w.workout_date).getDate()}</div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                            {w.title || 'Workout'}
                            <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-secondary font-mono">{w.duration_min}m</span>
                          </h4>
                          <p className="text-[11px] font-mono text-secondary mt-1 max-w-[200px] sm:max-w-md truncate">
                            {exNames.length ? exNames.join(', ') : 'No exercises'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {w.mood ? <span className="text-[10px] font-mono text-muted bg-surface px-2 py-0.5 rounded border border-border">Mood: {w.mood}/5</span> : null}
                        <ChevronRight size={14} className="text-muted transition-transform group-open:rotate-90" />
                      </div>
                    </summary>
                    <button onClick={() => handleDelete(w.id)} className="absolute top-4 right-4 p-1 text-muted hover:text-brick opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14}/>
                    </button>
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 text-xs bg-surface-raised">
                      {w.notes && <p className="mb-3 text-secondary italic text-[11px]">"{w.notes}"</p>}
                      <div className="space-y-1">
                        {w.sets?.map((s, i) => (
                          <div key={i} className="flex justify-between items-center text-secondary bg-surface p-2 rounded">
                            <span className="font-medium text-primary">{s.exercise_name} <span className="text-muted text-[10px]">S{s.set_number}</span></span>
                            <span className="font-mono text-[10px]">
                              {s.reps ? `${s.reps}x ` : ''}{s.weight_kg ? `${s.weight_kg}kg ` : ''}{s.distance_km ? `${s.distance_km}km ` : ''}{s.duration_min ? `${s.duration_min}m` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                );
              })}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4 pt-4">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn btn-ghost btn-sm">Prev</button>
                  <span className="text-xs font-mono text-muted py-1">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="btn btn-ghost btn-sm">Next</button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
