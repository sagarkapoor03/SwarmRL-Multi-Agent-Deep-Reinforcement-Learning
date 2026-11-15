'use client'

import useSWR from 'swr'
import { api } from '@/lib/api/client'
import { isBackendConfigured } from '@/lib/api/config'
import { sampleTraining, type TrainingMetrics } from '@/lib/data/training'

export type BackendState = 'unconfigured' | 'checking' | 'online' | 'offline'

export function useBackendHealth() {
  const { data, error, isLoading, mutate } = useSWR(isBackendConfigured ? 'backend:health' : null, api.health, {
    refreshInterval: 15000,
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  })
  const state: BackendState = !isBackendConfigured
    ? 'unconfigured'
    : isLoading
      ? 'checking'
      : error || !data
        ? 'offline'
        : 'online'
  return { state, health: data, error: error as Error | undefined, refresh: () => mutate() }
}

export function useTrainingMetrics(): { metrics: TrainingMetrics; isLive: boolean } {
  const { state } = useBackendHealth()
  const { data } = useSWR(state === 'online' ? 'backend:training' : null, api.trainingMetrics, {
    refreshInterval: 30000,
    shouldRetryOnError: false,
  })
  if (data && Array.isArray(data.episodes) && data.episodes.length > 0) {
    return { metrics: { ...data, source: 'backend' }, isLive: true }
  }
  return { metrics: sampleTraining, isLive: false }
}
