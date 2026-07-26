'use client';
import { getISTDateString } from '@/lib/dateUtils';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDsaProblems } from '@/lib/hooks/useDsaProblems';
import { useHabits } from '@/lib/hooks/useHabits';
import { HABITS, DSA_TOPICS } from '@/lib/data/seed';
import { Sparkles, Send, Database, RefreshCw, ChevronRight, Zap, Brain, Bot, X, Check, Loader2, ServerCrash } from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '@/lib/hooks/useSettings';

type Message = {
  id: string;
  role: 'user' | 'coach';
  content: string;
  fromData?: boolean;
  isAI?: boolean;
  provider?: string;
  timestamp: Date;
};

const SUGGESTED_PROMPTS = [
  'How am I doing on DSA this week?',
  'Give me a plan for the rest of the week',
  'Which topics am I behind on?',
  'I lost 3 days to exams — help me recalibrate',
  'What should I focus on today?',
  "What's my biggest bottleneck right now?",
  'How are my habits looking?',
  'Give me a motivational push',
];

/* ── Rules-based fallback coach ── */
function generateCoachResponse(
  userMsg: string,
  context: {
    currentPhase: number;
    totalSolved: number;
    solvedThisWeek: number;
    dueForReview: number;
    topicProgress: Record<string, { solved: number; target: number; name: string }>;
    habitStreak: number;
    todayHabits: { name: string; done: boolean }[];
    fitnessThisWeek: number;
    topExercises: string[];
    totalAchievements: number;
    recentAchievement: string;
  }
): { content: string; fromData: boolean } {
  const lowerMsg = userMsg.toLowerCase();

  if (lowerMsg.includes('how am i doing') || lowerMsg.includes('dsa this week')) {
    const pace = context.solvedThisWeek >= 15 ? 'on pace' : context.solvedThisWeek >= 10 ? 'slightly behind pace' : 'behind pace';
    const behindTopics = Object.values(context.topicProgress)
      .filter(t => t.solved < t.target * 0.5).slice(0, 2).map(t => t.name).join(' and ');
    return {
      content: `${context.solvedThisWeek} problems logged against a 15–20 target pace for Phase ${context.currentPhase}. You're ${pace}.\n\n${behindTopics ? `${behindTopics} are lagging behind the other topics.` : 'Topic distribution looks balanced.'}\n\n${context.dueForReview > 0 ? `${context.dueForReview} reviews are due — clear those before adding new problems.` : 'Review queue is clear — good position.'}`,
      fromData: true,
    };
  }
  if (lowerMsg.includes('plan') || lowerMsg.includes('rest of the week')) {
    const behind = Object.values(context.topicProgress)
      .filter(t => t.solved < t.target * 0.4)
      .sort((a, b) => (a.solved / a.target) - (b.solved / b.target));
    const focus = behind.slice(0, 2).map(t => t.name);
    return {
      content: focus.length > 0
        ? `Focus on:\n→ 4 ${focus[0]} problems over the next 2 days\n→ 3 ${focus[1] || 'remaining'} problems before end of week\n→ Clear the review queue each morning\n\nKeep sessions under 90 minutes for quality over quantity.`
        : `You're spread well. Push 3–4 problems per day to stay on phase pace.\n\nPrioritise spaced repetition reviews first each session.`,
      fromData: true,
    };
  }
  if (lowerMsg.includes('behind') || lowerMsg.includes('topics')) {
    const sorted = Object.values(context.topicProgress)
      .sort((a, b) => (a.solved / a.target) - (b.solved / b.target)).slice(0, 3);
    const lines = sorted.map(t => `${t.name}: ${t.solved}/${t.target} (${Math.round((t.solved / t.target) * 100)}%)`).join('\n');
    return {
      content: `Lowest completion rate:\n\n${lines}\n\nFocus there first. Finish what's close to completion before opening new topics.`,
      fromData: true,
    };
  }
  if (lowerMsg.includes('exam') || lowerMsg.includes('lost') || lowerMsg.includes('recalibrate')) {
    return {
      content: `Noted. Let's not count missed days as failures — just redistribute.\n\nIf you lost 3 days, you're roughly 6–9 problems behind phase pace. That's recoverable in 5–6 days at 3–4 problems/day.\n\nSuggestion: drop the daily target to 2 this week to rebuild the habit, then ramp back to 3–4 next week. The streak matters more than the count.`,
      fromData: false,
    };
  }
  if (lowerMsg.includes('habit')) {
    const notDone = context.todayHabits.filter(h => !h.done).map(h => h.name);
    const doneCnt = context.todayHabits.filter(h => h.done).length;
    return {
      content: `Today: ${doneCnt}/${context.todayHabits.length} habits done. Streak: ${context.habitStreak} days.\n\n${notDone.length > 0 ? `Still pending: ${notDone.join(', ')}.` : 'All habits done today — great consistency.'}`,
      fromData: true,
    };
  }
  if (lowerMsg.includes('motivat') || lowerMsg.includes('push') || lowerMsg.includes('inspire')) {
    return {
      content: `${context.totalSolved} problems in. Phase ${context.currentPhase} is exactly where most people quit — because it's the hardest phase structurally.\n\nYou're still here. That already puts you ahead of the people who said they'd start.\n\nThe compound effect is silent until it's deafening. Keep going.`,
      fromData: false,
    };
  }
  if (lowerMsg.includes('fitness') || lowerMsg.includes('workout') || lowerMsg.includes('gym')) {
    return {
      content: `You've logged ${context.fitnessThisWeek} workouts recently. ${context.topExercises.length > 0 ? `Your top exercises include ${context.topExercises.join(', ')}.` : 'Make sure to log your sets and reps to track progression.'}\n\nPhysical health directly correlates with mental endurance for coding. Keep the consistency up.`,
      fromData: true,
    };
  }
  if (lowerMsg.includes('achieve') || lowerMsg.includes('win') || lowerMsg.includes('proud')) {
    return {
      content: `You have ${context.totalAchievements} achievements in the Vault. ${context.recentAchievement ? `Most recently: "${context.recentAchievement}".` : ''}\n\nDocumenting wins is crucial for your eventual portfolio and morale. Keep building!`,
      fromData: true,
    };
  }
  if (lowerMsg.includes('today') || lowerMsg.includes('focus') || lowerMsg.includes('bottleneck')) {
    const notDone = context.todayHabits.filter(h => !h.done).map(h => h.name);
    return {
      content: `Today's priority stack:\n\n${context.dueForReview > 0 ? `→ Clear the ${context.dueForReview} review${context.dueForReview !== 1 ? 's' : ''} first — spaced rep compounds\n` : ''}→ 2–3 new problems (pick a topic you've been avoiding)\n${notDone.length > 0 ? `→ Habits not yet done: ${notDone.join(', ')}\n` : '→ All habits done — solid start.\n'}\nKeep it contained. A focused 2-hour block beats a scattered 4-hour one.`,
      fromData: true,
    };
  }
  return {
    content: `That's worth thinking through.\n\nYou're at ${context.totalSolved} problems in total — Phase ${context.currentPhase} is the heaviest DSA phase in the roadmap. The spaced repetition queue matters more than raw count at this point.\n\nWhat specifically are you trying to figure out?`,
    fromData: false,
  };
}

