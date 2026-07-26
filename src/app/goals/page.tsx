'use client'

import { useState, useMemo } from 'react'
import { Plus, Target, CheckCircle2, Circle, Edit3, Trash2, Calendar, RotateCw, X, Loader2, PlayCircle, PauseCircle, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { useGoals } from '@/lib/hooks/useGoals'
import type { Goal, Milestone } from '@/lib/hooks/useGoals'
import { useToast } from '@/components/providers/ToastProvider'
import Confirm from '@/components/ui/Confirm'


const CATEGORIES = [
  { id: 'career', label: 'Career', color: 'var(--color-sky)' },
  { id: 'learning', label: 'Learning', color: 'var(--color-jade)' },
  { id: 'fitness', label: 'Fitness', color: 'var(--color-brick)' },
  { id: 'personal', label: 'Personal', color: 'var(--color-gold)' },
  { id: 'financial', label: 'Financial', color: 'var(--color-amber)' },
  { id: 'project', label: 'Project', color: 'var(--color-violet)' },
  { id: 'other', label: 'Other', color: 'var(--color-secondary)' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low', class: 'badge-muted' },
  { id: 'medium', label: 'Medium', class: 'badge-gold' },
  { id: 'high', label: 'High', class: 'badge-brick' },
]

const COLORS = ['#3FA793', '#D6A24C', '#C4675A', '#E8975A', '#8B7FD4', '#5B9BD4']

export default function GoalsPage() {
  const toast = useToast()
  const { goals, loading, createGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone, syncAutoGoals } = useGoals()
  const [syncing, setSyncing] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)
  const [addMilestoneText, setAddMilestoneText] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState<Partial<Goal>>({
    category: 'personal', priority: 'medium', icon: '', color: COLORS[0], auto_track: false
  })

  const stats = useMemo(() => {
    const list = Array.isArray(goals) ? goals : [];
    const active = list.filter(g => g.status === 'active')
    const completed = list.filter(g => g.status === 'completed')
    const avgProgress = active.length ? Math.round(active.reduce((acc, g) => acc + g.progress_pct, 0) / active.length) : 0
    return { active: active.length, completed: completed.length, avgProgress }
  }, [goals])

  const handleSync = async () => {
    setSyncing(true)
    try { await syncAutoGoals() } catch {}
    setSyncing(false)
  }

  const openNewGoal = () => {
    setEditingGoalId(null)
    setForm({ category: 'personal', priority: 'medium', icon: '', color: COLORS[0], auto_track: false })
    setIsAddModalOpen(true)
  }

  const closeGoalModal = () => {
    setIsAddModalOpen(false)
    setEditingGoalId(null)
    setForm({ category: 'personal', priority: 'medium', icon: '', color: COLORS[0], auto_track: false })
  }

  const handleEditClick = () => {
    if (!selectedGoal) return
    setEditingGoalId(selectedGoal.id)
    setForm({
      title: selectedGoal.title,
      description: selectedGoal.description,
      category: selectedGoal.category,
      priority: selectedGoal.priority,
      target_date: selectedGoal.target_date || undefined,
      icon: selectedGoal.icon,
      color: selectedGoal.color,
      auto_track: selectedGoal.auto_track,
      track_module: selectedGoal.track_module,
      track_metric: selectedGoal.track_metric,
      track_target: selectedGoal.track_target
    })
    setIsAddModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title?.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description || '',
      category: form.category || 'personal',
      priority: form.priority || 'medium',
      target_date: form.target_date || undefined,
      icon: form.icon || '',
      color: form.color || COLORS[0],
      auto_track: form.auto_track || false,
      track_module: form.track_module || undefined,
      track_metric: form.track_metric || undefined,
      track_target: form.track_target ? Number(form.track_target) : undefined,
    };

    try {
      if (editingGoalId) {
        await updateGoal(editingGoalId, payload);
        toast.success('Goal updated!');
        setSelectedGoal(prev => prev && prev.id === editingGoalId ? { ...prev, ...payload } : prev);
      } else {
        await createGoal({ ...payload, status: 'active', progress_pct: 0 });
        toast.success('Goal created!');
      }
    } catch {
      toast.error(`Failed to ${editingGoalId ? 'update' : 'create'} goal`);
    }

    closeGoalModal()
  }

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    try { await toggleMilestone(goalId, milestoneId) } catch {}
    // Sync selectedGoal display
    setSelectedGoal(prev => {
      if (!prev || prev.id !== goalId) return prev
      const milestones = prev.milestones.map((m: Milestone) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      )
      const donePct = milestones.length
        ? Math.round(milestones.filter((m: Milestone) => m.completed).length / milestones.length * 100)
        : prev.progress_pct
      return { ...prev, milestones, progress_pct: donePct }
    })
  }

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id)
      toast.success('Goal deleted')
      if (selectedGoal?.id === id) setSelectedGoal(null)
    } catch {
      toast.error('Failed to delete goal')
    }
  }

  const handleAddMilestone = async () => {
    if (!selectedGoal || !addMilestoneText.trim()) return
    setAddingMilestone(true)
    try {
      const ms = await addMilestone(selectedGoal.id, { title: addMilestoneText.trim() })
      setSelectedGoal(prev => prev ? { ...prev, milestones: [...prev.milestones, ms] } : prev)
      setAddMilestoneText('')
      toast.success('Milestone added!')
    } catch {
      toast.error('Failed to add milestone')
    } finally {
      setAddingMilestone(false)
    }
  }

  const handleUpdateGoal = async (id: string, data: Partial<Goal>) => {
    try {
      await updateGoal(id, data)
      toast.success('Goal updated!')
    } catch {
      toast.error('Failed to update goal')
    }
  }

  // Circular progress SVG generator
  const ProgressRing = ({ pct, color, size = 60, stroke = 6 }: { pct: number, color: string, size?: number, stroke?: number }) => {
    const radius = (size - stroke) / 2
    const circ = radius * 2 * Math.PI
    const offset = circ - (pct / 100) * circ
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
          <circle 
            cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-primary font-mono font-bold" style={{ fontSize: size * 0.25 }}>{pct}%</span>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink text-primary pb-12">
      <div className="max-w-6xl mx-auto px-6 pt-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Target size={28} className="text-jade" /> Goals
            </h1>
            <p className="text-secondary mt-2">Long-term objectives with intelligent progress tracking</p>
          </div>
          <button onClick={openNewGoal} className="btn btn-jade">
            <Plus size={16} /> New Goal
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6 flex items-center justify-between border-jade/30 bg-surface-raised">
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Active Goals</p>
              <p className="text-3xl font-display font-bold text-primary">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-jade/20 flex items-center justify-center text-jade"><Target size={24}/></div>
          </div>
          <div className="card p-6 flex items-center justify-between border-border bg-surface-raised">
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Completed</p>
              <p className="text-3xl font-display font-bold text-primary">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-muted"><CheckCircle2 size={24}/></div>
          </div>
          <div className="card p-6 flex items-center justify-between border-gold/30 bg-surface-raised">
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Overall Progress</p>
              <p className="text-3xl font-display font-bold text-primary">{stats.avgProgress}%</p>
            </div>
            <ProgressRing pct={stats.avgProgress} color="var(--color-gold)" size={48} stroke={4} />
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="card h-48 skeleton" />)
          ) : goals.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-surface-raised rounded-2xl border border-border border-dashed text-center">
              <Target size={48} className="text-muted mb-4 opacity-50" />
              <h3 className="font-display font-medium text-xl text-primary mb-2">No goals yet</h3>
              <p className="text-secondary mb-6 max-w-md">Goals help you track long-term objectives with intelligent progress tracking.</p>
              <button onClick={openNewGoal} className="btn btn-jade">
                Create your first goal
              </button>
            </div>
          ) : goals.map(goal => {
            const isOverdue = goal.target_date && new Date(goal.target_date) < new Date() && goal.status === 'active'
            const cat = CATEGORIES.find(c => c.id === goal.category)
            const prio = PRIORITIES.find(p => p.id === goal.priority)
            
            return (
              <div 
                key={goal.id} 
                className={clsx("card p-5 cursor-pointer card-interactive flex flex-col relative overflow-hidden", goal.status === 'completed' && "opacity-75")}
                onClick={() => setSelectedGoal(goal)}
              >
                {/* Background color hint */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl -mr-10 -mt-10 pointer-events-none" style={{ backgroundColor: goal.color }} />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: goal.color }} />
                    <div>
                      <h3 className="font-display font-bold text-lg leading-tight group-hover:text-jade transition-colors">{goal.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-primary px-2 py-0.5 rounded-full border border-border" style={{ backgroundColor: `${cat?.color}20`, borderColor: `${cat?.color}40` }}>{cat?.label}</span>
                        <span className={clsx("badge", prio?.class)}>{prio?.label}</span>
                        {goal.status === 'completed' && <span className="badge badge-jade">Completed</span>}
                        {goal.status === 'paused' && <span className="badge badge-muted">Paused</span>}
                      </div>
                    </div>
                  </div>
                  <ProgressRing pct={goal.progress_pct} color={goal.color} size={50} stroke={4} />
                </div>

                <p className="text-sm text-secondary line-clamp-2 mb-4 flex-1">{goal.description}</p>

                <div className="space-y-3 mt-auto">
                  {goal.auto_track ? (
                    <div className="flex items-center gap-2 text-xs font-mono bg-surface-raised px-3 py-2 rounded-lg border border-border">
                      <RotateCw size={12} className="text-jade" />
                      <span className="text-muted">Auto-tracking:</span>
                      <strong className="text-primary">{goal.track_module} • {goal.track_current}/{goal.track_target} {goal.track_metric}</strong>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs text-muted font-mono">
                      <span>Milestones: {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length}</span>
                      {goal.target_date && (
                        <span className={clsx("flex items-center gap-1", isOverdue ? "text-brick" : "")}>
                          <Calendar size={12}/> {goal.target_date}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${goal.progress_pct}%`, backgroundColor: goal.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedGoal && (
        <div className="modal-overlay" onClick={() => setSelectedGoal(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 md:p-8">
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: selectedGoal.color }} />
                  <div>
                    <h2 className="font-display text-2xl font-bold text-primary">{selectedGoal.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge badge-surface">{CATEGORIES.find(c => c.id === selectedGoal.category)?.label}</span>
                      <span className={clsx("badge", PRIORITIES.find(p => p.id === selectedGoal.priority)?.class)}>{selectedGoal.priority}</span>
                      <span className={clsx("badge", selectedGoal.status === 'active' ? 'badge-jade' : 'badge-muted')}>{selectedGoal.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEditClick} className="btn btn-icon-sm btn-ghost hover:text-jade"><Edit3 size={16}/></button>
                  <button onClick={() => setDeleteGoalId(selectedGoal.id)} className="btn btn-icon-sm btn-ghost hover:text-brick" title="Delete goal"><Trash2 size={16}/></button>
                  <button onClick={() => setSelectedGoal(null)} className="btn btn-icon-sm btn-ghost ml-2"><X size={16}/></button>
                </div>
              </div>

              <p className="text-secondary text-lg mb-8 leading-relaxed">{selectedGoal.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                {/* Progress Overview */}
                <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-surface-raised rounded-2xl border border-border">
                  <ProgressRing pct={selectedGoal.progress_pct} color={selectedGoal.color} size={140} stroke={12} />
                  
                  {selectedGoal.auto_track ? (
                    <div className="mt-6 text-center w-full">
                      <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Tracking Status</div>
                      <div className="text-lg font-bold text-primary">{selectedGoal.track_current} / {selectedGoal.track_target}</div>
                      <div className="text-sm text-secondary">{selectedGoal.track_metric}</div>
                      <button 
                        onClick={handleSync}
                        disabled={syncing}
                        className="btn btn-surface btn-sm w-full mt-4"
                      >
                        {syncing ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />} 
                        {syncing ? 'Syncing...' : 'Sync Progress'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 w-full">
                      <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 text-center">Manual Progress</div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={selectedGoal.progress_pct}
                        onChange={e => {
                          const pct = parseInt(e.target.value)
                          setSelectedGoal(prev => prev ? { ...prev, progress_pct: pct } : prev)
                          updateGoal(selectedGoal.id, { progress_pct: pct }).catch(() => {})
                        }}
                        className="w-full"
                        style={{ accentColor: selectedGoal.color }}
                      />
                    </div>
                  )}
                </div>

                {/* Milestones / Details */}
                <div className="md:col-span-3 space-y-6">
                  {selectedGoal.auto_track ? (
                    <div className="card p-5 bg-jade/5 border-jade/20">
                      <h3 className="font-display font-medium text-lg text-primary flex items-center gap-2 mb-2">
                        <RotateCw size={18} className="text-jade" /> Auto-Tracked Goal
                      </h3>
                      <p className="text-sm text-secondary leading-relaxed">
                        This goal automatically updates based on your activity in the <strong className="text-primary">{selectedGoal.track_module}</strong> module. 
                        As you log more <strong className="text-primary">{selectedGoal.track_metric}</strong>, progress will reflect here without any manual effort.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="font-display font-bold text-lg">Milestones</h3>
                        <span className="text-xs font-mono text-muted">{selectedGoal.milestones.filter(m => m.completed).length} of {selectedGoal.milestones.length} done</span>
                      </div>
                      
                      <div className="space-y-2">
                        {selectedGoal.milestones.map(ms => (
                          <div 
                            key={ms.id} 
                            onClick={() => handleToggleMilestone(selectedGoal.id, ms.id)}
                            className={clsx(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              ms.completed ? "bg-surface border-border opacity-70" : "bg-surface-raised border-border hover:border-secondary"
                            )}
                          >
                            <button className={clsx("shrink-0", ms.completed ? "text-jade" : "text-muted")}>
                              {ms.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>
                            <span className={clsx("flex-1 text-sm transition-all", ms.completed ? "line-through text-muted" : "text-primary font-medium")}>{ms.title}</span>
                            {ms.target_date && <span className="text-xs font-mono text-muted">{ms.target_date}</span>}
                          </div>
                        ))}
                      </div>
                      
                      {/* Add milestone inline */}
                      <div className="flex gap-2 mt-2">
                        <input
                          className="input flex-1 text-sm py-2"
                          placeholder="Add milestone…"
                          value={addMilestoneText}
                          onChange={e => setAddMilestoneText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddMilestone() }}
                        />
                        <button
                          onClick={handleAddMilestone}
                          disabled={!addMilestoneText.trim() || addingMilestone}
                          className="btn btn-jade btn-sm px-3"
                        >
                          {addingMilestone ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="divider" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-mono text-muted uppercase">Target Date</div>
                      <div className="text-sm font-medium mt-1">{selectedGoal.target_date ? <span className="flex items-center gap-1"><Calendar size={14}/> {selectedGoal.target_date}</span> : 'No specific date'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted uppercase">Status</div>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          className={clsx(
                            "text-xs font-medium px-2 py-1 rounded border bg-transparent",
                            selectedGoal.status === 'active' ? "text-jade border-jade/30" :
                            selectedGoal.status === 'completed' ? "text-primary border-border" : "text-gold border-gold/30"
                          )}
                          value={selectedGoal.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as 'active' | 'completed' | 'paused';
                            handleUpdateGoal(selectedGoal.id, { status: newStatus });
                            setSelectedGoal({ ...selectedGoal, status: newStatus });
                          }}
                        >
                          <option value="active" className="text-primary bg-surface">Active</option>
                          <option value="paused" className="text-primary bg-surface">Paused</option>
                          <option value="completed" className="text-primary bg-surface">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeGoalModal}>
          <div className="modal-content modal-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-xl text-primary font-bold">{editingGoalId ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={closeGoalModal} className="btn btn-icon-sm btn-ghost"><X size={16}/></button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Master React, Save $10k..." value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Why is this important?" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})}>
                    {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Target Date (Optional)</label>
                <input type="date" className="input" value={form.target_date || ''} onChange={e => setForm({...form, target_date: e.target.value})} />
              </div>



              <div>
                <label className="label mb-2">Color</label>
                <div className="flex gap-3">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({...form, color: c})} className={clsx("w-8 h-8 rounded-full border-2 transition-transform", form.color === c ? "scale-110 shadow-lg" : "border-transparent scale-90")} style={{ backgroundColor: c, borderColor: form.color === c ? 'var(--color-primary)' : 'transparent' }} />
                  ))}
                </div>
              </div>

              <div className="divider" />

              <div className="bg-surface-raised p-4 rounded-xl border border-border space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-medium text-primary">Auto-track Progress</div>
                    <div className="text-xs text-secondary mt-1">Automatically calculate progress based on app activity</div>
                  </div>
                  <div className="switch">
                    <input type="checkbox" checked={form.auto_track} onChange={e => setForm({...form, auto_track: e.target.checked})} />
                    <span className="switch-slider" />
                  </div>
                </label>

                {form.auto_track && (
                  <div className="space-y-4 pt-2 animate-fade-in">
                    <div>
                      <label className="label">Module</label>
                      <select className="input text-sm" value={form.track_module || ''} onChange={e => setForm({...form, track_module: e.target.value})}>
                        <option value="">Select a module...</option>
                        <option value="DSA">DSA Tracker</option>
                        <option value="Fitness">Fitness</option>
                        <option value="Habits">Habits</option>
                        <option value="Tasks">Tasks</option>
                        <option value="Achievements">Achievements</option>
                      </select>
                    </div>

                    {form.track_module && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">Metric</label>
                          <select className="input text-sm" value={form.track_metric || ''} onChange={e => setForm({...form, track_metric: e.target.value})}>
                            <option value="">Select metric...</option>
                            {form.track_module === 'DSA' && <option value="Problems Solved">Problems Solved</option>}
                            {form.track_module === 'Fitness' && <><option value="Workouts Done">Workouts Done</option><option value="Workout Streak (days)">Streak (days)</option></>}
                            {form.track_module === 'Habits' && <option value="Current Streak (days)">Streak (days)</option>}
                            {form.track_module === 'Tasks' && <option value="Tasks Completed">Tasks Completed</option>}
                            {form.track_module === 'Achievements' && <option value="Total Achievements">Total Achievements</option>}
                          </select>
                        </div>
                        <div>
                          <label className="label">Target Value</label>
                          <input type="number" className="input text-sm" value={form.track_target || ''} onChange={e => setForm({...form, track_target: parseInt(e.target.value)})} />
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs font-mono text-jade bg-jade/10 p-2 rounded border border-jade/20 text-center">
                      Progress will be auto-calculated from your app activity
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4">
              <button onClick={closeGoalModal} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={!form.title} className="btn btn-jade">{editingGoalId ? 'Save Changes' : 'Create Goal'}</button>
            </div>
          </div>
        </div>
      )}

      <Confirm
        open={!!deleteGoalId}
        onClose={() => setDeleteGoalId(null)}
        onConfirm={async () => { if (deleteGoalId) await handleDeleteGoal(deleteGoalId); setDeleteGoalId(null) }}
        title="Delete Goal?"
        message="This goal and all its milestones will be permanently deleted."
        confirmText="Delete Goal"
        variant="danger"
      />

    </div>
  )
}
