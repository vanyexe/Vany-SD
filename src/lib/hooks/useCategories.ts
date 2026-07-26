'use client'

import { useState, useCallback, useEffect } from 'react'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      setCategories(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const createCategory = async (categoryData: Partial<Category>) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create category')
      }
      const newCategory = await res.json()
      setCategories(prev => [...prev, newCategory])
      return newCategory
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const previousCategories = [...categories]
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update category')
      }
      const updatedCategory = await res.json()
      setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c))
      return updatedCategory
    } catch (err: any) {
      setCategories(previousCategories)
      setError(err.message)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    const previousCategories = [...categories]
    setCategories(prev => prev.filter(c => c.id !== id))
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete category')
      }
    } catch (err: any) {
      setCategories(previousCategories)
      setError(err.message)
      throw err
    }
  }

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories
  }
}
