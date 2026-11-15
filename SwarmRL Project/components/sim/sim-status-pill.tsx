import { cn } from '@/lib/utils'
import type { SimStatus } from '@/lib/sim/types'

const STYLES: Record<SimStatus, { label: string; dot: string; text: string }> = {
  idle: { label: 'Standby', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  running: { label: 'Running', dot: 'bg-success animate-pulse', text: 'text-success' },
  paused: { label: 'Paused', dot: 'bg-warning', text: 'text-warning' },
  complete: { label: 'Mission complete', dot: 'bg-accent', text: 'text-accent' },
}

export function SimStatusPill({ status, step }: { status: SimStatus; step: number }) {
  const s = STYLES[status]
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs">
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      <span className={cn('font-medium', s.text)}>{s.label}</span>
      <span className="font-mono text-muted-foreground">t={step.toLocaleString()}</span>
    </span>
  )
}
