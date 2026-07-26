'use client'
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, CheckSquare, Target, Activity, Code, Clock } from 'lucide-react';
import clsx from 'clsx';

interface CommandResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'Task' | 'DSA' | 'Note' | 'Phase' | 'Habit';
  url: string;
}

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined);

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
};

// We wrap it in a provider for global usage if needed, but it can also be self-contained
export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      {open && <CommandPalette onClose={() => setOpen(false)} />}
    </CommandPaletteContext.Provider>
  );
};

// Self contained component as requested, could also use the provider above
export default function CommandPalette({ onClose }: { onClose?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(true); // if used without provider
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<CommandResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isOpen = onClose ? true : internalOpen;
  const close = onClose || (() => setInternalOpen(false));

  useEffect(() => {
    if (!onClose) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setInternalOpen(prev => !prev);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
      
      const stored = localStorage.getItem('vany_cmd_recent');
      if (stored) {
        try {
          setRecentItems(JSON.parse(stored));
        } catch (e) {}
      }
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setSelectedIndex(0);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Mock fetch for now, replace with actual API call
        // const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        // const data = await res.json();
        // setResults(data);
        
        // Mock data
        const mockData: CommandResult[] = [
          { id: '1', title: 'Implement React Query', subtitle: 'Frontend Phase', type: 'Task', url: '/tasks/1' },
          { id: '2', title: 'Two Sum', subtitle: 'Arrays & Hashing', type: 'DSA', url: '/dsa/two-sum' },
          { id: '3', title: 'Next.js 14 App Router Notes', subtitle: 'Web Dev', type: 'Note', url: '/notes/next14' },
        ];
        setResults(mockData.filter(item => item.title.toLowerCase().includes(query.toLowerCase())));
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const displayItems = query.trim() ? results : recentItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, displayItems.length]);

  const handleNavigate = (item: CommandResult) => {
    const newRecent = [item, ...recentItems.filter(r => r.id !== item.id)].slice(0, 5);
    setRecentItems(newRecent);
    localStorage.setItem('vany_cmd_recent', JSON.stringify(newRecent));
    
    // Perform navigation (replace with router.push in real app)
    window.location.href = item.url;
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < displayItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : displayItems.length - 1));
    } else if (e.key === 'Enter' && displayItems.length > 0) {
      e.preventDefault();
      handleNavigate(displayItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Task': return <CheckSquare className="w-4 h-4 text-jade" style={{ color: 'var(--color-jade)' }}/>;
      case 'DSA': return <Code className="w-4 h-4 text-gold" style={{ color: 'var(--color-gold)' }}/>;
      case 'Note': return <FileText className="w-4 h-4 text-primary" style={{ color: 'var(--color-primary)' }}/>;
      case 'Phase': return <Target className="w-4 h-4 text-brick" style={{ color: 'var(--color-brick)' }}/>;
      case 'Habit': return <Activity className="w-4 h-4 text-jade" style={{ color: 'var(--color-jade)' }}/>;
      default: return <FileText className="w-4 h-4 text-muted" />;
    }
  };

  return createPortal(
    <div className="command-overlay fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm p-4 sm:p-12 pt-[10vh] sm:pt-[20vh] animate-fade-in-fast" onClick={close}>
      <div 
        className="command-panel mx-auto max-w-xl bg-surface rounded-xl shadow-2xl border border-border overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-border" role="combobox" aria-controls="command-palette-listbox" aria-expanded={isOpen}>
          <Search className="w-5 h-5 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-0 py-4 pl-3 pr-4 text-primary focus:ring-0 placeholder:text-muted focus:outline-none"
            placeholder="Search tasks, notes, DSA problems... (Cmd+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <div className="w-4 h-4 rounded-full border-2 border-border border-t-jade animate-spin" style={{ borderTopColor: 'var(--color-jade)' }}></div>}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() && recentItems.length > 0 && (
            <div className="px-3 py-2 text-xs font-medium text-muted flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Recent Searches
            </div>
          )}

          {displayItems.length === 0 ? (
            <div className="py-12 text-center text-muted">
              {query.trim() ? 'No results found.' : 'Type to start searching...'}
            </div>
          ) : (
            <ul role="listbox">
              {displayItems.map((item, index) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors",
                    index === selectedIndex ? "bg-surface-hover" : "hover:bg-surface-hover/50"
                  )}
                  onClick={() => handleNavigate(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="shrink-0 p-1 bg-surface-raised rounded-md">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="text-sm font-medium text-primary truncate">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted truncate">{item.subtitle}</span>}
                  </div>
                  <div className="shrink-0">
                    <span className="badge badge-muted text-[10px] uppercase tracking-wider">{item.type}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="px-4 py-3 bg-surface-raised border-t border-border flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-surface px-1.5 py-0.5 rounded border border-border font-sans">↑</kbd> <kbd className="bg-surface px-1.5 py-0.5 rounded border border-border font-sans">↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-surface px-1.5 py-0.5 rounded border border-border font-sans">↵</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="bg-surface px-1.5 py-0.5 rounded border border-border font-sans">Esc</kbd> to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
