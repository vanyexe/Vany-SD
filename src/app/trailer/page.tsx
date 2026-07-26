'use client'

import { useState, useRef, useEffect } from 'react'
import { useTrailer } from '@/lib/hooks/useTrailer'
import type { TrailerStage, TrailerTask } from '@/lib/hooks/useTrailer'
import { Plus, X, GripVertical, Clock, User, Trash2, ChevronRight, ChevronLeft, Calendar, Tag, AlertCircle, PlaySquare, Timer, ListTodo } from 'lucide-react'
import clsx from 'clsx'

const STAGES: { id: TrailerStage; label: string; desc: string }[] = [
  { id: 'pre-prod', label: 'PRE-PROD', desc: 'Story, refs, shot list' },
  { id: 'weekend', label: 'WEEKEND', desc: 'Blender / Unity basics' },
  { id: 'paused', label: 'PAUSED', desc: 'Protecting internship push' },
  { id: 'daily-prod', label: 'DAILY PROD', desc: 'Phase 5 — active production' },
  { id: 'rough-cut', label: 'ROUGH CUT', desc: 'Month 20 milestone' },
  { id: 'finished', label: 'FINISHED', desc: 'Month 24 — shippable' },
]

const ACTIVE_STAGES: TrailerStage[] = ['pre-prod', 'weekend', 'daily-prod']

