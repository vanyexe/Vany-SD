import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

/* ── Groq (Free, Llama 3.3 70B) ── */
async function callGroq(systemPrompt: string, history: { role: string; content: string }[], userMessage: string): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(errData?.error?.message || `Groq HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from Groq.';
}

/* ── Gemini ── */
async function callGemini(systemPrompt: string, history: { role: string; content: string }[], userMessage: string): Promise<string> {
  const contents = [
    { role: 'user', parts: [{ text: `[System] ${systemPrompt}` }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready to coach you based on your real progress data.' }] },
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const models = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
  ];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    }
    const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
    if (res.status !== 404) {
      throw new Error(errData?.error?.message || `Gemini HTTP ${res.status}`);
    }
  }
  throw new Error('No working Gemini model found.');
}

async function callOpenAI(systemPrompt: string, history: { role: string; content: string }[], userMessage: string): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(errData?.error?.message || `OpenAI HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from OpenAI.';
}

export async function POST(req: NextRequest) {
  try {
    const { userMessage, history, context } = await req.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'Missing userMessage' }, { status: 400 });
    }

    const systemPrompt = `You are a precise, data-grounded personal coach for a developer named Vansh on a 24-month software engineering roadmap.
You have full visibility into their real progress data: DSA problems solved, habit streaks, fitness workouts, goals and achievements.

Real progress data:
${JSON.stringify(context, null, 2)}

Your rules:
- Be direct, honest, and motivating. Do not sugarcoat.
- Always base your advice on the actual data provided above.
- Respond fully and completely — never cut your response short.
- Tailor the response length to what the question actually requires.
- Use plain text with line breaks. Do NOT use markdown headers (##), bold (**), or bullet dashes (-).
- You can use arrows (→) and line breaks to structure responses.
- You are coaching Vansh, so speak to him directly in second person.`;

    const hist = (history || []).slice(-10) as { role: string; content: string }[];

    // Try Gemini first (has best free tier), fall back to OpenAI
    let response = '';
    let provider = '';
    const errors: string[] = [];

    // Try Groq first (free, fast, Llama 3.3 70B)
    if (GROQ_KEY) {
      try {
        response = await callGroq(systemPrompt, hist, userMessage);
        provider = 'groq';
      } catch (err) {
        errors.push(`Groq: ${err instanceof Error ? err.message : err}`);
        console.error('Groq failed:', err);
      }
    }

    // Fallback: Gemini
    if (!response && GEMINI_KEY) {
      try {
        response = await callGemini(systemPrompt, hist, userMessage);
        provider = 'gemini';
      } catch (err) {
        errors.push(`Gemini: ${err instanceof Error ? err.message : err}`);
        console.error('Gemini failed:', err);
      }
    }

    // Fallback: OpenAI
    if (!response && OPENAI_KEY) {
      try {
        response = await callOpenAI(systemPrompt, hist, userMessage);
        provider = 'openai';
      } catch (err) {
        errors.push(`OpenAI: ${err instanceof Error ? err.message : err}`);
        console.error('OpenAI failed:', err);
      }
    }

    if (!response) {
      const hasKeys = GROQ_KEY || GEMINI_KEY || OPENAI_KEY;
      if (!hasKeys) {
        return NextResponse.json({ error: 'No AI API keys configured on server.' }, { status: 503 });
      }
      throw new Error(`All AI providers failed: ${errors.join(' | ')}`);
    }

    return NextResponse.json({ response, provider });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Coach API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
