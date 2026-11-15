import type { SwarmEngine } from './engine'
import type { AgentStatus } from './types'

export type MapLayers = {
  heatmap: boolean
  roads: boolean
  buildings: boolean
  obstacles: boolean
  searchZones: boolean
  emergency: boolean
  drones: boolean
  trails: boolean
  links: boolean
  sensors: boolean
}

export const STATUS_COLORS: Record<AgentStatus, string> = {
  exploring: '#22d3ee',
  avoiding: '#f97316',
  coordinating: '#2f7bff',
  returning: '#facc15',
  charging: '#22c55e',
  idle: '#8b98ad',
}

export type Viewport = { scale: number; ox: number; oy: number }

export function computeViewport(engine: SwarmEngine, width: number, height: number, padding = 8): Viewport {
  const { world } = engine
  const scale = Math.min((width - padding * 2) / world.width, (height - padding * 2) / world.height)
  return {
    scale,
    ox: (width - world.width * scale) / 2,
    oy: (height - world.height * scale) / 2,
  }
}

export class SceneRenderer {
  private heat: HTMLCanvasElement | null = null
  private heatCtx: CanvasRenderingContext2D | null = null
  private heatImage: ImageData | null = null
  private lastHeatVersion = -1
  private frame = 0

  private ensureHeat(engine: SwarmEngine) {
    const { width, height } = engine.world
    if (!this.heat || this.heat.width !== width || this.heat.height !== height) {
      this.heat = document.createElement('canvas')
      this.heat.width = width
      this.heat.height = height
      this.heatCtx = this.heat.getContext('2d')
      this.heatImage = this.heatCtx?.createImageData(width, height) ?? null
      this.lastHeatVersion = -1
    }
  }

  private updateHeat(engine: SwarmEngine) {
    this.ensureHeat(engine)
    if (!this.heatCtx || !this.heatImage) return
    const data = this.heatImage.data
    const { visits } = engine
    const { blocked } = engine.world
    for (let i = 0; i < visits.length; i++) {
      const o = i * 4
      if (blocked[i]) {
        data[o + 3] = 0
        continue
      }
      const v = visits[i]
      if (v === 0) {
        data[o] = 10
        data[o + 1] = 14
        data[o + 2] = 24
        data[o + 3] = 255
      } else {
        const t = Math.min(1, Math.log(v + 1) / Math.log(400))
        data[o] = Math.round(14 + t * 33)
        data[o + 1] = Math.round(58 + t * 120)
        data[o + 2] = Math.round(78 + t * 160)
        data[o + 3] = 255
      }
    }
    this.heatCtx.putImageData(this.heatImage, 0, 0)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    engine: SwarmEngine,
    width: number,
    height: number,
    layers: MapLayers,
    selectedId: string | null,
    hoverId: string | null,
  ) {
    this.frame++
    const { world, agents, settings } = engine
    const vp = computeViewport(engine, width, height)
    const { scale: k, ox, oy } = vp
    const X = (x: number) => ox + x * k
    const Y = (y: number) => oy + y * k
    const time = performance.now() / 1000

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#080b12'
    ctx.fillRect(0, 0, width, height)

    if (layers.heatmap) {
      if (this.frame % 6 === 0 || this.lastHeatVersion !== engine.version) {
        this.updateHeat(engine)
        this.lastHeatVersion = engine.version
      }
      if (this.heat) {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(this.heat, ox, oy, world.width * k, world.height * k)
      }
    } else {
      ctx.fillStyle = '#0c111c'
      ctx.fillRect(ox, oy, world.width * k, world.height * k)
    }

    ctx.strokeStyle = 'rgba(47,123,255,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= world.width; x += 10) {
      ctx.moveTo(X(x), Y(0))
      ctx.lineTo(X(x), Y(world.height))
    }
    for (let y = 0; y <= world.height; y += 10) {
      ctx.moveTo(X(0), Y(y))
      ctx.lineTo(X(world.width), Y(y))
    }
    ctx.stroke()

