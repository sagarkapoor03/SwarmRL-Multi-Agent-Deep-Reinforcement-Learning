import { mulberry32 } from '@/lib/sim/world'

export type EpisodeMetric = {
  episode: number
  reward: number
  avgReward: number
  policyLoss: number
  valueLoss: number
  entropy: number
  efficiency: number
  collisionRate: number
  coverage: number
}

export type AgentGroupMetric = {
  role: string
  reward: number
  coverage: number
  successRate: number
  collisions: number
}

export type AlgorithmComparison = {
  metric: string
  MAPPO: number
  IPPO: number
  Heuristic: number
}

export type TrainingMetrics = {
  source: 'sample' | 'backend'
  algorithm: string
  framework: string
  totalEpisodes: number
  totalTimesteps: number
  episodes: EpisodeMetric[]
  agentGroups: AgentGroupMetric[]
  comparison: AlgorithmComparison[]
  hyperparameters: Record<string, string | number>
}

function generateSampleTraining(): TrainingMetrics {
  const rand = mulberry32(42)
  const gauss = () => {
    const u = Math.max(1e-9, rand())
    const v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const total = 1000
  const episodes: EpisodeMetric[] = []
  const window: number[] = []
  for (let e = 1; e <= total; e++) {
    const p = e / total
    const learn = 1 - Math.exp(-p * 4.2)
    const reward = -120 + learn * 520 + gauss() * (38 - learn * 22)
    window.push(reward)
    if (window.length > 50) window.shift()
    const avgReward = window.reduce((s, r) => s + r, 0) / window.length
    episodes.push({
      episode: e,
      reward: +reward.toFixed(1),
      avgReward: +avgReward.toFixed(1),
      policyLoss: +Math.max(0.005, 0.42 * Math.exp(-p * 3.4) + 0.02 + gauss() * 0.015).toFixed(4),
      valueLoss: +Math.max(0.01, 1.8 * Math.exp(-p * 2.8) + 0.08 + gauss() * 0.05).toFixed(4),
      entropy: +Math.max(0.2, 1.38 - p * 0.95 + gauss() * 0.03).toFixed(3),
      efficiency: +Math.min(97, 41 + learn * 52.4 + gauss() * 1.6).toFixed(2),
      collisionRate: +Math.max(0, 6.8 * Math.exp(-p * 5.2) + gauss() * 0.18).toFixed(3),
      coverage: +Math.min(99.5, 38 + learn * 60 + gauss() * 1.4).toFixed(2),
    })
  }
  return {
    source: 'sample',
    algorithm: 'MAPPO (shared policy, centralized critic)',
    framework: 'Ray RLlib 2.x',
    totalEpisodes: total,
    totalTimesteps: total * 2000,
    episodes,
    agentGroups: [
      { role: 'Sector Sweep', reward: 412.6, coverage: 71.3, successRate: 96.1, collisions: 0.02 },
      { role: 'Survivor Search', reward: 388.2, coverage: 12.4, successRate: 93.8, collisions: 0.04 },
      { role: 'Hazard Mapping', reward: 341.9, coverage: 9.7, successRate: 90.2, collisions: 0.05 },
      { role: 'Comm Relay', reward: 296.4, coverage: 6.6, successRate: 98.7, collisions: 0.01 },
    ],
    comparison: [
      { metric: 'Coverage', MAPPO: 96, IPPO: 84, Heuristic: 71 },
      { metric: 'Efficiency', MAPPO: 92, IPPO: 78, Heuristic: 64 },
      { metric: 'Safety', MAPPO: 99, IPPO: 91, Heuristic: 85 },
      { metric: 'Survivors', MAPPO: 94, IPPO: 80, Heuristic: 62 },
      { metric: 'Battery', MAPPO: 88, IPPO: 83, Heuristic: 76 },
      { metric: 'Comms', MAPPO: 90, IPPO: 69, Heuristic: 58 },
    ],
    hyperparameters: {
      'Learning rate': '3e-4',
      'Discount (γ)': 0.99,
      'GAE (λ)': 0.95,
      'Clip param': 0.2,
      'Train batch size': 64000,
      'SGD minibatch': 4096,
      'Num SGD iters': 10,
      'Entropy coeff': 0.01,
      'Rollout workers': 8,
      'Agents per env': 50,
    },
  }
}

export const sampleTraining: TrainingMetrics = generateSampleTraining()

export function downsample<T>(data: T[], max: number): T[] {
  if (data.length <= max) return data
  const step = data.length / max
  return Array.from({ length: max }, (_, i) => data[Math.floor(i * step)]).concat(data[data.length - 1])
}
