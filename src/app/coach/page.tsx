'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDsaProblems } from '@/lib/hooks/useDsaProblems';
import { useHabits } from '@/lib/hooks/useHabits';
import { HABITS, DSA_TOPICS } from '@/lib/data/seed';
import { Sparkles, Send, Database, RefreshCw, ChevronRight, Settings2, Key, Zap, Brain, Bot, X, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '@/lib/hooks/useSettings';

type Message = {
  id: string;
  role: 'user' | 'coach';
  content: string;
  fromData?: boolean;
  isAI?: boolean;
  timestamp: Date;
};

type AIMode = 'rules' | 'openai' | 'gemini';

const SUGGESTED_PROMPTS = [
  'How am I doing on DSA this week?',
  'Give me a plan for the rest of the week',
  'Which topics am I behind on?',
  'I lost 3 days to exams — help me recalibrate',
  'What should I focus on today?',
  "What's my biggest bottleneck right now?",
];

/* ── Rules-based coach ── */
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

/* ── Gemini API call ── */
async function callGeminiAPI(apiKey: string, messages: Message[], userMessage: string, context: object): Promise<string> {
  const systemPrompt = `You are a precise, data-grounded personal coach for a developer on a 24-month software engineering roadmap named Vansh. You also have full visibility into their fitness workouts, achievements, and goals. Real progress data: ${JSON.stringify(context, null, 2)}. Be direct, specific, and motivating. Respond fully and completely to every question — never cut your response short. Tailor your response length to what the user's question actually requires. Use plain text only, no markdown headers or bullet symbols.`;

  const history = messages.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  // Include system prompt as first user/model exchange for wider model compatibility
  const contents = [
    { role: 'user', parts: [{ text: `[System] ${systemPrompt}` }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready to coach you.' }] },
    ...history,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const body = JSON.stringify({
    contents,
    generationConfig: { temperature: 0.7 }
  });

  // Try models — gemini-1.5-flash has the best free tier (1500 req/day)
  const endpoints = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  ];
  let lastErr = '';
  for (const url of endpoints) {
    const res = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini.';
    }
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    lastErr = errBody?.error?.message ?? `HTTP ${res.status}`;
    // Only skip to next model on 404 (model not found); other errors are fatal
    if (res.status !== 404) {
      throw new Error(`Gemini: ${lastErr}`);
    }
  }
  throw new Error(`Gemini: No working model found. ${lastErr}`);
}

/* ── OpenAI API call ── */
async function callOpenAIAPI(apiKey: string, messages: Message[], userMessage: string, context: object): Promise<string> {
  const systemPrompt = `You are a precise, data-grounded personal coach for a developer named Vansh on a 24-month software engineering roadmap. You also track their fitness and achievements. Context: ${JSON.stringify(context)}. Be direct, specific, and motivating. Respond fully and completely to every question — never cut your response short. Tailor response length to what the question actually requires. Plain text only.`;
  const history = messages.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }],
    })
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const errMsg = errBody?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`OpenAI: ${errMsg}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'No response from OpenAI.';
}

/* ── AI Settings Panel ── */
function AISettingsPanel({
  aiMode, setAiMode,
  geminiKey, setGeminiKey,
  openaiKey, setOpenaiKey,
  onClose, onTest
}: {
  aiMode: AIMode; setAiMode: (m: AIMode) => void;
  geminiKey: string; setGeminiKey: (k: string) => void;
  openaiKey: string; setOpenaiKey: (k: string) => void;
  onClose: () => void; onTest: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} id="ai-settings-overlay">
      <div className="modal-content modal-sm p-6 space-y-5 animate-scale-up" onClick={e => e.stopPropagation()} id="ai-settings-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={18} style={{ color: 'var(--color-jade)' }} />
            <h2 className="font-display text-lg text-primary">AI Coach Settings</h2>
          </div>
          <button onClick={onClose} className="btn btn-icon-sm text-muted hover:text-primary" id="ai-settings-close"><X size={16} /></button>
        </div>

        <div className="space-y-2">
          <label className="label">AI Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {(['rules', 'gemini', 'openai'] as AIMode[]).map(m => (
              <button
                key={m}
                id={`ai-mode-${m}`}
                onClick={() => { setAiMode(m); if (m !== 'rules') {} }}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                  aiMode === m
                    ? 'border-jade text-jade'
                    : 'border-border text-secondary hover:border-secondary'
                )}
                style={aiMode === m ? { backgroundColor: 'var(--color-jade-dim)', borderColor: 'var(--color-jade)' } : undefined}
              >
                {m === 'rules' ? <Zap size={16} /> : m === 'gemini' ? <Sparkles size={16} /> : <Bot size={16} />}
                {m === 'rules' ? 'Rules-based' : m === 'gemini' ? 'Gemini' : 'OpenAI'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {aiMode === 'rules' ? 'Smart responses from your tracked data. No API key needed.' :
             aiMode === 'gemini' ? 'Uses Google Gemini. API keys are stored in your browser only.' :
             'Uses OpenAI GPT-4o Mini. API key stored in browser only.'}
          </p>
        </div>

        {aiMode === 'gemini' && (
          <div>
            <label className="label flex items-center gap-1"><Key size={10} />Gemini API Key</label>
            <input
              id="gemini-api-key-input"
              type="password"
              className="input"
              placeholder="AIza..."
              value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); localStorage.setItem('vany_gemini_key', e.target.value); }}
            />
            <p className="helper-text">Get your key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-jade hover:underline">aistudio.google.com</a></p>
          </div>
        )}

        {aiMode === 'openai' && (
          <div>
            <label className="label flex items-center gap-1"><Key size={10} />OpenAI API Key</label>
            <input
              id="openai-api-key-input"
              type="password"
              className="input"
              placeholder="sk-..."
              value={openaiKey}
              onChange={e => { setOpenaiKey(e.target.value); localStorage.setItem('vany_openai_key', e.target.value); }}
            />
            <p className="helper-text">Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-jade hover:underline">platform.openai.com</a></p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {aiMode !== 'rules' && (
            <button onClick={onTest} className="btn btn-ghost btn-sm flex-1" id="ai-test-btn">
              Test connection
            </button>
          )}
          <button onClick={onClose} className="btn btn-jade btn-sm flex-1" id="ai-settings-save">
            <Check size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function CoachPage() {
  const { currentPhase } = useSettings();
  const { totalSolved, solvedThisWeek, dueForReview, countByTopic } = useDsaProblems();
  const { isDone, today, logs: habitLogs } = useHabits();

  // AI config (from localStorage)
  const [aiMode, setAiMode] = useState<AIMode>('rules');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showAISettings, setShowAISettings] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const envGemini = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const envOpenAI = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

    const gk = localStorage.getItem('vany_gemini_key') || envGemini;
    if (gk) setGeminiKey(gk);

    const ok = localStorage.getItem('vany_openai_key') || envOpenAI;
    if (ok) setOpenaiKey(ok);

    // Auto-select best mode: prefer stored, else use Gemini if key available
    const stored = localStorage.getItem('vany_ai_mode') as AIMode | null;
    if (stored) {
      setAiMode(stored);
    } else if (gk) {
      setAiMode('gemini');
    } else if (ok) {
      setAiMode('openai');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vany_ai_mode', aiMode);
  }, [aiMode]);

  const topicProgress = DSA_TOPICS.reduce((acc, t) => {
    acc[t.id] = { solved: countByTopic[t.id] || 0, target: t.targetCount, name: t.name };
    return acc;
  }, {} as Record<string, { solved: number; target: number; name: string }>);

  const [fitnessContext, setFitnessContext] = useState({ recentWorkouts: 0, streak: 0, topExercises: [] as string[] })
  const [achievementContext, setAchievementContext] = useState({ total: 0, recent: '' })

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)
    fetch(`/api/fitness/workouts?from=${weekAgo}&to=${todayStr}`)
      .then(r => r.ok ? r.json() : { workouts: [], total: 0 })
      .then(d => {
        const workoutList = d.workouts as any[]
        const exNames = Array.from(new Set(workoutList.flatMap((w: any) => (w.sets || []).map((s: any) => s.exercise_name)))).slice(0, 3) as string[]
        // Calculate workout streak from workouts list
        const dates = [...new Set(workoutList.map((w: any) => w.workout_date as string))].sort().reverse()
        const todayIso = new Date().toISOString().slice(0, 10)
        const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        let workoutStreak = 0
        if (dates.length && (dates[0] === todayIso || dates[0] === yesterdayIso)) {
          workoutStreak = 1
          for (let i = 1; i < dates.length; i++) {
            const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000
            if (diff === 1) workoutStreak++; else break
          }
        }
        setFitnessContext({ recentWorkouts: d.total, streak: workoutStreak, topExercises: exNames })
      }).catch(() => {})
    
    fetch('/api/achievements?limit=1')
      .then(r => r.ok ? r.json() : { achievements: [], total: 0 })
      .then(d => setAchievementContext({ total: d.total || 0, recent: d.achievements[0]?.title || '' }))
      .catch(() => {})
  }, [])

  const todayHabits = HABITS.map(h => ({ name: h.name, done: isDone(h.id, today) }));
  const habitStreak = useMemo(() => {
    // Calculate streak from habit logs — use today's HABITS list to find consecutive days all done
    if (!habitLogs || habitLogs.length === 0) return 0
    const dayMap: Record<string, number> = {}
    for (const log of habitLogs) {
      if (log.done) dayMap[log.log_date] = (dayMap[log.log_date] || 0) + 1
    }
    const dates = Object.keys(dayMap).sort().reverse()
    if (!dates.length) return 0
    const todayIso = new Date().toISOString().slice(0, 10)
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (dates[0] !== todayIso && dates[0] !== yesterdayIso) return 0
    let s = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000
      if (diff === 1) s++; else break
    }
    return s
  }, [habitLogs])

  const context = { 
    currentPhase, totalSolved, solvedThisWeek, dueForReview: dueForReview.length, 
    topicProgress, habitStreak, todayHabits,
    fitnessThisWeek: fitnessContext.recentWorkouts,
    topExercises: fitnessContext.topExercises,
    totalAchievements: achievementContext.total,
    recentAchievement: achievementContext.recent,
  };

  const initialMessage: Message = {
    id: 'intro',
    role: 'coach',
    content: `Phase ${currentPhase} of 6. ${totalSolved} problems in total — you're in the phase where DSA gets structurally hard. Ask me anything about your progress, what to focus on, or how to redistribute after a rough week.`,
    fromData: true,
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    try {
      let content = '';
      let isAI = false;

      if (aiMode === 'gemini' && geminiKey) {
        content = await callGeminiAPI(geminiKey, messages, text, context);
        isAI = true;
      } else if (aiMode === 'openai' && openaiKey) {
        content = await callOpenAIAPI(openaiKey, messages, text, context);
        isAI = true;
      } else {
        // Simulate thinking delay for rules-based
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        const res = generateCoachResponse(text, context);
        content = res.content;
      }

      const coachMsg: Message = { id: `c_${Date.now()}`, role: 'coach', content, fromData: !isAI, isAI, timestamp: new Date() };
      setMessages(prev => [...prev, coachMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI request failed';
      setAiError(errMsg);
      // Fallback to rules-based
      const { content } = generateCoachResponse(text, context);
      const coachMsg: Message = { id: `c_${Date.now()}`, role: 'coach', content, fromData: true, timestamp: new Date() };
      setMessages(prev => [...prev, coachMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, aiMode, geminiKey, openaiKey, messages, context]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const handleTest = async () => {
    await sendMessage('What should I focus on today?');
    setShowAISettings(false);
  };

  const aiModeLabel = aiMode === 'rules' ? 'Rules-based' : aiMode === 'gemini' ? 'Gemini AI' : 'OpenAI';
  const aiModeColor = aiMode === 'rules' ? 'badge-muted' : 'badge-jade';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-ink)' }} id="coach-page">
      <div className="max-w-3xl mx-auto w-full px-5 pt-8 flex flex-col flex-1 pb-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-jade-dim)' }}>
            <Sparkles size={16} style={{ color: 'var(--color-jade)' }} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-primary">Coach</h1>
            <p className="text-xs text-muted font-mono">data-grounded advice</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={clsx('badge text-[10px]', aiModeColor)}>
              {aiMode !== 'rules' ? <Sparkles size={8} /> : <Database size={8} />}
              {aiModeLabel}
            </span>
            <button
              onClick={() => setShowAISettings(true)}
              id="ai-settings-toggle"
              className="btn btn-ghost btn-icon-sm text-muted hover:text-primary"
              title="AI settings"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* ── Context strip ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'total solved', value: totalSolved, colorClass: 'text-jade' },
            { label: 'this week',    value: solvedThisWeek, colorClass: 'text-gold' },
            { label: 'reviews due',  value: dueForReview.length, colorClass: dueForReview.length > 0 ? 'text-brick' : 'text-jade' },
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
            <span className="flex-1">{aiError} — fell back to rules-based response.</span>
            <button onClick={() => setAiError(null)} className="text-current opacity-60 hover:opacity-100"><X size={12} /></button>
          </div>
        )}

        {/* ── Messages ── */}
        <div
          id="coach-messages"
          className="flex-1 space-y-4 overflow-y-auto mb-4"
          style={{ minHeight: '300px', maxHeight: '50vh' }}
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
                    {msg.fromData && (
                      <span className="badge badge-jade text-[9px]">
                        <Database size={8} />
                        from your data
                      </span>
                    )}
                    {msg.isAI && (
                      <span className="badge badge-violet text-[9px]" style={{ background: 'var(--color-violet-dim)', color: 'var(--color-violet)' }}>
                        <Sparkles size={8} />
                        AI response
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
            placeholder={aiMode !== 'rules' ? 'Ask anything — powered by AI…' : 'Ask anything about your progress…'}
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
          onClick={() => setMessages([initialMessage])}
          className="mt-3 text-xs text-muted hover:text-secondary transition-colors flex items-center gap-1 mx-auto"
          id="coach-clear"
        >
          <RefreshCw size={10} />
          Clear conversation
        </button>
      </div>

      {/* AI Settings Modal */}
      {showAISettings && (
        <AISettingsPanel
          aiMode={aiMode} setAiMode={setAiMode}
          geminiKey={geminiKey} setGeminiKey={setGeminiKey}
          openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
          onClose={() => setShowAISettings(false)}
          onTest={handleTest}
        />
      )}
    </div>
  );
}
