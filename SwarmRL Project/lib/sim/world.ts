import type { Building, DangerZone, EmergencyArea, Road, SearchZone, Survivor, World } from './types'

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const WORLD_WIDTH = 120
export const WORLD_HEIGHT = 80

export function createWorld(seed: number): World {
  const rand = mulberry32(seed * 7 + 11)
  const width = WORLD_WIDTH
  const height = WORLD_HEIGHT

  const roadYs = [22, 54]
  const roadXs = [32, 66, 96]
  const roads: Road[] = [
    ...roadYs.map((y) => ({ x1: 0, y1: y, x2: width, y2: y, width: 3 })),
    ...roadXs.map((x) => ({ x1: x, y1: 0, x2: x, y2: height, width: 3 })),
  ]

  const xBands = [
    [12, 30],
    [34, 64],
    [68, 94],
    [98, 118],
  ]
  const yBands = [
    [2, 20],
    [24, 52],
    [56, 78],
  ]

  const buildings: Building[] = []
  let bId = 1
  for (const [x0, x1] of xBands) {
    for (const [y0, y1] of yBands) {
      const count = 2 + Math.floor(rand() * 2)
      for (let i = 0; i < count; i++) {
        const w = 3 + rand() * 5
        const h = 3 + rand() * 5
        const x = x0 + 1 + rand() * Math.max(0, x1 - x0 - w - 2)
        const y = y0 + 1 + rand() * Math.max(0, y1 - y0 - h - 2)
        const overlaps = buildings.some(
          (b) => x < b.x + b.w + 2 && x + w + 2 > b.x && y < b.y + b.h + 2 && y + h + 2 > b.y,
        )
        if (overlaps) continue
        buildings.push({
          id: `B-${String(bId++).padStart(2, '0')}`,
          x,
          y,
          w,
          h,
          collapsed: rand() < 0.3,
        })
      }
    }
  }

  const dangerZones: DangerZone[] = [
    { id: 'HZ-1', x: 50, y: 38, r: 4.5, kind: 'Fire' },
    { id: 'HZ-2', x: 82, y: 66, r: 4, kind: 'Gas leak' },
    { id: 'HZ-3', x: 106, y: 12, r: 3.5, kind: 'Structural' },
    { id: 'HZ-4', x: 22, y: 66, r: 3, kind: 'Fire' },
  ]

  const searchZones: SearchZone[] = [
    { id: 'SZ-A', name: 'Sector A · Northwest', x: 0, y: 0, w: 60, h: 40, priority: 'High' },
    { id: 'SZ-B', name: 'Sector B · Northeast', x: 60, y: 0, w: 60, h: 40, priority: 'Medium' },
    { id: 'SZ-C', name: 'Sector C · Southwest', x: 0, y: 40, w: 60, h: 40, priority: 'Medium' },
    { id: 'SZ-D', name: 'Sector D · Southeast', x: 60, y: 40, w: 60, h: 40, priority: 'High' },
  ]

  const emergencyAreas: EmergencyArea[] = [
    { id: 'EA-1', name: 'Collapsed school', x: 44, y: 12, r: 6 },
    { id: 'EA-2', name: 'Residential block', x: 80, y: 32, r: 7 },
    { id: 'EA-3', name: 'Hospital annex', x: 108, y: 60, r: 6 },
    { id: 'EA-4', name: 'Market square', x: 46, y: 66, r: 6 },
    { id: 'EA-5', name: 'Transit hub', x: 18, y: 36, r: 5 },
  ]

  const blocked = new Uint8Array(width * height)
  for (const b of buildings) {
    for (let y = Math.floor(b.y); y < Math.ceil(b.y + b.h); y++) {
      for (let x = Math.floor(b.x); x < Math.ceil(b.x + b.w); x++) {
        if (x >= 0 && y >= 0 && x < width && y < height) blocked[y * width + x] = 1
      }
    }
  }
  let explorableCells = 0
  for (let i = 0; i < blocked.length; i++) if (!blocked[i]) explorableCells++

  const survivors: Survivor[] = []
  let sId = 1
  for (const area of emergencyAreas) {
    const n = 3 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const a = rand() * Math.PI * 2
        const d = rand() * area.r
        const x = area.x + Math.cos(a) * d
        const y = area.y + Math.sin(a) * d
        const cell = Math.floor(y) * width + Math.floor(x)
        if (x > 0 && y > 0 && x < width && y < height && !blocked[cell]) {
          survivors.push({ id: `SV-${String(sId++).padStart(2, '0')}`, x, y, areaId: area.id, found: false })
          break
        }
      }
    }
  }

  return {
    width,
    height,
    base: { x: 5, y: 40 },
    buildings,
    roads,
    dangerZones,
    searchZones,
    emergencyAreas,
    survivors,
    blocked,
    explorableCells,
  }
}
