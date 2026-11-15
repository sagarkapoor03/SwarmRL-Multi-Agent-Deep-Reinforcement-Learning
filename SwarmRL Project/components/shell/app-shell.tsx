'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Radar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav-items'
import { TopBar } from './top-bar'
import { useBackendHealth } from '@/hooks/use-backend'

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="relative flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary glow-border">
        <Radar className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight text-foreground">SwarmRL</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Mission Control</span>
      </span>
    </Link>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              active
                ? 'bg-sidebar-accent text-foreground'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_12px_2px_rgba(47,123,255,0.6)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground group-hover:text-accent')} aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  const { state } = useBackendHealth()
  const label =
    state === 'online' ? 'MAPPO backend online' : state === 'checking' ? 'Checking backend…' : state === 'offline' ? 'Backend offline' : 'Local simulation mode'
  const dot = state === 'online' ? 'bg-success' : state === 'offline' ? 'bg-destructive' : state === 'checking' ? 'bg-warning' : 'bg-accent'
  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="flex items-center gap-2 text-xs text-foreground">
        <span className={cn('size-2 rounded-full', dot)} aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {state === 'online'
          ? 'Training metrics are served by Ray RLlib.'
          : 'Agents run a MAPPO-inspired JS policy in your browser.'}
      </p>
      <Link href="/settings" className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline">
        Configure backend
      </Link>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Navigation</p>
          <SidebarNav />
        </div>
        <SidebarFooter />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-5 lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          menuButton={
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
          }
        />
        <main className="grid-backdrop flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
