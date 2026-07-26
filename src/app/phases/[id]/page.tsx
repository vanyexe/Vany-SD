'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PHASES, DSA_TOPICS, MILESTONES, Phase, Milestone } from '@/lib/data/seed';
import {
  ArrowLeft, ArrowRight, CheckSquare, Square, Target, BookOpen, Flag,
  Calendar, Loader2, Pencil, Check, X, Plus, Trash2, GripVertical
} from 'lucide-react';
import clsx from 'clsx';

type CheckpointRow = { phase_id: number; item_index: number; checked: boolean };

// ── Per-phase overrides stored in localStorage ──────────────────────────
type PhaseOverride = {
  title?: string;
  subtitle?: string;
  goals?: string[];
  checkpointItems?: { label: string; done: boolean }[];
  milestones?: { monthNumber: number; description: string }[];
};

function loadOverride(phaseId: number): PhaseOverride {
  try {
    const raw = localStorage.getItem(`vyra_phase_override_${phaseId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOverride(phaseId: number, override: PhaseOverride) {
  localStorage.setItem(`vyra_phase_override_${phaseId}`, JSON.stringify(override));
}

// ── Small helper: editable text field ────────────────────────────────────
function EditableText({
  value,
  onChange,
  className,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={clsx(
          'w-full bg-surface-raised border border-jade/40 rounded-lg px-3 py-2 text-primary font-body resize-none focus:outline-none focus:border-jade transition-colors',
          className
        )}
      />
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        'w-full bg-surface-raised border border-jade/40 rounded-lg px-3 py-2 text-primary font-body focus:outline-none focus:border-jade transition-colors',
        className
      )}
    />
  );
}

export default function PhasePage() {
  const params = useParams();
  const router = useRouter();
  const phaseId = Number(params.id);

  const seedPhase = PHASES.find(p => p.id === phaseId);
  const seedTopics = DSA_TOPICS.filter(t => t.phaseId === phaseId);
  const seedMilestones = MILESTONES.filter(m => m.phaseId === phaseId);

  // ── Edit mode state ──
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<PhaseOverride>({});

  // ── Merged (override + seed) data ──
  const [override, setOverride] = useState<PhaseOverride>({});

  useEffect(() => {
    const o = loadOverride(phaseId);
    setOverride(o);
  }, [phaseId]);

  const phase: Phase | undefined = seedPhase
    ? {
        ...seedPhase,
        title: override.title ?? seedPhase.title,
        subtitle: override.subtitle ?? seedPhase.subtitle,
        goals: override.goals ?? seedPhase.goals,
        checkpointItems: override.checkpointItems ?? seedPhase.checkpointItems,
      }
    : undefined;

  const milestones: Milestone[] = override.milestones
    ? override.milestones.map(m => ({ ...m, phaseId }))
    : seedMilestones;

  // ── Checkpoints ──
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/checkpoints?phase_id=${phaseId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: CheckpointRow[] = await res.json();
        setCheckpoints(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchCheckpoints();
  }, [phaseId]);

  if (!phase) {
    return (
      <div className="min-h-dvh bg-ink flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary font-body">Phase not found</p>
          <button onClick={() => router.push('/')} className="btn btn-ghost mt-4">← Back</button>
        </div>
      </div>
    );
  }

  const isChecked = (idx: number) =>
    checkpoints.find(c => c.item_index === idx)?.checked ?? false;

  const checkedCount = phase.checkpointItems.filter((_, i) => isChecked(i)).length;
  const allChecked = phase.checkpointItems.length > 0 && checkedCount === phase.checkpointItems.length;

  const toggleItem = async (idx: number) => {
    const current = isChecked(idx);
    const newValue = !current;
    setCheckpoints(prev => {
      const exists = prev.find(c => c.item_index === idx);
      if (exists) return prev.map(c => c.item_index === idx ? { ...c, checked: newValue } : c);
      return [...prev, { phase_id: phaseId, item_index: idx, checked: newValue }];
    });
    setSaving(idx);
    try {
      await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, item_index: idx, checked: newValue }),
      });
    } catch (e) {
      console.error(e);
      setCheckpoints(prev => prev.map(c => c.item_index === idx ? { ...c, checked: current } : c));
    } finally { setSaving(null); }
  };

  const prevPhase = phaseId > 1 ? phaseId - 1 : null;
  const nextPhase = phaseId < 6 ? phaseId + 1 : null;

  // ── Edit mode helpers ──
  const enterEdit = () => {
    setDraft({
      title: phase.title,
      subtitle: phase.subtitle,
      goals: [...phase.goals],
      checkpointItems: phase.checkpointItems.map(i => ({ ...i })),
      milestones: milestones.map(m => ({ monthNumber: m.monthNumber, description: m.description })),
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraft({});
  };

  const saveEdit = () => {
    const newOverride: PhaseOverride = {
      title: draft.title,
      subtitle: draft.subtitle,
      goals: draft.goals,
      checkpointItems: draft.checkpointItems,
      milestones: draft.milestones,
    };
    saveOverride(phaseId, newOverride);
    setOverride(newOverride);
    setEditMode(false);
    setDraft({});
  };

  const resetToDefault = () => {
    if (!confirm('Reset this phase to default content?')) return;
    localStorage.removeItem(`vyra_phase_override_${phaseId}`);
    setOverride({});
    setEditMode(false);
    setDraft({});
  };

  // Draft field helpers
  const setDraftGoal = (i: number, val: string) =>
    setDraft(d => ({ ...d, goals: d.goals?.map((g, gi) => gi === i ? val : g) }));
  const addDraftGoal = () =>
    setDraft(d => ({ ...d, goals: [...(d.goals || []), ''] }));
  const removeDraftGoal = (i: number) =>
    setDraft(d => ({ ...d, goals: d.goals?.filter((_, gi) => gi !== i) }));

  const setDraftCheckpoint = (i: number, val: string) =>
    setDraft(d => ({ ...d, checkpointItems: d.checkpointItems?.map((c, ci) => ci === i ? { ...c, label: val } : c) }));
  const addDraftCheckpoint = () =>
    setDraft(d => ({ ...d, checkpointItems: [...(d.checkpointItems || []), { label: '', done: false }] }));
  const removeDraftCheckpoint = (i: number) =>
    setDraft(d => ({ ...d, checkpointItems: d.checkpointItems?.filter((_, ci) => ci !== i) }));

  const setDraftMilestoneDesc = (i: number, val: string) =>
    setDraft(d => ({ ...d, milestones: d.milestones?.map((m, mi) => mi === i ? { ...m, description: val } : m) }));
  const addDraftMilestone = () => {
    const lastMonth = (draft.milestones?.at(-1)?.monthNumber ?? (seedPhase?.monthStart ?? 1) - 1);
    setDraft(d => ({ ...d, milestones: [...(d.milestones || []), { monthNumber: lastMonth + 1, description: '' }] }));
  };
  const setDraftMilestoneMonth = (i: number, val: number) =>
    setDraft(d => ({ ...d, milestones: d.milestones?.map((m, mi) => mi === i ? { ...m, monthNumber: val } : m) }));
  const removeDraftMilestone = (i: number) =>
    setDraft(d => ({ ...d, milestones: d.milestones?.filter((_, mi) => mi !== i) }));

  return (
    <div className="min-h-dvh bg-ink">
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-16 space-y-8">

        {/* ── Navigation ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="btn btn-ghost py-2 px-3 h-auto text-sm">
            <ArrowLeft size={14} /> Route
          </button>
          <div className="flex-1" />
          {!editMode && (
            <button
              id="btn-edit-phase"
              onClick={enterEdit}
              className="btn btn-ghost py-2 px-3 h-auto text-sm text-jade border border-jade/30 hover:bg-jade/10 flex items-center gap-1.5"
            >
              <Pencil size={13} /> Edit Phase
            </button>
          )}
          {editMode && (
            <div className="flex items-center gap-2">
              <button onClick={resetToDefault} className="btn btn-ghost py-2 px-3 h-auto text-xs text-brick">
                Reset to Default
              </button>
              <button onClick={cancelEdit} className="btn btn-ghost py-2 px-3 h-auto text-sm flex items-center gap-1">
                <X size={13} /> Cancel
              </button>
              <button
                onClick={saveEdit}
                className="btn py-2 px-4 h-auto text-sm bg-jade text-ink font-semibold flex items-center gap-1.5 hover:bg-jade/90 rounded-lg transition-colors"
              >
                <Check size={13} /> Save
              </button>
            </div>
          )}
          {prevPhase && !editMode && (
            <button onClick={() => router.push(`/phases/${prevPhase}`)} className="btn btn-ghost py-2 px-3 h-auto text-sm">
              <ArrowLeft size={14} /> P{prevPhase}
            </button>
          )}
          {nextPhase && !editMode && (
            <button onClick={() => router.push(`/phases/${nextPhase}`)} className="btn btn-ghost py-2 px-3 h-auto text-sm">
              P{nextPhase} <ArrowRight size={14} />
            </button>
          )}
        </div>

        {editMode && (
          <div className="bg-jade/8 border border-jade/25 rounded-xl px-4 py-3 text-jade text-sm font-body flex items-center gap-2 animate-fade-in">
            <Pencil size={14} />
            Editing phase — changes are saved locally and override the defaults.
          </div>
        )}

        {/* ── Phase header ── */}
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted uppercase tracking-widest">
              Phase {String(phaseId).padStart(2, '0')} · Months {seedPhase!.monthStart}–{seedPhase!.monthEnd}
            </span>
            <span className="badge badge-gold text-[10px]">
              {seedPhase!.monthEnd - seedPhase!.monthStart + 1} months
            </span>
          </div>
          {editMode ? (
            <div className="space-y-2">
              <EditableText
                value={draft.title ?? ''}
                onChange={v => setDraft(d => ({ ...d, title: v }))}
                placeholder="Phase title"
                className="text-xl font-display font-semibold"
              />
              <EditableText
                value={draft.subtitle ?? ''}
                onChange={v => setDraft(d => ({ ...d, subtitle: v }))}
                placeholder="Phase subtitle"
                className="text-sm"
              />
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary leading-tight">
                {phase.title}
              </h1>
              <p className="text-secondary font-body">{phase.subtitle}</p>
            </>
          )}
        </div>

        {/* ── Goals ── */}
        <div className="card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-jade" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">Goals</span>
            </div>
            {editMode && (
              <button
                onClick={addDraftGoal}
                className="flex items-center gap-1 text-xs text-jade hover:text-jade/80 transition-colors"
              >
                <Plus size={12} /> Add Goal
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {editMode
              ? (draft.goals ?? []).map((goal, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <EditableText
                      value={goal}
                      onChange={v => setDraftGoal(i, v)}
                      placeholder={`Goal ${i + 1}`}
                      className="text-sm"
                    />
                    <button
                      onClick={() => removeDraftGoal(i)}
                      className="shrink-0 mt-2 text-muted hover:text-brick transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))
              : phase.goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-secondary font-body leading-relaxed">
                    <span className="text-jade mt-0.5 shrink-0 font-mono text-xs">→</span>
                    {goal}
                  </li>
                ))
            }
          </ul>
        </div>

        {/* ── DSA Topics (read-only always) ── */}
        {seedTopics.length > 0 && (
          <div className="card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-gold" />
                <span className="text-xs font-mono text-muted uppercase tracking-widest">DSA Topics</span>
              </div>
              <span className="text-xs text-muted font-mono">
                {seedTopics.reduce((s, t) => s + t.targetCount, 0)} problems target
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {seedTopics.map(topic => (
                <div key={topic.id} className="card-raised rounded-lg px-3 py-2.5 flex justify-between items-center">
                  <span className="text-sm text-primary font-body">{topic.name}</span>
                  <span className="badge badge-muted font-mono text-[10px]">{topic.targetCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Milestones ── */}
        {(milestones.length > 0 || editMode) && (
          <div className="card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gold" />
                <span className="text-xs font-mono text-muted uppercase tracking-widest">Monthly Milestones</span>
              </div>
              {editMode && (
                <button
                  onClick={addDraftMilestone}
                  className="flex items-center gap-1 text-xs text-jade hover:text-jade/80 transition-colors"
                >
                  <Plus size={12} /> Add Month
                </button>
              )}
            </div>
            <div className="space-y-3">
              {editMode
                ? (draft.milestones ?? []).map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-[10px] text-muted font-mono">mo.</span>
                        <input
                          type="number"
                          value={m.monthNumber}
                          onChange={e => setDraftMilestoneMonth(i, Number(e.target.value))}
                          className="w-12 bg-surface-raised border border-jade/40 rounded px-1 py-1 text-xs text-gold font-mono text-center focus:outline-none focus:border-jade"
                        />
                      </div>
                      <EditableText
                        value={m.description}
                        onChange={v => setDraftMilestoneDesc(i, v)}
                        placeholder="Milestone description"
                        multiline
                        className="text-sm"
                      />
                      <button
                        onClick={() => removeDraftMilestone(i)}
                        className="shrink-0 mt-1 text-muted hover:text-brick transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                : milestones.map(m => (
                    <div key={m.monthNumber} className="flex items-start gap-3">
                      <span className="font-mono text-xs text-gold shrink-0 mt-0.5 w-12">mo. {m.monthNumber}</span>
                      <p className="text-sm text-secondary font-body leading-relaxed">{m.description}</p>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── Checkpoint ── */}
        <div
          className={clsx(
            'card p-5 space-y-4 transition-all animate-fade-in',
            allChecked && !editMode ? 'border-jade/40' : 'border-border'
          )}
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className={allChecked && !editMode ? 'text-jade' : 'text-gold'} />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">
                Phase {phaseId} Checkpoint
              </span>
            </div>
            <div className="flex items-center gap-3">
              {editMode && (
                <button
                  onClick={addDraftCheckpoint}
                  className="flex items-center gap-1 text-xs text-jade hover:text-jade/80 transition-colors"
                >
                  <Plus size={12} /> Add Item
                </button>
              )}
              {loading ? (
                <Loader2 size={12} className="text-jade animate-spin" />
              ) : (
                <span className={clsx('font-mono text-xs', allChecked && !editMode ? 'text-jade' : 'text-secondary')}>
                  {checkedCount}/{phase.checkpointItems.length}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!editMode && (
            <div className="progress-bar">
              <div
                className={clsx('progress-fill transition-all', allChecked ? 'bg-jade' : 'bg-gold')}
                style={{ width: loading ? '0%' : `${phase.checkpointItems.length ? (checkedCount / phase.checkpointItems.length) * 100 : 0}%` }}
              />
            </div>
          )}

          {/* Checklist items */}
          <div className="space-y-2">
            {editMode
              ? (draft.checkpointItems ?? []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <GripVertical size={14} className="text-muted shrink-0" />
                    <EditableText
                      value={item.label}
                      onChange={v => setDraftCheckpoint(idx, v)}
                      placeholder={`Checkpoint item ${idx + 1}`}
                      className="text-sm"
                    />
                    <button
                      onClick={() => removeDraftCheckpoint(idx)}
                      className="shrink-0 text-muted hover:text-brick transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              : phase.checkpointItems.map((item, idx) => {
                  const checked = isChecked(idx);
                  const isSaving = saving === idx;
                  return (
                    <button
                      key={idx}
                      id={`checkpoint-${phaseId}-${idx}`}
                      onClick={() => !isSaving && toggleItem(idx)}
                      disabled={loading || isSaving}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left group',
                        checked ? 'bg-jade/10 text-jade' : 'text-secondary hover:text-primary hover:bg-surface-raised',
                        (loading || isSaving) && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <span className="shrink-0">
                        {isSaving
                          ? <Loader2 size={16} className="text-jade animate-spin" />
                          : checked
                          ? <CheckSquare size={16} className="text-jade" />
                          : <Square size={16} className="text-muted group-hover:text-secondary" />
                        }
                      </span>
                      <span className={clsx('text-sm font-body', checked && 'line-through opacity-70')}>
                        {item.label}
                      </span>
                    </button>
                  );
                })
            }
          </div>

          {/* Completion message */}
          {allChecked && !loading && !editMode && (
            <div className="pt-3 border-t border-jade/25 animate-fade-in">
              <p className="text-jade text-sm font-body font-medium">
                Phase {phaseId} checkpoint cleared. 🎉
              </p>
              {nextPhase && (
                <button
                  id="advance-phase"
                  onClick={() => router.push(`/phases/${nextPhase}`)}
                  className="btn btn-jade text-sm mt-3"
                >
                  On to Phase {nextPhase} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
