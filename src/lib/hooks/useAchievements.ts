'use client';
import { useState, useEffect, useCallback } from 'react';

export interface VaultAchievement {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  category?: { id: string; name: string; icon: string; color: string };
  achievement_date: string;
  organization?: string;
  event_name?: string;
  position?: string;
  team_members?: string[];
  technologies?: string[];
  skills_learned?: string[];
  tags?: string[];
  personal_reflection?: string;
  lessons_learned?: string;
  future_improvements?: string;
  is_featured: boolean;
  files?: { id: string; file_name: string; file_type: string; public_url?: string }[];
  // Flattened from category for convenience
  category_icon?: string;
  category_name?: string;
}

export interface AchievementCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default?: boolean;
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<VaultAchievement[]>([]);
  const [categories, setCategories] = useState<AchievementCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [achRes, catRes] = await Promise.all([
        fetch(`/api/achievements?limit=${PAGE_SIZE}&offset=0`),
        fetch('/api/achievements/categories')
      ]);

      if (achRes.ok) {
        const data = await achRes.json();
        // Normalize achievements to add category_icon/category_name
        const achList = (data.achievements || []).map((a: any) => ({
          ...a,
          category_icon: a.category?.icon || '🏆',
          category_name: a.category?.name || '',
        }));
        setAchievements(achList);
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
        setOffset(PAGE_SIZE);
      }

      if (catRes.ok) {
        setCategories(await catRes.json());
      }
    } catch (e) {
      console.error('Error fetching achievements:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const fetchMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/achievements?limit=${PAGE_SIZE}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const achList = (data.achievements || []).map((a: any) => ({
          ...a,
          category_icon: a.category?.icon || '🏆',
          category_name: a.category?.name || '',
        }));
        setAchievements(prev => [...prev, ...achList]);
        setHasMore(data.hasMore || false);
        setOffset(prev => prev + PAGE_SIZE);
      }
    } finally {
      setLoading(false);
    }
  };

  const createAchievement = async (data: Omit<VaultAchievement, 'id'>) => {
    const res = await fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create achievement');
    const created = await res.json();
    const normalized = {
      ...created,
      category_icon: created.category?.icon || '🏆',
      category_name: created.category?.name || '',
    };
    setAchievements(prev => [normalized, ...prev]);
    setTotal(prev => prev + 1);
    return normalized;
  };

  const updateAchievement = async (id: string, data: Partial<VaultAchievement>) => {
    const res = await fetch(`/api/achievements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update achievement');
    const updated = await res.json();
    setAchievements(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
    return updated;
  };

  const deleteAchievement = async (id: string) => {
    const res = await fetch(`/api/achievements/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete achievement');
    setAchievements(prev => prev.filter(a => a.id !== id));
    setTotal(prev => prev - 1);
  };
  
  const uploadFile = async (achievementId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('achievement_id', achievementId);
    const res = await fetch('/api/achievements/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  };

  const recentAchievements = achievements.slice(0, 5);
  
  const stats = {
    total,
    thisYear: achievements.filter(a => a.achievement_date?.startsWith(new Date().getFullYear().toString())).length,
    featured: achievements.filter(a => a.is_featured).length,
    categories: [...new Set(achievements.map(a => a.category_id).filter(Boolean))].length,
  };

  return {
    achievements,
    categories,
    total,
    loading,
    hasMore,
    stats,
    recentAchievements,
    fetchMore,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    uploadFile,
    refetch: fetchInitial
  };
}
