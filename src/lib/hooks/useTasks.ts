'use client'

import { useState, useCallback, useEffect } from 'react'

export interface TaskFilter {
  status?: string
  priority?: string
  category_id?: string
  tag?: string
  is_favorite?: boolean
  search?: string
  parent_id?: string | null
}

export interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  category_id?: string
  tags: string[]
  due_date?: string
  due_time?: string
  is_favorite: boolean
  is_pinned: boolean
  parent_id?: string
  sort_order: number
  progress: number
  [key: string]: any
}

export function useTasks(filter?: TaskFilter) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          } else if (value === null && key === 'parent_id') {
            params.append(key, 'null')
          }
        })
      }

      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filter)])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async (taskData: Partial<Task>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      if (!res.ok) throw new Error('Failed to create task')
      const newTask = await res.json()
      setTasks(prev => [newTask, ...prev])
      return newTask
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const previousTasks = [...tasks]
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update task')
      const updatedTask = await res.json()
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t))
      return updatedTask
    } catch (err: any) {
      setTasks(previousTasks)
      setError(err.message)
      throw err
    }
  }

  const deleteTask = async (id: string) => {
    const previousTasks = [...tasks]
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete task')
    } catch (err: any) {
      setTasks(previousTasks)
      setError(err.message)
      throw err
    }
  }

  const duplicateTask = async (id: string) => {
    const taskToDuplicate = tasks.find(t => t.id === id)
    if (!taskToDuplicate) return
    const { id: _, created_at, updated_at, ...rest } = taskToDuplicate
    return createTask({ ...rest, title: `${rest.title} (Copy)` })
  }

  const archiveTask = async (id: string) => {
    return updateTask(id, { status: 'archived' })
  }

  const restoreTask = async (id: string) => {
    return updateTask(id, { status: 'todo' })
  }

  const toggleFavorite = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    return updateTask(id, { is_favorite: !task.is_favorite })
  }

  const togglePin = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    return updateTask(id, { is_pinned: !task.is_pinned })
  }

  const reorderTasks = async (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks)
    // Send updates for order logic
    try {
      await Promise.all(
        reorderedTasks.map((t, i) => 
          fetch(`/api/tasks/${t.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: i })
          })
        )
      )
    } catch (err: any) {
      setError(err.message)
      fetchTasks()
    }
  }

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    archiveTask,
    restoreTask,
    toggleFavorite,
    togglePin,
    reorderTasks,
    refetch: fetchTasks
  }
}
