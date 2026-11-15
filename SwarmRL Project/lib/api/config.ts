function trimSlash(value: string | undefined) {
  return value ? value.replace(/\/+$/, '') : ''
}

export const apiConfig = {
  baseUrl: trimSlash(process.env.NEXT_PUBLIC_SWARMRL_API_URL),
  wsUrl: trimSlash(process.env.NEXT_PUBLIC_SWARMRL_WS_URL),
}

export const isBackendConfigured = apiConfig.baseUrl.length > 0
export const isStreamConfigured = apiConfig.wsUrl.length > 0

export const endpoints = {
  health: '/health',
  simulationStatus: '/api/v1/simulation/status',
  simulationControl: (action: 'start' | 'pause' | 'resume' | 'reset') => `/api/v1/simulation/${action}`,
  trainingMetrics: '/api/v1/training/metrics',
  agents: '/api/v1/agents',
  agentStream: '/ws/agents',
}
