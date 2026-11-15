export type Vec2 = { x: number; y: number }

export type AgentStatus =
  | 'exploring'
  | 'avoiding'
  | 'coordinating'
  | 'returning'
  | 'charging'
  | 'idle'

export type AgentTask =
  | 'Sector Sweep'
  | 'Survivor Search'
  | 'Comm Relay'
  | 'Hazard Mapping'
  | 'Return to Base'

export const AGENT_TASKS: AgentTask[] = [
  'Sector Sweep',
  'Survivor Search',
  'Comm Relay',
  'Hazard Mapping',
  'Return to Base',
]

export type Agent = {
  id: string
  index: number
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  battery: number
  status: AgentStatus
  task: AgentTask
  sector: number
  target: Vec2 | null
  retargetIn: number
  trail: Vec2[]
  cellsExplored: number
  distance: number
  collisions: number
  reward: number
  survivorsFound: number
  collisionFlash: number
}

export type Building = { id: string; x: number; y: number; w: number; h: number; collapsed: boolean }
export type Road = { x1: number; y1: number; x2: number; y2: number; width: number }
export type DangerZone = { id: string; x: number; y: number; r: number; kind: 'Fire' | 'Gas leak' | 'Structural' }
export type SearchZone = { id: string; name: string; x: number; y: number; w: number; h: number; priority: 'High' | 'Medium' | 'Low' }
export type EmergencyArea = { id: string; name: string; x: number; y: number; r: number }
export type Survivor = { id: string; x: number; y: number; areaId: string; found: boolean; foundBy?: string; foundAt?: number }

export type World = {
  width: number
  height: number
  base: Vec2
  buildings: Building[]
  roads: Road[]
  dangerZones: DangerZone[]
  searchZones: SearchZone[]
  emergencyAreas: EmergencyArea[]
  survivors: Survivor[]
  blocked: Uint8Array
  explorableCells: number
}

export type SimStatus = 'idle' | 'running' | 'paused' | 'complete'

export type SimEventKind = 'collision' | 'survivor' | 'battery' | 'system' | 'hazard'
export type SimEvent = { id: number; step: number; kind: SimEventKind; message: string; time: number }

export type HistoryPoint = {
  step: number
  coverage: number
  efficiency: number
  reward: number
  collisions: number
  avgBattery: number
}

export type SimSettings = {
  agentCount: number
  seed: number
  sensorRadius: number
  commRange: number
  maxSpeed: number
  collisionAvoidance: boolean
  warmStart: boolean
  showTrails: boolean
  showLinks: boolean
  showSensors: boolean
  showHeatmap: boolean
  useBackendStream: boolean
}

export const DEFAULT_SETTINGS: SimSettings = {
  agentCount: 50,
  seed: 1337,
  sensorRadius: 2,
  commRange: 9,
  maxSpeed: 0.08,
  collisionAvoidance: true,
  warmStart: true,
  showTrails: true,
  showLinks: true,
  showSensors: false,
  showHeatmap: true,
  useBackendStream: false,
}

export type SimSnapshot = {
  status: SimStatus
  step: number
  speed: number
  source: 'local' | 'backend'
  activeAgents: number
  coverage: number
  efficiency: number
  collisions: number
  survivorsFound: number
  survivorsTotal: number
  avgBattery: number
  commLinks: number
  episodeReward: number
  fps: number
  stepMs: number
  statusCounts: Record<AgentStatus, number>
  taskCounts: Record<AgentTask, number>
  history: HistoryPoint[]
  events: SimEvent[]
  version: number
}
