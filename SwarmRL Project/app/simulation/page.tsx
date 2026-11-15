import type { Metadata } from 'next'
import { SimulationView } from '@/components/simulation/simulation-view'

export const metadata: Metadata = { title: 'Live Simulation' }

export default function Page() {
  return <SimulationView />
}
