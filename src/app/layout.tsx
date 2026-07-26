import type { Metadata, Viewport } from 'next'
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/layout/AppShell'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { FocusTimerProvider } from '@/components/providers/FocusTimerProvider'
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Vyra — Command Center',
    template: '%s | Vyra',
  },
  description: 'A premium personal command center for a 24-month software engineering roadmap. Track DSA, habits, tasks, and the cinematic game trailer.',
  keywords: ['DSA tracker', 'habit tracker', 'task manager', 'software engineering', 'progress', 'roadmap', 'productivity'],
  authors: [{ name: 'Vyra' }],
  robots: 'noindex,nofollow',
  openGraph: {
    title: 'Vyra — Command Center',
    description: 'Track DSA, habits, tasks, and your cinematic game trailer on one premium command center.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#14161C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
      data-theme="dark"
      suppressHydrationWarning
    >
      {/*
        Inline script: apply stored theme BEFORE first paint to avoid flash.
        This runs synchronously before React hydrates.
      */}
      <head>
        <script id="theme-script" dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var stored = localStorage.getItem('vany-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', stored);
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className="bg-ink text-primary font-body antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <FocusTimerProvider>
              <AppShell>{children}</AppShell>
            </FocusTimerProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
