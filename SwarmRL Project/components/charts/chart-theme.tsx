'use client'

import type { TooltipContentProps } from 'recharts'

export const CHART_COLORS = {
  primary: '#2f7bff',
  accent: '#22d3ee',
  success: '#22c55e',
  warning: '#f97316',
  danger: '#ef4444',
  muted: '#8b98ad',
  grid: 'rgba(148,163,184,0.1)',
}

export const axisProps = {
  stroke: '#5b677c',
  tick: { fill: '#8b98ad', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

type Formatter = (value: number, name: string) => string

export function makeTooltip(labelPrefix = '', format?: Formatter) {
  return function ChartTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border bg-[#0d1320]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
        <p className="mb-1 font-mono text-[11px] text-muted-foreground">
          {labelPrefix}
          {typeof label === 'number' ? label.toLocaleString() : label}
        </p>
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-mono text-foreground tabular-nums">
              {format ? format(Number(p.value), String(p.name)) : Number(p.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
}
