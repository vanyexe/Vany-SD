'use client'
import { getISTDateString } from '@/lib/dateUtils';

import { useState, useEffect, useMemo } from 'react'
import { Plus, LayoutGrid, List, Search, Star, Trash2, X, Calendar as CalendarIcon, Loader2, Trophy, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

type AchievementCategory = {
  id: string
  name: string
  color: string
  icon: string
}

type Achievement = {
  id: string
  title: string
  description: string
  category_id: string
  category?: AchievementCategory
  achievement_date: string
  organization?: string
  is_featured: boolean
  tags?: string[]
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [categories, setCategories] = useState<AchievementCategory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('All Years')
  const [sortOrder, setSortOrder] = useState<'Newest' | 'Oldest' | 'Alphabetical'>('Newest')

  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [form, setForm] = useState<Partial<Achievement>>({ is_featured: false })
  const [tagInput, setTagInput] = useState('')

  // ── Fetch real data ──
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/achievements')
        if (!res.ok) throw new Error('Failed to load achievements')
        const data = await res.json()
        setAchievements(data.achievements || [])
        setTotal(data.total || 0)

        // Extract unique categories from the achievements
        const catRes = await fetch('/api/achievements/categories').catch(() => null)
        if (catRes && catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData || [])
        } else {
          // Derive categories from achievements
          const catMap: Record<string, AchievementCategory> = {}
          for (const a of data.achievements || []) {
            if (a.category) catMap[a.category.id] = a.category
          }
          setCategories(Object.values(catMap))
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredAchievements = useMemo(() => {
    let result = [...achievements]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.organization?.toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== 'All') {
      result = result.filter(a => a.category?.name === categoryFilter)
    }
    if (yearFilter !== 'All Years') {
      result = result.filter(a => a.achievement_date?.startsWith(yearFilter))
    }
    result.sort((a, b) => {
      if (sortOrder === 'Newest') return new Date(b.achievement_date).getTime() - new Date(a.achievement_date).getTime()
      if (sortOrder === 'Oldest') return new Date(a.achievement_date).getTime() - new Date(b.achievement_date).getTime()
      return a.title.localeCompare(b.title)
    })
    return result
  }, [achievements, searchQuery, categoryFilter, yearFilter, sortOrder])

  // Category counts from real data
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of achievements) {
      if (a.category?.name) map[a.category.name] = (map[a.category.name] || 0) + 1
    }
    return map
  }, [achievements])

  const stats = {
    total: achievements.length,
    thisYear: achievements.filter(a => a.achievement_date?.startsWith(new Date().getFullYear().toString())).length,
    featured: achievements.filter(a => a.is_featured).length,
    categories: Object.keys(categoryCounts).length,
  }

  // Real save to API
  const handleSave = async () => {
    if (!form.title?.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || '',
          category_id: form.category_id || categories[0]?.id,
          achievement_date: form.achievement_date || getISTDateString(),
          organization: form.organization || null,
          is_featured: form.is_featured || false,
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      const newA = await res.json()
      setAchievements(prev => [newA, ...prev])
      setTotal(t => t + 1)
      setIsAddModalOpen(false)
      setForm({ is_featured: false })
      setTagInput('')
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Real delete
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this achievement?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/achievements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setAchievements(prev => prev.filter(a => a.id !== id))
      setTotal(t => t - 1)
      setSelectedAchievement(null)
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  const uniqueCategories = [...new Set(achievements.map(a => a.category?.name).filter(Boolean))] as string[]
  const years = [...new Set(achievements.map(a => a.achievement_date?.slice(0, 4)).filter(Boolean))].sort().reverse()

  return (
    <div className="min-h-dvh bg-ink text-primary pb-12">
      {/* Sticky Header */}
      <div className="border-b border-border bg-surface sticky top-0 z-10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
              <Trophy size={22} className="text-gold" /> Achievement Vault
            </h1>
            <p className="text-secondary text-sm mt-1">Your permanent record of everything you achieve</p>
            <div className="flex flex-wrap gap-4 mt-3 font-mono text-xs text-muted">
              <span>Total: <strong className="text-primary">{stats.total}</strong></span>
              <span>This Year: <strong className="text-primary">{stats.thisYear}</strong></span>
              <span>Featured: <strong className="text-gold">{stats.featured}</strong></span>
              <span>Categories: <strong className="text-primary">{stats.categories}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-raised rounded-lg p-1 border border-border">
              <button onClick={() => setViewMode('grid')} className={clsx('btn btn-icon-sm', viewMode === 'grid' ? 'bg-surface shadow text-primary' : 'text-muted hover:text-primary')}><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode('timeline')} className={clsx('btn btn-icon-sm', viewMode === 'timeline' ? 'bg-surface shadow text-primary' : 'text-muted hover:text-primary')}><List size={16} /></button>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-jade"><Plus size={16} /> Add Achievement</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 overflow-x-auto flex gap-2">
            <button onClick={() => setCategoryFilter('All')} className={clsx('px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border', categoryFilter === 'All' ? 'bg-surface-raised border-border text-primary' : 'border-transparent text-secondary hover:bg-surface-raised/50')}>
              All
            </button>
            {uniqueCategories.map(catName => (
              <button key={catName} onClick={() => setCategoryFilter(catName)} className={clsx('px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border', categoryFilter === catName ? 'bg-surface-raised border-border text-primary' : 'border-transparent text-secondary hover:bg-surface-raised/50')}>
                {catName} ({categoryCounts[catName] || 0})
              </button>
            ))}
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-9 text-sm py-1.5" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="input text-sm py-1.5 w-auto" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option>All Years</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <select className="input text-sm py-1.5 w-auto" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
              <option>Newest</option>
              <option>Oldest</option>
              <option>Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="card h-48 skeleton" />)}
          </div>
        ) : error ? (
          <div className="text-center py-20 card">
            <AlertTriangle size={40} className="mx-auto text-brick mb-4" />
            <p className="text-brick">{error}</p>
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Trophy size={56} className="mx-auto text-muted opacity-30" />
            <h3 className="font-display text-xl text-primary">
              {achievements.length === 0 ? 'No achievements yet' : 'No results found'}
            </h3>
            <p className="text-muted text-sm">
              {achievements.length === 0 ? 'Add your first achievement — a hackathon win, certificate, or any milestone worth remembering.' : 'Try adjusting your filters.'}
            </p>
            {achievements.length === 0 && (
              <button onClick={() => setIsAddModalOpen(true)} className="btn btn-jade mt-2">
                <Plus size={16} /> Add First Achievement
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredAchievements.map(a => {
              const cat = a.category
              return (
                <div key={a.id} onClick={() => setSelectedAchievement(a)} className="card card-interactive overflow-hidden flex flex-col relative cursor-pointer hover:scale-[1.01] transition-transform">
                  <div className="h-1 w-full absolute top-0 left-0" style={{ backgroundColor: cat?.color || 'var(--color-border)' }} />
                  <div className="p-5 flex-1 flex flex-col pt-6">
                    <div className="flex justify-between items-start mb-3">
                      {cat && (
                        <span className="badge text-[10px] font-mono" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          {cat.icon} {cat.name}
                        </span>
                      )}
                      {a.is_featured && <Star size={15} className="text-gold fill-gold" />}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-primary leading-tight mb-1">{a.title}</h3>
                    <div className="text-xs font-mono text-muted flex items-center gap-1 mb-3">
                      <CalendarIcon size={11} /> {a.achievement_date}
                    </div>
                    {a.organization && <div className="text-sm text-secondary mb-2">{a.organization}</div>}
                    <p className="text-sm text-secondary line-clamp-2 flex-1">{a.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto animate-fade-in relative">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />
            {years.map(year => (
              <div key={year} className="relative mb-8">
                <div className="inline-flex items-center bg-surface border border-border px-3 py-1 rounded-full text-sm font-bold text-primary mb-4 ml-8">{year}</div>
                <div className="space-y-4">
                  {filteredAchievements.filter(a => a.achievement_date?.startsWith(year)).map(a => (
                    <div key={a.id} className="relative pl-10 flex group cursor-pointer" onClick={() => setSelectedAchievement(a)}>
                      <div className="absolute left-[11px] top-4 w-2.5 h-2.5 rounded-full border-2 border-surface" style={{ backgroundColor: a.category?.color || 'var(--color-border)' }} />
                      <div className="card p-4 flex-1 group-hover:border-secondary transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-primary">{a.title}</h4>
                            <div className="text-xs text-muted font-mono mt-1">{a.achievement_date} {a.category && `• ${a.category.name}`}</div>
                          </div>
                          {a.is_featured && <Star size={14} className="text-gold fill-gold" />}
                        </div>
                        {a.organization && <div className="text-sm text-secondary mt-1">{a.organization}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedAchievement(null)} />
          <div className="w-full max-w-md bg-surface border-l border-border overflow-y-auto p-6 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                {selectedAchievement.category && (
                  <span className="badge text-[10px] mb-2 block w-fit" style={{ backgroundColor: `${selectedAchievement.category.color}20`, color: selectedAchievement.category.color }}>
                    {selectedAchievement.category.icon} {selectedAchievement.category.name}
                  </span>
                )}
                <h2 className="font-display text-xl font-bold text-primary">{selectedAchievement.title}</h2>
                <div className="text-xs font-mono text-muted mt-1">{selectedAchievement.achievement_date}</div>
              </div>
              <button onClick={() => setSelectedAchievement(null)} className="btn btn-icon-sm btn-ghost"><X size={18}/></button>
            </div>
            {selectedAchievement.organization && <p className="text-secondary text-sm">{selectedAchievement.organization}</p>}
            {selectedAchievement.description && <p className="text-secondary text-sm whitespace-pre-wrap">{selectedAchievement.description}</p>}
            {selectedAchievement.is_featured && (
              <span className="badge badge-gold flex items-center gap-1 w-fit"><Star size={10} className="fill-gold" /> Featured</span>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => handleDelete(selectedAchievement.id)}
                disabled={deleting}
                className="btn btn-danger btn-sm"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content modal-lg p-6 md:p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-xl text-primary font-bold">New Achievement</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-icon-sm btn-ghost"><X size={16}/></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Title *</label>
                  <input className="input w-full" required placeholder="e.g. Won Global Hackathon" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input w-full" value={form.category_id || ''} onChange={e => setForm({...form, category_id: e.target.value})}>
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input w-full" rows={3} placeholder="What did you achieve? What made it special?" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input w-full" value={form.achievement_date || ''} onChange={e => setForm({...form, achievement_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Organization</label>
                  <input className="input w-full" placeholder="Company, University..." value={form.organization || ''} onChange={e => setForm({...form, organization: e.target.value})} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border" checked={!!form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} />
                <span className="text-sm text-primary flex items-center gap-1"><Star size={14} className="text-gold"/> Feature this achievement</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title?.trim()} className="btn btn-jade">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Achievement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
