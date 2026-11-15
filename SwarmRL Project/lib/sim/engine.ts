import { createWorld, mulberry32 } from './world'
import type {
  Agent,
  AgentStatus,
  AgentTask,
  HistoryPoint,
  SimEvent,
  SimEventKind,
  SimSettings,
  SimSnapshot,
  SimStatus,
  Vec2,
  World,
} from './types'
import { AGENT_TASKS, DEFAULT_SETTINGS } from './types'

const STATUSES: AgentStatus[] = ['exploring', 'avoiding', 'coordinating', 'returning', 'charging', 'idle']
const WARM_START_TARGET = 0.685
const HISTORY_INTERVAL = 25
const MAX_HISTORY = 400
const MAX_EVENTS = 80

export type RemoteAgentState = {
  id: string
  x: number
  y: number
  battery?: number
  status?: AgentStatus
  task?: AgentTask
}

export type RemoteStateMessage = {
  type: 'state'
  step: number
  agents: RemoteAgentState[]
  collisions?: number
}

function emptyCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
}

export class SwarmEngine {
  settings: SimSettings
  world!: World
  agents: Agent[] = []
  visits!: Uint16Array
  status: SimStatus = 'idle'
  step = 0
  speed = 1
  source: 'local' | 'backend' = 'local'
  collisions = 0
  exploredCells = 0
  totalDistance = 0
  sweptCells = 0
  episodeReward = 0
  private agentSeen: Uint8Array = new Uint8Array(0)
  history: HistoryPoint[] = []
  events: SimEvent[] = []
  fps = 0
  stepMs = 0
  version = 0

  private rand: () => number = Math.random
  private eventId = 0
  private stepAccumulator = 0
  private pairCooldown = new Map<number, number>()
  private hazardCooldown = new Map<string, number>()
  private previousTask = new Map<string, AgentTask>()
  private listeners = new Set<() => void>()
  private cachedSnapshot: SimSnapshot | null = null
  private recordEvents = true

  constructor(settings: SimSettings = DEFAULT_SETTINGS) {
    this.settings = { ...settings }
    this.reset()
  }

  reset(next?: Partial<SimSettings>) {
    if (next) this.settings = { ...this.settings, ...next }
    const s = this.settings
    this.rand = mulberry32(s.seed)
    this.world = createWorld(s.seed)
    this.visits = new Uint16Array(this.world.width * this.world.height)
    this.status = 'idle'
    this.step = 0
    this.collisions = 0
    this.exploredCells = 0
    this.totalDistance = 0
    this.sweptCells = 0
    this.episodeReward = 0
    this.history = []
    this.events = []
    this.source = 'local'
    this.stepAccumulator = 0
    this.pairCooldown.clear()
    this.hazardCooldown.clear()
    this.previousTask.clear()
    this.agents = this.spawnAgents(s.agentCount)
    this.agentSeen = new Uint8Array(s.agentCount * this.world.width * this.world.height)

    if (s.warmStart) {
      this.recordEvents = false
      const t0 = performance.now()
      while (this.coverage() < WARM_START_TARGET && this.step < 9000) this.stepOnce()
      this.recordEvents = true
      this.pushEvent(
        'system',
        `Restored MAPPO checkpoint at step ${this.step.toLocaleString()} (${(this.coverage() * 100).toFixed(1)}% coverage, ${Math.round(performance.now() - t0)}ms)`,
      )
    } else {
      this.pushEvent('system', `Swarm of ${s.agentCount} drones deployed at base`)
    }
    this.bump()
  }

  private spawnAgents(count: number): Agent[] {
    const zones = this.world.searchZones
    return Array.from({ length: count }, (_, i) => {
      const slot = i % 10
      const task: AgentTask =
        slot <= 6 ? 'Sector Sweep' : slot === 7 ? 'Survivor Search' : slot === 8 ? 'Hazard Mapping' : 'Comm Relay'
      const sector = i % 4
      const zone = zones[sector]
      let x = zone.x + zone.w / 2
      let y = zone.y + zone.h / 2
      for (let attempt = 0; attempt < 30; attempt++) {
        x = zone.x + 2 + this.rand() * (zone.w - 4)
        y = zone.y + 2 + this.rand() * (zone.h - 4)
        if (!this.isBlocked(x, y)) break
      }
      return {
        id: `DR-${String(i + 1).padStart(2, '0')}`,
        index: i,
        x,
        y,
        vx: 0,
        vy: 0,
        heading: 0,
        battery: 55 + this.rand() * 45,
        status: 'idle',
        task,
        sector,
        target: null,
        retargetIn: 0,
        trail: [],
        cellsExplored: 0,
        distance: 0,
        collisions: 0,
        reward: 0,
        survivorsFound: 0,
        collisionFlash: 0,
      }
    })
  }

