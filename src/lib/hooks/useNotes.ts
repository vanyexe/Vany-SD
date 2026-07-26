'use client'

import { useState, useCallback, useEffect } from 'react'

export interface Note {
  id: string
  title: string
  content: any
  tags: string[]
  is_pinned: boolean
  is_favorite: boolean
  color?: string
  created_at: string
  updated_at: string
  [key: string]: any
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      const data = await res.json()
      setNotes(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const createNote = async (noteData: Partial<Note>) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      })
      if (!res.ok) throw new Error('Failed to create note')
      const newNote = await res.json()
      setNotes(prev => [newNote, ...prev])
      return newNote
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const previousNotes = [...notes]
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update note')
      const updatedNote = await res.json()
      setNotes(prev => prev.map(n => n.id === id ? updatedNote : n))
      return updatedNote
    } catch (err: any) {
      setNotes(previousNotes)
      setError(err.message)
      throw err
    }
  }

  const deleteNote = async (id: string) => {
    const previousNotes = [...notes]
    setNotes(prev => prev.filter(n => n.id !== id))
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete note')
    } catch (err: any) {
      setNotes(previousNotes)
      setError(err.message)
      throw err
    }
  }

  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    return updateNote(id, { is_pinned: !note.is_pinned })
  }

  const toggleFavorite = async (id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    return updateNote(id, { is_favorite: !note.is_favorite })
  }

  const searchNotes = (query: string) => {
    if (!query) return notes
    const lowerQuery = query.toLowerCase()
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleFavorite,
    searchNotes,
    refetch: fetchNotes
  }
}
