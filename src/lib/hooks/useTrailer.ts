'use client'

import { useState, useEffect, useCallback } from 'react'

export type TrailerStage = 'pre-prod' | 'weekend' | 'paused' | 'daily-prod' | 'rough-cut' | 'finished'

export type TrailerTask = {
  id: string
  user_id: string
  title: string
  assignee: string
  stage: TrailerStage
  status: 'todo' | 'in-progress' | 'done'
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  labels?: string[]
  created_at: string
}

export function useTrailer() {
  const [tasks, setTasks] = useState<TrailerTask[]>([])
  const [activeStage, setActiveStage] = useState<TrailerStage>('pre-prod')
  const [loading, setLoading] = useState(true)
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('vany_trailer_deadline')
    if (saved) {
      setDeadlineDate(new Date(saved))
    } else {
      setDeadlineDate(new Date('2027-06-30'))
    }
  }, [])

  const updateDeadline = useCallback((dateStr: string) => {
    localStorage.setItem('vany_trailer_deadline', dateStr)
    setDeadlineDate(new Date(dateStr))
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/trailer')
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data: TrailerTask[] = await res.json()
      setTasks(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = useCallback(async (input: {
    title: string
    assignee: string
    stage: TrailerStage
  }) => {
    const res = await fetch('/api/trailer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to add task')
    const newTask: TrailerTask = await res.json()
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [])

  const updateTask = useCallback(async (taskId: string, updates: Partial<TrailerTask>) => {
    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    try {
      const res = await fetch(`/api/trailer/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update task')
      const updated: TrailerTask = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
    } catch (e) {
      console.error(e)
      fetchTasks() // revert on error
    }
  }, [fetchTasks])

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await fetch(`/api/trailer/${taskId}`, { method: 'DELETE' })
    } catch (e) {
      console.error(e)
      fetchTasks()
    }
  }, [fetchTasks])

  const stageTasks = tasks.filter(t => t.stage === activeStage)
  const todo = stageTasks.filter(t => t.status === 'todo')
  const inProgress = stageTasks.filter(t => t.status === 'in-progress')
  const done = stageTasks.filter(t => t.status === 'done')

  let daysToDeadline = 0
  if (deadlineDate) {
    const end = new Date(deadlineDate)
    end.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    daysToDeadline = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    tasks,
    activeStage,
    setActiveStage,
    todo,
    inProgress,
    done,
    loading,
    addTask,
    updateTask,
    deleteTask,
    daysToDeadline,
    deadlineDate,
    updateDeadline,
    refetch: fetchTasks,
  }
}
