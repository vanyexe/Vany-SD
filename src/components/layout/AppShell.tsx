'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home, CheckSquare, BookOpen, Flame, Map, Calendar,
  FileText, Film, BarChart2, Target, Sparkles, Settings,
  ChevronLeft, ChevronRight, Menu, X, LogOut, MoreHorizontal,
  Zap, Dumbbell, Award, BookMarked, Timer, Clock
} from 'lucide-react'

/* ── Navigation config ── */
const NAV_ITEMS = [
  // Main
  { href: '/',             icon: Home,          label: 'Dashboard',   group: 'main' },
  { href: '/dsa',          icon: BookOpen,      label: 'DSA',         group: 'main' },
  { href: '/tasks',        icon: CheckSquare,   label: 'Tasks',       group: 'main' },
  { href: '/habits',       icon: Flame,         label: 'Habits',      group: 'main' },
  // Life
  { href: '/fitness',      icon: Dumbbell,      label: 'Fitness',     group: 'life' },
  { href: '/journal',      icon: BookMarked,    label: 'Journal',     group: 'life' },
  { href: '/achievements', icon: Award,         label: 'Achievements',group: 'life' },
  { href: '/goals',        icon: Target,        label: 'Goals',       group: 'life' },
  // Build
  { href: '/trailer',      icon: Film,          label: 'Trailer',     group: 'build' },
  { href: '/notes',        icon: FileText,      label: 'Notes',       group: 'build' },
  { href: '/phases/1',     icon: Map,           label: 'Phases',      group: 'build' },
  // Tools
  { href: '/calendar',     icon: Calendar,      label: 'Calendar',    group: 'tools' },
  { href: '/focus',        icon: Timer,         label: 'Focus',       group: 'tools' },
  { href: '/coach',        icon: Sparkles,      label: 'AI Coach',    group: 'tools' },
  { href: '/analytics',    icon: BarChart2,     label: 'Analytics',   group: 'tools' },
  { href: '/timeline',     icon: Clock,         label: 'Timeline',    group: 'tools' },
  { href: '/settings',     icon: Settings,      label: 'Settings',    group: 'tools' },
]

// Primary 4 items for the mobile bottom nav
const BOTTOM_NAV_PRIMARY = ['/', '/dsa', '/fitness', '/habits']

