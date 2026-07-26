'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupDone, setSignupDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      // Sign up — then immediately sign in so no email confirm needed
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      // Auto sign-in right after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        // Account created but confirm email is required — show message
        setSignupDone(true)
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    }
  }

  // After signup, show confirmation
  if (signupDone) {
    return (
      <div className="min-h-dvh bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in text-center space-y-5">
          <div className="flex items-center gap-4 justify-center mb-8">
            <span className="w-10 h-10 rounded-full bg-jade flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(63,167,147,0.4)]">
              <span className="w-3.5 h-3.5 rounded-full bg-ink" />
            </span>
            <div className="flex flex-col justify-center items-start text-left mt-0.5">
              <span className="font-display text-3xl font-bold text-primary tracking-[0.15em] uppercase leading-none">Vyra</span>
              <span className="text-xs text-jade/90 font-mono font-medium uppercase tracking-[0.1em] mt-2 leading-none">Rise Every Day</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-jade/20 flex items-center justify-center mx-auto">
            <span className="text-jade text-xl">✓</span>
          </div>
          <h2 className="font-display text-2xl text-primary">Check your inbox</h2>
          <p className="text-secondary text-sm font-body leading-relaxed">
            A confirmation link was sent to <span className="text-gold font-mono">{email}</span>.
            <br />Click it to verify your account, then come back and sign in.
          </p>
          <button
            onClick={() => { setSignupDone(false); setMode('login') }}
            className="btn btn-jade text-sm mx-auto"
          >
            Go to sign in →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="flex items-center gap-4 mb-10">
          <span className="w-10 h-10 rounded-full bg-jade flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(63,167,147,0.4)]">
            <span className="w-3.5 h-3.5 rounded-full bg-ink" />
          </span>
          <div className="flex flex-col justify-center items-start text-left mt-0.5">
            <span className="font-display text-3xl font-bold text-primary tracking-[0.15em] uppercase leading-none">
              Vyra
            </span>
            <span className="text-xs text-jade/90 font-mono font-medium uppercase tracking-[0.1em] mt-2 leading-none">
              Rise Every Day
            </span>
          </div>
        </div>

        <h1 className="font-display text-3xl font-semibold text-primary mb-2">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-secondary font-body text-sm mb-8">
          {mode === 'login'
            ? 'Sign in with your email and password.'
            : 'Set up your Vyra account to begin Day 1.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          {/* Email */}
          <div>
            <label className="text-xs font-mono text-muted uppercase tracking-widest mb-1.5 block">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-mono text-muted uppercase tracking-widest mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                id="toggle-password"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-brick text-xs font-mono animate-fade-in bg-brick/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            id="login-submit"
            disabled={loading || !email.trim() || password.length < 6}
            className="btn btn-jade w-full mt-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading
              ? mode === 'login' ? 'Signing in…' : 'Creating account…'
              : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-muted text-xs font-body mt-6 text-center">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <button
                id="switch-to-signup"
                onClick={() => { setMode('signup'); setError(null) }}
                className="text-jade hover:underline underline-offset-2"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                id="switch-to-login"
                onClick={() => { setMode('login'); setError(null) }}
                className="text-jade hover:underline underline-offset-2"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
