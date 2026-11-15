'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'
import { useSimSnapshot } from '@/components/sim/simulation-provider'
import { SimStatusPill } from '@/components/sim/sim-status-pill'
import { SimControls } from '@/components/sim/sim-controls'
import { DataSourceBadge } from '@/components/sim/data-source-badge'

export function TopBar({ menuButton }: { menuButton: React.ReactNode }) {
  const pathname = usePathname()
  const snap = useSimSnapshot()
  const item =
    NAV_ITEMS.find((n) => (n.href === '/' ? pathname === '/' : pathname.startsWith(n.href))) ?? NAV_ITEMS[0]

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6 lg:px-8">
      {menuButton}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{item.description}</p>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        {snap && <DataSourceBadge source={snap.source} />}
        {snap && <SimStatusPill status={snap.status} step={snap.step} />}
      </div>
      <SimControls compact />
    </header>
  )
}
