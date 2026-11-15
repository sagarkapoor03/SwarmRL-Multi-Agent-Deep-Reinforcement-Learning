import { Cpu, FlaskConical, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

type Source = 'local' | 'backend' | 'sample'

const MAP: Record<Source, { label: string; title: string; icon: typeof Cpu; className: string }> = {
  local: {
    label: 'Simulated · local JS',
    title: 'Data produced by the in-browser MAPPO-inspired simulation, not a trained policy.',
    icon: Cpu,
    className: 'border-accent/30 bg-accent/10 text-accent',
  },
  backend: {
    label: 'Live · MAPPO backend',
    title: 'Data streamed from the FastAPI + Ray RLlib MAPPO backend.',
    icon: Server,
    className: 'border-success/30 bg-success/10 text-success',
  },
  sample: {
    label: 'Sample training data',
    title: 'Illustrative training curves. Connect the backend to see real MAPPO metrics.',
    icon: FlaskConical,
    className: 'border-warning/30 bg-warning/10 text-warning',
  },
}

export function DataSourceBadge({ source, className }: { source: Source; className?: string }) {
  const m = MAP[source]
  const Icon = m.icon
  return (
    <span
      title={m.title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium',
        m.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {m.label}
    </span>
  )
}
