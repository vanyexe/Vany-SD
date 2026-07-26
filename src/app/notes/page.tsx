'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Pin, Star, Trash2, FileText, ChevronLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import Confirm from '@/components/ui/Confirm';

// ── Types ──────────────────────────────────────────────────────
type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'ul' | 'code';
interface Block { id: string; type: BlockType; content: string }

interface Note {
  id: string;
  title: string;
  content?: string;        // DB stores raw text content
  blocks?: Block[];        // client-side rich structure (serialized to/from content)
  preview?: string;
  is_pinned: boolean;
  is_favorite: boolean;
  tags?: string[];
  updated_at: string;
  created_at: string;
}

// Serialize blocks to string for DB storage
function blocksToContent(blocks: Block[]): string {
  return blocks.map(b => {
    if (b.type === 'h1') return `# ${b.content}`;
    if (b.type === 'h2') return `## ${b.content}`;
    if (b.type === 'h3') return `### ${b.content}`;
    if (b.type === 'ul')  return `- ${b.content}`;
    if (b.type === 'code') return `\`\`\`\n${b.content}\n\`\`\``;
    return b.content;
  }).join('\n');
}

// Parse DB content string to blocks
function contentToBlocks(content: string): Block[] {
  if (!content) return [{ id: 'b0', type: 'paragraph', content: '' }];
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const id = `b${i}`;
    if (line.startsWith('# '))  return { id, type: 'h1', content: line.slice(2) };
    if (line.startsWith('## ')) return { id, type: 'h2', content: line.slice(3) };
    if (line.startsWith('### '))return { id, type: 'h3', content: line.slice(4) };
    if (line.startsWith('- ')) return { id, type: 'ul', content: line.slice(2) };
    if (line.startsWith('```')) return { id, type: 'code', content: '' };
    return { id, type: 'paragraph', content: line };
  });
}

// ── Save indicator component ───────────────────────────────────
function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;
  return (
    <div className={clsx(
      'flex items-center gap-1.5 text-xs font-mono transition-all',
      status === 'saving' ? 'text-muted' :
      status === 'saved' ? 'text-jade' :
      'text-brick'
    )}>
      {status === 'saving' && <Loader2 size={11} className="animate-spin" />}
      {status === 'saved' && <Check size={11} />}
      {status === 'error' && <AlertCircle size={11} />}
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Error saving'}
    </div>
  );
}

