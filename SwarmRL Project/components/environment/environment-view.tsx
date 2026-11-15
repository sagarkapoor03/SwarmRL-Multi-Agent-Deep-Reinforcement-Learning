'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, Flame, Siren } from 'lucide-react'
import { PageHeader, Panel, SimLoading, Toggle } from '@/components/dashboard/panel'
import { SimCanvas } from '@/components/sim/sim-canvas'
import { useSim, useSimSnapshot } from '@/components/sim/simulation-provider'
import type { MapLayers } from '@/lib/sim/render'
import type { SwarmEngine } from '@/lib/sim/engine'
import { cn } from '@/lib/utils'

const LAYER_LABELS: Array<[keyof MapLayers, string]> = [
  ['heatmap', 'Coverage heatmap'],
  ['buildings', 'Buildings'],
  ['roads', 'Roads'],
  ['obstacles', 'Danger zones'],
  ['searchZones', 'Search zones'],
  ['emergency', 'Emergency areas'],
  ['drones', 'Drone positions'],
  ['links', 'Comm links'],
]

function zoneCoverage(engine: SwarmEngine, x0: number, y0: number, w: number, h: number) {
  const { width, blocked } = engine.world
  let seen = 0
  let total = 0
  for (let y = Math.floor(y0); y < Math.floor(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.floor(x0 + w); x++) {
      const i = y * width + x
      if (blocked[i]) continue
      total++
      if (engine.visits[i] > 0) seen++
    }
  }
  return total ? seen / total : 0
}

function describePoint(engine: SwarmEngine, x: number, y: number) {
  const { world } = engine
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return null
  const lines: string[] = []
  const b = world.buildings.find((bd) => x >= bd.x && x <= bd.x + bd.w && y >= bd.y && y <= bd.y + bd.h)
  if (b) lines.push(`${b.id} · ${b.collapsed ? 'Collapsed structure' : 'Building'}`)
  const hz = world.dangerZones.find((z) => Math.hypot(z.x - x, z.y - y) <= z.r)
  if (hz) lines.push(`${hz.id} · ${hz.kind} hazard`)
  const ea = world.emergencyAreas.find((e) => Math.hypot(e.x - x, e.y - y) <= e.r)
  if (ea) lines.push(`${ea.id} · ${ea.name}`)
  const sz = world.searchZones.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
  if (sz) lines.push(`${sz.name} (${sz.priority} priority)`)
  if (!b) {
    const v = engine.visits[Math.floor(y) * world.width + Math.floor(x)]
    lines.push(v > 0 ? `Explored · ${v} sensor passes` : 'Unexplored')
  }
  return { title: `(${x.toFixed(1)}, ${y.toFixed(1)})`, lines }
}

export function EnvironmentView() {
  const { engine } = useSim()
  const snap = useSimSnapshot()
  const [layers, setLayers] = useState<Partial<MapLayers>>({ trails: false, links: false, sensors: false })
  const [hover, setHover] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null)

  const merged: MapLayers = {
    heatmap: true,
    roads: true,
    buildings: true,
    obstacles: true,
    searchZones: true,
    emergency: true,
    drones: true,
    trails: false,
    links: false,
    sensors: false,
    ...layers,
  }

  const zones = useMemo(() => {
    if (!engine) return []
    return engine.world.searchZones.map((z) => ({ ...z, coverage: zoneCoverage(engine, z.x, z.y, z.w, z.h) }))
    // agents mutate the shared grid; snapshot version is the recompute signal
  }, [engine, snap?.version])

  const info = engine && hover ? describePoint(engine, hover.x, hover.y) : null

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        eyebrow="Environment Map"
        title="Disaster-Zone Intelligence"
        description="120 × 80 unit urban grid with collapsed structures, active hazards, priority search sectors and emergency areas. Hover the map to inspect any location."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Operational Map" bodyClassName="p-0">
          <div className="relative aspect-[3/2] w-full">
            {engine ? (
              <SimCanvas
                layers={merged}
                ariaLabel="Interactive disaster zone map"
                onPointerWorld={(p, s) => setHover(p && s ? { x: p.x, y: p.y, sx: s.x, sy: s.y } : null)}
              />
            ) : (
              <SimLoading />
            )}
            {info && hover && (
              <div
                className="pointer-events-none absolute z-10 w-56 rounded-lg border border-border bg-background/90 p-2.5 text-xs shadow-xl backdrop-blur"
                style={{ left: hover.sx > 360 ? hover.sx - 238 : hover.sx + 14, top: hover.sy > 220 ? hover.sy - 110 : hover.sy + 14 }}
              >
                <p className="font-mono text-[11px] text-accent">{info.title}</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-foreground">
                  {info.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <fieldset className="grid grid-cols-2 gap-3 border-t border-border p-4 md:grid-cols-4">
            <legend className="sr-only">Map layers</legend>
            {LAYER_LABELS.map(([key, label]) => (
              <Toggle
                key={key}
                id={`layer-${key}`}
                label={label}
                checked={merged[key]}
                onChange={(v) => setLayers((l) => ({ ...l, [key]: v }))}
              />
            ))}
          </fieldset>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Search Zones" description="Coverage per sector">
            <ul className="flex flex-col gap-3">
              {zones.map((z) => (
                <li key={z.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{z.name}</span>
                    <span className="font-mono text-muted-foreground">{(z.coverage * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${z.coverage * 100}%` }} />
                    </div>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-mono text-[10px]',
                        z.priority === 'High' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary',
                      )}
                    >
                      {z.priority}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Emergency Areas" description="Survivors located per site">
            {engine ? (
              <ul className="flex flex-col gap-2">
                {engine.world.emergencyAreas.map((e) => {
                  const all = engine.world.survivors.filter((s) => s.areaId === e.id)
                  const found = all.filter((s) => s.found).length
                  return (
                    <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
                      <Siren className={cn('size-4', found === all.length ? 'text-success' : 'text-destructive')} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-foreground">{e.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {e.id} · ({e.x}, {e.y})
                        </p>
                      </div>
                      <span className="font-mono text-xs text-foreground">
                        {found}/{all.length}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <SimLoading />
            )}
          </Panel>

          <Panel title="Hazards & Obstacles">
            {engine ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <Building2 className="size-4 text-muted-foreground" aria-hidden />
                    <p className="mt-1 font-mono text-lg font-semibold text-foreground">{engine.world.buildings.length}</p>
                    <p className="text-[11px] text-muted-foreground">Structures</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <AlertTriangle className="size-4 text-warning" aria-hidden />
                    <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                      {engine.world.buildings.filter((b) => b.collapsed).length}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Collapsed</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {engine.world.dangerZones.map((z) => (
                    <li key={z.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-foreground">
                        <Flame className="size-3.5 text-destructive" aria-hidden />
                        {z.id} · {z.kind}
                      </span>
                      <span className="font-mono text-muted-foreground">r={z.r}u</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SimLoading />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