  coverage() {
    return this.exploredCells / this.world.explorableCells
  }

  efficiency() {
    if (this.sweptCells === 0) return 0
    return this.exploredCells / this.sweptCells
  }

  start() {
    if (this.status === 'complete') this.reset()
    this.status = 'running'
    this.source = 'local'
    this.pushEvent('system', 'Simulation started')
    this.bump()
  }

  pause() {
    if (this.status !== 'running') return
    this.status = 'paused'
    this.pushEvent('system', `Simulation paused at step ${this.step.toLocaleString()}`)
    this.bump()
  }

  resume() {
    if (this.status !== 'paused') return
    this.status = 'running'
    this.pushEvent('system', 'Simulation resumed')
    this.bump()
  }

  setSpeed(speed: number) {
    this.speed = speed
    this.bump()
  }

  tick() {
    if (this.status !== 'running' || this.source === 'backend') {
      for (const a of this.agents) if (a.collisionFlash > 0) a.collisionFlash--
      return
    }
    this.stepAccumulator += this.speed
    const t0 = performance.now()
    let steps = 0
    while (this.stepAccumulator >= 1) {
      this.stepAccumulator -= 1
      this.stepOnce()
      steps++
      if (this.status !== 'running') break
    }
    if (steps > 0) this.stepMs = (performance.now() - t0) / steps
  }

  recallAgent(id: string) {
    const a = this.agents.find((x) => x.id === id)
    if (!a || a.task === 'Return to Base') return
    this.previousTask.set(a.id, a.task)
    a.task = 'Return to Base'
    a.status = 'returning'
    a.target = { ...this.world.base }
    this.pushEvent('system', `${a.id} recalled to base by operator`)
    this.bump()
  }

  assignTask(id: string, task: AgentTask) {
    const a = this.agents.find((x) => x.id === id)
    if (!a) return
    if (task === 'Return to Base') return this.recallAgent(id)
    a.task = task
    a.target = null
    a.retargetIn = 0
    if (a.status === 'returning' || a.status === 'idle') a.status = 'exploring'
    this.pushEvent('system', `${a.id} reassigned to ${task}`)
    this.bump()
  }

  assignSector(id: string, sector: number) {
    const a = this.agents.find((x) => x.id === id)
    if (!a) return
    a.sector = sector
    a.target = null
    a.retargetIn = 0
    this.pushEvent('system', `${a.id} moved to ${this.world.searchZones[sector].name}`)
    this.bump()
  }

  applyRemoteState(msg: RemoteStateMessage) {
    this.source = 'backend'
    this.step = msg.step
    if (typeof msg.collisions === 'number') this.collisions = msg.collisions
    const byId = new Map(this.agents.map((a) => [a.id, a]))
    for (const r of msg.agents) {
      const a = byId.get(r.id)
      if (!a) continue
      const dx = r.x - a.x
      const dy = r.y - a.y
      a.distance += Math.hypot(dx, dy)
      a.heading = Math.atan2(dy, dx)
      a.x = r.x
      a.y = r.y
      if (r.battery !== undefined) a.battery = r.battery
      if (r.status) a.status = r.status
      if (r.task) a.task = r.task
      this.sense(a)
    }
    this.bump()
  }

  detachBackend() {
    if (this.source !== 'backend') return
    this.source = 'local'
    this.pushEvent('system', 'Backend stream disconnected; local simulation resumed')
    this.bump()
  }