// ── Notes page ─────────────────────────────────────────────────
export default function NotesPage() {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch notes ─────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data: Note[] = await res.json();
      setNotes(data);
    } catch {
      toast.error('Could not load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ── Load selected note into editor ─────────────────────────
  const selectedNote = notes.find(n => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedNote) {
      setBlocks(contentToBlocks(selectedNote.content ?? ''));
      setSaveStatus('idle');
    }
  }, [selectedId]); // only on ID change

  // ── Auto-save debounced ─────────────────────────────────────
  const autoSave = useCallback(async (noteId: string, updatedBlocks: Block[], title: string) => {
    setSaveStatus('saving');
    const content = blocksToContent(updatedBlocks);
    const preview = updatedBlocks.find(b => b.content)?.content.slice(0, 80) ?? '';
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, preview }),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated: Note = await res.json();
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updated } : n));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const scheduleAutoSave = useCallback((noteId: string, updatedBlocks: Block[], title: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => autoSave(noteId, updatedBlocks, title), 600);
  }, [autoSave]);

  // ── Create ──────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note', content: '', preview: '', is_pinned: false, is_favorite: false }),
      });
      if (!res.ok) throw new Error();
      const newNote: Note = await res.json();
      setNotes(prev => [newNote, ...prev]);
      setSelectedId(newNote.id);
    } catch {
      toast.error('Failed to create note');
    }
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const note = notes.find(n => n.id === id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);

    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Note deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            if (note) {
              const r = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: note.title, content: note.content, preview: note.preview }),
              });
              if (r.ok) {
                const restored = await r.json();
                setNotes(prev => [restored, ...prev]);
              }
            }
          }
        }
      });
    } catch {
      toast.error('Failed to delete note');
      if (note) setNotes(prev => [note, ...prev]);
    }
  };

  // ── Pin / Favorite ──────────────────────────────────────────
  const handleTogglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const updated = { ...note, is_pinned: !note.is_pinned };
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: updated.is_pinned }),
    });
  };

  const handleToggleFavorite = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const updated = { ...note, is_favorite: !note.is_favorite };
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: updated.is_favorite }),
    });
  };

  // ── Block editor handlers ───────────────────────────────────
  const handleTitleChange = (title: string) => {
    if (!selectedNote) return;
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, title } : n));
    scheduleAutoSave(selectedNote.id, blocks, title);
  };

  const handleBlockChange = (blockId: string, content: string) => {
    if (!selectedNote) return;
    const newBlocks = blocks.map(b => b.id === blockId ? { ...b, content } : b);
    setBlocks(newBlocks);
    scheduleAutoSave(selectedNote.id, newBlocks, selectedNote.title);
  };

  const addBlock = (afterId: string, type: BlockType = 'paragraph') => {
    if (!selectedNote) return;
    const idx = blocks.findIndex(b => b.id === afterId);
    const newBlock: Block = { id: `b${Date.now()}`, type, content: '' };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    setBlocks(newBlocks);
    scheduleAutoSave(selectedNote.id, newBlocks, selectedNote.title);
    setTimeout(() => document.getElementById(`block-${newBlock.id}`)?.focus(), 30);
  };

  const removeBlock = (blockId: string) => {
    if (!selectedNote || blocks.length <= 1) return;
    const newBlocks = blocks.filter(b => b.id !== blockId);
    setBlocks(newBlocks);
    scheduleAutoSave(selectedNote.id, newBlocks, selectedNote.title);
  };

  const changeBlockType = (blockId: string, type: BlockType) => {
    if (!selectedNote) return;
    const newBlocks = blocks.map(b => b.id === blockId ? { ...b, type } : b);
    setBlocks(newBlocks);
    scheduleAutoSave(selectedNote.id, newBlocks, selectedNote.title);
  };

  // ── Filter + sort ──────────────────────────────────────────
  const filteredNotes = notes
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()) ||
                 (n.content ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div className="flex h-dvh bg-ink text-white overflow-hidden animate-fade-in">

      {/* ── Sidebar ── */}
      <aside className={clsx(
        'w-full md:w-72 lg:w-80 shrink-0 border-r border-border bg-surface flex flex-col',
        'absolute md:relative h-full z-20 transition-transform duration-300',
        selectedId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      )}>
        <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl text-primary font-semibold">Notes</h1>
            <button
              id="btn-create-note"
              onClick={handleCreate}
              className="btn btn-jade btn-sm flex items-center gap-1"
            >
              <Plus size={14} /> New
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="search-notes"
              type="text"
              placeholder="Search notes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-9 text-sm py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText size={36} className="text-muted opacity-30" />
              <p className="text-sm text-muted">{search ? 'No notes match your search' : 'No notes yet'}</p>
              {!search && (
                <button onClick={handleCreate} className="btn btn-jade btn-sm">
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                id={`note-${note.id}`}
                onClick={() => setSelectedId(note.id)}
                className={clsx(
                  'p-4 border-b border-border cursor-pointer hover:bg-surface-raised transition-colors group',
                  selectedId === note.id && 'bg-surface-raised border-l-2 border-l-jade'
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-sm text-primary truncate pr-2 leading-snug">{note.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.is_pinned && <Pin size={11} className="text-jade" />}
                    {note.is_favorite && <Star size={11} className="text-gold fill-gold" />}
                  </div>
                </div>
                <p className="text-xs text-muted line-clamp-2 mb-2 leading-relaxed">{note.preview || note.content?.slice(0, 80) || 'No content…'}</p>
                <div className="text-[10px] text-muted/60 font-mono">
                  {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Editor ── */}
      <main className={clsx(
        'flex-1 h-dvh flex flex-col bg-ink overflow-hidden',
        'absolute md:relative w-full z-10 transition-transform duration-300',
        !selectedId ? 'translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto' : 'translate-x-0'
      )}>
        {selectedNote ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Toolbar */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <button
                id="btn-back-notes"
                onClick={() => setSelectedId(null)}
                className="md:hidden flex items-center gap-1.5 text-sm text-muted hover:text-primary"
              >
                <ChevronLeft size={16} /> Notes
              </button>
              <div className="flex items-center gap-1 ml-auto">
                <SaveIndicator status={saveStatus} />
                <button
                  id="btn-pin-note"
                  onClick={() => handleTogglePin(selectedNote.id)}
                  title={selectedNote.is_pinned ? 'Unpin' : 'Pin'}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    selectedNote.is_pinned ? 'text-jade bg-jade/10' : 'text-muted hover:bg-surface-raised hover:text-primary'
                  )}
                >
                  <Pin size={16} />
                </button>
                <button
                  id="btn-fav-note"
                  onClick={() => handleToggleFavorite(selectedNote.id)}
                  title={selectedNote.is_favorite ? 'Unfavorite' : 'Favorite'}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    selectedNote.is_favorite ? 'text-gold bg-gold/10' : 'text-muted hover:bg-surface-raised hover:text-primary'
                  )}
                >
                  <Star size={16} className={selectedNote.is_favorite ? 'fill-current' : ''} />
                </button>
                <button
                  id="btn-delete-note"
                  onClick={() => setConfirmDeleteId(selectedNote.id)}
                  className="p-2 rounded-lg text-muted hover:bg-surface-raised hover:text-brick transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </header>

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto px-5 md:px-16 pb-24 pt-8 max-w-3xl mx-auto w-full">
              {/* Title */}
              <input
                id="note-title-input"
                type="text"
                value={selectedNote.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Note title…"
                className="w-full bg-transparent border-none text-3xl md:text-4xl font-display font-bold text-primary mb-8 focus:outline-none placeholder-muted/30"
              />

              {/* Blocks */}
              <div className="flex flex-col gap-1.5">
                {blocks.map((block, idx) => (
                  <div key={block.id} className="group/block relative flex items-start gap-2">
                    {/* Type switcher */}
                    <div className="absolute -left-6 top-1.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                      <select
                        value={block.type}
                        onChange={e => changeBlockType(block.id, e.target.value as BlockType)}
                        className="text-[10px] bg-surface border border-border rounded px-1 py-0.5 text-muted cursor-pointer focus:outline-none"
                      >
                        <option value="paragraph">¶ Text</option>
                        <option value="h1">H1</option>
                        <option value="h2">H2</option>
                        <option value="h3">H3</option>
                        <option value="ul">• List</option>
                        <option value="code">{'<>'} Code</option>
                      </select>
                    </div>

                    {/* Block input */}
                    {block.type === 'code' ? (
                      <pre className="w-full bg-surface-raised rounded-xl p-4 font-mono text-sm text-jade overflow-x-auto border border-border">
                        <textarea
                          id={`block-${block.id}`}
                          value={block.content}
                          onChange={e => handleBlockChange(block.id, e.target.value)}
                          className="w-full bg-transparent outline-none resize-none min-h-[80px] text-jade"
                          placeholder="// Code…"
                        />
                      </pre>
                    ) : block.type === 'ul' ? (
                      <div className="flex items-start gap-2 w-full">
                        <span className="text-jade mt-1 shrink-0">•</span>
                        <input
                          id={`block-${block.id}`}
                          value={block.content}
                          onChange={e => handleBlockChange(block.id, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); addBlock(block.id, 'ul'); }
                            if (e.key === 'Backspace' && block.content === '') { e.preventDefault(); removeBlock(block.id); }
                          }}
                          className={clsx('w-full bg-transparent outline-none text-secondary focus:text-primary transition-colors py-0.5')}
                          placeholder="List item…"
                        />
                      </div>
                    ) : (
                      <input
                        id={`block-${block.id}`}
                        value={block.content}
                        onChange={e => handleBlockChange(block.id, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); addBlock(block.id); }
                          if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
                            e.preventDefault();
                            removeBlock(block.id);
                            setTimeout(() => {
                              const prevId = blocks[idx - 1]?.id;
                              if (prevId) document.getElementById(`block-${prevId}`)?.focus();
                            }, 30);
                          }
                        }}
                        className={clsx(
                          'w-full bg-transparent outline-none transition-colors py-0.5',
                          block.type === 'h1' ? 'text-2xl font-bold text-primary mt-4 mb-1' :
                          block.type === 'h2' ? 'text-xl font-semibold text-primary mt-3 mb-0.5' :
                          block.type === 'h3' ? 'text-lg font-medium text-primary mt-2' :
                          'text-secondary focus:text-primary'
                        )}
                        placeholder={
                          block.type === 'h1' ? 'Heading 1' :
                          block.type === 'h2' ? 'Heading 2' :
                          block.type === 'h3' ? 'Heading 3' :
                          idx === 0 ? 'Start writing…' : ''
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 text-muted">
            <FileText size={64} className="opacity-15" />
            <p className="text-sm">Select a note or create a new one</p>
            <button id="btn-create-note-center" onClick={handleCreate} className="btn btn-jade">
              <Plus size={14} className="mr-1" /> New Note
            </button>
          </div>
        )}
      </main>

      {/* ── Delete Confirm ── */}
      <Confirm
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) await handleDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        title="Delete Note?"
        message="This note will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
