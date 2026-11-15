'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { SceneRenderer, pickAgent, type MapLayers, type Viewport } from '@/lib/sim/render'
import { useSim } from './simulation-provider'

export const DEFAULT_LAYERS: MapLayers = {
  heatmap: true,
  roads: true,
  buildings: true,
  obstacles: true,
  searchZones: true,
  emergency: true,
  drones: true,
  trails: true,
  links: true,
  sensors: false,
}

type Props = {
  layers?: Partial<MapLayers>
  interactive?: boolean
  className?: string
  ariaLabel?: string
  onPointerWorld?: (point: { x: number; y: number } | null, screen: { x: number; y: number } | null) => void
}

export function SimCanvas({ layers, interactive = true, className, ariaLabel, onPointerWorld }: Props) {
  const { engine, registerFrame, selectedAgentId, selectAgent } = useSim()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<SceneRenderer | null>(null)
  const vpRef = useRef<Viewport | null>(null)
  const hoverRef = useRef<string | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const stateRef = useRef({ layers: { ...DEFAULT_LAYERS, ...layers }, selectedAgentId })
  stateRef.current = { layers: { ...DEFAULT_LAYERS, ...layers }, selectedAgentId }

  useEffect(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      sizeRef.current = { w: width, h: height }
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!engine) return
    if (!rendererRef.current) rendererRef.current = new SceneRenderer()
    return registerFrame(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx || sizeRef.current.w === 0) return
      const dpr = canvas.width / sizeRef.current.w
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      vpRef.current = rendererRef.current!.draw(
        ctx,
        engine,
        sizeRef.current.w,
        sizeRef.current.h,
        stateRef.current.layers,
        stateRef.current.selectedAgentId,
        hoverRef.current,
      )
    })
  }, [engine, registerFrame])

  const localPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel ?? 'Disaster zone map showing drone positions, explored area, obstacles and hazards'}
        className={cn('absolute inset-0', interactive && 'cursor-crosshair')}
        onPointerMove={(e) => {
          if (!engine || !vpRef.current) return
          const p = localPoint(e)
          if (interactive) hoverRef.current = pickAgent(engine, vpRef.current, p.x, p.y)
          if (onPointerWorld) {
            const vp = vpRef.current
            onPointerWorld({ x: (p.x - vp.ox) / vp.scale, y: (p.y - vp.oy) / vp.scale }, p)
          }
        }}
        onPointerLeave={() => {
          hoverRef.current = null
          onPointerWorld?.(null, null)
        }}
        onClick={(e) => {
          if (!interactive || !engine || !vpRef.current) return
          const p = localPoint(e)
          const id = pickAgent(engine, vpRef.current, p.x, p.y, 16)
          selectAgent(id)
        }}
      />
    </div>
  )
}
