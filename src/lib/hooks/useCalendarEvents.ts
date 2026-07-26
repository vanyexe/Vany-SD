import { useState, useEffect } from 'react'

export type CalendarEvent = {
  id: string
  title: string
  description?: string
  event_date: string
  color: string
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/calendar-events')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const createEvent = async (event: Partial<CalendarEvent>) => {
    const res = await fetch('/api/calendar-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    })
    if (res.ok) {
      const data = await res.json()
      setEvents(prev => [...prev, data.event])
      return data.event
    }
    return null
  }

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    const res = await fetch(`/api/calendar-events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (res.ok) {
      const data = await res.json()
      setEvents(prev => prev.map(e => e.id === id ? data.event : e))
      return data.event
    }
    return null
  }

  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEvents(prev => prev.filter(e => e.id !== id))
      return true
    }
    return false
  }

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchEvents
  }
}
