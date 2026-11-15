'use client'

import Link from 'next/link'
import { Crosshair, Home, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AGENT_TASKS, type AgentTask } from '@/lib/sim/types'
import { STATUS_COLORS } from '@/lib/sim/render'
import { useSim, useSimSnapshot } from './simulation-provider'

export function BatteryBar({ value }: { value: number }) {
  const color = value < 20 ? 'bg-destructive' : value < 45 ? 'bg-warning' : 'bg-success'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-foreground">{value.toFixed(0)}%</span>
    </div>
  )
}

export function StatusBadge({ status }: { status: keyof typeof STATUS_COLORS }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2 py-0.5 text-[11px] capitalize text-foreground">
      <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden />
      {status}
    </span>
  )
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background/60 px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AgentInspector({ showSimLink = true, className }: { showSimLink?: boolean; className?: string }) {
  const { engine, selectedAgentId, selectAgent, recallAgent, assignTask, assignSector } = useSim()
  useSimSnapshot()
  const agent = engine?.agents.find((a) => a.id === selectedAgentId)

  if (!engine || !agent) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 py-8 text-center', className)}>
        <Crosshair className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-foreground">No drone selected</p>
        <p className="max-w-[16rem] text-xs text-muted-foreground">
          Click a drone on the map or pick one from the agent table to inspect telemetry.
        </p>
      </div>
    )
  }

  const zone = engine.world.searchZones[agent.sector]
  const share = (agent.cellsExplored / Math.max(1, engine.exploredCells)) * 100
  const rows: Array<[string, React.ReactNode]> = [
    ['Position', <span key="p" className="font-mono">({agent.x.toFixed(1)}, {agent.y.toFixed(1)})</span>],
    ['Heading', <span key="h" className="font-mono">{Math.round(((agent.heading * 180) / Math.PI + 360) % 360)}°</span>],
    ['Battery', <BatteryBar key="b" value={agent.battery} />],
    ['Cells explored', <span key="c" className="font-mono">{agent.cellsExplored.toLocaleString()} ({share.toFixed(1)}%)</span>],
    ['Distance flown', <span key="d" className="font-mono">{agent.distance.toFixed(1)} u</span>],
    ['Survivors found', <span key="s" className="font-mono">{agent.survivorsFound}</span>],
    ['Collisions', <span key="col" className={cn('font-mono', agent.collisions > 0 && 'text-destructive')}>{agent.collisions}</span>],
    ['Cumulative reward', <span key="r" className="font-mono">{agent.reward.toFixed(1)}</span>],
  ]

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-lg font-semibold text-foreground">{agent.id}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={agent.status} />
            <span className="text-[11px] text-muted-foreground">{zone.name}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => selectAgent(null)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close inspector"
        >
          <X className="size-4" />
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-xs last:border-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right text-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`task-${agent.id}`} className="text-[11px] text-muted-foreground">
            Assigned task
          </label>
          <select
            id={`task-${agent.id}`}
            className={selectClass}
            value={agent.task}
            onChange={(e) => assignTask(agent.id, e.target.value as AgentTask)}
          >
            {AGENT_TASKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`sector-${agent.id}`} className="text-[11px] text-muted-foreground">
            Sector
          </label>
          <select
            id={`sector-${agent.id}`}
            className={selectClass}
            value={agent.sector}
            onChange={(e) => assignSector(agent.id, Number(e.target.value))}
          >
            {engine.world.searchZones.map((z, i) => (
              <option key={z.id} value={i}>
                {z.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => recallAgent(agent.id)}
          disabled={agent.task === 'Return to Base' || agent.status === 'charging'}
        >
          <Home aria-hidden />
          Recall to base
        </Button>
        {showSimLink && (
          <Button
            size="sm"
            render={<Link href="/simulation" />}
            nativeButton={false}
            className="bg-primary/15 text-primary hover:bg-primary/25"
          >
            <Crosshair aria-hidden />
            View in simulation
          </Button>
        )}
      </div>
    </div>
  )
}
