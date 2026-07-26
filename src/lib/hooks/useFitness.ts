'use client';
import { getISTDateString } from '@/lib/dateUtils';
import { useState, useEffect, useCallback } from 'react';

export interface WorkoutSet {
  id?: string;
  exercise_id?: string;
  exercise_name: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  distance_km?: number;
  duration_min?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  workout_date: string;
  title?: string;
  notes?: string;
  mood?: number;
  energy_level?: number;
  difficulty?: number;
  duration_min?: number;
  completed: boolean;
  created_at: string;
  sets?: WorkoutSet[];
  // Legacy alias
  date?: string;
  exerciseName?: string;
}

export interface FitnessChallenge {
  id: string;
  title: string;
  description?: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  completed: boolean;
}

export interface FitnessPR {
  id: string;
  exercise_name: string;
  pr_type: string;
  value: number;
  achieved_at: string;
}

export interface FitnessExercise {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  unit: string;
  has_sets: boolean;
  has_reps: boolean;
  has_weight: boolean;
  has_distance: boolean;
  has_duration: boolean;
  is_archived: boolean;
  description?: string;
}

export function useFitness() {
  const [exercises, setExercises] = useState<FitnessExercise[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [challenges, setChallenges] = useState<FitnessChallenge[]>([]);
  const [prs, setPrs] = useState<FitnessPR[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFitnessData = useCallback(async () => {
    setLoading(true);
    try {
      const [exRes, woRes, chRes, prRes] = await Promise.all([
        fetch('/api/fitness/exercises'),
        fetch('/api/fitness/workouts?limit=50'),
        fetch('/api/fitness/challenges'),
        fetch('/api/fitness/prs')
      ]);
      
      if (exRes.ok) setExercises(await exRes.json());
      if (woRes.ok) {
        const data = await woRes.json();
        // API returns { workouts: [...] }, normalize it
        setWorkouts(Array.isArray(data) ? data : (data.workouts || []));
      }
      if (chRes.ok) setChallenges(await chRes.json());
      if (prRes.ok) setPrs(await prRes.json());
    } catch (error) {
      console.error('Error fetching fitness data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFitnessData();
  }, [fetchFitnessData]);

  const todayStr = getISTDateString();
  const todayWorkout = workouts.find(w => (w.workout_date || w.date) === todayStr);
  
  // Real streak calculation using IST dates
  const streak = (() => {
    if (!workouts.length) return 0;
    const dates = [...new Set(workouts.map(w => w.workout_date || w.date || ''))].filter(Boolean).sort().reverse();
    const yesterday = getISTDateString(new Date(Date.now() - 86400000));
    if (dates[0] !== todayStr && dates[0] !== yesterday) return 0;
    let s = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
      if (diff === 1) s++;
      else break;
    }
    return s;
  })();

  // Real weekly stats using IST
  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgo = getISTDateString(weekAgoDate);
  const thisWeekWorkouts = workouts.filter(w => (w.workout_date || w.date || '') >= weekAgo);
  const weeklyStats = {
    count: thisWeekWorkouts.length,
    minutes: thisWeekWorkouts.reduce((sum, w) => sum + (w.duration_min || 0), 0),
  };

  const logWorkout = async (data: Omit<WorkoutSession, 'id' | 'created_at'> & { sets?: Partial<WorkoutSet>[] }) => {
    const res = await fetch('/api/fitness/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log workout');
    const workout = await res.json();
    setWorkouts(prev => [workout, ...prev]);
    return workout;
  };

  const updateWorkout = async (id: string, data: Partial<WorkoutSession>) => {
    const res = await fetch(`/api/fitness/workouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update workout');
    const updated = await res.json();
    setWorkouts(prev => prev.map(w => w.id === id ? updated : w));
    return updated;
  };

  const deleteWorkout = async (id: string) => {
    const res = await fetch(`/api/fitness/workouts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete workout');
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const createChallenge = async (data: Omit<FitnessChallenge, 'id'>) => {
    const res = await fetch('/api/fitness/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create challenge');
    const challenge = await res.json();
    setChallenges(prev => [challenge, ...prev]);
    return challenge;
  };

  const updateChallenge = async (id: string, data: Partial<FitnessChallenge>) => {
    const res = await fetch(`/api/fitness/challenges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update challenge');
    const updated = await res.json();
    setChallenges(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const logPR = async (data: { exercise_name: string; pr_type: string; value: number; achieved_at: string }) => {
    const res = await fetch('/api/fitness/prs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log PR');
    const pr = await res.json();
    setPrs(prev => {
      const idx = prev.findIndex(p => p.exercise_name === data.exercise_name && p.pr_type === data.pr_type);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = pr;
        return updated;
      }
      return [pr, ...prev];
    });
    return pr;
  };

  const getProgressionSuggestion = useCallback((exerciseName: string) => {
    const exerciseWorkouts = workouts
      .filter(w => w.sets?.some(s => s.exercise_name === exerciseName))
      .sort((a, b) => new Date(b.workout_date || b.date || '').getTime() - new Date(a.workout_date || a.date || '').getTime())
      .slice(0, 5);

    if (exerciseWorkouts.length === 0) {
      return { message: "No recent data for this exercise." };
    }

    const mostRecent = exerciseWorkouts[0];
    const lastSets = (mostRecent.sets || []).filter(s => s.exercise_name === exerciseName);
    if (!lastSets.length) {
      return { message: "No sets found in recent workout." };
    }
    
    const lastSet = lastSets[0];
    const daysSince = Math.floor((new Date().getTime() - new Date(mostRecent.workout_date || mostRecent.date || '').getTime()) / (1000 * 3600 * 24));

    let multiplier = 1;
    if (daysSince <= 2) multiplier = 1.10;
    else if (daysSince <= 5) multiplier = 1.05;
    else if (daysSince <= 7) multiplier = 1.0;
    else multiplier = 0.95;

    const suggestion: any = { message: "Suggested progression based on previous session." };
    if (lastSet.reps) suggestion.reps = Math.round(lastSet.reps * multiplier);
    if (lastSet.weight_kg) suggestion.weight_kg = Math.round(lastSet.weight_kg * multiplier * 2) / 2;
    if (lastSet.distance_km) suggestion.distance_km = Math.round(lastSet.distance_km * multiplier * 2) / 2;
    if (lastSet.duration_min) suggestion.duration_min = Math.round(lastSet.duration_min * multiplier / 5) * 5;

    return suggestion;
  }, [workouts]);

  return {
    exercises,
    workouts,
    challenges,
    prs,
    loading,
    todayWorkout,
    streak,
    weeklyStats,
    getProgressionSuggestion,
    logWorkout,
    updateWorkout,
    updateChallenge,
    createChallenge,
    deleteWorkout,
    logPR,
    refetch: fetchFitnessData
  };
}