const GROUP_LABELS: Record<string, string> = {
  main:  '',
  life:  'Life',
  build: 'Build',
  tools: 'Tools',
}

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  /* Detect mobile */
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setIsMobileOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  /* Close mobile menu on route change */
  useEffect(() => {
    setIsMobileOpen(false)
    setIsMoreOpen(false)
  }, [pathname])

  /* Close mobile menu on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMobileOpen(false); setIsMoreOpen(false) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  /* Persist collapsed state */
  useEffect(() => {
    const stored = localStorage.getItem('vany-sidebar-collapsed')
    if (stored !== null) setIsCollapsed(stored === 'true')
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('vany-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  /* Is a nav item active? */
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    // phases match /phases/*
    if (href === '/phases/1') return pathname.startsWith('/phases')
    return pathname === href || pathname.startsWith(href + '/')
  }

  /* Sidebar width */
  const sidebarW = isCollapsed ? 64 : 240

  const bottomPrimary = NAV_ITEMS.filter(n => BOTTOM_NAV_PRIMARY.includes(n.href))
  const moreItems     = NAV_ITEMS.filter(n => !BOTTOM_NAV_PRIMARY.includes(n.href))
  const anyMoreActive = moreItems.some(n => isActive(n.href))

  /* ─── Render ─── */
  return (
    <div className="flex min-h-dvh bg-ink">

      {/* ═══════════════════════════════════════
          SIDEBAR — Desktop only (md+)
          ═══════════════════════════════════════ */}
      {!isMobile && (
        <aside
          style={{ width: sidebarW }}
          className="hidden md:flex flex-col fixed top-0 left-0 h-full z-30 bg-surface border-r border-border transition-all duration-200 ease-in-out overflow-hidden"
        >
          {/* Logo */}
          <div className={`flex items-center h-20 px-5 border-b border-border flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <Link href="/" className="flex items-center gap-3.5 group" id="sidebar-logo">
                <span className="w-9 h-9 rounded-full bg-jade flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_0_12px_rgba(63,167,147,0.5)] transition-shadow">
                  <span className="w-3.5 h-3.5 rounded-full bg-ink" />
                </span>
                <div className="flex flex-col justify-center items-start text-left mt-0.5">
                  <span className="font-display text-lg font-bold text-primary tracking-[0.15em] uppercase leading-none">
                    Vyra
                  </span>
                  <span className="text-[10px] text-jade/90 font-mono font-medium uppercase tracking-[0.1em] mt-1.5 leading-none">
                    Rise Every Day
                  </span>
                </div>
              </Link>
            )}
            {isCollapsed && (
              <Link href="/" id="sidebar-logo-collapsed">
                <span className="w-9 h-9 rounded-full bg-jade flex items-center justify-center hover:shadow-[0_0_12px_rgba(63,167,147,0.5)] transition-shadow">
                  <span className="w-3.5 h-3.5 rounded-full bg-ink" />
                </span>
              </Link>
            )}
            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              id="sidebar-collapse-toggle"
              className={`btn btn-icon btn-icon-sm text-muted hover:text-secondary ${isCollapsed ? 'mt-0' : ''}`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
            {NAV_ITEMS.reduce<React.ReactNode[]>((acc, item, idx) => {
              const prev = NAV_ITEMS[idx - 1]
              const showGroupLabel = !isCollapsed && item.group !== 'main' && (!prev || prev.group !== item.group)

              if (showGroupLabel) {
                acc.push(
                  <div key={`group-${item.group}`} className="px-3 pt-4 pb-1">
                    <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
                      {GROUP_LABELS[item.group]}
                    </span>
                  </div>
                )
              }

              const active = isActive(item.href)
              const Icon   = item.icon

              acc.push(
                <Link
                  key={item.href}
                  href={item.href}
                  id={`nav-${item.label.toLowerCase()}`}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative ${
                    active
                      ? 'bg-jade-dim text-jade'
                      : 'text-secondary hover:text-primary hover:bg-surface-raised'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  style={active ? { backgroundColor: 'var(--color-jade-dim)' } : undefined}
                >
                  {/* Active indicator */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-jade"
                    />
                  )}
                  <Icon
                    size={17}
                    className={`flex-shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-jade' : ''}`}
                    style={active ? { color: 'var(--color-jade)' } : undefined}
                  />
                  {!isCollapsed && (
                    <span className={`text-sm font-medium truncate ${active ? 'text-jade' : ''}`}
                      style={active ? { color: 'var(--color-jade)' } : undefined}>
                      {item.label}
                    </span>
                  )}
                </Link>
              )
              return acc
            }, [])}
          </nav>

          {/* Bottom: sign out */}
          <div className={`px-2 py-3 border-t border-border space-y-1 flex-shrink-0`}>
            <button
              onClick={handleSignOut}
              id="sidebar-signout"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:text-brick hover:bg-brick-dim transition-all ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? 'Sign out' : undefined}
            >
              <LogOut size={16} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Sign out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* ═══════════════════════════════════════
          MOBILE SIDEBAR OVERLAY
          ═══════════════════════════════════════ */}
      {isMobile && isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in-fast"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed top-0 left-0 h-full w-72 z-50 bg-surface border-r border-border flex flex-col animate-slide-in-left">
            {/* Header */}
            <div className="flex items-center justify-between h-20 px-5 border-b border-border">
              <div className="flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-full bg-jade flex items-center justify-center flex-shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full bg-ink" />
                </span>
                <div className="flex flex-col justify-center items-start text-left mt-0.5">
                  <span className="font-display text-lg font-bold text-primary tracking-[0.15em] uppercase leading-none">Vyra</span>
                  <span className="text-[10px] text-jade/90 font-mono font-medium uppercase tracking-[0.1em] mt-1.5 leading-none">Rise Every Day</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="btn btn-icon btn-icon-sm text-muted hover:text-primary"
                id="mobile-sidebar-close"
              >
                <X size={16} />
              </button>
            </div>
            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {NAV_ITEMS.map((item, idx) => {
                const prev = NAV_ITEMS[idx - 1]
                const showGroupLabel = item.group !== 'main' && (!prev || prev.group !== item.group)
                const active = isActive(item.href)
                const Icon   = item.icon
                return (
                  <Fragment key={item.href}>
                    {showGroupLabel && (
                      <div className="px-3 pt-4 pb-1">
                        <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
                          {GROUP_LABELS[item.group]}
                        </span>
                      </div>
                    )}
                    <Link
                      href={item.href}
                      id={`mobile-nav-${item.label.toLowerCase()}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                        active
                          ? 'text-jade'
                          : 'text-secondary hover:text-primary hover:bg-surface-raised'
                      }`}
                      style={active ? { backgroundColor: 'var(--color-jade-dim)' } : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-jade" />
                      )}
                      <Icon size={17} className="flex-shrink-0" style={active ? { color: 'var(--color-jade)' } : undefined} />
                      <span className="text-sm font-medium" style={active ? { color: 'var(--color-jade)' } : undefined}>
                        {item.label}
                      </span>
                    </Link>
                  </Fragment>
                )
              })}
            </nav>
            {/* Sign out */}
            <div className="px-3 py-3 border-t border-border">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:text-brick transition-all"
                id="mobile-signout"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ═══════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════ */}
      <main
        className="flex-1 min-w-0 min-h-dvh flex flex-col"
        style={{
          marginLeft: isMobile ? 0 : sidebarW,
          paddingBottom: isMobile ? 60 : 0,
          transition: 'margin-left 0.2s ease',
        }}
      >
        {/* Mobile topbar */}
        {isMobile && (
          <header className="sticky top-0 z-20 flex items-center justify-between h-[68px] px-4 bg-surface border-b border-border">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="btn btn-icon btn-icon-sm text-secondary"
              id="mobile-menu-toggle"
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="flex items-center gap-3" id="mobile-logo">
              <span className="w-8 h-8 rounded-full bg-jade flex items-center justify-center flex-shrink-0">
                <span className="w-3 h-3 rounded-full bg-ink" />
              </span>
              <div className="flex flex-col justify-center items-start text-left mt-0.5">
                <span className="font-display text-[15px] font-bold text-primary tracking-[0.15em] uppercase leading-none">Vyra</span>
                <span className="text-[9px] text-jade/90 font-mono font-medium uppercase tracking-[0.1em] mt-1 leading-none hidden sm:block">Rise Every Day</span>
              </div>
            </Link>
            <div className="w-9" /> {/* spacer */}
          </header>
        )}

        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* ═══════════════════════════════════════
          MOBILE BOTTOM NAV
          ═══════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* More drawer */}
          {isMoreOpen && (
            <>
              <div
                className="fixed inset-0 z-40 animate-fade-in-fast"
                onClick={() => setIsMoreOpen(false)}
              />
              <div className="drawer-panel-bottom z-50 px-4 pt-4 pb-safe">
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3 px-1">More</p>
                <div className="grid grid-cols-3 gap-2 pb-4">
                  {moreItems.map(item => {
                    const active = isActive(item.href)
                    const Icon   = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        id={`more-nav-${item.label.toLowerCase()}`}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                          active
                            ? 'bg-jade-dim text-jade'
                            : 'bg-surface-raised text-secondary hover:text-primary'
                        }`}
                        style={active ? { backgroundColor: 'var(--color-jade-dim)', color: 'var(--color-jade)' } : undefined}
                      >
                        <Icon size={20} />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                  {/* Sign out in more */}
                  <button
                    onClick={handleSignOut}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised text-muted hover:text-brick transition-all"
                    id="more-signout"
                  >
                    <LogOut size={20} />
                    <span className="text-xs font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Bottom tab bar */}
          <nav className="bottom-nav" id="bottom-nav">
            {bottomPrimary.map(item => {
              const active = isActive(item.href)
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  id={`bottom-nav-${item.label.toLowerCase()}`}
                  className={`bottom-nav-item ${active ? 'active' : ''}`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={active ? { color: 'var(--color-jade)' } : undefined}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            {/* More button */}
            <button
              onClick={() => setIsMoreOpen(v => !v)}
              id="bottom-nav-more"
              className={`bottom-nav-item ${anyMoreActive ? 'active' : ''}`}
            >
              <MoreHorizontal
                size={20}
                strokeWidth={anyMoreActive ? 2.5 : 1.8}
                style={anyMoreActive ? { color: 'var(--color-jade)' } : undefined}
              />
              <span>More</span>
            </button>
          </nav>
        </>
      )}
    </div>
  )
}
