'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface JournalEntry {
  id?: string;
  entry_date: string;
  title?: string;
  mood?: number;
  energy?: number;
  word_count?: number;
  tags?: string[];
  section_learned?: string;
  section_achievement?: string;
  section_challenges?: string;
  section_tomorrow?: string;
  section_reflection?: string;
  free_content?: string;
  ai_summary?: string;
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJournal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/journal?limit=365');
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : (data.entries || []));
      }
    } catch (e) {
      console.error('Failed to fetch journal:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.entry_date === todayStr);

  // Real streak calculation
  const streak = useMemo(() => {
    if (!entries.length) return 0;
    const dates = entries.map(e => e.entry_date).sort().reverse();
    let s = 0;
    let expected = new Date();
    expected.setHours(0, 0, 0, 0);
    
    // Allow today or yesterday as starting point
    const todayIso = expected.toISOString().slice(0, 10);
    const firstDate = dates[0];
    if (firstDate !== todayIso) {
      // Check if yesterday
      const yesterday = new Date(expected);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = yesterday.toISOString().slice(0, 10);
      if (firstDate !== yesterdayIso) return 0;
      expected = yesterday;
    }

    for (const dateStr of dates) {
      const expectedStr = expected.toISOString().slice(0, 10);
      if (dateStr === expectedStr) {
        s++;
        expected.setDate(expected.getDate() - 1);
      } else {
        break;
      }
    }
    return s;
  }, [entries]);

  const saveEntry = async (date: string, data: Partial<JournalEntry>) => {
    const res = await fetch(`/api/journal/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save journal entry');
    }
    const saved: JournalEntry = await res.json();
    setEntries(prev => {
      const idx = prev.findIndex(e => e.entry_date === date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    });
    return saved;
  };

  const getEntry = useCallback((date: string) => {
    return entries.find(e => e.entry_date === date);
  }, [entries]);

  const deleteEntry = async (date: string) => {
    const res = await fetch(`/api/journal/${date}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete entry');
    setEntries(prev => prev.filter(e => e.entry_date !== date));
  };

  return {
    entries,
    loading,
    todayEntry,
    streak,
    saveEntry,
    getEntry,
    deleteEntry,
    refetch: fetchJournal
  };
}
