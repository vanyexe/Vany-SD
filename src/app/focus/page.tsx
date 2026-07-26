'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, CheckCircle2, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';

type SessionType = 'work' | 'break';
type Mode = '25/5' | '50/10' | 'custom';

import { useFocusTimer } from '@/components/providers/FocusTimerProvider';

export default function FocusPage() {
  const {
    mode, setMode,
    sessionType,
    timeLeft, isActive, sessionsCompleted,
    soundEnabled, setSoundEnabled,
    customWork, setCustomWork,
    customBreak, setCustomBreak,
    taskLabel, setTaskLabel,
    sessions,
    toggleTimer, skipSession, resetTimer, getInitialTime
  } = useFocusTimer();

  // ── Spacebar toggle ────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggleTimer();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleTimer]);


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
              value={customWork || ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '') setCustomWork(0);
                else setCustomWork(Math.min(120, parseInt(val, 10) || 0));
              }}
              className="w-16 bg-ink border border-border rounded-lg p-1.5 text-center text-sm focus:outline-none focus:border-jade"
              min="1" max="120"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted font-mono">Break (min)</label>
            <input
              type="number"
              value={customBreak || ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '') setCustomBreak(0);
                else setCustomBreak(Math.min(60, parseInt(val, 10) || 0));
              }}
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