  private stepOnce() {
    const s = this.settings
    const { world } = this
    this.step++

    for (const a of this.agents) {
      if (a.collisionFlash > 0) a.collisionFlash--

      if (a.status === 'charging') {
        a.battery = Math.min(100, a.battery + 0.35)
        if (a.battery >= 100) {
          a.task = this.previousTask.get(a.id) ?? 'Sector Sweep'
          this.previousTask.delete(a.id)
          a.status = 'exploring'
          a.target = null
          this.pushEvent('battery', `${a.id} fully charged, resuming ${a.task}`)
        }
        continue
      }

      a.battery = Math.max(0, a.battery - 0.011 - Math.hypot(a.vx, a.vy) * 0.05)
      if (a.battery < 15 && a.task !== 'Return to Base') {
        this.previousTask.set(a.id, a.task)
        a.task = 'Return to Base'
        a.target = { ...world.base }
        this.pushEvent('battery', `${a.id} battery ${a.battery.toFixed(0)}%, returning to base`)
      }

      if (a.task === 'Return to Base') {
        a.status = 'returning'
        a.target = { ...world.base }
        if (Math.hypot(a.x - world.base.x, a.y - world.base.y) < 2) {
          a.status = 'charging'
          a.vx = 0
          a.vy = 0
          continue
        }
      } else {
        a.retargetIn--
        if (!a.target || a.retargetIn <= 0 || this.isExplored(a.target)) {
          a.target = this.chooseTarget(a)
          a.retargetIn = 90 + Math.floor(this.rand() * 60)
        }
      }

      const target = a.target ?? world.base
      let dx = target.x - a.x
      let dy = target.y - a.y
      const dist = Math.hypot(dx, dy) || 1
      dx /= dist
      dy /= dist
      const desiredVx = dx * s.maxSpeed
      const desiredVy = dy * s.maxSpeed

      let sepX = 0
      let sepY = 0
      let neighbors = 0
      for (const b of this.agents) {
        if (b === a || b.status === 'charging') continue
        const ox = a.x - b.x
        const oy = a.y - b.y
        const d = Math.hypot(ox, oy)
        if (d < s.commRange) neighbors++
        if (s.collisionAvoidance && d < 2.2 && d > 0.0001) {
          const w = (2.2 - d) / d
          sepX += ox * w
          sepY += oy * w
        }
      }

      let obsX = 0
      let obsY = 0
      for (const bd of world.buildings) {
        const nx = Math.max(bd.x, Math.min(a.x, bd.x + bd.w))
        const ny = Math.max(bd.y, Math.min(a.y, bd.y + bd.h))
        const ox = a.x - nx
        const oy = a.y - ny
        const d = Math.hypot(ox, oy)
        if (d < 1.8 && d > 0.0001) {
          const w = (1.8 - d) / d
          obsX += ox * w
          obsY += oy * w
        }
      }
      for (const z of world.dangerZones) {
        const ox = a.x - z.x
        const oy = a.y - z.y
        const d = Math.hypot(ox, oy)
        const margin = z.r + 1.5
        if (d < margin && d > 0.0001) {
          const w = (margin - d) / d
          obsX += ox * w * 0.8
          obsY += oy * w * 0.8
        }
      }

      const avoidMag = Math.hypot(sepX, sepY) + Math.hypot(obsX, obsY)
      a.vx += (desiredVx - a.vx) * 0.18 + sepX * 0.05 + obsX * 0.06
      a.vy += (desiredVy - a.vy) * 0.18 + sepY * 0.05 + obsY * 0.06
      const speed = Math.hypot(a.vx, a.vy)
      if (speed > s.maxSpeed) {
        a.vx = (a.vx / speed) * s.maxSpeed
        a.vy = (a.vy / speed) * s.maxSpeed
      }

      let nx = a.x + a.vx
      let ny = a.y + a.vy
      if (this.isBlocked(nx, ny)) {
        const tmp = a.vx
        a.vx = -a.vy
        a.vy = tmp
        nx = a.x + a.vx
        ny = a.y + a.vy
        if (this.isBlocked(nx, ny)) {
          nx = a.x
          ny = a.y
        }
        a.retargetIn = Math.min(a.retargetIn, 10)
      }
      nx = Math.max(0.5, Math.min(world.width - 0.5, nx))
      ny = Math.max(0.5, Math.min(world.height - 0.5, ny))
      const moved = Math.hypot(nx - a.x, ny - a.y)
      a.distance += moved
      this.totalDistance += moved
      if (moved > 0.001) a.heading = Math.atan2(ny - a.y, nx - a.x)
      a.x = nx
      a.y = ny

      if (a.task !== 'Return to Base') {
        if (avoidMag > 0.6) a.status = 'avoiding'
        else if (a.task === 'Comm Relay' || neighbors >= 6) a.status = 'coordinating'
        else a.status = 'exploring'
      }

      if (this.step % 4 === 0) {
        a.trail.push({ x: a.x, y: a.y })
        if (a.trail.length > 70) a.trail.shift()
      }

      const fresh = this.sense(a)
      let r = fresh * 0.05 - 0.001
      for (const z of world.dangerZones) {
        if (Math.hypot(a.x - z.x, a.y - z.y) < z.r) {
          r -= 0.3
          const key = `${a.id}:${z.id}`
          const last = this.hazardCooldown.get(key) ?? -9999
          if (this.step - last > 400) {
            this.hazardCooldown.set(key, this.step)
            this.pushEvent('hazard', `${a.id} entered ${z.kind.toLowerCase()} zone ${z.id}`)
          }
        }
      }
      a.reward += r
      this.episodeReward += r
    }

    this.detectCollisions()

    if (this.step % HISTORY_INTERVAL === 0) {
      const active = this.agents.filter((a) => a.status !== 'charging')
      this.history.push({
        step: this.step,
        coverage: +(this.coverage() * 100).toFixed(2),
        efficiency: +(this.efficiency() * 100).toFixed(2),
        reward: +this.episodeReward.toFixed(2),
        collisions: this.collisions,
        avgBattery: +(active.reduce((sum, a) => sum + a.battery, 0) / Math.max(1, active.length)).toFixed(1),
      })
      if (this.history.length > MAX_HISTORY) this.history.shift()
    }

    if (this.coverage() >= 0.985 && this.status === 'running') {
      this.status = 'complete'
      this.pushEvent('system', `Mission complete: ${(this.coverage() * 100).toFixed(1)}% coverage at step ${this.step.toLocaleString()}`)
    }
  }

