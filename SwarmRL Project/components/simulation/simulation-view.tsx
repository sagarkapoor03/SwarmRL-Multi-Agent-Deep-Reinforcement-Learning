'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Box, Square } from 'lucide-react'
import { PageHeader, Panel, SimLoading, Toggle } from '@/components/dashboard/panel'
import { SimCanvas } from '@/components/sim/sim-canvas'
import { SimControls } from '@/components/sim/sim-controls'
import { EventLog } from '@/components/sim/event-log'
import { AgentInspector } from '@/components/sim/agent-inspector'
import { DataSourceBadge } from '@/components/sim/data-source-badge'
import { useSim, useSimSnapshot } from '@/components/sim/simulation-provider'
import { STATUS_COLORS } from '@/lib/sim/render'
import { cn } from '@/lib/utils'

const Sim3D = dynamic(() => import('@/components/sim/sim-3d'), { ssr: false, loading: () => <SimLoading /> })

export function SimulationView() {
  const { engine, settings, updateSettings } = useSim()
  const snap = useSimSnapshot()
  const [mode, setMode] = useState<'2d' | '3d'>('2d')

  const metrics = snap
    ? [
        ['Step', snap.step.toLocaleString()],
        ['Coverage', `${(snap.coverage * 100).toFixed(1)}%`],
        ['Efficiency', `${(snap.efficiency * 100).toFixed(1)}%`],
        ['Collisions', String(snap.collisions)],
        ['Comm links', String(snap.commLinks)],
        ['Team reward', snap.episodeReward.toFixed(0)],
        ['Avg battery', `${snap.avgBattery.toFixed(0)}%`],
        ['Render FPS', String(snap.fps)],
      ]
    : []

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        eyebrow="Live Simulation"
        title="Disaster-Zone Swarm Exploration"
        description="Each drone runs a decentralized policy: frontier-seeking exploration, separation-based collision avoidance, hazard repulsion and neighbor communication within range."
        actions={<SimControls />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          bodyClassName="p-0"
          title={mode === '2d' ? 'Tactical View · 2D' : 'Orbital View · 3D'}
          description={mode === '2d' ? 'Click a drone to inspect it' : 'Drag to orbit, scroll to zoom'}
          actions={
            <>
              {snap && <DataSourceBadge source={snap.source} />}
              <div role="group" aria-label="View mode" className="flex rounded-lg border border-border bg-card/60 p-0.5">
                {(
                  [
                    ['2d', '2D', Square],
                    ['3d', '3D', Box],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs',
                      mode === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </>
          }
        >
          <div className="relative aspect-[3/2] w-full">
            {!engine ? (
              <SimLoading />
            ) : mode === '2d' ? (
              <SimCanvas
                layers={{
                  trails: settings.showTrails,
                  links: settings.showLinks,
                  sensors: settings.showSensors,
                  heatmap: settings.showHeatmap,
                }}
              />
            ) : (
              <Sim3D />
            )}
            <Legend />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border p-4 md:grid-cols-4">
            <Toggle id="t-trails" label="Exploration paths" checked={settings.showTrails} onChange={(v) => updateSettings({ showTrails: v })} />
            <Toggle id="t-links" label="Comm links" checked={settings.showLinks} onChange={(v) => updateSettings({ showLinks: v })} />
            <Toggle id="t-sensors" label="Sensor radius" checked={settings.showSensors} onChange={(v) => updateSettings({ showSensors: v })} />
            <Toggle id="t-heat" label="Coverage map" checked={settings.showHeatmap} onChange={(v) => updateSettings({ showHeatmap: v })} />
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Agent Inspector" delay={0.05}>
            <AgentInspector showSimLink={false} />
          </Panel>
          <Panel title="Telemetry" delay={0.1}>
            {snap ? (
              <dl className="grid grid-cols-2 gap-3">
                {metrics.map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border bg-background/40 px-3 py-2">
                    <dt className="text-[11px] text-muted-foreground">{k}</dt>
                    <dd className="font-mono text-sm font-semibold text-foreground tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <SimLoading />
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Event Stream" description="Collisions, survivor detections, hazard incursions and battery events" bodyClassName="max-h-72 overflow-y-auto p-3">
        {snap ? <EventLog events={snap.events} limit={60} className="md:grid md:grid-cols-2 md:gap-x-4" /> : <SimLoading />}
      </Panel>
    </div>
  )
}

function Legend() {
  const items: Array<[string, string]> = [
    ...(Object.entries(STATUS_COLORS) as Array<[string, string]>),
    ['danger zone', '#ef4444'],
    ['survivor found', '#22c55e'],
  ]
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[70%] flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border bg-background/80 px-3 py-2 backdrop-blur md:flex">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-[10px] capitalize text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  )
}
