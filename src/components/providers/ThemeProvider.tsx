'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

const STORAGE_KEY = 'vany-theme'

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return getSystemPreference()
  return theme
}

function applyThemeToDOM(theme: Theme) {
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
  // Also set a class for components that need to react
  const resolved = resolveTheme(theme)
  html.setAttribute('data-resolved-theme', resolved)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')
  const [mounted, setMounted] = useState(false)

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    setResolvedTheme(resolveTheme(newTheme))
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyThemeToDOM(newTheme)
  }, [])

  // On mount: read from localStorage and apply
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) || 'dark'
    const resolved = resolveTheme(stored)
    setThemeState(stored)
    setResolvedTheme(resolved)
    applyThemeToDOM(stored)
    setMounted(true)
  }, [])

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = resolveTheme('system')
        setResolvedTheme(resolved)
        document.documentElement.setAttribute('data-resolved-theme', resolved)
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [theme])

  // Prevent flash of unstyled content: apply dark theme immediately from a script
  // This is done in layout.tsx via a script tag for SSR compatibility
  if (!mounted) {
    // Render children immediately (theme applied via inline script in layout)
    return (
      <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
