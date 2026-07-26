'use client';
import { useState, useEffect, useCallback } from 'react';

export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  target_date?: string;
  sort_order?: number;
};

export type Goal = {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  target_date?: string;
  icon?: string;
  color: string;
  status: 'active' | 'completed' | 'paused';
  progress_pct: number;
  auto_track: boolean;
  track_module?: string;
  track_metric?: string;
  track_target?: number;
  track_current?: number;
  milestones: Milestone[];
  created_at?: string;
};

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals');
      if (!res.ok) throw new Error('Failed to fetch goals');
      const json = await res.json();
      // API returns { data: Goal[] }
      const list: Goal[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      setGoals(list.map(g => ({ ...g, milestones: g.milestones ?? [] })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // ── Create ─────────────────────────────────────────────────
  const createGoal = useCallback(async (data: Partial<Goal>): Promise<Goal> => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to create goal');
    }
    const json = await res.json();
    const newGoal: Goal = { ...(json.data ?? json), milestones: [] };
    setGoals(prev => [newGoal, ...prev]);
    return newGoal;
  }, []);

  // ── Update ─────────────────────────────────────────────────
  const updateGoal = useCallback(async (id: string, data: Partial<Goal>): Promise<Goal> => {
    // Optimistic
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to update goal');
      }
      const json = await res.json();
      const updated: Goal = { ...(json.data ?? json) };
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updated, milestones: g.milestones } : g));
      return updated;
    } catch (e) {
      await fetchGoals(); // revert on failure
      throw e;
    }
  }, [fetchGoals]);

  // ── Delete ─────────────────────────────────────────────────
  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    setGoals(prev => prev.filter(g => g.id !== id));
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to delete goal');
      }
    } catch (e) {
      await fetchGoals();
      throw e;
    }
  }, [fetchGoals]);

  // ── Milestones ─────────────────────────────────────────────
  const addMilestone = useCallback(async (goalId: string, data: { title: string; target_date?: string }): Promise<Milestone> => {
    const res = await fetch(`/api/goals/${goalId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to add milestone');
    }
    const json = await res.json();
    const milestone: Milestone = json.data ?? json;
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, milestones: [...g.milestones, milestone] } : g
    ));
    return milestone;
  }, []);

  const toggleMilestone = useCallback(async (goalId: string, milestoneId: string): Promise<void> => {
    // Optimistic toggle
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map(m =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const donePct = milestones.length
        ? Math.round(milestones.filter(m => m.completed).length / milestones.length * 100)
        : g.progress_pct;
      return { ...g, milestones, progress_pct: donePct };
    }));

    const goal = goals.find(g => g.id === goalId);
    const milestone = goal?.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    try {
      const res = await fetch(`/api/goals/${goalId}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: milestoneId, completed: !milestone.completed }),
      });
      if (!res.ok) throw new Error('Failed to toggle milestone');
    } catch {
      await fetchGoals(); // revert
    }
  }, [goals, fetchGoals]);

  const deleteMilestone = useCallback(async (goalId: string, milestoneId: string): Promise<void> => {
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) } : g
    ));
    try {
      const res = await fetch(`/api/goals/${goalId}/milestones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: milestoneId }),
      });
      if (!res.ok) throw new Error('Failed to delete milestone');
    } catch {
      await fetchGoals();
    }
  }, [fetchGoals]);

  // ── Sync auto-tracked goals ────────────────────────────────
  const syncAutoGoals = useCallback(async () => {
    try {
      await fetch('/api/goals/sync', { method: 'POST' });
      await fetchGoals();
    } catch (e) {
      console.error('syncAutoGoals error:', e);
    }
  }, [fetchGoals]);

  // ── Derived ────────────────────────────────────────────────
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pausedGoals = goals.filter(g => g.status === 'paused');

  return {
    goals,
    loading,
    error,
    activeGoals,
    completedGoals,
    pausedGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    syncAutoGoals,
    refetch: fetchGoals,
  };
}
