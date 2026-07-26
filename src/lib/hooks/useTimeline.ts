'use client';
import { useState, useEffect, useCallback } from 'react';

export interface TimelineEvent {
  id: string;
  event_type: string;
  module: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  icon: string;
  color: string;
  event_date: string;
  created_at: string;
}

export function useTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  const fetchTimeline = useCallback(async (params?: { module?: string; search?: string; from?: string; to?: string }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', '0');
      if (params?.module) qs.set('module', params.module);
      if (params?.search) qs.set('search', params.search);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);

      const res = await fetch(`/api/timeline?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // API returns { events: [...], total, hasMore } 
        const evts = data.events || data.items || [];
        setEvents(evts);
        setHasMore(data.hasMore || false);
        setTotal(data.total || 0);
        setOffset(PAGE_SIZE);
      }
    } catch (e) {
      console.error('Failed to fetch timeline:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const fetchMore = useCallback(async (params?: { module?: string; search?: string; from?: string; to?: string }) => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(offset));
      if (params?.module) qs.set('module', params.module);
      if (params?.search) qs.set('search', params.search);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);

      const res = await fetch(`/api/timeline?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const evts = data.events || data.items || [];
        setEvents(prev => [...prev, ...evts]);
        setHasMore(data.hasMore || false);
        setOffset(prev => prev + PAGE_SIZE);
      }
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, offset]);

  const writeEvent = async (data: {
    event_type: string;
    module: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    event_date?: string;
    metadata?: Record<string, any>;
  }) => {
    const res = await fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to write timeline event');
    const result = await res.json();
    const newEvent: TimelineEvent = result.data || result;
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  };

  const refetchWithParams = useCallback((params: { module?: string; search?: string; from?: string; to?: string }) => {
    fetchTimeline(params);
  }, [fetchTimeline]);

  return {
    events,
    loading,
    hasMore,
    total,
    fetchMore,
    refetch: fetchTimeline,
    refetchWithParams,
    writeEvent,
  };
}
