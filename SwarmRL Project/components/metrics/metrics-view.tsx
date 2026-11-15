'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BatteryMedium, Cpu, Network, Timer, Trophy, UserCheck } from 'lucide-react'
import { PageHeader, Panel, SimLoading } from '@/components/dashboard/panel'
import { StatCard } from '@/components/dashboard/stat-card'
import { SimControls } from '@/components/sim/sim-controls'
import { DataSourceBadge } from '@/components/sim/data-source-badge'
import { useSim, useSimSnapshot } from '@/components/sim/simulation-provider'
import { CHART_COLORS, axisProps, makeTooltip } from '@/components/charts/chart-theme'
import { AGENT_TASKS } from '@/lib/sim/types'

const PlainTooltip = makeTooltip('', (v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }))
const StepTooltip = makeTooltip('step ', (v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }))
const legendStyle = { fontSize: 11, color: '#8b98ad' }

export function MetricsView() {
  const { engine } = useSim()
  const snap = useSimSnapshot()

  const derived = useMemo(() => {
    if (!engine) return null
    const agents = engine.agents
    const top = [...agents]
      .sort((a, b) => b.cellsExplored - a.cellsExplored)
      .slice(0, 12)
      .map((a) => ({ id: a.id, cells: a.cellsExplored, reward: +a.reward.toFixed(1) }))
    const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}–${i * 10 + 10}`, count: 0 }))
    for (const a of agents) buckets[Math.min(9, Math.floor(a.battery / 10))].count++
    const byTask = AGENT_TASKS.map((t) => {
      const group = agents.filter((a) => a.task === t)
      return {
        task: t,
        agents: group.length,
        avgCells: group.length ? +(group.reduce((s, a) => s + a.cellsExplored, 0) / group.length).toFixed(1) : 0,
        avgReward: group.length ? +(group.reduce((s, a) => s + a.reward, 0) / group.length).toFixed(1) : 0,
      }
    })
    return { top, buckets, byTask }
    // agents mutate in place; snapshot version is the recompute signal
  }, [engine, snap?.version])

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        eyebrow="Performance Metrics"
        title="Runtime & Agent Performance"
        description="Live performance of the running simulation: compute cost, communication graph density, energy and per-agent contribution."
        actions={
          <>
            {snap && <DataSourceBadge source={snap.source} />}
            <SimControls />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard index={0} icon={Cpu} tone="primary" label="Render FPS" value={snap ? String(snap.fps) : '—'} hint="Browser animation frame rate" />
        <StatCard index={1} icon={Timer} tone="accent" label="Step latency" value={snap ? `${snap.stepMs.toFixed(2)}ms` : '—'} hint="Policy + physics per step" />
        <StatCard index={2} icon={Network} tone="primary" label="Comm links" value={snap ? String(snap.commLinks) : '—'} hint={`Range ${engine?.settings.commRange ?? '—'}u`} />
        <StatCard
          index={3}
          icon={BatteryMedium}
          tone={snap && snap.avgBattery < 40 ? 'warning' : 'success'}
          label="Avg battery"
          value={snap ? `${snap.avgBattery.toFixed(0)}%` : '—'}
          progress={snap?.avgBattery}
        />
        <StatCard index={4} icon={Trophy} tone="warning" label="Team reward" value={snap ? snap.episodeReward.toFixed(0) : '—'} hint="Cumulative this episode" />
        <StatCard
          index={5}
          icon={UserCheck}
          tone="success"
          label="Survivor recall"
          value={snap ? `${((snap.survivorsFound / Math.max(1, snap.survivorsTotal)) * 100).toFixed(0)}%` : '—'}
          hint={snap ? `${snap.survivorsFound} of ${snap.survivorsTotal}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Top Contributing Agents" description="Unique cells explored and cumulative reward">
          <div className="h-72">
            {derived ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.top} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="id" {...axisProps} interval={0} angle={-35} textAnchor="end" height={44} />
                  <YAxis {...axisProps} />
                  <Tooltip content={PlainTooltip} cursor={{ fill: 'rgba(47,123,255,0.06)' }} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="cells" name="Cells explored" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="reward" name="Reward" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <SimLoading />
            )}
          </div>
        </Panel>

        <Panel title="Battery Distribution" description="Number of drones per battery band (%)">
          <div className="h-72">
            {derived ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.buckets} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="range" {...axisProps} interval={0} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={PlainTooltip} cursor={{ fill: 'rgba(47,123,255,0.06)' }} />
                  <Bar dataKey="count" name="Drones" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {derived.buckets.map((b, i) => (
                      <Cell key={b.range} fill={i < 2 ? CHART_COLORS.danger : i < 4 ? CHART_COLORS.warning : CHART_COLORS.success} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <SimLoading />
            )}
          </div>
        </Panel>

        <Panel title="Team Reward & Energy" description="Cumulative reward and fleet battery across the episode">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snap?.history ?? []} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="step" {...axisProps} minTickGap={40} />
                <YAxis yAxisId="r" {...axisProps} />
                <YAxis yAxisId="b" orientation="right" domain={[0, 100]} {...axisProps} />
                <Tooltip content={StepTooltip} />
                <Legend wrapperStyle={legendStyle} />
                <Line yAxisId="r" type="monotone" dataKey="reward" name="Team reward" stroke={CHART_COLORS.warning} dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="b" type="monotone" dataKey="avgBattery" name="Avg battery %" stroke={CHART_COLORS.success} dot={false} strokeWidth={1.6} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Performance by Task" description="Average unique cells and reward per agent for each role">
          <div className="h-72">
            {derived ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.byTask} layout="vertical" margin={{ top: 4, right: 12, left: 24, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="task" {...axisProps} width={96} />
                  <Tooltip content={PlainTooltip} cursor={{ fill: 'rgba(47,123,255,0.06)' }} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="avgCells" name="Avg cells" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  <Bar dataKey="avgReward" name="Avg reward" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <SimLoading />
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
