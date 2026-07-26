'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, History, Terminal, Flame, Dumbbell, Trophy, CheckCircle2, FileText, Map, Film, BookOpen, Target, Clock, Activity } from 'lucide-react'

type TimelineEvent = {
  id: string; user_id: string; event_type: string; module: string;
  title: string; description?: string; metadata: any;
  icon: string; color: string; event_date: string; created_at: string;
}

const MODULE_COLORS: Record<string, string> = {
  dsa: '#5BA0D0', habits: '#3FA793', fitness: '#C4675A',
  achievements: '#D6A24C', tasks: '#3FA793', notes: '#7C5CBF',
  phases: '#5BA0D0', trailer: '#D6A24C', journal: '#7C5CBF',
  goals: '#3FA793', focus: '#D6A24C'
}

function getModuleIcon(module: string, size = 13) {
  switch ((module || '').toLowerCase()) {
    case 'dsa': return <Terminal size={size} />;
    case 'habits': return <Flame size={size} />;
    case 'fitness': return <Dumbbell size={size} />;
    case 'achievements': return <Trophy size={size} />;
    case 'tasks': return <CheckCircle2 size={size} />;
    case 'notes': return <FileText size={size} />;
    case 'phases': return <Map size={size} />;
    case 'trailer': return <Film size={size} />;
    case 'journal': return <BookOpen size={size} />;
    case 'goals': return <Target size={size} />;
    case 'focus': return <Clock size={size} />;
    default: return <Activity size={size} />;
  }
}

