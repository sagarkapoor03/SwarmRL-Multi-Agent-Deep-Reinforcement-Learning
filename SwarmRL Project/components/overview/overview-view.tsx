'use client'

import Link from 'next/link'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, BrainCircuit, Gauge, Map as MapIcon, PlaneTakeoff, ShieldCheck, UserCheck } from 'lucide-react'
import { PageHeader, Panel, SimLoading } from '@/components/dashboard/panel'
import { StatCard } from '@/components/dashboard/stat-card'
import { SimCanvas } from '@/components/sim/sim-canvas'
import { SimControls } from '@/components/sim/sim-controls'
import { EventLog } from '@/components/sim/event-log'
import { DataSourceBadge } from '@/components/sim/data-source-badge'
import { useSim, useSimSnapshot } from '@/components/sim/simulation-provider'
import { CHART_COLORS, axisProps, makeTooltip } from '@/components/charts/chart-theme'
import { STATUS_COLORS } from '@/lib/sim/render'
import { useTrainingMetrics } from '@/hooks/use-backend'
import { downsample } from '@/lib/data/training'
import { SystemStatus } from './system-status'
import type { AgentStatus } from '@/lib/sim/types'

const CoverageTooltip = makeTooltip('step ', (v) => `${v.toFixed(1)}%`)
const RewardTooltip = makeTooltip('episode ', (v) => v.toFixed(1))

export function OverviewView() {
  const { engine } = useSim()
  const snap = useSimSnapshot()
  const { metrics, isLive } = useTrainingMetrics()
  const rewardSeries = downsample(metrics.episodes, 80)
  const latest = metrics.episodes[metrics.episodes.length - 1]

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        eyebrow="Operation Phoenix · Sector 7 Earthquake Response"
        title="Swarm Mission Overview"
        description="50 autonomous drones coordinated by a Multi-Agent PPO policy are searching a disaster-affected urban area for survivors while avoiding hazards and each other."
        actions={<SimControls />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          index={0}
          label="Active Drones"
          icon={PlaneTakeoff}
          tone="primary"
          value={snap ? `${snap.activeAgents}` : '—'}
          hint={snap ? `${engine?.agents.length ?? 0} deployed · ${snap.statusCounts.charging} charging` : undefined}
          progress={snap && engine ? (snap.activeAgents / engine.agents.length) * 100 : 0}
        />
        <StatCard
          index={1}
          label="Map Coverage"
          icon={MapIcon}
          tone="accent"
          value={snap ? `${(snap.coverage * 100).toFixed(1)}%` : '—'}
          hint="Explorable cells sensed"
          progress={snap ? snap.coverage * 100 : 0}
        />
        <StatCard
          index={2}
          label="Total Collisions"
          icon={ShieldCheck}
          tone={snap && snap.collisions > 0 ? 'danger' : 'success'}
          value={snap ? `${snap.collisions}` : '—'}
          hint="Inter-agent separation < 0.42u"
        />
        <StatCard
          index={3}
          label="Exploration Efficiency"
          icon={Gauge}
          tone="success"
          value={snap ? `${(snap.efficiency * 100).toFixed(1)}%` : '—'}
          hint="Unique / total swept area"
          progress={snap ? snap.efficiency * 100 : 0}
        />
        <StatCard
          index={4}
          label="Training Episodes"
          icon={BrainCircuit}
          tone="warning"
          value={metrics.totalEpisodes.toLocaleString()}
          hint={isLive ? 'From MAPPO backend' : 'Sample MAPPO run'}
          progress={100}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel
          title="Live Swarm Map"
          description="Cyan cells are explored; dark cells remain unsearched."
          className="xl:col-span-2"
          bodyClassName="p-0"
          delay={0.1}
          actions={
            <>
              {snap && <DataSourceBadge source={snap.source} />}
              <Link
                href="/simulation"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              >
                Open simulation <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </>
          }
        >
          <div className="aspect-[3/2] w-full">
            {engine ? <SimCanvas layers={{ trails: false }} /> : <SimLoading />}
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Swarm Status" description="Current behavior of each agent" delay={0.15}>
            {snap ? <StatusBreakdown counts={snap.statusCounts} total={engine?.agents.length ?? 0} /> : <SimLoading />}
          </Panel>
          <Panel title="Survivors Located" delay={0.2}>
            {snap ? (
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-success/12 text-success">
                  <UserCheck className="size-6" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="font-mono text-2xl font-semibold text-foreground">
                    {snap.survivorsFound}
                    <span className="text-base text-muted-foreground"> / {snap.survivorsTotal}</span>
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full bg-success transition-[width]"
                      style={{ width: `${(snap.survivorsFound / Math.max(1, snap.survivorsTotal)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <SimLoading />
            )}
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title="Coverage Progress" description="Live coverage and efficiency over simulation steps" delay={0.1}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snap?.history ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="covFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="step" {...axisProps} minTickGap={40} />
                <YAxis domain={[0, 100]} {...axisProps} />
                <Tooltip content={CoverageTooltip} />
                <Area type="monotone" dataKey="coverage" name="Coverage" stroke={CHART_COLORS.accent} fill="url(#covFill)" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke={CHART_COLORS.success} dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="MAPPO Training Snapshot"
          description={`Mean episode reward · latest ${latest.avgReward.toFixed(1)}`}
          delay={0.15}
          actions={<DataSourceBadge source={isLive ? 'backend' : 'sample'} />}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rewardSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="episode" {...axisProps} minTickGap={40} />
                <YAxis {...axisProps} />
                <Tooltip content={RewardTooltip} />
                <Line type="monotone" dataKey="reward" name="Reward" stroke={CHART_COLORS.primary} strokeOpacity={0.35} dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="avgReward" name="Avg (50)" stroke={CHART_COLORS.primary} dot={false} strokeWidth={2.2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Mission Events" description="Latest swarm activity" delay={0.2} bodyClassName="max-h-[16.5rem] overflow-y-auto p-3">
          {snap ? <EventLog events={snap.events} limit={12} /> : <SimLoading />}
        </Panel>
      </div>

      <SystemStatus />
    </div>
  )
}

function StatusBreakdown({ counts, total }: { counts: Record<AgentStatus, number>; total: number }) {
  const entries = Object.entries(counts) as Array<[AgentStatus, number]>
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        {entries.map(([s, n]) =>
          n > 0 ? <div key={s} style={{ width: `${(n / Math.max(1, total)) * 100}%`, background: STATUS_COLORS[s] }} /> : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {entries.map(([s, n]) => (
          <li key={s} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 capitalize text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: STATUS_COLORS[s] }} aria-hidden />
              {s}
            </span>
            <span className="font-mono text-foreground">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
