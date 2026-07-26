'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PHASES, DSA_TOPICS, MILESTONES } from '@/lib/data/seed';
import { ArrowLeft, ArrowRight, CheckSquare, Square, Target, BookOpen, Flag, Calendar, Loader2 } from 'lucide-react';
import clsx from 'clsx';

type CheckpointRow = {
  phase_id: number;
  item_index: number;
  checked: boolean;
};

export default function PhasePage() {
  const params = useParams();
  const router = useRouter();
  const phaseId = Number(params.id);

  const phase = PHASES.find(p => p.id === phaseId);
  const topics = DSA_TOPICS.filter(t => t.phaseId === phaseId);
  const milestones = MILESTONES.filter(m => m.phaseId === phaseId);

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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
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
  const allChecked = checkedCount === phase.checkpointItems.length;

  const toggleItem = async (idx: number) => {
    const current = isChecked(idx);
    const newValue = !current;

    // Optimistic update
    setCheckpoints(prev => {
      const exists = prev.find(c => c.item_index === idx);
      if (exists) {
        return prev.map(c => c.item_index === idx ? { ...c, checked: newValue } : c);
      }
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
      // revert on error
      setCheckpoints(prev => prev.map(c =>
        c.item_index === idx ? { ...c, checked: current } : c
      ));
    } finally {
      setSaving(null);
    }
  };

  const prevPhase = phaseId > 1 ? phaseId - 1 : null;
  const nextPhase = phaseId < 6 ? phaseId + 1 : null;

  return (
    <div className="min-h-dvh bg-ink">
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-16 space-y-8">

        {/* ── Navigation ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="btn btn-ghost py-2 px-3 h-auto text-sm">
            <ArrowLeft size={14} /> Route
          </button>
          <div className="flex-1" />
          {prevPhase && (
            <button onClick={() => router.push(`/phases/${prevPhase}`)} className="btn btn-ghost py-2 px-3 h-auto text-sm">
              <ArrowLeft size={14} /> P{prevPhase}
            </button>
          )}
          {nextPhase && (
            <button onClick={() => router.push(`/phases/${nextPhase}`)} className="btn btn-ghost py-2 px-3 h-auto text-sm">
              P{nextPhase} <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* ── Phase header ── */}
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted uppercase tracking-widest">
              Phase {String(phaseId).padStart(2, '0')} · Months {phase.monthStart}–{phase.monthEnd}
            </span>
            <span className="badge badge-gold text-[10px]">
              {phase.monthEnd - phase.monthStart + 1} months
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary leading-tight">
            {phase.title}
          </h1>
          <p className="text-secondary font-body">{phase.subtitle}</p>
        </div>

        {/* ── Goals ── */}
        <div className="card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2">
            <Flag size={14} className="text-jade" />
            <span className="text-xs font-mono text-muted uppercase tracking-widest">Goals</span>
          </div>
          <ul className="space-y-2">
            {phase.goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-secondary font-body leading-relaxed">
                <span className="text-jade mt-0.5 shrink-0 font-mono text-xs">→</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>

        {/* ── DSA Topics ── */}
        {topics.length > 0 && (
          <div className="card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-gold" />
                <span className="text-xs font-mono text-muted uppercase tracking-widest">DSA Topics</span>
              </div>
              <span className="text-xs text-muted font-mono">
                {topics.reduce((s, t) => s + t.targetCount, 0)} problems target
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {topics.map(topic => (
                <div key={topic.id} className="card-raised rounded-lg px-3 py-2.5 flex justify-between items-center">
                  <span className="text-sm text-primary font-body">{topic.name}</span>
                  <span className="badge badge-muted font-mono text-[10px]">{topic.targetCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Milestones ── */}
        {milestones.length > 0 && (
          <div className="card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gold" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">Monthly Milestones</span>
            </div>
            <div className="space-y-3">
              {milestones.map(m => (
                <div key={m.monthNumber} className="flex items-start gap-3">
                  <span className="font-mono text-xs text-gold shrink-0 mt-0.5 w-12">mo. {m.monthNumber}</span>
                  <p className="text-sm text-secondary font-body leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Checkpoint ── */}
        <div
          className={clsx(
            'card p-5 space-y-4 transition-all animate-fade-in',
            allChecked ? 'border-jade/40' : 'border-border'
          )}
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className={allChecked ? 'text-jade' : 'text-gold'} />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">
                Phase {phaseId} Checkpoint
              </span>
            </div>
            {loading ? (
              <Loader2 size={12} className="text-jade animate-spin" />
            ) : (
              <span className={clsx('font-mono text-xs', allChecked ? 'text-jade' : 'text-secondary')}>
                {checkedCount}/{phase.checkpointItems.length}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="progress-bar">
            <div
              className={clsx('progress-fill transition-all', allChecked ? 'bg-jade' : 'bg-gold')}
              style={{ width: loading ? '0%' : `${(checkedCount / phase.checkpointItems.length) * 100}%` }}
            />
          </div>

          {/* Checklist items */}
          <div className="space-y-2">
            {phase.checkpointItems.map((item, idx) => {
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
            })}
          </div>

          {/* Completion message */}
          {allChecked && !loading && (
            <div className="pt-3 border-t border-jade/25 animate-fade-in">
              <p className="text-jade text-sm font-body font-medium">
                Phase {phaseId} checkpoint cleared.
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
