'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, BatteryWarning, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader, Panel, SimLoading } from '@/components/dashboard/panel'
import { AgentInspector, BatteryBar, StatusBadge } from '@/components/sim/agent-inspector'
import { useSim, useSimSnapshot } from '@/components/sim/simulation-provider'
import { SimControls } from '@/components/sim/sim-controls'
import { AGENT_TASKS, type Agent, type AgentStatus } from '@/lib/sim/types'
import { cn } from '@/lib/utils'

type SortKey = 'id' | 'battery' | 'cellsExplored' | 'status' | 'task'
const STATUSES: Array<AgentStatus | 'all'> = ['all', 'exploring', 'avoiding', 'coordinating', 'returning', 'charging', 'idle']

const inputClass =
  'h-9 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

export function AgentsView() {
  const { engine, selectedAgentId, selectAgent, recallAgent } = useSim()
  const snap = useSimSnapshot()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AgentStatus | 'all'>('all')
  const [task, setTask] = useState<string>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'id', dir: 1 })

  const total = engine?.exploredCells ?? 1
  const rows = useMemo(() => {
    if (!engine) return []
    const list: Agent[] = engine.agents.filter(
      (a) =>
        (status === 'all' || a.status === status) &&
        (task === 'all' || a.task === task) &&
        a.id.toLowerCase().includes(query.trim().toLowerCase()),
    )
    return [...list].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sort.dir
      return String(av).localeCompare(String(bv)) * sort.dir
    })
    // agents mutate in place; snapshot version is the recompute signal
  }, [engine, snap?.version, status, task, query, sort])

  const lowBattery = engine?.agents.filter((a) => a.battery < 30 && a.task !== 'Return to Base' && a.status !== 'charging') ?? []

  const header = (key: SortKey, label: string, className?: string) => (
    <th scope="col" className={cn('px-3 py-2.5 text-left font-medium', className)} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : 1 }))}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
      </button>
    </th>
  )

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        eyebrow="Agent Management"
        title="Drone Fleet Monitor"
        description="Live telemetry for every agent in the swarm. Select a drone to inspect it, reassign its task, move it to another sector or recall it to base."
        actions={<SimControls />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title={`Agents (${rows.length}/${engine?.agents.length ?? 0})`}
          bodyClassName="p-0"
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={lowBattery.length === 0}
              onClick={() => lowBattery.forEach((a) => recallAgent(a.id))}
            >
              <BatteryWarning aria-hidden />
              Recall low battery ({lowBattery.length})
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2 border-b border-border p-4">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <label htmlFor="agent-search" className="sr-only">
                Search agents by ID
              </label>
              <input
                id="agent-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ID, e.g. DR-07"
                className={cn(inputClass, 'w-full pl-9')}
              />
            </div>
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select id="status-filter" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as AgentStatus | 'all')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <label htmlFor="task-filter" className="sr-only">
              Filter by task
            </label>
            <select id="task-filter" className={inputClass} value={task} onChange={(e) => setTask(e.target.value)}>
              <option value="all">All tasks</option>
              {AGENT_TASKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {!engine ? (
            <SimLoading />
          ) : (
            <div className="max-h-[640px] overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 z-10 bg-card/95 text-xs text-muted-foreground backdrop-blur">
                  <tr>
                    {header('id', 'Agent ID')}
                    <th scope="col" className="px-3 py-2.5 text-left font-medium">
                      Position (X, Y)
                    </th>
                    {header('status', 'Status')}
                    {header('battery', 'Battery')}
                    {header('cellsExplored', 'Exploration')}
                    {header('task', 'Assigned task')}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const share = (a.cellsExplored / Math.max(1, total)) * 100
                    const selected = a.id === selectedAgentId
                    return (
                      <tr
                        key={a.id}
                        onClick={() => selectAgent(a.id)}
                        className={cn(
                          'cursor-pointer border-t border-border/60 transition-colors hover:bg-primary/5',
                          selected && 'bg-primary/10',
                        )}
                      >
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectAgent(a.id)
                            }}
                            className={cn('font-mono text-sm font-medium hover:text-primary', selected ? 'text-primary' : 'text-foreground')}
                            aria-pressed={selected}
                          >
                            {a.id}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground tabular-nums">
                          ({a.x.toFixed(1)}, {a.y.toFixed(1)})
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-3 py-2">
                          <BatteryBar value={a.battery} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
                              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, share * 10)}%` }} />
                            </div>
                            <span className="font-mono text-xs tabular-nums text-foreground">{a.cellsExplored}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-foreground">{a.task}</td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        No agents match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <Panel title="Agent Inspector" delay={0.05}>
            <AgentInspector />
          </Panel>
        </div>
      </div>
    </div>
  )
}
