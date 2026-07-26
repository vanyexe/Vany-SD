'use client';
import { getISTDateString } from '@/lib/dateUtils';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, BarChart2, Flame, Map, Clock, Dumbbell } from 'lucide-react';
import clsx from 'clsx';

type FitnessWorkoutSet = { id?: string; exercise_name: string; set_number: number; distance_km?: number; duration_min?: number; }
type FitnessWorkout = { id: string; workout_date: string; duration_min?: number; mood?: number; sets?: FitnessWorkoutSet[]; }

export default function FitnessAnalyticsPage() {
  const [workouts, setWorkouts] = useState<FitnessWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fitness/workouts?limit=1000')
      .then(r => r.ok ? r.json() : { workouts: [] })
      .then(data => setWorkouts(data.workouts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const { totalWorkouts, totalHours, totalDistance, currentStreak, bestMonth } = useMemo(() => {
    if (!workouts.length) return { totalWorkouts: 0, totalHours: 0, totalDistance: 0, currentStreak: 0, bestMonth: 'None' };
    
    let mins = 0;
    let dist = 0;
    const months: Record<string, number> = {};

    workouts.forEach(w => {
      mins += w.duration_min || 0;
      w.sets?.forEach(s => dist += (s.distance_km || 0));
      const m = w.workout_date.slice(0, 7);
      months[m] = (months[m] || 0) + 1;
    });

    const dates = [...new Set(workouts.map(w => w.workout_date))].sort().reverse();
    let streak = 0;
    const todayStr = getISTDateString();
    if (dates[0] === todayStr || dates[0] === new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
        if (diff === 1) streak++; else break;
      }
    }

    const bm = Object.entries(months).sort((a,b) => b[1] - a[1])[0];
    const monthName = bm ? new Date(bm[0] + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : 'None';

    return { totalWorkouts: workouts.length, totalHours: (mins / 60).toFixed(1), totalDistance: dist.toFixed(1), currentStreak: streak, bestMonth: monthName };
  }, [workouts]);

  // Weekly workout count (last 8 weeks)
  const weeklyData = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i * 7 + start.getDay())); // start of week i weeks ago
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      const count = workouts.filter(w => {
        const wd = new Date(w.workout_date);
        return wd >= start && wd <= end;
      }).length;
      
      weeks.push({ label: i === 0 ? 'Now' : `W${8-i}`, count });
    }
    return weeks;
  }, [workouts]);
  const maxWeek = Math.max(1, ...weeklyData.map(d => d.count));

  // Exercise distribution
  const topExercises = useMemo(() => {
    const counts: Record<string, number> = {};
    workouts.forEach(w => {
      const exNames = new Set(w.sets?.map(s => s.exercise_name));
      exNames.forEach(name => counts[name] = (counts[name] || 0) + 1);
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
  }, [workouts]);
  const maxEx = topExercises.length > 0 ? topExercises[0][1] : 1;

  // Running distance line chart
  const runningWeekly = useMemo(() => {
    const weeks: { label: string; dist: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i * 7 + start.getDay())); 
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      let dist = 0;
      workouts.filter(w => {
        const wd = new Date(w.workout_date);
        return wd >= start && wd <= end;
      }).forEach(w => {
        w.sets?.forEach(s => {
          if (s.exercise_name.toLowerCase().includes('run')) {
            dist += (s.distance_km || 0);
          }
        });
      });
      weeks.push({ label: i === 0 ? 'Now' : `W${8-i}`, dist });
    }
    return weeks;
  }, [workouts]);
  const maxRun = Math.max(1, ...runningWeekly.map(d => d.dist));

  return (
    <div className="min-h-dvh bg-ink pb-20">
      <div className="max-w-4xl mx-auto px-5 pt-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/fitness" className="p-2 -ml-2 rounded-lg hover:bg-surface-raised transition-colors"><ChevronLeft size={20}/></Link>
            <h1 className="font-display text-2xl font-semibold text-primary">Analytics</h1>
          </div>
          <span className="text-xs font-mono text-muted">{bestMonth} was your best month</span>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
          {[
            { label: 'Workouts', val: totalWorkouts, icon: Dumbbell, color: 'jade' },
            { label: 'Hours', val: totalHours, icon: Clock, color: 'gold' },
            { label: 'Distance', val: `${totalDistance}km`, icon: Map, color: 'primary' },
            { label: 'Streak', val: currentStreak, icon: Flame, color: 'brick' },
          ].map((s, i) => (
            <div key={i} className={`card-raised p-4 border-l-2 border-l-${s.color}`}>
              <div className={`w-8 h-8 rounded-lg bg-${s.color}/10 flex items-center justify-center mb-2`}>
                <s.icon size={16} className={`text-${s.color}`} />
              </div>
              <div className={`font-display text-2xl text-${s.color}`}>{loading ? <div className="skeleton rounded h-8 w-12"/> : s.val}</div>
              <div className="text-[10px] font-mono text-muted uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Weekly Bar Chart */}
          <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-display text-lg text-primary mb-6 flex items-center gap-2"><BarChart2 size={18} className="text-jade"/> Weekly Workouts</h3>
            {loading ? <div className="skeleton rounded h-40 w-full"/> : (
              <div className="h-40 flex items-end justify-between gap-2 px-2">
                {weeklyData.map((d, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full flex justify-center h-32 items-end relative">
                      <div 
                        className="w-full max-w-[24px] bg-jade/20 border border-jade/50 rounded-t transition-all hover:bg-jade" 
                        style={{ height: `${Math.max(4, (d.count / maxWeek) * 100)}%` }} 
                      />
                      <div className="absolute -top-6 text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100">{d.count}</div>
                    </div>
                    <span className={clsx("text-[10px] font-mono mt-2", i === 7 ? "text-jade font-bold" : "text-muted")}>{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Running Distance Line Chart */}
          <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-display text-lg text-primary mb-6 flex items-center gap-2"><Map size={18} className="text-primary"/> Running Distance</h3>
            {loading ? <div className="skeleton rounded h-40 w-full"/> : runningWeekly.every(d => d.dist === 0) ? (
              <p className="text-sm text-muted text-center py-12">No running data logged yet.</p>
            ) : (
              <div className="h-40 relative px-2 flex flex-col justify-end">
                <svg viewBox="0 0 800 128" className="w-full h-32 overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {/* Filled area */}
                  <polygon
                    fill="url(#lineGrad)"
                    points={[
                      ...runningWeekly.map((d, i) => `${(i / (runningWeekly.length - 1)) * 800},${128 - (maxRun > 0 ? (d.dist / maxRun) * 112 : 0)}`),
                      `${800},128`, `0,128`
                    ].join(' ')}
                  />
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={runningWeekly.map((d, i) => `${(i / (runningWeekly.length - 1)) * 800},${128 - (maxRun > 0 ? (d.dist / maxRun) * 112 : 0)}`).join(' ')}
                  />
                  {/* Dots */}
                  {runningWeekly.map((d, i) => (
                    <circle
                      key={i}
                      cx={(i / (runningWeekly.length - 1)) * 800}
                      cy={128 - (maxRun > 0 ? (d.dist / maxRun) * 112 : 0)}
                      r="4"
                      fill="var(--color-ink)"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
                <div className="flex justify-between mt-2">
                  {runningWeekly.map((d, i) => <span key={i} className={clsx("text-[10px] font-mono", i === 7 ? "text-primary font-bold" : "text-muted")}>{d.label}</span>)}
                </div>
              </div>
            )}
          </div>


          {/* Exercise Distribution */}
          <div className="card p-5 animate-fade-in md:col-span-2" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-display text-lg text-primary mb-5 flex items-center gap-2"><Dumbbell size={18} className="text-gold"/> Top Exercises</h3>
            {loading ? <div className="skeleton rounded h-32 w-full"/> : topExercises.length === 0 ? <p className="text-sm text-muted text-center py-4">No exercises logged yet.</p> : (
              <div className="space-y-4">
                {topExercises.map(([name, count], i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-secondary">{name}</span>
                      <span className="font-mono text-muted">{count} sessions</span>
                    </div>
                    <div className="progress-bar h-2 bg-surface">
                      <div className="progress-fill h-full bg-gold transition-all" style={{ width: `${(count / maxEx) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
