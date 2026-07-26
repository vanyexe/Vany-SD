'use client';
import { getISTDateString } from '@/lib/dateUtils';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Activity, Calendar, Trophy, ChevronRight, X, Dumbbell } from 'lucide-react';
import clsx from 'clsx';

type FitnessExercise = { id: string; name: string; category: string; icon: string; color: string; unit: string; has_sets: boolean; has_reps: boolean; has_weight: boolean; has_distance: boolean; has_duration: boolean; is_archived: boolean; description?: string; }
type FitnessWorkoutSet = { id?: string; exercise_id?: string; exercise_name: string; set_number: number; reps?: number; weight_kg?: number; distance_km?: number; duration_min?: number; notes?: string; }
type FitnessWorkout = { id: string; workout_date: string; title?: string; notes?: string; mood?: number; energy_level?: number; difficulty?: number; duration_min?: number; completed: boolean; created_at: string; sets?: FitnessWorkoutSet[]; }
type FitnessPR = { id: string; exercise_name: string; pr_type: string; value: number; achieved_at: string; }
type FitnessChallenge = { id: string; title: string; description?: string; challenge_type: string; target_value: number; current_value: number; unit: string; start_date: string; end_date: string; completed: boolean; }

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded', className)} />
}

export default function FitnessDashboardPage() {
  const [workouts, setWorkouts] = useState<FitnessWorkout[]>([]);
  const [challenges, setChallenges] = useState<FitnessChallenge[]>([]);
  const [prs, setPrs] = useState<FitnessPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const refetch = async () => {
    try {
      const [wRes, cRes, pRes] = await Promise.all([
        fetch('/api/fitness/workouts').then(r => r.ok ? r.json() : { workouts: [] }),
        fetch('/api/fitness/challenges').then(r => r.ok ? r.json() : []),
        fetch('/api/fitness/prs').then(r => r.ok ? r.json() : [])
      ]);
      setWorkouts(wRes.workouts || []);
      setChallenges(cRes || []);
      setPrs(pRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [wRes, cRes, pRes] = await Promise.all([
          fetch('/api/fitness/workouts').then(r => r.ok ? r.json() : { workouts: [] }),
          fetch('/api/fitness/challenges').then(r => r.ok ? r.json() : []),
          fetch('/api/fitness/prs').then(r => r.ok ? r.json() : [])
        ]);
        setWorkouts(wRes.workouts || []);
        setChallenges(cRes || []);
        setPrs(pRes || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const todayStr = getISTDateString();
  const todaysWorkouts = workouts.filter(w => w.workout_date === todayStr);
  const todaysDuration = todaysWorkouts.reduce((sum, w) => sum + (w.duration_min || 0), 0);

  const streak = useMemo(() => {
    if (!workouts.length) return 0;
    const dates = [...new Set(workouts.map(w => w.workout_date))].sort().reverse();
    if (dates[0] !== todayStr && dates[0] !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      return 0;
    }
    let currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
      if (diff === 1) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [workouts, todayStr]);

  const thisWeekWorkouts = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const lastWeekStr = getISTDateString(d);
    return workouts.filter(w => w.workout_date >= lastWeekStr);
  }, [workouts]);
  const thisWeekMinutes = thisWeekWorkouts.reduce((sum, w) => sum + (w.duration_min || 0), 0);

  const formatPRType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="min-h-dvh bg-ink relative pb-20">
      <div className="max-w-5xl mx-auto px-5 pt-10 space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2.5">
              <Dumbbell className="text-jade" size={32} />
              <span>Fitness</span>
            </h1>
            <p className="text-secondary text-sm mt-1 font-mono">Your complete fitness journey</p>
          </div>
          <div className="flex gap-2">
            <Link href="/fitness/history" className="btn btn-ghost btn-sm text-xs font-mono"><Calendar size={14}/> History</Link>
            <Link href="/fitness/analytics" className="btn btn-ghost btn-sm text-xs font-mono"><Activity size={14}/> Analytics</Link>
          </div>
        </div>

        {/* Top stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div className="card-raised p-5 border-l-4 border-l-jade">
            <div className="text-xs font-mono text-secondary mb-2 uppercase">Today's Workout</div>
            {loading ? <Skeleton className="h-8 w-20 mb-1" /> : todaysWorkouts.length > 0 ? (
              <>
                <div className="font-display text-2xl text-jade mb-1">{todaysWorkouts.length} {todaysWorkouts.length === 1 ? 'Workout' : 'Workouts'}</div>
                <div className="text-xs text-muted font-mono">{todaysDuration} mins</div>
              </>
            ) : (
              <div className="text-xs text-primary mb-2">Log your first workout today</div>
            )}
            {!loading && todaysWorkouts.length === 0 && (
              <Link href="/fitness/log" className="text-xs font-mono text-jade hover:underline">Log Workout →</Link>
            )}
          </div>
          <div className="card-raised p-5 border-l-4 border-l-gold">
            <div className="text-xs font-mono text-secondary mb-2 uppercase">Workout Streak</div>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <>
                <div className="font-display text-3xl text-gold mb-1">{streak}</div>
                <div className="text-xs text-muted font-mono">days consecutive</div>
              </>
            )}
          </div>
          <div className="card-raised p-5 border-l-4 border-l-primary">
            <div className="text-xs font-mono text-secondary mb-2 uppercase">This Week</div>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <>
                <div className="font-display text-3xl text-primary mb-1">{thisWeekWorkouts.length}</div>
                <div className="text-xs text-muted font-mono">{thisWeekMinutes} total minutes</div>
              </>
            )}
          </div>
          <div className="card-raised p-5 border-l-4 border-l-brick">
            <div className="text-xs font-mono text-secondary mb-2 uppercase">Total Workouts</div>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <>
                <div className="font-display text-3xl text-brick mb-1">{workouts.length}</div>
                <div className="text-xs text-muted font-mono">all time</div>
              </>
            )}
          </div>
        </div>

        {/* Middle section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Active Challenges */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-center">
              <h2 className="font-display text-xl text-primary flex items-center gap-2">
                <TargetIcon /> Active Challenges
              </h2>
            </div>
            
            {loading ? <div className="space-y-3"><Skeleton className="h-20 w-full" /></div> : 
             challenges.length === 0 ? (
              <div className="card-raised p-8 text-center border border-dashed border-border flex flex-col items-center">
                <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-3">
                  <TargetIcon />
                </div>
                <p className="text-sm text-primary mb-1">No active challenges</p>
                <p className="text-xs text-muted mb-4">Push yourself by setting a goal</p>
                <button onClick={() => setShowModal(true)} className="btn btn-sm btn-jade font-mono text-xs">Create Challenge</button>
              </div>
            ) : (
              <div className="space-y-3">
                {challenges.map(c => {
                  const pct = Math.min(100, Math.round((c.current_value / c.target_value) * 100));
                  const daysRem = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - new Date().getTime()) / 86400000));
                  return (
                    <div key={c.id} className="card p-4 bg-surface-raised border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-medium text-primary">{c.title}</h3>
                          <p className="text-[10px] font-mono text-muted">{c.current_value} / {c.target_value} {c.unit}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-surface px-2 py-1 rounded text-secondary">{daysRem}d left</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1 h-2">
                          <div className="progress-fill h-full bg-jade transition-all" style={{ width: pct + '%' }} />
                        </div>
                        <span className="text-[10px] font-mono text-jade">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowModal(true)} className="w-full py-3 text-xs font-mono text-jade bg-jade/10 border border-jade/20 rounded-xl hover:bg-jade/20 transition-colors">
                  + Create Challenge
                </button>
              </div>
            )}
          </div>

          {/* Personal Records */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="font-display text-xl text-primary flex items-center gap-2">
              <Trophy size={20} className="text-gold" /> Personal Records
            </h2>
            
            {loading ? <div className="space-y-3"><Skeleton className="h-16 w-full" /></div> :
             prs.length === 0 ? (
              <div className="card p-6 text-center text-muted text-sm border border-dashed border-border">
                Log workouts to set personal records!
              </div>
             ) : (
              <div className="grid grid-cols-2 gap-3">
                {prs.map(pr => (
                  <div key={pr.id} className="card p-4 bg-surface-raised border border-border hover:border-gold/50 transition-colors">
                    <div className="text-[10px] font-mono text-gold uppercase mb-1">{formatPRType(pr.pr_type)}</div>
                    <div className="font-body text-sm font-medium text-primary line-clamp-1">{pr.exercise_name}</div>
                    <div className="font-mono text-lg text-primary mt-1">{pr.value} <span className="text-xs text-muted">unit</span></div>
                  </div>
                ))}
              </div>
             )}
          </div>

        </div>

        {/* Bottom section: Recent Activity */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="font-display text-xl text-primary flex items-center gap-2">
            <Activity size={20} className="text-primary" /> Recent Activity
          </h2>
          
          {loading ? <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> :
           workouts.length === 0 ? (
             <div className="card-raised p-8 text-center flex flex-col items-center">
               <Dumbbell size={32} className="text-muted mb-4" />
               <p className="text-sm text-primary mb-4">No workouts logged yet.</p>
               <Link href="/fitness/log" className="btn btn-jade">Log Your First Workout</Link>
             </div>
           ) : (
             <div className="space-y-3">
               {workouts.slice(0, 7).map(w => {
                 const exNames = Array.from(new Set((w.sets || []).map(s => s.exercise_name)));
                 return (
                   <details key={w.id} className="card bg-surface-raised group border border-border [&_summary::-webkit-details-marker]:hidden">
                     <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="w-12 text-center">
                           <div className="text-[10px] font-mono text-muted uppercase">{new Date(w.workout_date).toLocaleString('default', {month:'short'})}</div>
                           <div className="text-lg font-display text-primary">{new Date(w.workout_date).getDate()}</div>
                         </div>
                         <div>
                           <h4 className="text-sm font-medium text-primary">{w.title || 'Workout'}</h4>
                           <p className="text-[11px] font-mono text-secondary mt-0.5 max-w-[200px] sm:max-w-md truncate">
                             {exNames.length ? exNames.join(', ') : 'No exercises'}
                           </p>
                         </div>
                       </div>
                        <div className="flex items-center gap-4 text-right">
                          <div className="hidden sm:block text-[11px] font-mono text-secondary">
                            {w.duration_min} min
                          </div>
                          {w.mood ? <span className="text-[10px] font-mono text-muted bg-surface px-2 py-0.5 rounded border border-border">Mood: {w.mood}/5</span> : null}
                          <ChevronRight size={16} className="text-muted transition-transform group-open:rotate-90" />
                        </div>
                     </summary>
                     <div className="px-4 pb-4 pt-2 border-t border-border/50 text-xs">
                       {(w.sets || []).length === 0 ? (
                         <div className="text-muted italic">No sets recorded.</div>
                       ) : (
                         <div className="space-y-2">
                           {w.sets?.map((s, i) => (
                             <div key={i} className="flex justify-between items-center text-secondary">
                               <span>{s.exercise_name} - Set {s.set_number}</span>
                               <span className="font-mono">
                                 {s.reps ? `${s.reps} reps ` : ''}
                                 {s.weight_kg ? `${s.weight_kg} kg ` : ''}
                                 {s.distance_km ? `${s.distance_km} km ` : ''}
                                 {s.duration_min ? `${s.duration_min} min` : ''}
                               </span>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   </details>
                 );
               })}
             </div>
           )}
        </div>
      </div>

      <Link href="/fitness/log" className="fixed bottom-6 right-6 w-14 h-14 bg-jade text-ink rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10">
        <Plus size={24} />
      </Link>

      {showModal && <ChallengeModal onClose={() => setShowModal(false)} onCreated={(c) => { setChallenges(prev => [c, ...prev]); setShowModal(false); }} />}
    </div>
  );
}

function TargetIcon() {
  return <Target size={20} className="text-jade" />;
}
import { Target } from 'lucide-react';

function ChallengeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: FitnessChallenge) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Weekly');
  const [target, setTarget] = useState('10');
  const [unit, setUnit] = useState('workouts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const start = new Date();
    const end = new Date();
    if (type === 'Daily') end.setDate(end.getDate() + 1);
    else if (type === 'Weekly') end.setDate(end.getDate() + 7);
    else end.setDate(end.getDate() + 30);

    try {
      const res = await fetch('/api/fitness/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          challenge_type: type.toLowerCase(),
          target_value: Number(target),
          unit,
          start_date: getISTDateString(start),
          end_date: getISTDateString(end)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      onCreated(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-fade-in">
      <div className="bg-surface-raised rounded-2xl w-full max-w-md border border-border shadow-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-xl text-primary">Create Challenge</h3>
          <button onClick={onClose} className="text-muted hover:text-primary"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input required type="text" className="input w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 100km Running Month" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input w-full" value={type} onChange={e => setType(e.target.value)}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input w-full" value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="workouts">Workouts</option>
                <option value="km">Kilometers</option>
                <option value="reps">Reps</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Target Value</label>
            <input required type="number" min="1" className="input w-full" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          {error && <p className="text-xs text-brick font-mono">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-jade w-full mt-4">
            {loading ? 'Creating...' : 'Create Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}
