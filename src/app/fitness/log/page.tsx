'use client';
import { getISTDateString } from '@/lib/dateUtils';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, X, Search, Dumbbell, Save, Activity } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

type FitnessExercise = { id: string; name: string; category: string; icon: string; color: string; unit: string; has_sets: boolean; has_reps: boolean; has_weight: boolean; has_distance: boolean; has_duration: boolean; is_archived: boolean; description?: string; }
type FitnessWorkoutSet = { id?: string; exercise_id?: string; exercise_name: string; set_number: number; reps?: number; weight_kg?: number; distance_km?: number; duration_min?: number; notes?: string; }
type FitnessWorkout = { id: string; workout_date: string; title?: string; notes?: string; mood?: number; energy_level?: number; difficulty?: number; duration_min?: number; completed: boolean; created_at: string; sets?: FitnessWorkoutSet[]; }

export default function LogWorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<FitnessExercise[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  // Workout state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getISTDateString());
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [duration, setDuration] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<{ exercise: FitnessExercise, sets: Partial<FitnessWorkoutSet>[] }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const exRes = await fetch('/api/fitness/exercises');
        const exData = exRes.ok ? await exRes.json() : [];
        setExercises(exData || []);

        const wRes = await fetch('/api/fitness/workouts?limit=3');
        const wData = wRes.ok ? await wRes.json() : { workouts: [] };
        const ws: FitnessWorkout[] = wData.workouts || [];
        if (ws.length > 0 && ws[0].sets?.length) {
          const exCounts: Record<string, number> = {};
          ws.forEach(w => w.sets?.forEach(s => { exCounts[s.exercise_name] = (exCounts[s.exercise_name] || 0) + 1; }));
          const bestEx = Object.entries(exCounts).sort((a,b) => b[1] - a[1])[0][0];
          setSuggestion(`Last time you did ${bestEx}. Try +10% today!`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredExercises = exercises.filter(e => 
    (category === 'All' || e.category === category) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddExercise = (ex: FitnessExercise) => {
    setSelectedExercises(prev => [...prev, { exercise: ex, sets: [{ set_number: 1 }] }]);
    setSearch('');
  };

  const handleAddSet = (index: number) => {
    setSelectedExercises(prev => {
      const copy = [...prev];
      const exBlock = copy[index];
      const lastSet = exBlock.sets[exBlock.sets.length - 1];
      exBlock.sets.push({ ...lastSet, set_number: exBlock.sets.length + 1 });
      return copy;
    });
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    setSelectedExercises(prev => {
      const copy = [...prev];
      copy[exIndex].sets.splice(setIndex, 1);
      // Re-number
      copy[exIndex].sets.forEach((s, i) => s.set_number = i + 1);
      if (copy[exIndex].sets.length === 0) {
        copy.splice(exIndex, 1);
      }
      return copy;
    });
  };

  const handleSetChange = (exIndex: number, setIndex: number, field: keyof FitnessWorkoutSet, value: string) => {
    setSelectedExercises(prev => {
      const copy = [...prev];
      copy[exIndex].sets[setIndex] = { ...copy[exIndex].sets[setIndex], [field]: Number(value) || undefined };
      return copy;
    });
  };

  const handleSave = async () => {
    if (selectedExercises.length === 0) return alert('Add at least one exercise');
    setSaving(true);
    try {
      const allSets: Partial<FitnessWorkoutSet>[] = [];
      selectedExercises.forEach(block => {
        block.sets.forEach(s => {
          allSets.push({
            exercise_id: block.exercise.id,
            exercise_name: block.exercise.name,
            set_number: s.set_number || 1,
            reps: s.reps,
            weight_kg: s.weight_kg,
            distance_km: s.distance_km,
            duration_min: s.duration_min
          });
        });
      });

      const payload = {
        workout_date: date,
        title, notes, mood, energy_level: energy, difficulty, duration_min: Number(duration) || undefined,
        completed: true,
        sets: allSets
      };

      const res = await fetch('/api/fitness/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/fitness');
      } else {
        alert('Failed to save');
        setSaving(false);
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-ink pb-20">
      <div className="max-w-3xl mx-auto px-5 pt-8 space-y-6">
        
        <div className="flex items-center gap-3">
          <Link href="/fitness" className="p-2 -ml-2 rounded-lg hover:bg-surface-raised transition-colors"><ChevronLeft size={20}/></Link>
          <h1 className="font-display text-2xl font-semibold text-primary">Log Workout</h1>
        </div>

        {suggestion && (
          <div className="bg-jade/10 border border-jade/20 rounded-xl p-3 text-sm text-jade font-mono animate-fade-in flex items-center gap-2">
            <Activity size={16}/> {suggestion}
          </div>
        )}

        <div className="card p-5 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input w-full" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Title (Optional)</label>
              <input type="text" className="input w-full" placeholder="e.g. Morning Run" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label flex justify-between">Mood <span>{mood}/5</span></label>
              <input type="range" min="1" max="5" value={mood} onChange={e => setMood(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label flex justify-between">Energy <span>{energy}/5</span></label>
              <input type="range" min="1" max="5" value={energy} onChange={e => setEnergy(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label flex justify-between">Difficulty <span>{difficulty}/5</span></label>
              <input type="range" min="1" max="5" value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" className="input w-full" placeholder="45" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input w-full h-20 resize-none" placeholder="How did it feel?" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display text-xl text-primary">Exercises</h2>
          
          {selectedExercises.map((block, exIndex) => (
            <div key={exIndex} className="card p-4 border-l-4 border-l-jade bg-surface-raised relative">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: block.exercise.color || '#3FA793' }} />
                <span className="font-medium text-primary text-sm">{block.exercise.name}</span>
              </div>
              
              <div className="space-y-2">
                {block.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex flex-wrap items-center gap-2">
                    <div className="w-8 text-xs font-mono text-muted text-center py-2 bg-surface rounded">S{set.set_number}</div>
                    
                    {block.exercise.has_reps && (
                      <input type="number" placeholder="Reps" className="input w-16 text-center text-sm px-1 py-1 h-8" value={set.reps || ''} onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} />
                    )}
                    {block.exercise.has_weight && (
                      <div className="flex items-center gap-1">
                        <input type="number" placeholder="Kg" className="input w-16 text-center text-sm px-1 py-1 h-8" value={set.weight_kg || ''} onChange={e => handleSetChange(exIndex, setIndex, 'weight_kg', e.target.value)} />
                      </div>
                    )}
                    {block.exercise.has_distance && (
                      <div className="flex items-center gap-1">
                        <input type="number" placeholder="Km" step="0.1" className="input w-16 text-center text-sm px-1 py-1 h-8" value={set.distance_km || ''} onChange={e => handleSetChange(exIndex, setIndex, 'distance_km', e.target.value)} />
                      </div>
                    )}
                    {block.exercise.has_duration && (
                      <div className="flex items-center gap-1">
                        <input type="number" placeholder="Min" className="input w-16 text-center text-sm px-1 py-1 h-8" value={set.duration_min || ''} onChange={e => handleSetChange(exIndex, setIndex, 'duration_min', e.target.value)} />
                      </div>
                    )}
                    
                    <button onClick={() => handleRemoveSet(exIndex, setIndex)} className="p-1.5 text-muted hover:text-brick transition-colors rounded hover:bg-surface">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {block.exercise.has_sets && (
                <button onClick={() => handleAddSet(exIndex)} className="mt-3 text-[11px] font-mono text-jade hover:underline flex items-center gap-1">
                  <Plus size={12}/> Add Set
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="card p-5 border border-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Search exercises..." className="input w-full pl-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input text-sm" value={category} onChange={e => setCategory(e.target.value)}>
              <option>All</option>
              <option>Cardio</option>
              <option>Strength</option>
              <option>Flexibility</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2"><div className="skeleton rounded h-10"/><div className="skeleton rounded h-10"/></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredExercises.map(ex => (
                <button key={ex.id} onClick={() => handleAddExercise(ex)} className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-surface hover:border-jade hover:bg-jade/5 transition-all text-left">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ex.color || '#3FA793' }} />
                  <span className="text-xs font-medium text-primary line-clamp-1">{ex.name}</span>
                </button>
              ))}
              {filteredExercises.length === 0 && <div className="col-span-2 text-xs text-muted text-center py-4">No exercises found</div>}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-jade w-full py-4 text-base shadow-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {saving ? 'Saving...' : <><Save size={18} className="mr-2"/> Save Workout</>}
        </button>

      </div>
    </div>
  );
}
