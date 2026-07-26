'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/providers/ToastProvider';

type SessionType = 'work' | 'break';
type Mode = '25/5' | '50/10' | 'custom';

export interface FocusSession {
  id: string;
  task_label?: string;
  duration_min: number;
  actual_min: number;
  completed: boolean;
  started_at: string;
}

interface FocusTimerContextType {
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  sessionType: SessionType;
  setSessionType: React.Dispatch<React.SetStateAction<SessionType>>;
  timeLeft: number;
  isActive: boolean;
  sessionsCompleted: number;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  customWork: number;
  setCustomWork: React.Dispatch<React.SetStateAction<number>>;
  customBreak: number;
  setCustomBreak: React.Dispatch<React.SetStateAction<number>>;
  taskLabel: string;
  setTaskLabel: React.Dispatch<React.SetStateAction<string>>;
  sessions: FocusSession[];
  loadingSessions: boolean;
  toggleTimer: () => void;
  skipSession: () => void;
  resetTimer: () => void;
  getInitialTime: (type: SessionType, m: Mode) => number;
}

const FocusTimerContext = createContext<FocusTimerContextType | undefined>(undefined);

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
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

  const getInitialTime = useCallback((type: SessionType, m: Mode) => {
    if (m === '25/5')  return type === 'work' ? 25 * 60 : 5 * 60;
    if (m === '50/10') return type === 'work' ? 50 * 60 : 10 * 60;
    return type === 'work' ? customWork * 60 : customBreak * 60;
  }, [customWork, customBreak]);

  // Fetch today's sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/focus-sessions');
      if (res.ok) {
        const data: FocusSession[] = await res.json();
        const today = new Date().toDateString();
        const todaySessions = data.filter(s => new Date(s.started_at).toDateString() === today);
        setSessions(todaySessions);
        setSessionsCompleted(todaySessions.filter(s => s.completed).length);
      }
    } catch {}
    finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  function playBeep() {
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
  }

  async function saveSession(completed: boolean) {
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
  }

  const handleSessionComplete = useCallback(async () => {
    playBeep();
    await saveSession(true);
    setIsActive(false);
    setSessionType(prev => prev === 'work' ? 'break' : 'work');
  }, [playBeep, saveSession, sessionType]);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(getInitialTime(sessionType, mode));
    }
  }, [mode, sessionType, customWork, customBreak, getInitialTime]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      handleSessionComplete();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isActive, timeLeft, handleSessionComplete]);

  useEffect(() => {
    if (isActive && !sessionStartRef.current) {
      sessionStartRef.current = new Date();
    } else if (!isActive) {
      sessionStartRef.current = null;
    }
  }, [isActive]);

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

  return (
    <FocusTimerContext.Provider value={{
      mode, setMode,
      sessionType, setSessionType,
      timeLeft, isActive, sessionsCompleted,
      soundEnabled, setSoundEnabled,
      customWork, setCustomWork,
      customBreak, setCustomBreak,
      taskLabel, setTaskLabel,
      sessions, loadingSessions,
      toggleTimer, skipSession, resetTimer,
      getInitialTime
    }}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const context = useContext(FocusTimerContext);
  if (context === undefined) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  }
  return context;
}