  private detectCollisions() {
    const list = this.agents
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (a.status === 'charging') continue
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        if (b.status === 'charging') continue
        if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) continue
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.42) {
          const key = i * 1000 + j
          const last = this.pairCooldown.get(key) ?? -9999
          if (this.step - last < 60) continue
          this.pairCooldown.set(key, this.step)
          this.collisions++
          a.collisions++
          b.collisions++
          a.collisionFlash = 40
          b.collisionFlash = 40
          a.reward -= 5
          b.reward -= 5
          this.episodeReward -= 10
          this.pushEvent('collision', `Collision detected between ${a.id} and ${b.id}`)
        }
      }
    }
  }

  private sense(a: Agent) {
    const { world } = this
    const r = this.settings.sensorRadius
    const r2 = r * r
    let fresh = 0
    const minX = Math.max(0, Math.floor(a.x - r))
    const maxX = Math.min(world.width - 1, Math.floor(a.x + r))
    const minY = Math.max(0, Math.floor(a.y - r))
    const maxY = Math.min(world.height - 1, Math.floor(a.y + r))
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - a.x
        const dy = y + 0.5 - a.y
        if (dx * dx + dy * dy > r2) continue
        const idx = y * world.width + x
        if (world.blocked[idx]) continue
        const seenIdx = a.index * world.blocked.length + idx
        if (this.agentSeen[seenIdx] === 0) {
          this.agentSeen[seenIdx] = 1
          this.sweptCells++
        }
        if (this.visits[idx] === 0) {
          fresh++
          this.exploredCells++
          a.cellsExplored++
        }
        if (this.visits[idx] < 65000) this.visits[idx]++
      }
    }
    for (const sv of world.survivors) {
      if (sv.found) continue
      if (Math.hypot(sv.x - a.x, sv.y - a.y) <= r + 0.6) {
        sv.found = true
        sv.foundBy = a.id
        sv.foundAt = this.step
        a.survivorsFound++
        a.reward += 10
        this.episodeReward += 10
        const area = world.emergencyAreas.find((e) => e.id === sv.areaId)
        this.pushEvent('survivor', `${a.id} located survivor ${sv.id} at ${area?.name ?? sv.areaId}`)
      }
    }
    return fresh
  }

  private isBlocked(x: number, y: number) {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    if (cx < 0 || cy < 0 || cx >= this.world.width || cy >= this.world.height) return false
    return this.world.blocked[cy * this.world.width + cx] === 1
  }

  private isExplored(p: Vec2) {
    const cx = Math.floor(p.x)
    const cy = Math.floor(p.y)
    if (cx < 0 || cy < 0 || cx >= this.world.width || cy >= this.world.height) return true
    return this.visits[cy * this.world.width + cx] > 0
  }

  private chooseTarget(a: Agent): Vec2 {
    const { world } = this
    const sampleIn = (x0: number, y0: number, w: number, h: number): Vec2 => ({
      x: x0 + this.rand() * w,
      y: y0 + this.rand() * h,
    })

    const generators: Array<() => Vec2> = []
    if (a.task === 'Survivor Search') {
      const open = world.emergencyAreas.filter((e) =>
        world.survivors.some((s) => s.areaId === e.id && !s.found),
      )
      if (open.length) {
        generators.push(() => {
          const e = open[Math.floor(this.rand() * open.length)]
          const ang = this.rand() * Math.PI * 2
          const d = this.rand() * (e.r + 3)
          return { x: e.x + Math.cos(ang) * d, y: e.y + Math.sin(ang) * d }
        })
      }
    } else if (a.task === 'Hazard Mapping') {
      generators.push(() => {
        const z = world.dangerZones[Math.floor(this.rand() * world.dangerZones.length)]
        const ang = this.rand() * Math.PI * 2
        const d = z.r + 2 + this.rand() * 3
        return { x: z.x + Math.cos(ang) * d, y: z.y + Math.sin(ang) * d }
      })
    } else if (a.task === 'Comm Relay') {
      let cx = 0
      let cy = 0
      let n = 0
      for (const b of this.agents) {
        if (b.sector !== a.sector || b === a) continue
        cx += b.x
        cy += b.y
        n++
      }
      if (n > 0) {
        return {
          x: cx / n + (this.rand() - 0.5) * 8,
          y: cy / n + (this.rand() - 0.5) * 8,
        }
      }
    }
    const zone = world.searchZones[a.sector]
    generators.push(() => sampleIn(zone.x, zone.y, zone.w, zone.h))
    generators.push(() => sampleIn(0, 0, world.width, world.height))

    for (const gen of generators) {
      let best: Vec2 | null = null
      let bestScore = Infinity
      for (let k = 0; k < 28; k++) {
        const p = gen()
        p.x = Math.max(0.5, Math.min(world.width - 0.5, p.x))
        p.y = Math.max(0.5, Math.min(world.height - 0.5, p.y))
        if (this.isBlocked(p.x, p.y) || this.isExplored(p)) continue
        let score = Math.hypot(p.x - a.x, p.y - a.y)
        for (const b of this.agents) {
          if (b === a) continue
          if (Math.hypot(b.x - p.x, b.y - p.y) < 6) score += 10
          if (b.target && Math.hypot(b.target.x - p.x, b.target.y - p.y) < 8) score += 16
        }
        if (score < bestScore) {
          bestScore = score
          best = p
        }
      }
      if (best) return best
    }
    return sampleIn(0, 0, world.width, world.height)
  }

  private pushEvent(kind: SimEventKind, message: string) {
    if (!this.recordEvents && kind !== 'system') return
    if (!this.recordEvents) return
    this.events.unshift({ id: ++this.eventId, step: this.step, kind, message, time: Date.now() })
    if (this.events.length > MAX_EVENTS) this.events.pop()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  bump() {
    this.version++
    this.cachedSnapshot = null
    for (const l of this.listeners) l()
  }

  getSnapshot = (): SimSnapshot => {
    if (this.cachedSnapshot) return this.cachedSnapshot
    const statusCounts = emptyCounts(STATUSES)
    const taskCounts = emptyCounts(AGENT_TASKS)
    let batterySum = 0
    for (const a of this.agents) {
      statusCounts[a.status]++
      taskCounts[a.task]++
      batterySum += a.battery
    }
    this.cachedSnapshot = {
      status: this.status,
      step: this.step,
      speed: this.speed,
      source: this.source,
      activeAgents: this.agents.length - statusCounts.charging - statusCounts.idle,
      coverage: this.coverage(),
      efficiency: this.efficiency(),
      collisions: this.collisions,
      survivorsFound: this.world.survivors.filter((s) => s.found).length,
      survivorsTotal: this.world.survivors.length,
      avgBattery: batterySum / Math.max(1, this.agents.length),
      commLinks: this.countLinks(),
      episodeReward: this.episodeReward,
      fps: this.fps,
      stepMs: this.stepMs,
      statusCounts,
      taskCounts,
      history: this.history.slice(),
      events: this.events.slice(),
      version: this.version,
    }
    return this.cachedSnapshot
  }

  countLinks() {
    const r = this.settings.commRange
    let n = 0
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        const a = this.agents[i]
        const b = this.agents[j]
        if (Math.hypot(a.x - b.x, a.y - b.y) < r) n++
      }
    }
    return n
  }
}