/* ── Main page ── */
export default function CoachPage() {
  const { currentPhase } = useSettings();
  const { totalSolved, solvedThisWeek, dueForReview, countByTopic } = useDsaProblems();
  const { isDone, today, logs: habitLogs } = useHabits();

  const [isTyping, setIsTyping] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [serverAIAvailable, setServerAIAvailable] = useState<boolean | null>(null);

  // Check if server-side AI is available on mount
  useEffect(() => {
    fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: 'ping', history: [], context: {} })
    }).then(r => {
      // 200 = works, 503 = no keys configured, anything else means route exists
      setServerAIAvailable(r.status !== 503);
    }).catch(() => setServerAIAvailable(false));
  }, []);

  const topicProgress = DSA_TOPICS.reduce((acc, t) => {
    acc[t.id] = { solved: countByTopic[t.id] || 0, target: t.targetCount, name: t.name };
    return acc;
  }, {} as Record<string, { solved: number; target: number; name: string }>);

  const [fitnessContext, setFitnessContext] = useState({ recentWorkouts: 0, streak: 0, topExercises: [] as string[] });
  const [achievementContext, setAchievementContext] = useState({ total: 0, recent: '' });

  useEffect(() => {
    const weekAgo = getISTDateString(new Date(Date.now() - 7 * 86400000));
    const todayStr = getISTDateString();
    fetch(`/api/fitness/workouts?from=${weekAgo}&to=${todayStr}`)
      .then(r => r.ok ? r.json() : { workouts: [], total: 0 })
      .then(d => {
        const workoutList = d.workouts as any[];
        const exNames = Array.from(new Set(workoutList.flatMap((w: any) => (w.sets || []).map((s: any) => s.exercise_name)))).slice(0, 3) as string[];
        const dates = [...new Set(workoutList.map((w: any) => w.workout_date as string))].sort().reverse();
        const todayIso = getISTDateString();
        const yesterdayIso = getISTDateString(new Date(Date.now() - 86400000));
        let workoutStreak = 0;
        if (dates.length && (dates[0] === todayIso || dates[0] === yesterdayIso)) {
          workoutStreak = 1;
          for (let i = 1; i < dates.length; i++) {
            const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
            if (diff === 1) workoutStreak++; else break;
          }
        }
        setFitnessContext({ recentWorkouts: d.total, streak: workoutStreak, topExercises: exNames });
      }).catch(() => {});

    fetch('/api/achievements?limit=1')
      .then(r => r.ok ? r.json() : { achievements: [], total: 0 })
      .then(d => setAchievementContext({ total: d.total || 0, recent: d.achievements[0]?.title || '' }))
      .catch(() => {});
  }, []);

  const todayHabits = HABITS.map(h => ({ name: h.name, done: isDone(h.id, today) }));
  const habitStreak = useMemo(() => {
    if (!habitLogs || habitLogs.length === 0) return 0;
    const dayMap: Record<string, number> = {};
    for (const log of habitLogs) {
      if (log.done) dayMap[log.log_date] = (dayMap[log.log_date] || 0) + 1;
    }
    const dates = Object.keys(dayMap).sort().reverse();
    if (!dates.length) return 0;
    const todayIso = getISTDateString();
    const yesterdayIso = getISTDateString(new Date(Date.now() - 86400000));
    if (dates[0] !== todayIso && dates[0] !== yesterdayIso) return 0;
    let s = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
      if (diff === 1) s++; else break;
    }
    return s;
  }, [habitLogs]);

  const context = {
    currentPhase, totalSolved, solvedThisWeek, dueForReview: dueForReview.length,
    topicProgress, habitStreak, todayHabits,
    fitnessThisWeek: fitnessContext.recentWorkouts,
    fitnessStreak: fitnessContext.streak,
    topExercises: fitnessContext.topExercises,
    totalAchievements: achievementContext.total,
    recentAchievement: achievementContext.recent,
  };

  const initialMessage: Message = useMemo(() => ({
    id: 'intro',
    role: 'coach',
    content: `Phase ${currentPhase} of 6. ${totalSolved} problems in total — you're in the phase where DSA gets structurally hard.\n\nAsk me anything about your progress, what to focus on today, or how to redistribute after a rough week.`,
    fromData: true,
    timestamp: new Date(),
  }), [currentPhase, totalSolved]);

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('coach_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          const withDates = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
          if (withDates[0].id === 'intro') {
            withDates[0] = initialMessage;
          }
          setMessages(withDates);
        }
      } catch (e) {}
    }
    setIsLoaded(true);
  }, [initialMessage]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('coach_messages', JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    setAiError(null);

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }));

    try {
      // Always try server-side AI first (uses server env keys, secure)
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: text.trim(), history, context })
      });

      if (res.ok) {
        const data = await res.json();
        const coachMsg: Message = {
          id: `c_${Date.now()}`,
          role: 'coach',
          content: data.response,
          isAI: true,
          provider: data.provider,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, coachMsg]);
      } else if (res.status === 503) {
        // No AI keys on server — fall back to rules
        setServerAIAvailable(false);
        throw new Error('No AI keys configured');
      } else {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error || `Server error ${res.status}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI request failed';
      setAiError(errMsg);
      // Always fall back to rules-based — user always gets a response
      await new Promise(r => setTimeout(r, 300));
      const { content, fromData } = generateCoachResponse(text, context);
      const coachMsg: Message = { id: `c_${Date.now()}`, role: 'coach', content, fromData, timestamp: new Date() };
      setMessages(prev => [...prev, coachMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, messages, context]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const providerLabel = (provider?: string) => 
    provider === 'groq' ? 'Llama 3.3 (Groq)' :
    provider === 'gemini' ? 'Gemini AI' : 
    provider === 'openai' ? 'GPT-4o Mini' : 'AI';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-ink)' }} id="coach-page">
      <div className="max-w-3xl mx-auto w-full px-5 pt-8 flex flex-col flex-1 pb-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-jade-dim)' }}>
            <Brain size={20} style={{ color: 'var(--color-jade)' }} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-primary">AI Coach</h1>
            <p className="text-xs text-muted font-mono">data-grounded personal coaching</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {serverAIAvailable === true && (
              <span className="badge badge-jade text-[10px] flex items-center gap-1">
                <Sparkles size={8} /> AI Active
              </span>
            )}
            {serverAIAvailable === false && (
              <span className="badge badge-muted text-[10px] flex items-center gap-1">
                <Zap size={8} /> Rules-based
              </span>
            )}
          </div>
        </div>

        {/* ── Context strip ── */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'total solved', value: totalSolved, colorClass: 'text-jade' },
            { label: 'this week', value: solvedThisWeek, colorClass: 'text-gold' },
            { label: 'reviews due', value: dueForReview.length, colorClass: dueForReview.length > 0 ? 'text-brick' : 'text-jade' },
            { label: 'habit streak', value: `${habitStreak}d`, colorClass: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="card-raised rounded-xl p-3 text-center">
              <div className={clsx("stat-number-sm", s.colorClass)}>{s.value}</div>
              <div className="text-[10px] font-mono text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── AI error banner ── */}
        {aiError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-3 text-xs animate-fade-in" style={{ background: 'var(--color-brick-dim)', color: 'var(--color-brick)' }}>
            <ServerCrash size={12} className="flex-shrink-0" />
            <span className="flex-1">AI Error: {aiError} — responded with rules-based coach.</span>
            <button onClick={() => setAiError(null)} className="text-current opacity-60 hover:opacity-100"><X size={12} /></button>
          </div>
        )}

        {/* ── Messages ── */}
        <div
          id="coach-messages"
          className="flex-1 space-y-4 overflow-y-auto mb-4"
          style={{ minHeight: '300px', maxHeight: '55vh' }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              id={`coach-msg-${msg.id}`}
              className={clsx('flex animate-fade-in', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className={clsx(
                'max-w-[85%] rounded-2xl px-4 py-3 space-y-2',
                msg.role === 'user'
                  ? 'bg-jade text-ink rounded-br-sm'
                  : 'bg-surface-raised text-primary border border-border rounded-bl-sm'
              )}>
                <p className="text-sm font-body whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.role === 'coach' && (
                  <div className="flex items-center gap-2">
                    {msg.fromData && !msg.isAI && (
                      <span className="badge badge-jade text-[9px]">
                        <Database size={8} />
                        from your data
                      </span>
                    )}
                    {msg.isAI && (
                      <span className="badge text-[9px]" style={{ background: 'var(--color-violet-dim)', color: 'var(--color-violet)' }}>
                        <Sparkles size={8} />
                        {providerLabel(msg.provider)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl px-4 py-3 border border-border" style={{ background: 'var(--color-surface-raised)' }}>
                <div className="flex gap-1.5 items-center">
                  {[0, 200, 400].map(delay => (
                    <span
                      key={delay}
                      className="w-2 h-2 rounded-full animate-pulse-soft"
                      style={{ animationDelay: `${delay}ms`, background: 'var(--color-jade)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggested prompts ── */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
            {SUGGESTED_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="rounded-full bg-surface text-secondary hover:bg-surface-hover hover:text-primary text-xs border border-border px-4 py-2 transition-all cursor-pointer flex items-center shadow-sm"
              >
                {prompt}
                <ChevronRight size={10} className="ml-1 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <form id="coach-input-form" onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            id="coach-input"
            className="input flex-1 py-3 px-4 w-full"
            placeholder={serverAIAvailable ? 'Ask anything — powered by AI…' : 'Ask anything about your progress…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="submit"
            id="coach-send"
            disabled={!input.trim() || isTyping}
            className={clsx('btn px-4', input.trim() && !isTyping ? 'btn-jade' : 'btn-ghost opacity-50')}
          >
            {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>

        <button
          onClick={() => {
            setMessages([initialMessage]);
            localStorage.removeItem('coach_messages');
          }}
          className="mt-3 text-xs text-muted hover:text-secondary transition-colors flex items-center gap-1 mx-auto"
          id="coach-clear"
        >
          <RefreshCw size={10} />
          Clear conversation
        </button>
      </div>
    </div>
  );
}
