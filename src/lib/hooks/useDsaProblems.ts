'use client'

import { useState, useEffect, useCallback } from 'react'
import { DSA_TOPICS } from '@/lib/data/seed'

export type DsaProblem = {
  id: string
  user_id: string
  title: string
  topic_id: string
  difficulty: 'easy' | 'medium' | 'hard'
  platform_url?: string | null
  date_solved: string
  next_review_date: string
  review_count: number
  created_at: string
  confidence_rating?: number | null
  time_taken_minutes?: number | null
  companies?: string | null
  notes?: string | null
}

export function useDsaProblems() {
  const [problems, setProblems] = useState<DsaProblem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dsa')
      if (!res.ok) throw new Error('Failed to fetch problems')
      const data = await res.json()
      setProblems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProblems() }, [fetchProblems])

  const logProblem = useCallback(async (input: {
    topic_id: string
    title: string
    difficulty: 'easy' | 'medium' | 'hard'
    platform_url?: string
    confidence_rating?: number
    time_taken_minutes?: number
    companies?: string
    notes?: string
  }) => {
    const res = await fetch('/api/dsa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to log problem')
    const newProblem: DsaProblem = await res.json()
    setProblems(prev => [newProblem, ...prev])
    return newProblem
  }, [])

  const markReviewed = useCallback(async (problemId: string) => {
    const res = await fetch(`/api/dsa/${problemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ review_count_increment: true }) })
    if (!res.ok) throw new Error('Failed to mark reviewed')
    const updated: DsaProblem = await res.json()
    setProblems(prev => prev.map(p => p.id === problemId ? updated : p))
  }, [])

  const editProblem = useCallback(async (problemId: string, updates: Partial<DsaProblem>) => {
    const res = await fetch(`/api/dsa/${problemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!res.ok) throw new Error('Failed to edit problem')
    const updated: DsaProblem = await res.json()
    setProblems(prev => prev.map(p => p.id === problemId ? updated : p))
    return updated
  }, [])

  const deleteProblem = useCallback(async (problemId: string) => {
    const res = await fetch(`/api/dsa/${problemId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete problem')
    setProblems(prev => prev.filter(p => p.id !== problemId))
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const dueForReview = problems.filter(p => p.next_review_date <= today)

  const solvedThisWeek = problems.filter(p => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(p.date_solved) >= weekAgo
  }).length

  const countByTopic = DSA_TOPICS.reduce((acc, topic) => {
    acc[topic.id] = problems.filter(p => p.topic_id === topic.id).length
    return acc
  }, {} as Record<string, number>)

  return {
    problems,
    loading,
    error,
    dueForReview,
    solvedThisWeek,
    countByTopic,
    totalSolved: problems.length,
    logProblem,
    markReviewed,
    editProblem,
    deleteProblem,
    refetch: fetchProblems,
  }
}
