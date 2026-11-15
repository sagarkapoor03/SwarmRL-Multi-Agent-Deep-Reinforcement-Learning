'use client'

import { useState } from 'react'
import { Check, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader, Panel, Toggle } from '@/components/dashboard/panel'
import { useSim } from '@/components/sim/simulation-provider'
import { useBackendHealth } from '@/hooks/use-backend'
import { apiConfig } from '@/lib/api/config'
import { DEFAULT_SETTINGS } from '@/lib/sim/types'
import { cn } from '@/lib/utils'

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-foreground">
          {label}
        </label>
        <span className="font-mono text-xs text-accent">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input"
      />
    </div>
  )
}

export function SettingsView() {
  const { settings, updateSettings, streamStatus } = useSim()
  const { state, health, refresh } = useBackendHealth()
  const [draft, setDraft] = useState({
    agentCount: settings.agentCount,
    seed: settings.seed,
    warmStart: settings.warmStart,
  })
  const [applied, setApplied] = useState(false)
  const dirty =
    draft.agentCount !== settings.agentCount || draft.seed !== settings.seed || draft.warmStart !== settings.warmStart

  const apply = () => {
    updateSettings(draft, { reset: true })
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }

  const statusLabel =
    state === 'online'
      ? `Online · v${health?.version ?? '?'} · ${health?.ray ? 'Ray available' : 'Ray unavailable'}`
      : state === 'offline'
        ? 'Unreachable'
        : state === 'checking'
          ? 'Checking…'
          : 'Not configured'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Simulation & Backend Configuration"
        description="Tune the swarm, the local policy parameters and the connection to the FastAPI / Ray RLlib backend."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setDraft({ agentCount: DEFAULT_SETTINGS.agentCount, seed: DEFAULT_SETTINGS.seed, warmStart: DEFAULT_SETTINGS.warmStart })
              updateSettings(DEFAULT_SETTINGS, { reset: true })
            }}
          >
            <RotateCcw aria-hidden />
            Restore defaults
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Swarm Deployment" description="Changing these redeploys the swarm and resets the episode.">
          <div className="flex flex-col gap-5">
            <RangeField
              id="agent-count"
              label="Number of drones"
              value={draft.agentCount}
              min={10}
              max={100}
              step={5}
              onChange={(v) => setDraft((d) => ({ ...d, agentCount: v }))}
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="seed" className="text-sm text-foreground">
                Environment seed
              </label>
              <input
                id="seed"
                type="number"
                min={1}
                value={draft.seed}
                onChange={(e) => setDraft((d) => ({ ...d, seed: Math.max(1, Number(e.target.value) || 1) }))}
                className="h-9 rounded-lg border border-input bg-background/60 px-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Seeds the building layout, survivors and agent spawn points.</p>
            </div>
            <Toggle
              id="warm-start"
              label="Start from checkpoint"
              description="Pre-roll the episode to ~68.5% coverage before handing control to you."
              checked={draft.warmStart}
              onChange={(v) => setDraft((d) => ({ ...d, warmStart: v }))}
            />
            <Button onClick={apply} disabled={!dirty && !applied} className="self-start">
              {applied ? <Check aria-hidden /> : <RotateCcw aria-hidden />}
              {applied ? 'Swarm redeployed' : 'Apply & redeploy'}
            </Button>
          </div>
        </Panel>

        <Panel title="Policy Parameters" description="Applied live to the running local simulation.">
          <div className="flex flex-col gap-5">
            <RangeField
              id="sensor"
              label="Sensor radius"
              unit="u"
              value={settings.sensorRadius}
              min={1}
              max={4}
              step={0.1}
              onChange={(v) => updateSettings({ sensorRadius: v })}
            />
            <RangeField
              id="comm"
              label="Communication range"
              unit="u"
              value={settings.commRange}
              min={3}
              max={20}
              step={0.5}
              onChange={(v) => updateSettings({ commRange: v })}
            />
            <RangeField
              id="speed"
              label="Max velocity"
              unit=" u/step"
              value={settings.maxSpeed}
              min={0.03}
              max={0.2}
              step={0.01}
              onChange={(v) => updateSettings({ maxSpeed: v })}
            />
            <Toggle
              id="avoid"
              label="Collision avoidance"
              description="Disable to observe collisions without the separation term."
              checked={settings.collisionAvoidance}
              onChange={(v) => updateSettings({ collisionAvoidance: v })}
            />
          </div>
        </Panel>

        <Panel title="Visualization" description="Default overlays for the live simulation view.">
          <div className="flex flex-col gap-4">
            <Toggle id="s-trails" label="Exploration paths" checked={settings.showTrails} onChange={(v) => updateSettings({ showTrails: v })} />
            <Toggle id="s-links" label="Communication links" checked={settings.showLinks} onChange={(v) => updateSettings({ showLinks: v })} />
            <Toggle id="s-sensors" label="Sensor radius" checked={settings.showSensors} onChange={(v) => updateSettings({ showSensors: v })} />
            <Toggle id="s-heat" label="Coverage heatmap" checked={settings.showHeatmap} onChange={(v) => updateSettings({ showHeatmap: v })} />
          </div>
        </Panel>

        <Panel title="MAPPO Backend" description="FastAPI + Ray RLlib service hosted separately from the frontend.">
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-2 text-xs">
              {[
                ['NEXT_PUBLIC_SWARMRL_API_URL', apiConfig.baseUrl || 'not set'],
                ['NEXT_PUBLIC_SWARMRL_WS_URL', apiConfig.wsUrl || 'not set'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 rounded-lg border border-border bg-background/40 px-3 py-2">
                  <dt className="font-mono text-[10px] text-muted-foreground">{k}</dt>
                  <dd className={cn('truncate font-mono', v === 'not set' ? 'text-muted-foreground' : 'text-foreground')}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <p className="text-foreground">REST status</p>
                <p
                  className={cn(
                    'text-xs',
                    state === 'online' ? 'text-success' : state === 'offline' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {statusLabel}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={refresh} disabled={state === 'unconfigured'}>
                <RefreshCw aria-hidden />
                Test connection
              </Button>
            </div>
            <Toggle
              id="stream"
              label="Stream agents from backend"
              description={`WebSocket status: ${streamStatus}. When open, drone positions come from the MAPPO policy instead of the local JS simulation.`}
              checked={settings.useBackendStream}
              onChange={(v) => updateSettings({ useBackendStream: v })}
            />
            {state === 'unconfigured' && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                Set the two environment variables above in the project settings (Vars) or your Cloudflare Worker to connect a
                running backend. The dashboard keeps working in local simulation mode until then.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
