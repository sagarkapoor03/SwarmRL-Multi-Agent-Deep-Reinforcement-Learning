import { apiConfig, endpoints } from './config'
import type { TrainingMetrics } from '@/lib/data/training'

export type HealthResponse = {
  status: 'ok' | 'degraded'
  version: string
  ray: boolean
  algorithm: string
  training: boolean
}

export type SimulationStatusResponse = {
  status: 'idle' | 'running' | 'paused' | 'complete'
  step: number
  coverage: number
  collisions: number
  active_agents: number
}

export class BackendError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiConfig.baseUrl) throw new BackendError('Backend URL not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!res.ok) throw new BackendError(`Request failed: ${res.status}`, res.status)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof BackendError) throw err
    throw new BackendError(err instanceof Error ? err.message : 'Network error')
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  health: () => request<HealthResponse>(endpoints.health),
  simulationStatus: () => request<SimulationStatusResponse>(endpoints.simulationStatus),
  controlSimulation: (action: 'start' | 'pause' | 'resume' | 'reset') =>
    request<SimulationStatusResponse>(endpoints.simulationControl(action), { method: 'POST' }),
  trainingMetrics: () => request<TrainingMetrics>(endpoints.trainingMetrics),
}
