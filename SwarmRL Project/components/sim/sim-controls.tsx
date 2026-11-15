'use client'

import { Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSim, useSimSnapshot } from './simulation-provider'

export const SPEEDS = [0.5, 1, 2, 4, 8]

export function SimControls({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { start, pause, resume, reset, setSpeed } = useSim()
  const snap = useSimSnapshot()
  const disabled = !snap
  const status = snap?.status ?? 'idle'
  const backend = snap?.source === 'backend'

  const primary =
    status === 'running'
      ? { label: 'Pause', icon: Pause, onClick: pause }
      : status === 'paused'
        ? { label: 'Resume', icon: StepForward, onClick: resume }
        : status === 'complete'
          ? { label: 'Restart', icon: Play, onClick: start }
          : { label: 'Start', icon: Play, onClick: start }
  const PrimaryIcon = primary.icon

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        onClick={primary.onClick}
        disabled={disabled || backend}
        size={compact ? 'sm' : 'lg'}
        className={cn(
          'min-w-[5.5rem]',
          status === 'running'
            ? 'bg-warning/15 text-warning hover:bg-warning/25'
            : 'bg-primary text-primary-foreground shadow-[0_0_20px_-4px_rgba(47,123,255,0.8)] hover:bg-primary/90',
        )}
      >
        <PrimaryIcon aria-hidden />
        {primary.label}
      </Button>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'lg'}
        onClick={reset}
        disabled={disabled || backend}
        aria-label="Reset simulation"
      >
        <RotateCcw aria-hidden />
        {!compact && 'Reset'}
      </Button>
      {!compact && (
        <div role="group" aria-label="Simulation speed" className="flex items-center rounded-lg border border-border bg-card/60 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-pressed={snap?.speed === s}
              disabled={disabled || backend}
              className={cn(
                'rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors disabled:opacity-50',
                snap?.speed === s ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
