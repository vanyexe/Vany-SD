'use client'

import { useState, useEffect, useCallback } from 'react'

export type UserSettings = {
  id: string
  user_id: string
  display_name: string
  start_date: string
  current_phase: number
  phase_progress: number
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      if (!res.ok) {
        const errText = await res.text().catch(() => 'No text');
        console.error('Settings fetch failed:', res.status, errText);
        throw new Error(`Failed to fetch settings: ${res.status} ${errText}`)
      }
      const data: UserSettings = await res.json()
      setSettings(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSettings = useCallback(async (updates: Partial<Pick<UserSettings,
    'current_phase' | 'phase_progress' | 'display_name' | 'start_date'
  >>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update settings')
    const updated: UserSettings = await res.json()
    setSettings(updated)
    return updated
  }, [])

  // Compute day number from start_date
  const dayNumber = settings
    ? Math.max(1, Math.floor(
        (Date.now() - new Date(settings.start_date).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1)
    : 1

  return {
    settings,
    loading,
    dayNumber,
    currentPhase: settings?.current_phase ?? 1,
    phaseProgress: settings?.phase_progress ?? 0,
    updateSettings,
    refetch: fetchSettings,
  }
}
