'use client'

import { AlertTriangle, BatteryLow, Flame, Info, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SimEvent, SimEventKind } from '@/lib/sim/types'

const KIND: Record<SimEventKind, { icon: typeof Info; className: string; label: string }> = {
  collision: { icon: AlertTriangle, className: 'text-destructive bg-destructive/10', label: 'Collision' },
  survivor: { icon: UserCheck, className: 'text-success bg-success/10', label: 'Survivor' },
  battery: { icon: BatteryLow, className: 'text-yellow-400 bg-yellow-400/10', label: 'Battery' },
  hazard: { icon: Flame, className: 'text-warning bg-warning/10', label: 'Hazard' },
  system: { icon: Info, className: 'text-primary bg-primary/10', label: 'System' },
}

export function EventLog({ events, limit = 30, className }: { events: SimEvent[]; limit?: number; className?: string }) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No events yet. Start the simulation.</p>
  }
  return (
    <ol className={cn('flex flex-col gap-1.5', className)} aria-live="polite" aria-relevant="additions">
      {events.slice(0, limit).map((e) => {
        const k = KIND[e.kind]
        const Icon = k.icon
        return (
          <li key={e.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40">
            <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md', k.className)}>
              <Icon className="size-3.5" aria-label={k.label} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug text-foreground">{e.message}</p>
              <p className="font-mono text-[10px] text-muted-foreground">step {e.step.toLocaleString()}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
