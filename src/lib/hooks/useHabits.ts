'use client'
import { getISTDateString } from '@/lib/dateUtils';

import { useState, useEffect, useCallback, useMemo } from 'react'
import { HABITS } from '@/lib/data/seed'

export type HabitLog = {
  id: string
  user_id: string
  habit_id: number | string  // number for fixed, UUID string for custom
  log_date: string
  done: boolean
}

export type CustomHabit = {
  id: string        // UUID from DB
  name: string
  icon: string      // Lucide icon name (e.g. 'Star', 'Heart')
  color: string     // hex color
  description?: string
  goal_per_week?: number
  sort_order?: number
}

function getISODate(date: Date): string {
  return getISTDateString(date);
}

function getWeekDates(referenceDate: Date): string[] {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return getISODate(day)
  })
}

function mapHabitId(id: string | number): number {
  if (typeof id === 'number') return id;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 2000000000) + 1000;
}

export function useHabits() {
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  const today = getISODate(new Date())
  const referenceDate = new Date()
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(referenceDate)

  // ─── Fetch all data ───────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const from = getISODate(threeMonthsAgo)
      const to = today

      const [logsRes, customRes] = await Promise.all([
        fetch(`/api/habits?from=${from}&to=${to}`),
        fetch('/api/custom-habits'),
      ])

      const logsData: HabitLog[] = logsRes.ok ? await logsRes.json() : []
      const customData: CustomHabit[] = customRes.ok ? await customRes.json() : []

      setLogs(logsData)
      setCustomHabits(customData)
    } catch (e) {
      console.error('useHabits fetchLogs error:', e)
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // ─── Toggle a habit log ───────────────────────────────────────
  const toggle = useCallback(async (rawHabitId: number | string, date: string) => {
    const habitId = mapHabitId(rawHabitId);
    const existing = logs.find(l => String(l.habit_id) === String(habitId) && l.log_date === date)
    const newDone = existing ? !existing.done : true

    // Optimistic update
    setLogs(prev => {
      const exists = prev.find(l => String(l.habit_id) === String(habitId) && l.log_date === date)
      if (exists) {
        return prev.map(l =>
          String(l.habit_id) === String(habitId) && l.log_date === date
            ? { ...l, done: newDone }
            : l
        )
      }
      return [...prev, { id: `temp_${Date.now()}`, user_id: '', habit_id: habitId, log_date: date, done: newDone }]
    })

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, log_date: date, done: newDone }),
      })
      if (!res.ok) throw new Error('Failed to toggle habit')
      const updated: HabitLog = await res.json()
      setLogs(prev => prev.map(l =>
        String(l.habit_id) === String(habitId) && l.log_date === date ? updated : l
      ))
    } catch (e) {
      console.error('toggle habit error:', e)
      fetchLogs() // revert
    }
  }, [logs, fetchLogs])

  // ─── Custom habits CRUD ───────────────────────────────────────
  const addCustomHabit = useCallback(async (data: Omit<CustomHabit, 'id'>) => {
    const res = await fetch('/api/custom-habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create custom habit')
    const newHabit: CustomHabit = await res.json()
    setCustomHabits(prev => [...prev, newHabit])
    return newHabit
  }, [])

  const deleteCustomHabit = useCallback(async (id: string) => {
    // Optimistic
    setCustomHabits(prev => prev.filter(h => h.id !== id))
    const res = await fetch(`/api/custom-habits/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      fetchLogs() // revert on error
      throw new Error('Failed to delete custom habit')
    }
  }, [fetchLogs])

  // ─── Computed helpers ─────────────────────────────────────────
  const isDone = useCallback((rawHabitId: number | string, date: string) => {
    const habitId = mapHabitId(rawHabitId);
    return logs.find(l => String(l.habit_id) === String(habitId) && l.log_date === date)?.done ?? false
  }, [logs])

  const getStreak = useCallback((habitId: number | string): number => {
    let streak = 0
    const d = new Date()
    while (true) {
      const dateStr = getISODate(d)
      if (isDone(habitId, dateStr)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [isDone])

  const getBestStreak = useCallback((rawHabitId: number | string): number => {
    const habitId = mapHabitId(rawHabitId);
    let best = 0
    let current = 0

    const habitLogs = logs
      .filter(l => String(l.habit_id) === String(habitId) && l.done)
      .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())

    if (habitLogs.length === 0) return 0

    current = 1
    best = 1
    for (let i = 1; i < habitLogs.length; i++) {
      const d1 = new Date(habitLogs[i - 1].log_date)
      const d2 = new Date(habitLogs[i].log_date)
      const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        current++
        if (current > best) best = current
      } else if (diffDays > 1) {
        current = 1
      }
    }

    return best
  }, [logs])

  const todayAllDone = useMemo(() => {
    const defaultDone = HABITS.every(h => isDone(h.id, today));
    const customDone = customHabits.length > 0 ? customHabits.every(h => isDone(h.id, today)) : true;
    return defaultDone && customDone;
  }, [isDone, today, customHabits])

  return {
    weekDates,
    today,
    weekOffset,
    setWeekOffset,
    toggle,
    isDone,
    getStreak,
    getBestStreak,
    todayAllDone,
    loading,
    logs,
    customHabits,
    addCustomHabit,
    deleteCustomHabit,
    refetch: fetchLogs,
  }
}