    if (layers.roads) {
      ctx.lineCap = 'butt'
      for (const r of world.roads) {
        ctx.strokeStyle = 'rgba(148,163,184,0.16)'
        ctx.lineWidth = r.width * k
        ctx.beginPath()
        ctx.moveTo(X(r.x1), Y(r.y1))
        ctx.lineTo(X(r.x2), Y(r.y2))
        ctx.stroke()
        ctx.strokeStyle = 'rgba(250,204,21,0.25)'
        ctx.lineWidth = Math.max(1, k * 0.12)
        ctx.setLineDash([k * 1.2, k * 1.2])
        ctx.beginPath()
        ctx.moveTo(X(r.x1), Y(r.y1))
        ctx.lineTo(X(r.x2), Y(r.y2))
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    if (layers.searchZones) {
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 1
      ctx.font = `500 ${Math.max(9, k * 1.5)}px ui-monospace, SFMono-Regular, monospace`
      for (const z of world.searchZones) {
        ctx.strokeStyle = z.priority === 'High' ? 'rgba(249,115,22,0.45)' : 'rgba(47,123,255,0.4)'
        ctx.strokeRect(X(z.x) + 2, Y(z.y) + 2, z.w * k - 4, z.h * k - 4)
        ctx.fillStyle = z.priority === 'High' ? 'rgba(249,115,22,0.8)' : 'rgba(125,170,255,0.8)'
        ctx.fillText(z.id, X(z.x) + 8, Y(z.y) + 8 + Math.max(9, k * 1.5))
      }
      ctx.setLineDash([])
    }

    if (layers.obstacles) {
      for (const z of world.dangerZones) {
        const pulse = 1 + Math.sin(time * 2 + z.x) * 0.06
        const g = ctx.createRadialGradient(X(z.x), Y(z.y), 0, X(z.x), Y(z.y), z.r * k * pulse)
        const color = z.kind === 'Gas leak' ? '250,204,21' : z.kind === 'Structural' ? '249,115,22' : '239,68,68'
        g.addColorStop(0, `rgba(${color},0.55)`)
        g.addColorStop(0.7, `rgba(${color},0.22)`)
        g.addColorStop(1, `rgba(${color},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(X(z.x), Y(z.y), z.r * k * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = `rgba(${color},0.7)`
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.arc(X(z.x), Y(z.y), z.r * k, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    if (layers.buildings) {
      for (const b of world.buildings) {
        ctx.fillStyle = b.collapsed ? 'rgba(120,53,15,0.55)' : 'rgba(30,41,59,0.95)'
        ctx.fillRect(X(b.x), Y(b.y), b.w * k, b.h * k)
        ctx.strokeStyle = b.collapsed ? 'rgba(249,115,22,0.6)' : 'rgba(148,163,184,0.35)'
        ctx.lineWidth = 1
        ctx.strokeRect(X(b.x) + 0.5, Y(b.y) + 0.5, b.w * k - 1, b.h * k - 1)
        if (b.collapsed) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(X(b.x), Y(b.y), b.w * k, b.h * k)
          ctx.clip()
          ctx.strokeStyle = 'rgba(249,115,22,0.3)'
          ctx.beginPath()
          for (let d = -b.h * k; d < b.w * k; d += 6) {
            ctx.moveTo(X(b.x) + d, Y(b.y) + b.h * k)
            ctx.lineTo(X(b.x) + d + b.h * k, Y(b.y))
          }
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    if (layers.emergency) {
      for (const e of world.emergencyAreas) {
        const ring = (time * 0.6 + e.x * 0.1) % 1
        ctx.strokeStyle = `rgba(239,68,68,${0.6 * (1 - ring)})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(X(e.x), Y(e.y), e.r * k * (0.6 + ring * 0.5), 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(239,68,68,0.55)'
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.arc(X(e.x), Y(e.y), e.r * k, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      for (const s of world.survivors) {
        if (!s.found) continue
        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.arc(X(s.x), Y(s.y), Math.max(2.5, k * 0.45), 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(34,197,94,0.5)'
        ctx.beginPath()
        ctx.arc(X(s.x), Y(s.y), Math.max(5, k * 0.9), 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const bx = X(world.base.x)
    const by = Y(world.base.y)
    ctx.fillStyle = 'rgba(47,123,255,0.18)'
    ctx.strokeStyle = '#2f7bff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(bx, by, 2.5 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#9cc0ff'
    ctx.font = `600 ${Math.max(9, k * 1.3)}px ui-monospace, SFMono-Regular, monospace`
    ctx.textAlign = 'center'
    ctx.fillText('BASE', bx, by + 2.5 * k + Math.max(10, k * 1.6))
    ctx.textAlign = 'left'

    if (!layers.drones) return vp

    if (layers.links) {
      const r = settings.commRange
      ctx.lineWidth = 1
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i]
        for (let j = i + 1; j < agents.length; j++) {
          const b = agents[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < r) {
            ctx.strokeStyle = `rgba(47,123,255,${0.38 * (1 - d / r)})`
            ctx.beginPath()
            ctx.moveTo(X(a.x), Y(a.y))
            ctx.lineTo(X(b.x), Y(b.y))
            ctx.stroke()
          }
        }
      }
    }

    if (layers.trails) {
      ctx.lineWidth = 1
      for (const a of agents) {
        if (a.trail.length < 2) continue
        const sel = a.id === selectedId
        ctx.strokeStyle = sel ? 'rgba(255,255,255,0.7)' : 'rgba(34,211,238,0.22)'
        ctx.lineWidth = sel ? 1.5 : 1
        ctx.beginPath()
        ctx.moveTo(X(a.trail[0].x), Y(a.trail[0].y))
        for (let t = 1; t < a.trail.length; t++) ctx.lineTo(X(a.trail[t].x), Y(a.trail[t].y))
        ctx.lineTo(X(a.x), Y(a.y))
        ctx.stroke()
      }
    }

    if (layers.sensors) {
      ctx.fillStyle = 'rgba(34,211,238,0.07)'
      ctx.strokeStyle = 'rgba(34,211,238,0.25)'
      for (const a of agents) {
        ctx.beginPath()
        ctx.arc(X(a.x), Y(a.y), settings.sensorRadius * k, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }

    const size = Math.max(3.5, k * 0.85)
    for (const a of agents) {
      const x = X(a.x)
      const y = Y(a.y)
      const color = STATUS_COLORS[a.status]
      const sel = a.id === selectedId
      const hov = a.id === hoverId

      if (a.collisionFlash > 0) {
        ctx.strokeStyle = `rgba(239,68,68,${a.collisionFlash / 40})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, size * (2.5 + (40 - a.collisionFlash) / 10), 0, Math.PI * 2)
        ctx.stroke()
      }

      if (sel && a.target) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.setLineDash([4, 4])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(X(a.target.x), Y(a.target.y))
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.strokeRect(X(a.target.x) - 4, Y(a.target.y) - 4, 8, 8)
      }

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a.heading)
      ctx.shadowColor = color
      ctx.shadowBlur = sel || hov ? 14 : 6
      ctx.fillStyle = a.collisionFlash > 0 ? '#ef4444' : color
      ctx.beginPath()
      ctx.moveTo(size * 1.3, 0)
      ctx.lineTo(-size * 0.8, size * 0.8)
      ctx.lineTo(-size * 0.4, 0)
      ctx.lineTo(-size * 0.8, -size * 0.8)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      if (sel || hov) {
        ctx.strokeStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, size * 2.2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.font = `600 11px ui-monospace, SFMono-Regular, monospace`
        const label = `${a.id} · ${a.battery.toFixed(0)}%`
        const w = ctx.measureText(label).width + 10
        ctx.fillStyle = 'rgba(8,11,18,0.9)'
        ctx.fillRect(x + size * 2.4, y - 20, w, 18)
        ctx.strokeStyle = 'rgba(47,123,255,0.6)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + size * 2.4 + 0.5, y - 19.5, w - 1, 17)
        ctx.fillStyle = '#e6edf7'
        ctx.fillText(label, x + size * 2.4 + 5, y - 7)
      }
    }

    return vp
  }
}

export function pickAgent(engine: SwarmEngine, vp: Viewport, px: number, py: number, radius = 12) {
  let best: string | null = null
  let bestD = radius
  for (const a of engine.agents) {
    const d = Math.hypot(vp.ox + a.x * vp.scale - px, vp.oy + a.y * vp.scale - py)
    if (d < bestD) {
      bestD = d
      best = a.id
    }
  }
  return best
}
