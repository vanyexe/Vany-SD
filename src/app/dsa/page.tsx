'use client';

import { useState, useRef, useMemo } from 'react';
import { useDsaProblems, DsaProblem } from '@/lib/hooks/useDsaProblems';
import { DSA_TOPICS, PHASES } from '@/lib/data/seed';
import {
  Clock, Plus, ExternalLink, CheckCheck, ChevronDown, ChevronUp,
  BarChart3, X, Zap, Star, Search, Filter, Edit, Trash2, MoreHorizontal, MessageSquare, List
} from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';

const CURRENT_PHASE = 3;

type Difficulty = 'easy' | 'medium' | 'hard';

export default function DsaPage() {
  const { problems, dueForReview, totalSolved, solvedThisWeek, countByTopic, logProblem, markReviewed, editProblem, deleteProblem } = useDsaProblems();
  const toast = useToast();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState(DSA_TOPICS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [platformUrl, setPlatformUrl] = useState('');
  const [confidence, setConfidence] = useState<number>(3);
  const [timeTaken, setTimeTaken] = useState<string>('');
  const [companies, setCompanies] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<'all' | Difficulty>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'diff' | 'alpha'>('date-desc');
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(10);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DsaProblem>>({});

  // Phase filter (for topic progress)
  const [selectedPhase, setSelectedPhase] = useState<number | 'all'>(CURRENT_PHASE);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([CURRENT_PHASE]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const p = await logProblem({
        topic_id: topicId,
        title: title.trim(),
        difficulty,
        platform_url: platformUrl.trim() || undefined,
        confidence_rating: confidence,
        time_taken_minutes: timeTaken ? parseInt(timeTaken, 10) : undefined,
        companies: companies.trim(),
        notes: notes.trim(),
      });
      setJustAdded(p.id);
      
      // Reset
      setTitle('');
      setPlatformUrl('');
      setConfidence(3);
      setTimeTaken('');
      setCompanies('');
      setNotes('');
      setShowForm(false);
      toast.success('Problem logged successfully!');
      setTimeout(() => setJustAdded(null), 3000);
    } catch (err) {
      toast.error('Failed to log problem');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (p: DsaProblem) => {
    setEditingId(p.id);
    setEditForm({
      title: p.title,
      topic_id: p.topic_id,
      difficulty: p.difficulty,
      platform_url: p.platform_url || '',
      confidence_rating: p.confidence_rating || 3,
      time_taken_minutes: p.time_taken_minutes || null,
      companies: p.companies || '',
      notes: p.notes || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.title?.trim()) return;
    try {
      await editProblem(editingId, {
        title: editForm.title.trim(),
        topic_id: editForm.topic_id,
        difficulty: editForm.difficulty,
        platform_url: editForm.platform_url?.trim() || null,
        confidence_rating: editForm.confidence_rating,
        time_taken_minutes: editForm.time_taken_minutes,
        companies: editForm.companies?.trim() || null,
        notes: editForm.notes?.trim() || null,
      });
      setEditingId(null);
      toast.success('Problem updated!');
    } catch (err) {
      toast.error('Failed to update problem');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this problem?')) {
      try {
        await deleteProblem(id);
        toast.success('Problem deleted');
      } catch (err) {
        toast.error('Failed to delete problem');
      }
    }
  };

  const togglePhaseExpand = (id: number) => {
    setExpandedPhases(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Derived filtered & sorted problems
  const filteredProblems = useMemo(() => {
    let result = problems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q));
    }
    if (diffFilter !== 'all') {
      result = result.filter(p => p.difficulty === diffFilter);
    }
    if (topicFilter !== 'all') {
      result = result.filter(p => p.topic_id === topicFilter);
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === 'date-desc') return new Date(b.date_solved).getTime() - new Date(a.date_solved).getTime();
      if (sortOrder === 'date-asc') return new Date(a.date_solved).getTime() - new Date(b.date_solved).getTime();
      if (sortOrder === 'alpha') return a.title.localeCompare(b.title);
      if (sortOrder === 'diff') {
        const diffWeight = { easy: 1, medium: 2, hard: 3 };
        return diffWeight[b.difficulty] - diffWeight[a.difficulty];
      }
      return 0;
    });

    return result;
  }, [problems, searchQuery, diffFilter, topicFilter, sortOrder]);

  // Statistics calculations
  const avgConfidence = useMemo(() => {
    const withRating = problems.filter(p => p.confidence_rating);
    if (withRating.length === 0) return 0;
    const sum = withRating.reduce((acc, p) => acc + (p.confidence_rating || 0), 0);
    return (sum / withRating.length).toFixed(1);
  }, [problems]);

  const diffCounts = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0 };
    problems.forEach(p => counts[p.difficulty]++);
    return counts;
  }, [problems]);

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type={interactive ? "button" : "button"}
            disabled={!interactive}
            onClick={() => onRate && onRate(star)}
            className={clsx(
              "transition-colors",
              interactive ? "hover:scale-110" : "cursor-default",
              star <= rating ? "text-gold fill-gold" : "text-border"
            )}
          >
            <Star size={interactive ? 18 : 12} fill={star <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-ink">
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-10 space-y-6 flex flex-col md:block">

        {/* ── Header ── */}
        <div className="flex items-start justify-between order-1">
          <div>
            <h1 className="page-title">DSA tracker</h1>
            <p className="text-secondary font-mono text-sm mt-1">
              Master data structures and algorithms
            </p>
          </div>

          <button
            id="log-problem-btn"
            onClick={() => { setShowForm(v => !v); setTimeout(() => titleRef.current?.focus(), 100); }}
            className={clsx('btn text-sm', showForm ? 'btn-ghost' : 'btn-jade')}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            <span className="hidden sm:inline">{showForm ? 'Cancel' : 'Log problem'}</span>
          </button>
        </div>

        {/* ── Log Problem Form ── */}
        {showForm && (
          <form
            id="log-problem-form"
            onSubmit={handleSubmit}
            className="card p-5 space-y-4 animate-scale-in border-jade/30 order-2"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-jade" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">New problem</span>
            </div>

            {/* Title */}
            <div>
              <label className="label">Problem title *</label>
              <input
                ref={titleRef}
                className="input"
                placeholder="e.g. Two Sum, Coin Change..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Topic */}
              <div>
                <label className="label">Topic</label>
                <select
                  className="input"
                  value={topicId}
                  onChange={e => setTopicId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {PHASES.map(phase => (
                    <optgroup key={phase.id} label={`Phase ${phase.id}`}>
                      {DSA_TOPICS.filter(t => t.phaseId === phase.id).map(topic => (
                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Platform URL */}
              <div>
                <label className="label">Link (optional)</label>
                <input
                  className="input"
                  placeholder="leetcode.com/problems/..."
                  value={platformUrl}
                  onChange={e => setPlatformUrl(e.target.value)}
                  type="url"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Difficulty */}
              <div>
                <label className="label">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider border transition-all',
                        difficulty === d
                          ? d === 'easy' ? 'bg-jade/20 border-jade text-jade'
                            : d === 'medium' ? 'bg-gold/20 border-gold text-gold'
                            : 'bg-brick/20 border-brick text-brick'
                          : 'border-border text-muted hover:border-border hover:text-secondary'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence */}
              <div>
                <label className="label">Confidence Rating</label>
                <div className="flex items-center h-9">
                  {renderStars(confidence, true, setConfidence)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Time taken */}
              <div>
                <label className="label">Time Taken (min)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 45"
                  value={timeTaken}
                  onChange={e => setTimeTaken(e.target.value)}
                  min="1"
                />
              </div>

              {/* Companies */}
              <div>
                <label className="label">Companies (comma separated)</label>
                <input
                  className="input"
                  placeholder="e.g. Google, Meta"
                  value={companies}
                  onChange={e => setCompanies(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Solution Notes</label>
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Key insights, patterns used, space/time complexity..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="btn btn-jade w-full"
            >
              {submitting ? 'Logging...' : 'Log problem →'}
            </button>
          </form>
        )}

        {/* ── Due for Review ── */}
        {dueForReview.length > 0 && (
          <div className="card p-5 border-gold/30 space-y-3 animate-fade-in order-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gold" />
              <span className="text-xs font-mono text-gold uppercase tracking-widest">
                Due for review today ({dueForReview.length})
              </span>
            </div>

            <div className="space-y-2">
              {dueForReview.map(problem => {
                const topic = DSA_TOPICS.find(t => t.id === problem.topic_id);
                return (
                  <div
                    key={problem.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-surface-raised group transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={clsx('badge text-[10px]',
                        problem.difficulty === 'easy' ? 'diff-easy' :
                        problem.difficulty === 'medium' ? 'diff-medium' : 'diff-hard'
                      )}>
                        {problem.difficulty[0].toUpperCase()}
                      </span>
                      <span className="text-sm text-primary truncate">{problem.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="badge badge-muted text-[10px] hidden sm:inline-flex">
                        {topic?.name.split(' ').slice(0, 2).join(' ')} · {problem.review_count === 0 ? '7d' : problem.review_count === 1 ? '30d' : '90d'}
                      </span>
                      {problem.platform_url && (
                        <a
                          href={problem.platform_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-jade transition-colors"
                          title="Open problem"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button
                        onClick={() => markReviewed(problem.id)}
                        className="btn btn-ghost text-xs py-1 px-2 h-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Mark reviewed"
                      >
                        <CheckCheck size={12} />
                        Done
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Statistics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 order-4">
          <div className="card p-5 stat-jade flex flex-col justify-center items-center">
            <span className="text-2xl font-mono text-jade font-bold">{totalSolved}</span>
            <span className="text-xs text-muted font-mono uppercase tracking-widest mt-1">Total</span>
          </div>
          <div className="card p-5 stat-gold flex flex-col justify-center items-center">
            <span className="text-2xl font-mono text-gold font-bold">{solvedThisWeek}</span>
            <span className="text-xs text-muted font-mono uppercase tracking-widest mt-1">This Week</span>
          </div>
          <div className="card p-5 stat-brick flex flex-col justify-center items-center">
            <span className={clsx("text-2xl font-mono font-bold", dueForReview.length > 0 ? "text-brick" : "text-primary")}>{dueForReview.length}</span>
            <span className="text-xs text-muted font-mono uppercase tracking-widest mt-1">Reviews</span>
          </div>
          <div className="card p-5 stat-amber flex flex-col justify-center items-center">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-mono text-primary font-bold">{avgConfidence}</span>
              <Star size={16} className="text-gold fill-gold" />
            </div>
            <span className="text-xs text-muted font-mono uppercase tracking-widest mt-1">Avg Conf</span>
          </div>
        </div>

        {/* Difficulty Distribution */}
        {totalSolved > 0 && (
          <div className="card p-5 space-y-2 order-5">
            <div className="flex justify-between text-xs font-mono text-muted">
              <span>Difficulty Split</span>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-raised">
              <div className="bg-jade" style={{ width: `${(diffCounts.easy / totalSolved) * 100}%` }} title={`Easy: ${diffCounts.easy}`} />
              <div className="bg-gold" style={{ width: `${(diffCounts.medium / totalSolved) * 100}%` }} title={`Medium: ${diffCounts.medium}`} />
              <div className="bg-brick" style={{ width: `${(diffCounts.hard / totalSolved) * 100}%` }} title={`Hard: ${diffCounts.hard}`} />
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-1">
              <span className="text-jade">{diffCounts.easy} Easy</span>
              <span className="text-gold">{diffCounts.medium} Medium</span>
              <span className="text-brick">{diffCounts.hard} Hard</span>
            </div>
          </div>
        )}

        {/* ── Problem List with Search & Filters ── */}
        <div className="card p-5 space-y-4 animate-fade-in order-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <List size={14} className="text-primary" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">
                Problem Log
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9 w-full text-sm py-2"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <select
                className="input py-2 text-sm max-w-[120px]"
                value={diffFilter}
                onChange={e => setDiffFilter(e.target.value as any)}
              >
                <option value="all">All Diff</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                className="input py-2 text-sm max-w-[150px]"
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
              >
                <option value="all">All Topics</option>
                {DSA_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select
                className="input py-2 text-sm max-w-[140px]"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="diff">Difficulty</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Problem List */}
          <div className="space-y-3">
            {filteredProblems.slice(0, visibleCount).map(p => {
              const topic = DSA_TOPICS.find(t => t.id === p.topic_id);
              const isEditing = editingId === p.id;

              if (isEditing) {
                return (
                  <form key={p.id} onSubmit={handleEditSubmit} className="p-4 rounded-lg bg-surface-raised border border-jade/30 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono text-jade">Editing Problem</span>
                      <button type="button" onClick={() => setEditingId(null)} className="text-muted hover:text-primary"><X size={14}/></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input text-sm"
                        value={editForm.title || ''}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Title" required
                      />
                      <select
                        className="input text-sm"
                        value={editForm.topic_id || ''}
                        onChange={e => setEditForm({ ...editForm, topic_id: e.target.value })}
                      >
                        {DSA_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <select
                        className="input text-sm"
                        value={editForm.difficulty || ''}
                        onChange={e => setEditForm({ ...editForm, difficulty: e.target.value as Difficulty })}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <input
                        className="input text-sm"
                        value={editForm.platform_url || ''}
                        onChange={e => setEditForm({ ...editForm, platform_url: e.target.value })}
                        placeholder="URL" type="url"
                      />
                      <div>
                        <label className="text-[10px] text-secondary font-mono mb-1 block">Confidence</label>
                        {renderStars(editForm.confidence_rating || 3, true, (r) => setEditForm({...editForm, confidence_rating: r}))}
                      </div>
                      <div>
                        <label className="text-[10px] text-secondary font-mono mb-1 block">Time (min)</label>
                        <input
                          type="number" className="input text-sm"
                          value={editForm.time_taken_minutes || ''}
                          onChange={e => setEditForm({ ...editForm, time_taken_minutes: parseInt(e.target.value) || undefined })}
                        />
                      </div>
                    </div>
                    <input
                      className="input text-sm w-full"
                      value={editForm.companies || ''}
                      onChange={e => setEditForm({ ...editForm, companies: e.target.value })}
                      placeholder="Companies"
                    />
                    <textarea
                      className="input text-sm w-full min-h-[60px]"
                      value={editForm.notes || ''}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Notes..."
                    />
                    <div className="flex gap-2 justify-end mt-2">
                      <button type="button" onClick={() => setEditingId(null)} className="btn btn-ghost text-sm py-1.5">Cancel</button>
                      <button type="submit" className="btn btn-jade text-sm py-1.5">Save Changes</button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={p.id}
                  className={clsx(
                    'flex flex-col gap-2 py-3 px-3 rounded-lg transition-all border border-transparent hover:border-border hover:bg-surface-raised group',
                    justAdded === p.id && 'bg-jade/10 border-jade/50 animate-fade-in'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={clsx('badge text-[10px] shrink-0',
                        p.difficulty === 'easy' ? 'diff-easy' :
                        p.difficulty === 'medium' ? 'diff-medium' : 'diff-hard'
                      )}>
                        {p.difficulty[0].toUpperCase()}
                      </span>
                      <span className="text-sm text-primary font-medium truncate">{p.title}</span>
                      {p.platform_url && (
                        <a href={p.platform_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-jade shrink-0">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startEdit(p)} className="text-muted hover:text-jade p-1"><Edit size={14}/></button>
                      <button onClick={() => handleDelete(p.id)} className="text-muted hover:text-brick p-1"><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted ml-9">
                    <span className="text-secondary">{topic?.name}</span>
                    <span>•</span>
                    <span>{new Date(p.date_solved).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    {p.confidence_rating && (
                      <>
                        <span>•</span>
                        {renderStars(p.confidence_rating)}
                      </>
                    )}
                    {p.time_taken_minutes && (
                      <>
                        <span>•</span>
                        <span>{p.time_taken_minutes}m</span>
                      </>
                    )}
                    {p.companies && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[100px] sm:max-w-[150px]">{p.companies}</span>
                      </>
                    )}
                  </div>
                  
                  {p.notes && (
                    <div className="ml-9 mt-1 text-xs text-secondary bg-surface rounded p-2 border border-border/50 flex items-start gap-2">
                      <MessageSquare size={12} className="text-muted mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{p.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProblems.length === 0 && (
            <div className="text-center py-10">
              <p className="text-secondary font-body">No problems found</p>
            </div>
          )}

          {visibleCount < filteredProblems.length && (
            <button
              onClick={() => setVisibleCount(v => v + 10)}
              className="w-full btn btn-surface text-sm mt-4"
            >
              Load More
            </button>
          )}
        </div>

        {/* ── Progress by topic ── */}
        <div className="card p-5 space-y-4 order-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-jade" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">
                Progress by topic
              </span>
            </div>

            {/* Phase filter */}
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedPhase('all')}
                className={clsx('text-[10px] font-mono px-2 py-1 rounded transition-colors',
                  selectedPhase === 'all' ? 'bg-jade/20 text-jade' : 'text-muted hover:text-secondary'
                )}
              >
                All
              </button>
              {PHASES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhase(p.id)}
                  className={clsx('text-[10px] font-mono px-2 py-1 rounded transition-colors',
                    selectedPhase === p.id ? 'bg-jade/20 text-jade' : 'text-muted hover:text-secondary'
                  )}
                >
                  P{p.id}
                </button>
              ))}
            </div>
          </div>

          {selectedPhase === 'all' ? (
            // Show by phase accordion
            <div className="space-y-2">
              {PHASES.map(phase => {
                const phaseTopics = DSA_TOPICS.filter(t => t.phaseId === phase.id);
                const isExpanded = expandedPhases.includes(phase.id);
                const phaseTotal = phaseTopics.reduce((s, t) => s + t.targetCount, 0);
                const phaseDone = phaseTopics.reduce((s, t) => s + (countByTopic[t.id] || 0), 0);
                const phasePct = phaseTotal > 0 ? Math.min(100, Math.round((phaseDone / phaseTotal) * 100)) : 0;

                return (
                  <div key={phase.id} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => togglePhaseExpand(phase.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-surface-raised/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted hidden sm:inline">Phase {phase.id}</span>
                        <span className="text-sm text-primary font-medium">{phase.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-secondary">
                          {phaseDone}/{phaseTotal}
                        </span>
                        <span className={clsx('font-mono text-xs', phasePct === 100 ? 'text-jade' : 'text-gold')}>
                          {phasePct}%
                        </span>
                        {isExpanded ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-3 space-y-3">
                        {phaseTopics.map(topic => (
                          <TopicProgressBar
                            key={topic.id}
                            topic={topic}
                            solved={countByTopic[topic.id] || 0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Single phase flat list
            <div className="space-y-4">
              {DSA_TOPICS
                .filter(t => t.phaseId === selectedPhase)
                .sort((a, b) => (countByTopic[b.id] || 0) - (countByTopic[a.id] || 0))
                .map(topic => (
                  <TopicProgressBar
                    key={topic.id}
                    topic={topic}
                    solved={countByTopic[topic.id] || 0}
                  />
                ))
              }
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Topic Progress Bar ──
function TopicProgressBar({ topic, solved }: { topic: typeof DSA_TOPICS[0]; solved: number }) {
  const pct = Math.min(100, Math.round((solved / topic.targetCount) * 100));
  const isComplete = solved >= topic.targetCount;
  const isStarted = solved > 0;

  return (
    <div className="space-y-1.5" id={`topic-${topic.id}`}>
      <div className="flex justify-between items-baseline">
        <span className={clsx('text-sm font-body', isComplete ? 'text-jade' : isStarted ? 'text-primary' : 'text-secondary')}>
          {topic.name}
        </span>
        <span className={clsx('font-mono text-xs', isComplete ? 'text-jade' : 'text-secondary')}>
          {solved}/{topic.targetCount}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={clsx('progress-fill', isComplete ? 'bg-jade' : 'bg-jade')}
          style={{ width: `${pct}%`, opacity: isComplete ? 1 : 0.8 }}
        />
      </div>
    </div>
  );
}
