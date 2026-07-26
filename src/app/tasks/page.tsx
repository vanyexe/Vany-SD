'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Plus, CheckCircle2, Circle, Star, Trash2, Clock, Inbox,
  AlertTriangle, AlertCircle, Filter, Search, ChevronDown,
  X, Pencil, Calendar, Tag, GripVertical, Loader2
} from 'lucide-react'
import clsx from 'clsx'
import { useTasks, type Task } from '@/lib/hooks/useTasks'
import { useToast } from '@/components/providers/ToastProvider'
import Confirm from '@/components/ui/Confirm'

/* ─── Smart filter definitions ─── */
const SMART_FILTERS = [
  { id: 'pending',  label: 'All Pending',    icon: Inbox },
  { id: 'today',    label: 'Due Today',      icon: Calendar },
  { id: 'overdue',  label: 'Overdue',        icon: AlertTriangle },
  { id: 'high',     label: 'High Priority',  icon: AlertCircle },
  { id: 'starred',  label: 'Favorites',      icon: Star },
  { id: 'done',     label: 'Completed',      icon: CheckCircle2 },
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
type Priority = typeof PRIORITIES[number]

const PRIORITY_STYLES: Record<Priority, { label: string; cls: string; dot: string }> = {
  low:    { label: 'Low',    cls: 'badge badge-muted',         dot: 'bg-muted' },
  medium: { label: 'Medium', cls: 'badge priority-medium',     dot: 'bg-gold' },
  high:   { label: 'High',   cls: 'badge priority-high',       dot: 'bg-amber' },
  urgent: { label: 'Urgent', cls: 'badge priority-urgent',     dot: 'bg-brick' },
}

/* ─── Date helpers ─── */
function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isOverdue(due: string | undefined) {
  if (!due) return false
  return new Date(due) < new Date(new Date().toDateString())
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (isSameDay(d, today)) return 'Today'
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(d, tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ─── Skeleton ─── */
function TaskSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 card">
      <div className="skeleton w-5 h-5 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-5 w-14 rounded-full" />
    </div>
  )
}

/* ─── Task Row ─── */
interface TaskRowProps {
  task: Task
  onToggle: (id: string) => void
  onStar: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  justAdded: string | null
}

function TaskRow({ task, onToggle, onStar, onDelete, onEdit, justAdded }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const isDone     = task.status === 'done'
  const overdue    = !isDone && isOverdue(task.due_date)
  const pStyle     = PRIORITY_STYLES[(task.priority as Priority) ?? 'medium']

  return (
    <div
      id={`task-row-${task.id}`}
      className={clsx(
        'group rounded-xl border transition-all duration-150',
        justAdded === task.id ? 'border-jade animate-scale-in' : 'border-border hover:border-secondary',
        isDone ? 'opacity-55' : '',
        task.is_pinned ? 'border-l-2 border-l-gold' : '',
        'bg-surface'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Checkbox */}
        <button
          id={`task-check-${task.id}`}
          onClick={e => { e.stopPropagation(); onToggle(task.id) }}
          className={clsx(
            'flex-shrink-0 transition-all duration-200',
            isDone ? 'text-jade' : 'text-border hover:text-jade'
          )}
        >
          {isDone
            ? <CheckCircle2 size={20} className="check-icon" style={{ color: 'var(--color-jade)' }} />
            : <Circle size={20} />
          }
        </button>

        {/* Title */}
        <span className={clsx(
          'flex-1 text-sm font-medium truncate transition-all duration-200',
          isDone ? 'line-through text-muted' : 'text-primary'
        )}>
          {task.title}
        </span>

        {/* Due date */}
        {task.due_date && (
          <span className={clsx(
            'text-xs font-mono flex-shrink-0',
            overdue ? 'text-brick' : 'text-muted'
          )}>
            {overdue ? '⚑ ' : ''}{fmtDate(task.due_date)}
          </span>
        )}

        {/* Priority */}
        {task.priority && task.priority !== 'low' && (
          <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0', pStyle.cls)}>
            {pStyle.label}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            id={`task-star-${task.id}`}
            onClick={e => { e.stopPropagation(); onStar(task.id) }}
            className={clsx(
              'btn btn-icon-sm transition-colors',
              task.is_favorite ? 'text-gold' : 'text-muted hover:text-gold'
            )}
          >
            <Star size={14} className={task.is_favorite ? 'fill-current' : ''} />
          </button>
          <button
            id={`task-edit-${task.id}`}
            onClick={e => { e.stopPropagation(); onEdit(task) }}
            className="btn btn-icon-sm text-muted hover:text-primary"
          >
            <Pencil size={14} />
          </button>
          <button
            id={`task-delete-${task.id}`}
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
            className="btn btn-icon-sm text-muted hover:text-brick"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Tags row */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 px-11 pb-2 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag} className="badge badge-muted text-[10px]">
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded description */}
      {expanded && (
        <div className="px-11 pb-4 animate-fade-in-fast">
          <div className="divider mb-3" />
          <p className="text-sm text-secondary leading-loose">
            {task.description || <span className="text-muted italic">No description</span>}
          </p>
          {task.progress > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-jade" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Edit Task Modal ─── */
interface EditModalProps {
  task: Task | null
  onClose: () => void
  onSave: (id: string, updates: Partial<Task>) => Promise<void>
}

function EditTaskModal({ task, onClose, onSave }: EditModalProps) {
  const [title, setTitle]       = useState(task?.title ?? '')
  const [desc, setDesc]         = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>((task?.priority as Priority) ?? 'medium')
  const [dueDate, setDueDate]   = useState(task?.due_date?.slice(0, 10) ?? '')
  const [tags, setTags]         = useState(task?.tags?.join(', ') ?? '')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title ?? '')
      setDesc(task.description ?? '')
      setPriority((task.priority as Priority) ?? 'medium')
      setDueDate(task.due_date?.slice(0, 10) ?? '')
      setTags(task.tags?.join(', ') ?? '')
    }
  }, [task])

  if (!task) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(task.id, {
        title: title.trim(),
        description: desc.trim(),
        priority,
        due_date: dueDate || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} id="edit-task-modal-overlay">
      <div
        className="modal-content modal-md p-6 space-y-5"
        onClick={e => e.stopPropagation()}
        id="edit-task-modal"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">Edit Task</h2>
          <button onClick={onClose} className="btn btn-icon btn-icon-sm text-muted hover:text-primary" id="edit-modal-close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input id="edit-task-title" className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea id="edit-task-desc" className="input" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select id="edit-task-priority" className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_STYLES[p].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input id="edit-task-due" type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input id="edit-task-tags" className="input" placeholder="design, urgent, review..." value={tags} onChange={e => setTags(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn btn-ghost flex-1" id="edit-modal-cancel">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="btn btn-jade flex-1"
            id="edit-modal-save"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ─── */
export default function TasksPage() {
  const toast = useToast()
  const { tasks, loading, createTask, updateTask, deleteTask, toggleFavorite, refetch } = useTasks()

  const [filter, setFilter]         = useState('pending')
  const [search, setSearch]         = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTitle, setNewTitle]     = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newDue, setNewDue]         = useState('')
  const [adding, setAdding]         = useState(false)
  const [justAdded, setJustAdded]   = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const today = new Date(new Date().toDateString())
    return {
      total:   tasks.filter(t => t.status !== 'done').length,
      today:   tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), today) && t.status !== 'done').length,
      overdue: tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length,
      done:    tasks.filter(t => t.status === 'done').length,
    }
  }, [tasks])

  /* ─── Filtered tasks ─── */
  const filtered = useMemo(() => {
    const today = new Date(new Date().toDateString())
    let base = tasks

    switch (filter) {
      case 'pending':  base = tasks.filter(t => t.status !== 'done' && t.status !== 'archived'); break
      case 'today':    base = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), today)); break
      case 'overdue':  base = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done'); break
      case 'high':     base = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent'); break
      case 'starred':  base = tasks.filter(t => t.is_favorite); break
      case 'done':     base = tasks.filter(t => t.status === 'done'); break
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      base = base.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }

    return [...base].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return b.sort_order - a.sort_order
    })
  }, [tasks, filter, search])

  /* ─── Handlers ─── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const task = await createTask({
        title: newTitle.trim(),
        priority: newPriority,
        due_date: newDue || undefined,
        status: 'todo',
        tags: [],
        is_favorite: false,
        is_pinned: false,
        sort_order: 0,
        progress: 0,
      })
      setJustAdded(task.id)
      setTimeout(() => setJustAdded(null), 2000)
      setNewTitle('')
      setNewDue('')
      toast.success('Task added')
    } catch {
      toast.error('Failed to add task')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = useCallback(async (id: string) => {
    const t = tasks.find(x => x.id === id)
    if (!t) return
    const newStatus = t.status === 'done' ? 'todo' : 'done'
    await updateTask(id, { status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : undefined })
    if (newStatus === 'done') toast.success('Task completed! ✓')
  }, [tasks, updateTask, toast])

  const handleDelete = useCallback(async (id: string) => {
    setDeleteTaskId(id)
  }, [])

  const confirmDelete = async () => {
    if (!deleteTaskId) return
    try {
      await deleteTask(deleteTaskId)
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleteTaskId(null)
    }
  }

  const handleStar = useCallback(async (id: string) => {
    await toggleFavorite(id)
  }, [toggleFavorite])

  const handleSaveEdit = useCallback(async (id: string, updates: Partial<Task>) => {
    await updateTask(id, updates)
    toast.success('Task updated')
  }, [updateTask, toast])

  return (
    <div className="flex h-full min-h-dvh" id="tasks-page">

      {/* ─── Left sidebar ─── */}
      <aside className="hidden md:flex w-52 flex-shrink-0 flex-col border-r border-border bg-surface p-4 gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary mb-1">Tasks</h1>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono text-muted">
            <span id="tasks-stat-pending">{stats.total} active</span>
            {stats.today > 0 && <span className="text-gold" id="tasks-stat-today">{stats.today} today</span>}
            {stats.overdue > 0 && <span className="text-brick" id="tasks-stat-overdue">{stats.overdue} overdue</span>}
          </div>
        </div>

        <nav className="space-y-0.5">
          {SMART_FILTERS.map(f => {
            const Icon = f.icon
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                id={`tasks-filter-${f.id}`}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'text-ink font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-surface-raised'
                )}
                style={isActive ? { backgroundColor: 'var(--color-jade)' } : undefined}
              >
                <Icon size={15} />
                {f.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
          {/* Mobile page title */}
          <h1 className="font-display text-xl text-primary md:hidden">Tasks</h1>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="tasks-search"
              type="text"
              placeholder="Search tasks…"
              className="input pl-9 py-2 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                id="tasks-search-clear"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className="btn btn-ghost btn-sm md:hidden"
            id="tasks-filter-mobile-toggle"
          >
            <Filter size={14} />
          </button>

          <span className="text-xs text-muted font-mono ml-auto hidden md:block">
            {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Mobile filter row */}
        {showFilters && (
          <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto md:hidden animate-slide-in-down">
            {SMART_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setShowFilters(false) }}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                  filter === f.id ? 'bg-jade text-ink' : 'bg-surface-raised text-secondary'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Quick add */}
        <form onSubmit={handleAdd} className="flex items-center gap-2 px-6 py-5 border-b border-border bg-surface-raised shadow-inner" id="tasks-add-form">
          <Plus size={16} className="text-jade flex-shrink-0" />
          <input
            ref={inputRef}
            id="tasks-add-input"
            type="text"
            placeholder="Add a task…"
            className="flex-1 bg-transparent text-sm text-primary placeholder-muted outline-none"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          {newTitle && (
            <>
              <select
                id="tasks-add-priority"
                className="text-xs bg-transparent text-muted border-none outline-none cursor-pointer"
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map(p => <option key={p} value={p} style={{ background: 'var(--color-ink)' }}>{p}</option>)}
              </select>
              <input
                id="tasks-add-due"
                type="date"
                className="text-xs bg-transparent text-muted border-none outline-none cursor-pointer"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
              />
              <button
                type="submit"
                disabled={adding}
                className="btn btn-jade btn-sm"
                id="tasks-add-submit"
              >
                {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </>
          )}
        </form>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <>
              <TaskSkeleton />
              <TaskSkeleton />
              <TaskSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-in"
              id="tasks-empty-state"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--color-jade-dim)' }}>
                <Inbox size={32} style={{ color: 'var(--color-jade)' }} />
              </div>
              <div>
                <p className="text-primary font-medium text-lg">
                  {filter === 'done' ? 'No completed tasks' :
                   filter === 'starred' ? 'No favorites yet' :
                   filter === 'overdue' ? 'Nothing overdue! 🎉' :
                   'No tasks here'}
                </p>
                <p className="text-muted text-base mt-1">
                  {filter === 'pending' ? 'Type above to add your first task' : 'Switch filter to see other tasks'}
                </p>
              </div>
            </div>
          ) : (
            filtered.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onStar={handleStar}
                onDelete={handleDelete}
                onEdit={setEditingTask}
                justAdded={justAdded}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEdit}
        />
      )}

      <Confirm
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={confirmDelete}
        title="Delete Task?"
        message="This task will be permanently deleted."
        confirmText="Delete Task"
        variant="danger"
      />
    </div>
  )
}
