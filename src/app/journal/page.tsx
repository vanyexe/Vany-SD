'use client'
import { getISTDateString } from '@/lib/dateUtils';

import { useState, useEffect, useMemo, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Edit3, Save, Flame, Hash, Check, Search, BookOpen, X, Loader2, Lightbulb, Trophy, Zap, Target, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

type JournalEntry = {
  date: string
  learned: string
  achievement: string
  challenges: string
  goals: string
  reflection: string
  notes: string
  tags: string[]
  mood: number   // 1-5 (1=very bad, 5=excellent)
  energy: number
  wordCount: number
}

const MOOD_LABELS = ['Very Bad', 'Bad', 'Okay', 'Good', 'Excellent']
const MOOD_COLORS = ['#C4675A', '#E8975A', '#D6A24C', '#5B9BD4', '#3FA793']
const PROMPTS = [
  'What one thing would make today great?',
  'What are you grateful for right now?',
  'What did you learn that surprised you?',
  'What challenge are you ready to tackle?',
  'How did you show up for yourself today?',
  'What\'s a small win you can celebrate?',
]

function parseMarkdown(text: string) {
  if (!text) return { __html: '' }
  let html = text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*?)$/gm, '<h3 class="font-display text-lg text-primary mt-4 mb-2">$1</h3>')
    .replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/`([^`]+)`/g, '<code class="bg-surface-raised px-1 py-0.5 rounded text-sm font-mono text-jade">$1</code>')
    .replace(/\n/g, '<br/>')
  
  return { __html: html }
}

export default function JournalPage() {
  const todayStr = getISTDateString()
  const [selectedDate, setSelectedDate] = useState(todayStr)
  
  const [entry, setEntry] = useState<JournalEntry>({
    date: selectedDate, learned: '', achievement: '', challenges: '', goals: '', reflection: '', notes: '', tags: [], mood: 0, energy: 0, wordCount: 0
  })
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showPreview, setShowPreview] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pastEntries, setPastEntries] = useState<{ entry_date: string; word_count?: number; mood?: number; tags?: string[] }[]>([])
  const [journalStreak, setJournalStreak] = useState(0)

  // Fetch past entries for the sidebar
  useEffect(() => {
    fetch('/api/journal?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const entries = data?.entries || []
        setPastEntries(entries)
        // Calculate streak
        const dates = entries.map((e: any) => e.entry_date).sort().reverse()
        const today = getISTDateString()
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        if (!dates.length || (dates[0] !== today && dates[0] !== yesterday)) {
          setJournalStreak(0)
          return
        }
        let s = 1
        let expected = new Date(dates[0])
        for (let i = 1; i < dates.length; i++) {
          expected.setDate(expected.getDate() - 1)
          if (dates[i] === getISTDateString(expected)) s++
          else break
        }
        setJournalStreak(s)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setEntry({ date: selectedDate, learned: '', achievement: '', challenges: '', goals: '', reflection: '', notes: '', tags: [], mood: 0, energy: 0, wordCount: 0 })
    setSaveStatus('idle')
    // Fetch existing entry
    fetch(`/api/journal/${selectedDate}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setEntry({
            date: selectedDate,
            learned: data.section_learned || '',
            achievement: data.section_achievement || '',
            challenges: data.section_challenges || '',
            goals: data.section_tomorrow || '',
            reflection: data.section_reflection || '',
            notes: data.free_content || '',
            tags: data.tags || [],
            mood: data.mood || 0,
            energy: data.energy || 0,
            wordCount: data.word_count || 0,
          })
        }
      })
      .catch(() => {})
  }, [selectedDate])

  // Word count calc
  useEffect(() => {
    const text = [entry.learned, entry.achievement, entry.challenges, entry.goals, entry.reflection, entry.notes].join(' ')
    const count = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    if (count !== entry.wordCount) {
      setEntry(prev => ({ ...prev, wordCount: count }))
    }
  }, [entry.learned, entry.achievement, entry.challenges, entry.goals, entry.reflection, entry.notes])

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const body = {
        title: entry.notes?.slice(0, 50) || `Journal - ${selectedDate}`,
        mood: entry.mood || null,
        energy: entry.energy || null,
        tags: entry.tags,
        section_learned: entry.learned,
        section_achievement: entry.achievement,
        section_challenges: entry.challenges,
        section_tomorrow: entry.goals,
        section_reflection: entry.reflection,
        free_content: entry.notes,
        word_count: entry.wordCount,
      }
      const res = await fetch(`/api/journal/${selectedDate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('idle')
    }
  }

  const handleTextChange = (field: keyof JournalEntry, value: any) => {
    setEntry(prev => ({ ...prev, [field]: value }))
    setSaveStatus('saving')
  }

  const navigateDay = (direction: -1 | 1) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    setSelectedDate(getISTDateString(d))
  }

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault()
      const val = e.currentTarget.value.trim()
      if (!entry.tags.includes(val)) {
        setEntry(prev => ({ ...prev, tags: [...prev.tags, val] }))
        setSaveStatus('saving')
      }
      e.currentTarget.value = ''
    }
  }

  const randomPrompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], [selectedDate])
  const isEmpty = entry.wordCount === 0

  return (
    <div className="flex h-dvh bg-ink text-primary overflow-hidden">
      
      {/* LEFT PANEL - Desktop Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 w-[260px] bg-surface border-r border-border transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col",
        historyOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <BookOpen size={18} className="text-jade" /> Journal
          </h2>
          <button className="md:hidden text-muted" onClick={() => setHistoryOpen(false)}><X size={16}/></button>
        </div>

        <div className="p-5 border-b border-border space-y-4">
          <div className="card p-4 flex items-center justify-between bg-surface-raised border-border-subtle">
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Streak</div>
              <div className="text-2xl font-bold text-primary flex items-center gap-2">
                {journalStreak} <Flame size={20} className="text-amber" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Words Today</div>
              <div className="text-xl font-bold text-jade">{selectedDate === todayStr ? entry.wordCount : 0}</div>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              className="input pl-9 text-sm py-1.5" 
              placeholder="Search journals..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <h3 className="text-xs font-mono text-muted uppercase tracking-wider px-2 mb-2 mt-2">Recent Entries</h3>
          <button
            onClick={() => { setSelectedDate(todayStr); setHistoryOpen(false) }}
            className={clsx(
              "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between",
              selectedDate === todayStr ? "bg-jade/10 text-jade" : "hover:bg-surface-raised text-secondary hover:text-primary"
            )}
          >
            <div>
              <div className="text-sm font-medium">Today</div>
              <div className="text-[10px] font-mono opacity-60">{entry.wordCount} words</div>
            </div>
            {entry.mood > 0 && (
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: MOOD_COLORS[entry.mood - 1] }} />
            )}
          </button>
          {pastEntries
            .filter(e => e.entry_date !== todayStr)
            .filter(e => !searchQuery || e.entry_date.includes(searchQuery))
            .slice(0, 30)
            .map(e => (
              <button
                key={e.entry_date}
                onClick={() => { setSelectedDate(e.entry_date); setHistoryOpen(false) }}
                className={clsx(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between",
                  selectedDate === e.entry_date ? "bg-jade/10 text-jade" : "hover:bg-surface-raised text-secondary hover:text-primary"
                )}
              >
                <div>
                  <div className="text-sm font-medium">
                    {new Date(e.entry_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-[10px] font-mono opacity-60">{e.word_count || 0} words</div>
                </div>
                {(e.mood || 0) > 0 && (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: MOOD_COLORS[(e.mood || 1) - 1] }} />
                )}
              </button>
            ))
          }
          {pastEntries.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-muted font-mono">Start writing to see your history</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Tag Cloud</h3>
          <div className="flex flex-wrap gap-1">
            {(() => {
              const allTags = [...new Set([
                ...entry.tags,
                ...pastEntries.flatMap(e => e.tags || [])
              ])].slice(0, 20)
              return allTags.length === 0 ? (
                <span className="text-[10px] text-muted font-mono">Tags from your entries will appear here</span>
              ) : (
                allTags.map(t => (
                  <span
                    key={t}
                    onClick={() => setSearchQuery(t)}
                    className="badge badge-muted text-[10px] cursor-pointer hover:bg-surface-raised hover:text-primary"
                  >#{t}</span>
                ))
              )
            })()}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {historyOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setHistoryOpen(false)} />}

      {/* MAIN PANEL */}
      <main className="flex-1 flex flex-col min-w-0 bg-ink relative">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-surface/50 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden btn btn-icon-sm btn-ghost" onClick={() => setHistoryOpen(true)}>
              <BookOpen size={16} />
            </button>
            <div className="flex items-center gap-1 bg-surface-raised rounded-lg p-1 border border-border">
              <button onClick={() => navigateDay(-1)} className="btn btn-icon-sm text-muted hover:text-primary"><ChevronLeft size={16}/></button>
              <div className="text-sm font-medium font-mono px-3 text-primary flex items-center gap-2">
                <Calendar size={14} className="text-jade" />
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {selectedDate === todayStr && <span className="badge badge-jade ml-2">Today</span>}
              </div>
              <button onClick={() => navigateDay(1)} disabled={selectedDate === todayStr} className="btn btn-icon-sm text-muted hover:text-primary disabled:opacity-30"><ChevronRight size={16}/></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted hidden sm:inline-flex items-center gap-1">
              {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving...</>}
              {saveStatus === 'saved' && <><Check size={12} className="text-jade" /> Saved</>}
            </span>
            <button onClick={handleSave} className="btn btn-jade btn-sm shrink-0">
              <Save size={14} /> Save
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            
            {isEmpty && (
              <div className="card p-6 bg-surface-raised border-jade/30 flex items-start gap-4 animate-fade-in">
                <div className="bg-jade/20 p-2 rounded-full text-jade shrink-0">
                  <Flame size={20} />
                </div>
                <div>
                  <h3 className="font-display font-medium text-lg text-primary mb-1">Daily Prompt</h3>
                  <p className="text-secondary">{randomPrompt}</p>
                </div>
              </div>
            )}

            {/* Mood & Energy */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="card p-4 flex-1">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">How are you feeling?</label>
                  {entry.mood > 0 && (
                    <span className="text-xs font-medium" style={{ color: MOOD_COLORS[entry.mood - 1] }}>
                      {MOOD_LABELS[entry.mood - 1]}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {MOOD_LABELS.map((label, idx) => {
                    const level = idx + 1;
                    const isSelected = entry.mood === level;
                    const color = MOOD_COLORS[idx];
                    return (
                      <button
                        key={level}
                        id={`mood-${level}`}
                        onClick={() => handleTextChange('mood', level)}
                        title={label}
                        className="flex-1 h-9 rounded-lg border transition-all"
                        style={{
                          borderColor: isSelected ? color : 'var(--color-border)',
                          background: isSelected ? `${color}22` : 'var(--color-surface-raised)',
                        }}
                      >
                        <div
                          className="w-full h-full rounded-md flex items-end justify-center pb-1.5"
                        >
                          <div
                            className="w-3 rounded-sm transition-all duration-200"
                            style={{
                              height: `${(level / 5) * 18 + 4}px`,
                              background: isSelected ? color : 'var(--color-border)',
                              opacity: isSelected ? 1 : 0.5,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[9px] font-mono text-muted">Bad</span>
                  <span className="text-[9px] font-mono text-muted">Excellent</span>
                </div>
              </div>
              
              <div className="card p-4 flex-1">
                <label className="text-xs font-mono text-muted uppercase tracking-wider block mb-3 flex justify-between">
                  <span>Energy Level</span>
                  <span className="text-jade font-bold">{entry.energy}/5</span>
                </label>
                <div className="flex justify-between items-center h-12 px-2">
                  {[1,2,3,4,5].map(v => (
                    <button 
                      key={v}
                      onClick={() => handleTextChange('energy', v)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all group relative"
                    >
                      <div className={clsx(
                        "w-full h-full rounded-full transition-all duration-300",
                        v <= entry.energy ? "bg-amber scale-100" : "bg-surface-raised border border-border scale-75 group-hover:scale-90"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Structured Sections */}
            <div className="space-y-4">
              <Section title="What I Learned Today" icon={<Lightbulb size={16} className="text-jade" />} value={entry.learned} onChange={v => handleTextChange('learned', v)} placeholder="Share what clicked today..." />
              <Section title="Biggest Achievement" icon={<Trophy size={16} className="text-gold" />} value={entry.achievement} onChange={v => handleTextChange('achievement', v)} placeholder="What are you proud of today?" />
              <Section title="Challenges Faced" icon={<Zap size={16} className="text-brick" />} value={entry.challenges} onChange={v => handleTextChange('challenges', v)} placeholder="What was hard? What blocked you?" />
              <Section title="Tomorrow's Goals" icon={<Target size={16} className="text-amber" />} value={entry.goals} onChange={v => handleTextChange('goals', v)} placeholder="What 3 things matter most tomorrow?" />
              <Section title="Reflection" icon={<MessageSquare size={16} className="text-secondary" />} value={entry.reflection} onChange={v => handleTextChange('reflection', v)} placeholder="How are you feeling overall? What patterns do you notice?" />
            </div>

            {/* Free Writing */}
            <div className="card p-5 border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-medium text-lg flex items-center gap-2"><Edit3 size={18} className="text-primary"/> Additional Notes</h3>
                <button onClick={() => setShowPreview(!showPreview)} className="text-xs font-mono text-jade hover:underline">
                  {showPreview ? 'Edit Text' : 'Preview Markdown'}
                </button>
              </div>
              
              {showPreview ? (
                <div className="prose prose-invert max-w-none min-h-[200px] p-4 bg-surface-raised rounded-lg border border-border-subtle" dangerouslySetInnerHTML={parseMarkdown(entry.notes || '*No additional notes.*')} />
              ) : (
                <textarea 
                  className="w-full bg-transparent border-0 outline-none resize-y min-h-[200px] text-primary placeholder-muted"
                  placeholder="Free writing space. Markdown supported."
                  value={entry.notes}
                  onChange={e => handleTextChange('notes', e.target.value)}
                />
              )}
            </div>

            {/* Tags */}
            <div className="card p-5 flex flex-col gap-3">
              <label className="text-xs font-mono text-muted uppercase tracking-wider flex items-center gap-1">
                <Hash size={12}/> Entry Tags
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {entry.tags.map(t => (
                  <span key={t} className="badge badge-surface pl-2 pr-1 py-1 flex items-center gap-1">
                    {t} <button onClick={() => {
                      setEntry(prev => ({...prev, tags: prev.tags.filter(x => x !== t)}))
                      setSaveStatus('saving')
                    }} className="text-muted hover:text-brick ml-1"><X size={12}/></button>
                  </span>
                ))}
                <input 
                  type="text" 
                  placeholder="Add tag and press Enter" 
                  className="bg-transparent border-none outline-none text-sm w-48 text-primary placeholder-muted"
                  onKeyDown={handleTagInput}
                />
              </div>
            </div>

            <div className="h-12" /> {/* Spacer */}
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, icon, value, onChange, placeholder }: { title: string, icon?: React.ReactNode, value: string, onChange: (v: string) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(!!value)
  
  return (
    <div className="card overflow-hidden border-border transition-colors focus-within:border-jade/50">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full px-5 py-4 flex justify-between items-center bg-surface hover:bg-surface-raised transition-colors"
      >
        <span className={clsx("font-display font-medium text-base flex items-center gap-2", value ? "text-primary" : "text-secondary")}>
          {icon}{title}
        </span>
        <div className="flex items-center gap-3">
          {value && <Check size={16} className="text-jade" />}
          <ChevronRight size={18} className={clsx("text-muted transition-transform", isOpen ? "rotate-90" : "")} />
        </div>
      </button>
      
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-border bg-surface-raised/30">
          <textarea 
            className="w-full bg-transparent border-0 outline-none resize-y min-h-[80px] text-primary placeholder-muted"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            autoFocus={!value}
          />
        </div>
      )}
    </div>
  )
}
