'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { SwarmEngine, type RemoteStateMessage } from '@/lib/sim/engine'
import { DEFAULT_SETTINGS, type AgentTask, type SimSettings, type SimSnapshot } from '@/lib/sim/types'
import { apiConfig, endpoints, isStreamConfigured } from '@/lib/api/config'

export type StreamStatus = 'disabled' | 'unconfigured' | 'connecting' | 'open' | 'closed' | 'error'

type FrameCallback = () => void

type SimContextValue = {
  engine: SwarmEngine | null
  settings: SimSettings
  selectedAgentId: string | null
  streamStatus: StreamStatus
  selectAgent: (id: string | null) => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  setSpeed: (speed: number) => void
  updateSettings: (patch: Partial<SimSettings>, options?: { reset?: boolean }) => void
  recallAgent: (id: string) => void
  assignTask: (id: string, task: AgentTask) => void
  assignSector: (id: string, sector: number) => void
  registerFrame: (cb: FrameCallback) => () => void
}

const SimContext = createContext<SimContextValue | null>(null)

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [engine, setEngine] = useState<SwarmEngine | null>(null)
  const [settings, setSettings] = useState<SimSettings>(DEFAULT_SETTINGS)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disabled')
  const frameCallbacks = useRef(new Set<FrameCallback>())

  useEffect(() => {
    setEngine(new SwarmEngine(DEFAULT_SETTINGS))
  }, [])

  useEffect(() => {
    if (!engine) return
    let raf = 0
    let lastEmit = performance.now()
    let frames = 0
    let fpsWindowStart = performance.now()
    const loop = () => {
      engine.tick()
      frames++
      const now = performance.now()
      if (now - fpsWindowStart >= 1000) {
        engine.fps = Math.round((frames * 1000) / (now - fpsWindowStart))
        frames = 0
        fpsWindowStart = now
      }
      if (engine.status === 'running' && now - lastEmit > 200) {
        lastEmit = now
        engine.bump()
      }
      for (const cb of frameCallbacks.current) cb()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  useEffect(() => {
    if (!engine) return
    if (!settings.useBackendStream) {
      setStreamStatus('disabled')
      return
    }
    if (!isStreamConfigured) {
      setStreamStatus('unconfigured')
      return
    }
    setStreamStatus('connecting')
    const ws = new WebSocket(`${apiConfig.wsUrl}${endpoints.agentStream}`)
    ws.onopen = () => setStreamStatus('open')
    ws.onerror = () => setStreamStatus('error')
    ws.onclose = () => {
      setStreamStatus((s) => (s === 'error' ? 'error' : 'closed'))
      engine.detachBackend()
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as RemoteStateMessage
        if (msg.type === 'state' && Array.isArray(msg.agents)) engine.applyRemoteState(msg)
      } catch {
        // ignore malformed frames from the stream
      }
    }
    return () => ws.close()
  }, [engine, settings.useBackendStream])

  const registerFrame = useCallback((cb: FrameCallback) => {
    frameCallbacks.current.add(cb)
    return () => {
      frameCallbacks.current.delete(cb)
    }
  }, [])

  const value = useMemo<SimContextValue>(
    () => ({
      engine,
      settings,
      selectedAgentId,
      streamStatus,
      selectAgent: setSelectedAgentId,
      start: () => engine?.start(),
      pause: () => engine?.pause(),
      resume: () => engine?.resume(),
      reset: () => engine?.reset(),
      setSpeed: (speed) => engine?.setSpeed(speed),
      updateSettings: (patch, options) => {
        const next = { ...settings, ...patch }
        setSettings(next)
        if (!engine) return
        if (options?.reset) {
          engine.reset(next)
          setSelectedAgentId(null)
        } else {
          engine.settings = { ...engine.settings, ...patch }
          engine.bump()
        }
      },
      recallAgent: (id) => engine?.recallAgent(id),
      assignTask: (id, task) => engine?.assignTask(id, task),
      assignSector: (id, sector) => engine?.assignSector(id, sector),
      registerFrame,
    }),
    [engine, settings, selectedAgentId, streamStatus, registerFrame],
  )

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>
}

export function useSim() {
  const ctx = useContext(SimContext)
  if (!ctx) throw new Error('useSim must be used within SimulationProvider')
  return ctx
}

const noopSubscribe = () => () => {}
const nullSnapshot = () => null

export function useSimSnapshot(): SimSnapshot | null {
  const { engine } = useSim()
  return useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getSnapshot : nullSnapshot,
    nullSnapshot,
  )
}
