'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader, Panel } from '@/components/dashboard/panel'
import { DataSourceBadge } from '@/components/sim/data-source-badge'
import { CHART_COLORS, axisProps, makeTooltip } from '@/components/charts/chart-theme'
import { useTrainingMetrics } from '@/hooks/use-backend'
import { downsample } from '@/lib/data/training'
import { cn } from '@/lib/utils'

const RANGES = [
  { label: 'Last 100', value: 100 },
  { label: 'Last 250', value: 250 },
  { label: 'Last 500', value: 500 },
  { label: 'All', value: 0 },
]

const EpisodeTooltip = makeTooltip('episode ', (v) => v.toFixed(2))
const PctTooltip = makeTooltip('episode ', (v) => `${v.toFixed(1)}%`)
const PlainTooltip = makeTooltip('', (v) => v.toFixed(1))

const legendStyle = { fontSize: 11, color: '#8b98ad' }

export function AnalyticsView() {
  const { metrics, isLive } = useTrainingMetrics()
  const [range, setRange] = useState(0)

  const data = useMemo(() => {
    const slice = range ? metrics.episodes.slice(-range) : metrics.episodes
    return downsample(slice, 160)
  }, [metrics, range])

  const last = metrics.episodes[metrics.episodes.length - 1]
  const first = metrics.episodes[0]
  const best = metrics.episodes.reduce((m, e) => (e.reward > m.reward ? e : m), first)

  const summary = [
    ['Episodes', metrics.totalEpisodes.toLocaleString()],
    ['Timesteps', `${(metrics.totalTimesteps / 1e6).toFixed(1)}M`],
    ['Mean reward (50)', last.avgReward.toFixed(1)],
    ['Best episode', `${best.reward.toFixed(1)} @ ${best.episode}`],
    ['Final efficiency', `${last.efficiency.toFixed(1)}%`],
    ['Collision rate', `${last.collisionRate.toFixed(2)}/ep`],
  ]

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        eyebrow="Training Analytics"
        title="MAPPO Learning Curves"
        description={`${metrics.algorithm} trained with ${metrics.framework}. ${isLive ? 'Metrics are streamed from the training backend.' : 'Showing a representative sample run until the FastAPI backend is connected.'}`}
        actions={
          <>
            <DataSourceBadge source={isLive ? 'backend' : 'sample'} />
            <div role="group" aria-label="Episode range" className="flex rounded-lg border border-border bg-card/60 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  aria-pressed={range === r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs',
                    range === r.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summary.map(([k, v]) => (
          <div key={k} className="glass-panel rounded-xl px-4 py-3">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Reward per Episode" description="Raw team reward and 50-episode moving average">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="episode" {...axisProps} minTickGap={40} />
                <YAxis {...axisProps} />
                <Tooltip content={EpisodeTooltip} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="reward" name="Episode reward" stroke={CHART_COLORS.primary} strokeOpacity={0.4} dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="avgReward" name="Moving average" stroke={CHART_COLORS.accent} dot={false} strokeWidth={2.2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Training Loss" description="PPO clipped policy loss and centralized critic value loss">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="episode" {...axisProps} minTickGap={40} />
                <YAxis {...axisProps} />
                <Tooltip content={EpisodeTooltip} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="policyLoss" name="Policy loss" stroke={CHART_COLORS.warning} dot={false} strokeWidth={1.8} />
                <Line type="monotone" dataKey="valueLoss" name="Value loss" stroke={CHART_COLORS.danger} dot={false} strokeWidth={1.8} />
                <Line type="monotone" dataKey="entropy" name="Entropy" stroke={CHART_COLORS.muted} dot={false} strokeWidth={1.2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Average Episode Reward" description="Smoothed return showing policy convergence">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="episode" {...axisProps} minTickGap={40} />
                <YAxis {...axisProps} />
                <Tooltip content={EpisodeTooltip} />
                <Area type="monotone" dataKey="avgReward" name="Average reward" stroke={CHART_COLORS.primary} fill="url(#avgFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Exploration Efficiency" description="Unique area covered per unit swept, and final map coverage">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="episode" {...axisProps} minTickGap={40} />
                <YAxis domain={[30, 100]} {...axisProps} />
                <Tooltip content={PctTooltip} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke={CHART_COLORS.success} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="coverage" name="Coverage" stroke={CHART_COLORS.accent} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Collision Rate" description="Inter-agent collisions per episode">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="colFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.danger} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="episode" {...axisProps} minTickGap={40} />
                <YAxis {...axisProps} />
                <Tooltip content={EpisodeTooltip} />
                <Area type="monotone" dataKey="collisionRate" name="Collisions / episode" stroke={CHART_COLORS.danger} fill="url(#colFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Agent Performance" description="Mean reward and task success rate by agent role">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.agentGroups} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="role" {...axisProps} interval={0} />
                <YAxis {...axisProps} />
                <Tooltip content={PlainTooltip} cursor={{ fill: 'rgba(47,123,255,0.06)' }} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="reward" name="Mean reward" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="successRate" name="Success rate %" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Algorithm Comparison" description="Normalized evaluation scores (0–100) against baselines">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={metrics.comparison} outerRadius="75%">
                <PolarGrid stroke={CHART_COLORS.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#8b98ad', fontSize: 11 }} />
                <Tooltip content={PlainTooltip} />
                <Legend wrapperStyle={legendStyle} />
                <Radar name="MAPPO" dataKey="MAPPO" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.3} />
                <Radar name="IPPO" dataKey="IPPO" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.15} />
                <Radar name="Heuristic" dataKey="Heuristic" stroke={CHART_COLORS.muted} fill={CHART_COLORS.muted} fillOpacity={0.08} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Hyperparameters" description="RLlib PPO config used for MAPPO">
          <dl className="flex flex-col">
            {Object.entries(metrics.hyperparameters).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-border/60 py-2 text-xs last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-foreground">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  )
}
