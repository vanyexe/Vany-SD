'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, CheckCircle2, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';

type SessionType = 'work' | 'break';
type Mode = '25/5' | '50/10' | 'custom';

interface FocusSession {
  id: string;
  task_label?: string;
  duration_min: number;
  actual_min: number;
  completed: boolean;
  started_at: string;
}

export default function FocusPage() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('25/5');
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [taskLabel, setTaskLabel] = useState('');
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const getInitialTime = (type: SessionType, m: Mode) => {
    if (m === '25/5')  return type === 'work' ? 25 * 60 : 5 * 60;
    if (m === '50/10') return type === 'work' ? 50 * 60 : 10 * 60;
    return type === 'work' ? customWork * 60 : customBreak * 60;
  };

  // ── Fetch today's sessions ─────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/focus-sessions');
      if (res.ok) {
        const data: FocusSession[] = await res.json();
        // Filter to today
        const today = new Date().toDateString();
        const todaySessions = data.filter(s => new Date(s.started_at).toDateString() === today);
        setSessions(todaySessions);
        setSessionsCompleted(todaySessions.filter(s => s.completed).length);
      }
    } catch {}
    finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Timer logic ────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(getInitialTime(sessionType, mode));
    setIsActive(false);
  }, [mode, sessionType, customWork, customBreak]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      handleSessionComplete();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isActive, timeLeft]);

  // ── Spacebar toggle ────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsActive(p => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Track session start time ───────────────────────────────
  useEffect(() => {
    if (isActive && !sessionStartRef.current) {
      sessionStartRef.current = new Date();
    } else if (!isActive) {
      sessionStartRef.current = null;
    }
  }, [isActive]);

  // ── Save completed session to DB ───────────────────────────
  const saveSession = async (completed: boolean) => {
    const totalTime = getInitialTime(sessionType, mode);
    const actualMin = Math.round((totalTime - timeLeft) / 60);
    try {
      const res = await fetch('/api/focus-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_label: taskLabel.trim() || null,
          duration_min: Math.round(totalTime / 60),
          actual_min: actualMin,
          completed,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        setSessions(prev => [session, ...prev]);
        if (completed) {
          setSessionsCompleted(p => p + 1);
          toast.success(`${sessionType === 'work' ? 'Focus' : 'Break'} session complete!`);
        }
      }
    } catch {}
  };

  const handleSessionComplete = async () => {
    playBeep();
    await saveSession(true);
    setIsActive(false);
    setSessionType(prev => prev === 'work' ? 'break' : 'work');
  };

  // ── Controls ───────────────────────────────────────────────
  const toggleTimer = () => {
    if (!isActive) sessionStartRef.current = new Date();
    setIsActive(p => !p);
  };

  const skipSession = async () => {
    if (isActive) await saveSession(false);
    setIsActive(false);
    setSessionType(prev => prev === 'work' ? 'break' : 'work');
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getInitialTime(sessionType, mode));
    sessionStartRef.current = null;
  };

  // ── Audio ──────────────────────────────────────────────────
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch {}
  };

  // ── Display ────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const totalTime = getInitialTime(sessionType, mode);
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const circleR = 120;
  const circumference = 2 * Math.PI * circleR;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isWork = sessionType === 'work';
  const colorVar = isWork ? 'var(--color-jade)' : 'var(--color-gold)';

  // Today's total focus minutes
  const todayFocusMin = sessions
    .filter(s => s.completed && new Date(s.started_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.actual_min, 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-ink p-4 md:p-8 animate-fade-in relative overflow-hidden">

      {/* ── Mode + Sound controls ── */}
      <div className="absolute top-6 left-4 right-4 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center bg-surface border border-border rounded-xl overflow-hidden">
          {(['25/5', '50/10', 'custom'] as const).map(m => (
            <button
              key={m}
              id={`mode-${m.replace('/', '-')}`}
              onClick={() => setMode(m)}
              className={clsx(
                'px-3 py-1.5 text-xs font-mono transition-colors',
                mode === m ? 'bg-ink text-primary' : 'text-muted hover:text-primary'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          id="btn-sound"
          onClick={() => setSoundEnabled(p => !p)}
          className="p-2 text-muted hover:text-primary bg-surface rounded-xl border border-border transition-colors"
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* ── Custom mode inputs ── */}
      {mode === 'custom' && (
        <div className="absolute top-20 flex gap-3 bg-surface border border-border rounded-xl p-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted font-mono">Work (min)</label>
            <input
              type="number"
              value={customWork}
              onChange={e => setCustomWork(Math.max(1, Math.min(120, Number(e.target.value))))}
              className="w-16 bg-ink border border-border rounded-lg p-1.5 text-center text-sm focus:outline-none focus:border-jade"
              min="1" max="120"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted font-mono">Break (min)</label>
            <input
              type="number"
              value={customBreak}
              onChange={e => setCustomBreak(Math.max(1, Math.min(60, Number(e.target.value))))}
              className="w-16 bg-ink border border-border rounded-lg p-1.5 text-center text-sm focus:outline-none focus:border-gold"
              min="1" max="60"
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-col items-center gap-8 mt-8">
        {/* Session badge */}
        <span className={clsx(
          'px-4 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-widest border',
          isWork
            ? 'text-jade border-jade/30 bg-jade/10'
            : 'text-gold border-gold/30 bg-gold/10'
        )}>
          {isWork ? 'Focus Session' : 'Break Time'}
        </span>

        {/* Task label input */}
        <input
          type="text"
          placeholder="What are you working on? (optional)"
          value={taskLabel}
          onChange={e => setTaskLabel(e.target.value)}
          disabled={isActive}
          className="w-72 bg-surface/50 border border-border rounded-xl px-4 py-2 text-sm text-center text-secondary focus:outline-none focus:border-jade focus:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        />

        {/* Circle timer */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r={circleR} stroke="var(--color-surface-raised)" strokeWidth="5" fill="none" />
            <circle
              cx="130" cy="130" r={circleR}
              stroke={colorVar}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-6xl font-display font-bold tracking-tight" style={{ color: colorVar }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-muted font-mono mt-1">{isActive ? 'running' : 'paused'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button id="btn-reset" onClick={resetTimer} className="p-3 text-muted hover:text-primary transition-colors" title="Reset">
            <RotateCcw size={22} />
          </button>
          <button
            id="btn-play-pause"
            onClick={toggleTimer}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-ink hover:scale-105 transition-transform shadow-xl"
          >
            {isActive ? <Pause size={26} className="fill-current" /> : <Play size={26} className="fill-current ml-1" />}
          </button>
          <button id="btn-skip" onClick={skipSession} className="p-3 text-muted hover:text-primary transition-colors" title="Skip">
            <SkipForward size={22} />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="absolute bottom-6 left-4 right-4 flex items-end justify-between">
        {/* Session dots */}
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-muted font-mono">Session {(sessionsCompleted % 4) + 1} of 4</p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-3 h-3 rounded-full transition-all',
                  i < (sessionsCompleted % 4) ? 'bg-jade' : 'bg-surface-raised border border-border'
                )}
              />
            ))}
          </div>
        </div>

        {/* Today stats */}
        <div className="flex flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
            <CheckCircle2 size={12} className="text-jade" />
            <span>{sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} today</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
            <Clock size={12} className="text-gold" />
            <span>{todayFocusMin} min focused</span>
          </div>
        </div>
      </div>
    </div>
  );
}
