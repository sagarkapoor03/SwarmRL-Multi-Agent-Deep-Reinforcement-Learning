'use client'

import { ArrowRight, BrainCircuit, Cloud, Radio, Server } from 'lucide-react'
import { Panel } from '@/components/dashboard/panel'
import { useBackendHealth } from '@/hooks/use-backend'
import { useSim } from '@/components/sim/simulation-provider'
import { cn } from '@/lib/utils'

type Node = { title: string; subtitle: string; icon: typeof Cloud; state: 'ok' | 'warn' | 'off' | 'local'; detail: string }

const STATE_STYLES = {
  ok: 'border-success/30 text-success',
  warn: 'border-warning/30 text-warning',
  off: 'border-border text-muted-foreground',
  local: 'border-accent/30 text-accent',
}

export function SystemStatus() {
  const { state, health } = useBackendHealth()
  const { streamStatus } = useSim()

  const nodes: Node[] = [
    { title: 'Mission Control UI', subtitle: 'Next.js · Cloudflare Workers', icon: Cloud, state: 'ok', detail: 'Serving' },
    {
      title: 'FastAPI Gateway',
      subtitle: 'REST + WebSocket',
      icon: Server,
      state: state === 'online' ? 'ok' : state === 'offline' ? 'warn' : state === 'checking' ? 'warn' : 'off',
      detail: state === 'online' ? `v${health?.version ?? '—'}` : state === 'unconfigured' ? 'Not configured' : state === 'checking' ? 'Checking' : 'Unreachable',
    },
    {
      title: 'Agent Stream',
      subtitle: 'ws://…/ws/agents',
      icon: Radio,
      state: streamStatus === 'open' ? 'ok' : streamStatus === 'connecting' ? 'warn' : streamStatus === 'error' ? 'warn' : 'off',
      detail:
        streamStatus === 'open' ? 'Streaming' : streamStatus === 'disabled' ? 'Disabled' : streamStatus === 'unconfigured' ? 'Not configured' : streamStatus,
    },
    {
      title: 'MAPPO Engine',
      subtitle: 'Ray RLlib · PPO + centralized critic',
      icon: BrainCircuit,
      state: state === 'online' && health?.ray ? 'ok' : 'local',
      detail: state === 'online' && health?.ray ? (health.training ? 'Training' : 'Ready') : 'Using local JS policy',
    },
  ]

  return (
    <Panel title="System Architecture" description="Live status of each layer in the SwarmRL stack" delay={0.1}>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {nodes.map((n, i) => {
          const Icon = n.icon
          return (
            <li key={n.title} className="relative">
              <div className="flex h-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{n.subtitle}</p>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] capitalize', STATE_STYLES[n.state])}>
                  {n.detail}
                </span>
              </div>
              {i < nodes.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden size-4 -translate-y-1/2 text-muted-foreground xl:block" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
