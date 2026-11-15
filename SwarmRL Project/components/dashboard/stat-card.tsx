'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  primary: { icon: 'text-primary bg-primary/12', bar: 'bg-primary', glow: 'rgba(47,123,255,0.35)' },
  accent: { icon: 'text-accent bg-accent/12', bar: 'bg-accent', glow: 'rgba(34,211,238,0.3)' },
  success: { icon: 'text-success bg-success/12', bar: 'bg-success', glow: 'rgba(34,197,94,0.3)' },
  warning: { icon: 'text-warning bg-warning/12', bar: 'bg-warning', glow: 'rgba(249,115,22,0.3)' },
  danger: { icon: 'text-destructive bg-destructive/12', bar: 'bg-destructive', glow: 'rgba(239,68,68,0.3)' },
} as const

export type Tone = keyof typeof TONES

type Props = {
  label: string
  value: string
  icon: LucideIcon
  tone?: Tone
  hint?: string
  progress?: number
  index?: number
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint, progress, index = 0 }: Props) {
  const t = TONES[tone]
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="glass-panel group relative overflow-hidden rounded-2xl p-4"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100"
        style={{ background: t.glow }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex size-8 items-center justify-center rounded-lg', t.icon)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="relative mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {progress !== undefined && (
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={cn('h-full rounded-full transition-[width] duration-500', t.bar)} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {hint && <p className="relative mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </motion.div>
  )
}