const MODULES = ['All', 'DSA', 'Habits', 'Fitness', 'Achievements', 'Tasks', 'Notes', 'Journal', 'Goals', 'Focus']
const DATERANGES = ['This Week', 'This Month', 'Last 3 Months', 'All Time']

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [module, setModule] = useState('All')
  const [dateRange, setDateRange] = useState('This Week')
  
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchEvents = useCallback(async (reset = false) => {
    setLoading(true)
    const currentOffset = reset ? 0 : offset
    
    // Calculate dates
    let from = ''
    let to = ''
    const now = new Date()
    if (dateRange === 'This Week') {
      const w = new Date(now)
      w.setDate(now.getDate() - 7)
      from = w.toISOString()
    } else if (dateRange === 'This Month') {
      const m = new Date(now)
      m.setMonth(now.getMonth() - 1)
      from = m.toISOString()
    } else if (dateRange === 'Last 3 Months') {
      const m3 = new Date(now)
      m3.setMonth(now.getMonth() - 3)
      from = m3.toISOString()
    }

    const modParam = module === 'All' ? '' : module.toLowerCase()
    
    try {
      const res = await fetch(`/api/timeline?module=${modParam}&search=${debouncedSearch}&from=${from}&to=${to}&limit=20&offset=${currentOffset}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(prev => reset ? data.events : [...prev, ...data.events])
        setTotal(data.total)
        setHasMore(data.hasMore)
        if (reset) setOffset(20)
        else setOffset(prev => prev + 20)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [module, debouncedSearch, dateRange, offset])

  useEffect(() => {
    fetchEvents(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, debouncedSearch, dateRange])

  useEffect(() => {
    if (loading || !hasMore) return
    const callback: IntersectionObserverCallback = (entries) => {
      if (entries[0].isIntersecting) {
        fetchEvents(false)
      }
    }
    observerRef.current = new IntersectionObserver(callback)
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)
    
    return () => observerRef.current?.disconnect()
  }, [loading, hasMore, fetchEvents])

  // Group events by date
  const groupedEvents: Record<string, TimelineEvent[]> = {}
  events.forEach(ev => {
    const d = new Date(ev.event_date)
    const dStr = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    let key = dStr
    const today = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    if (dStr === today) key = 'Today'
    else if (dStr === yesterday) key = 'Yesterday'
    
    if (!groupedEvents[key]) groupedEvents[key] = []
    groupedEvents[key].push(ev)
  })

  return (
    <div className="min-h-dvh flex flex-col bg-ink">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 pb-16">
        
        {/* Header */}
        <div className="px-5 pt-10 pb-6">
          <h1 className="font-display text-3xl font-semibold text-primary mb-2 flex items-center gap-2.5">
            <History className="text-jade" size={30} />
            <span>Life Timeline</span>
          </h1>
          <p className="text-secondary text-sm font-mono">A searchable history of everything you do in Yatra</p>
        </div>

        {/* Filter Bar (Sticky) */}
        <div className="sticky top-0 z-20 bg-ink/90 backdrop-blur-md px-5 py-4 border-b border-border flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input w-full pl-9 py-2 text-sm"
              />
            </div>
            <div className="text-xs font-mono text-muted whitespace-nowrap">
              {total} events
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
            {MODULES.map(m => (
              <button
                key={m}
                onClick={() => setModule(m)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  module === m ? 'bg-jade text-ink font-medium' : 'bg-surface text-secondary hover:bg-surface-raised border border-border'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
            {DATERANGES.map(dr => (
              <button
                key={dr}
                onClick={() => setDateRange(dr)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  dateRange === dr ? 'bg-primary text-ink' : 'bg-surface text-secondary hover:bg-surface-raised border border-border'
                }`}
              >
                {dr}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Feed */}
        <div className="flex-1 px-5 py-6 space-y-8">
          {events.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-muted text-sm">Your timeline is empty. Start using Yatra and your activity will appear here!</p>
            </div>
          )}

          {Object.entries(groupedEvents).map(([dateLabel, dayEvents]) => (
            <div key={dateLabel} className="space-y-4">
              <h2 className="font-mono text-xs font-bold text-muted uppercase tracking-wider">{dateLabel}</h2>
              <div className="space-y-4 ml-2">
                {dayEvents.map((ev, i) => {
                  const color = ev.color || MODULE_COLORS[ev.module] || '#888'
                  const moduleIcon = getModuleIcon(ev.module)
                  
                  // formatting time
                  const t = new Date(ev.event_date)
                  const diff = Date.now() - t.getTime()
                  let timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  if (diff < 86400000 && dateLabel === 'Today') {
                    const h = Math.floor(diff / 3600000)
                    if (h > 0) timeStr = `${h}h ago`
                    else {
                      const m = Math.floor(diff / 60000)
                      if (m > 0) timeStr = `${m}m ago`
                      else timeStr = 'Just now'
                    }
                  }

                  return (
                    <div key={ev.id} className="relative flex gap-4 animate-fade-in group">
                      <div className="relative flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full mt-1.5 relative z-10 border-2 border-ink" style={{ backgroundColor: color }} />
                        {i !== dayEvents.length - 1 && (
                          <div className="w-0.5 h-full absolute top-3" style={{ backgroundColor: color, opacity: 0.3 }} />
                        )}
                      </div>
                      
                      <div className="card-raised flex-1 p-4 mb-2 hover:border-border transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="badge px-2 py-0.5 text-[10px] flex items-center gap-1.5 border font-mono" style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30` }}>
                              {moduleIcon} <span className="capitalize">{ev.module}</span>
                            </span>
                            <span className="text-[10px] font-mono text-muted">{timeStr}</span>
                          </div>
                        </div>
                        <h3 className="font-body text-sm font-medium text-primary mb-1">{ev.title}</h3>
                        {ev.description && (
                          <p className="text-xs text-muted mb-2">{ev.description}</p>
                        )}
                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ev.module === 'dsa' && ev.metadata.difficulty && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                ev.metadata.difficulty === 'easy' ? 'text-jade border-jade/30 bg-jade/5' :
                                ev.metadata.difficulty === 'medium' ? 'text-gold border-gold/30 bg-gold/5' :
                                'text-brick border-brick/30 bg-brick/5'
                              }`}>
                                {String(ev.metadata.difficulty)}
                              </span>
                            )}
                            {ev.module === 'fitness' && ev.metadata.duration_min && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface-raised text-secondary">
                                {String(ev.metadata.duration_min)} min
                              </span>
                            )}
                            {ev.module === 'achievements' && ev.metadata.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface-raised text-secondary">
                                {String(ev.metadata.category)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-jade border-t-transparent animate-spin" />
              ) : (
                <button onClick={() => fetchEvents(false)} className="btn btn-ghost btn-sm text-muted">
                  Load More Events
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