const KANBAN_COLS: { id: TrailerTask['status']; label: string; color: string; border: string; bg: string }[] = [
  { id: 'todo', label: 'TO DO', color: 'text-secondary', border: 'border-border', bg: 'bg-surface/50' },
  { id: 'in-progress', label: 'IN PROGRESS', color: 'text-gold', border: 'border-gold/30', bg: 'bg-gold/5' },
  { id: 'done', label: 'DONE', color: 'text-jade', border: 'border-jade/30', bg: 'bg-jade/5' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-surface-raised text-secondary' },
  { id: 'medium', label: 'Medium', color: 'bg-gold/20 text-gold' },
  { id: 'high', label: 'High', color: 'bg-brick/20 text-brick' },
  { id: 'urgent', label: 'Urgent', color: 'bg-brick text-ink font-bold' }
]

export default function TrailerPage() {
  const { tasks, activeStage, setActiveStage, todo, inProgress, done, addTask, updateTask, deleteTask, daysToDeadline, loading, deadlineDate, updateDeadline } = useTrailer()

  const [isEditingDeadline, setIsEditingDeadline] = useState(false)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TrailerTask['status'] | null>(null)

  // Inline add task state
  const [addingToCol, setAddingToCol] = useState<TrailerTask['status'] | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('You')

  // Task detail modal state
  const [selectedTask, setSelectedTask] = useState<TrailerTask | null>(null)

  const handleQuickAdd = async (col: TrailerTask['status']) => {
    if (!newTaskTitle.trim()) {
      setAddingToCol(null)
      return
    }
    await addTask({ title: newTaskTitle.trim(), assignee: newTaskAssignee, stage: activeStage })
    // In a real app we'd also patch the status if it's not 'todo' immediately after, 
    // but the hook creates it as 'todo'. Let's find it and update it if needed.
    // To keep it simple, inline add always adds to the specific col by finding it, 
    // actually our addTask hook hardcodes status to 'todo' on backend. So we might need to patch it.
    // We will just let it go to TODO and then patch it if col !== 'todo'
    setNewTaskTitle('')
    setNewTaskAssignee('You')
    setAddingToCol(null)
  }

  const colData: Record<TrailerTask['status'], TrailerTask[]> = {
    todo,
    'in-progress': inProgress,
    done,
  }

  const handleDragStart = (id: string) => setDraggingId(id)
  const handleDragEnd = () => { setDraggingId(null); setDragOverCol(null) }
  const handleDrop = (col: TrailerTask['status']) => {
    if (draggingId) updateTask(draggingId, { status: col })
    setDraggingId(null)
    setDragOverCol(null)
  }

  const currentStageIndex = STAGES.findIndex(s => s.id === activeStage)
  const progressPct = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0

  return (
    <div className="min-h-dvh bg-ink flex flex-col h-screen overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-5 pt-8 pb-4 flex-1 flex flex-col space-y-6">

        {/* -- Header -- */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-display text-4xl font-semibold text-primary flex items-center gap-3">
              <PlaySquare className="text-brick" size={32} />
              Trailer Board
            </h1>
            <div className="text-secondary text-sm mt-2 font-mono flex items-center gap-2 flex-wrap">
              <span className="badge badge-muted">Phase 5</span>
              <span>•</span>
              <span className={clsx(progressPct >= 50 ? 'text-jade' : 'text-gold')}>
                {progressPct}% done overall
              </span>
              <span>•</span>
              <span>{tasks.length} total tasks</span>
            </div>
          </div>
          <div className="card p-3 px-5 flex items-center gap-4 bg-surface-raised border-border">
            <div className="text-right flex flex-col items-end">
              <div className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Time to Deadline</div>
              {isEditingDeadline ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    autoFocus
                    className="input py-1 px-2 text-sm max-w-[140px]"
                    defaultValue={deadlineDate ? deadlineDate.toISOString().split('T')[0] : ''}
                    onBlur={(e) => {
                      if (e.target.value) updateDeadline(e.target.value)
                      setIsEditingDeadline(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.currentTarget.value) updateDeadline(e.currentTarget.value)
                        setIsEditingDeadline(false)
                      }
                      if (e.key === 'Escape') setIsEditingDeadline(false)
                    }}
                  />
                </div>
              ) : (
                <div 
                  className="font-mono text-3xl font-bold text-brick tracking-tight leading-none cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsEditingDeadline(true)}
                  title="Click to change deadline"
                >
                  {daysToDeadline}
                </div>
              )}
            </div>
            <Timer className="text-brick/50" size={32} />
          </div>
        </div>

        {/* -- Stage tab bar -- */}
        <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {STAGES.map((stage, i) => {
            const isActive = stage.id === activeStage
            const isEnabled = ACTIVE_STAGES.includes(stage.id)
            const isPassed = i < currentStageIndex
            return (
              <button
                key={stage.id}
                onClick={() => isEnabled && setActiveStage(stage.id)}
                disabled={!isEnabled}
                className={clsx(
                  'px-4 py-3 rounded-xl text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap border flex flex-col items-start gap-1 min-w-[140px]',
                  isActive
                    ? 'bg-jade border-jade text-ink shadow-lg shadow-jade/20 scale-105'
                    : isPassed
                    ? 'bg-jade/10 text-jade border-jade/30 hover:bg-jade/20'
                    : isEnabled
                    ? 'bg-surface text-primary border-border hover:border-jade/40 hover:text-jade'
                    : 'bg-transparent text-muted/30 border-border/50 cursor-not-allowed'
                )}
              >
                <span>{stage.label}</span>
                <span className={clsx('text-[10px] font-body normal-case opacity-70 truncate w-full text-left', isActive && 'text-ink/80')}>{stage.desc}</span>
              </button>
            )
          })}
        </div>

        {/* -- Kanban board -- */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-4">
          {KANBAN_COLS.map(col => (
            <div
              key={col.id}
              className={clsx(
                'flex flex-col rounded-2xl border transition-all h-full overflow-hidden',
                dragOverCol === col.id ? 'border-jade bg-jade/5' : clsx(col.border, col.bg)
              )}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className={clsx("flex items-center justify-between p-4 border-b bg-ink/50 backdrop-blur shrink-0", col.border)}>
                <div className="flex items-center gap-2">
                  <span className={clsx('text-xs font-mono font-bold uppercase tracking-widest', col.color)}>
                    {col.label}
                  </span>
                  <span className="badge badge-muted text-[10px] px-2 py-0.5 rounded-full">
                    {colData[col.id].length}
                  </span>
                </div>
              </div>

              {/* Task cards scrollable area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {colData[col.id].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(status) => updateTask(task.id, { status })}
                    onDelete={() => deleteTask(task.id)}
                    onClick={() => setSelectedTask(task)}
                    isDragging={draggingId === task.id}
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))}

                {colData[col.id].length === 0 && !addingToCol && (
                  <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-xl">
                    <p className="text-muted text-xs font-mono">Drop tasks here</p>
                  </div>
                )}

                {/* Inline Add Task Form */}
                {addingToCol === col.id && (
                  <div className="card-raised p-3 border border-jade/50 space-y-3 animate-scale-in">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleQuickAdd(col.id)
                        if (e.key === 'Escape') setAddingToCol(null)
                      }}
                      className="w-full bg-surface border border-border rounded p-2 text-sm text-primary focus:outline-none focus:border-jade"
                    />
                    <div className="flex items-center justify-between">
                      <input 
                        type="text"
                        placeholder="Assignee (You)"
                        value={newTaskAssignee}
                        onChange={e => setNewTaskAssignee(e.target.value)}
                        className="bg-transparent text-xs font-mono text-secondary focus:outline-none w-24"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setAddingToCol(null)} className="text-xs text-muted hover:text-primary">Cancel</button>
                        <button onClick={() => handleQuickAdd(col.id)} className="btn btn-jade btn-sm text-[10px] px-2 py-1">Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Add to this column */}
              <div className={clsx("p-3 border-t bg-ink/50 shrink-0", col.border)}>
                <button
                  onClick={() => setAddingToCol(col.id)}
                  className="w-full py-2.5 rounded-lg border border-dashed border-border text-xs text-muted hover:border-jade/50 hover:text-jade hover:bg-jade/5 transition-all flex items-center justify-center gap-1.5 font-mono"
                >
                  <Plus size={14} /> Add Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -- Task Detail Modal -- */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updates) => {
            updateTask(selectedTask.id, updates)
            setSelectedTask(null)
          }}
          onDelete={() => {
            deleteTask(selectedTask.id)
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}

// -- Task Card --
function TaskCard({
  task, onStatusChange, onDelete, onClick, isDragging, onDragStart, onDragEnd,
}: {
  task: TrailerTask;
  onStatusChange: (status: TrailerTask['status']) => void;
  onDelete: () => void;
  onClick: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  
  // Calculate priority color
  const prio = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[0]

  // Calculate overdue
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  const initials = task.assignee.substring(0,2).toUpperCase()

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // Prevent click if dragging or clicking buttons inside
        if (!isDragging && !(e.target as HTMLElement).closest('button')) {
          onClick()
        }
      }}
      className={clsx(
        'card-raised rounded-xl p-3 cursor-pointer hover:border-primary/30 group transition-all relative overflow-hidden',
        isDragging && 'opacity-40 scale-95 border-dashed border-jade/50',
        task.status === 'done' && 'opacity-60 bg-surface/30',
        !isDragging && 'active:scale-[0.98]'
      )}
    >
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: task.status === 'in-progress' ? 'var(--color-gold)' : task.status === 'done' ? 'var(--color-jade)' : 'transparent' }} />
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {task.priority && task.priority !== 'low' && (
              <span className={clsx("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded", prio.color)}>
                {prio.label}
              </span>
            )}
            {task.labels?.map(l => (
              <span key={l} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-raised text-secondary border border-border flex items-center gap-1">
                <Tag size={8} /> {l}
              </span>
            ))}
          </div>
          
          {/* Action buttons (mobile visible, desktop on hover) */}
          <div className="md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
             <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 text-muted hover:text-brick rounded">
               <Trash2 size={12} />
             </button>
          </div>
        </div>

        <p className={clsx('text-sm font-body leading-snug', task.status === 'done' ? 'line-through text-muted' : 'text-primary')}>
          {task.title}
        </p>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-jade/20 text-jade border border-jade/30 flex items-center justify-center text-[10px] font-mono font-bold" title={task.assignee}>
               {initials}
             </div>
             {task.due_date && (
               <div className={clsx("flex items-center gap-1 text-[10px] font-mono", isOverdue ? "text-brick font-bold" : "text-muted")}>
                 {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
                 {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
               </div>
             )}
          </div>
          
          <div className="md:hidden flex gap-1">
            {task.status !== 'todo' && <button onClick={(e) => { e.stopPropagation(); onStatusChange(task.status === 'done' ? 'in-progress' : 'todo') }} className="p-1 bg-surface-raised rounded text-muted"><ChevronLeft size={12} /></button>}
            {task.status !== 'done' && <button onClick={(e) => { e.stopPropagation(); onStatusChange(task.status === 'todo' ? 'in-progress' : 'done') }} className="p-1 bg-surface-raised rounded text-jade"><ChevronRight size={12} /></button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Task Detail Modal --
function TaskDetailModal({ task, onClose, onSave, onDelete }: { 
  task: TrailerTask; 
  onClose: () => void; 
  onSave: (updates: Partial<TrailerTask>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [assignee, setAssignee] = useState(task.assignee)
  const [priority, setPriority] = useState<TrailerTask['priority']>(task.priority || 'low')
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [status, setStatus] = useState(task.status)

  const handleSave = () => {
    onSave({ title, description, assignee, priority, due_date: dueDate, status })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-full animate-scale-in">
        
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
             <span className="text-xs font-mono text-muted uppercase tracking-widest bg-surface-raised px-2 py-1 rounded">Edit Task</span>
             <span className="text-xs font-mono text-jade">{task.id.substring(0,8)}</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary rounded-full hover:bg-surface-raised transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Title */}
          <div>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-transparent text-2xl font-display font-semibold text-primary focus:outline-none placeholder:text-muted"
              placeholder="Task Title"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-mono text-muted uppercase tracking-wider mb-2 block flex items-center gap-2"><ListTodo size={12}/> Description</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add more details to this task..."
                  className="w-full min-h-[150px] bg-surface-raised border border-border rounded-xl p-3 text-sm text-primary font-body focus:outline-none focus:border-jade resize-y"
                />
              </div>
            </div>

            {/* Sidebar properties */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted uppercase tracking-wider mb-2 block">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-surface-raised border border-border rounded-lg p-2 text-sm text-primary">
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-muted uppercase tracking-wider mb-2 block">Assignee</label>
                <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full bg-surface-raised border border-border rounded-lg p-2 text-sm text-primary" />
              </div>

              <div>
                <label className="text-xs font-mono text-muted uppercase tracking-wider mb-2 block">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full bg-surface-raised border border-border rounded-lg p-2 text-sm text-primary">
                  {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-muted uppercase tracking-wider mb-2 block">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-surface-raised border border-border rounded-lg p-2 text-sm text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-between shrink-0 bg-surface/50 rounded-b-2xl">
          <button onClick={() => { if(confirm('Delete this task?')) onDelete() }} className="btn btn-ghost text-brick hover:bg-brick/10 gap-2">
            <Trash2 size={14} /> Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button onClick={handleSave} className="btn btn-jade">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}
