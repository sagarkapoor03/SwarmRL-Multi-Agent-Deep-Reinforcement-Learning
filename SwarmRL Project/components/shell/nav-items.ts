import {
  Activity,
  BarChart3,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  PlaneTakeoff,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon; description: string }

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, description: 'Mission summary and swarm health' },
  { href: '/simulation', label: 'Live Simulation', icon: Activity, description: 'Real-time swarm exploration' },
  { href: '/agents', label: 'Agent Management', icon: PlaneTakeoff, description: 'Monitor and command drones' },
  { href: '/environment', label: 'Environment Map', icon: MapIcon, description: 'Disaster-zone layers and coverage' },
  { href: '/analytics', label: 'Training Analytics', icon: BarChart3, description: 'MAPPO learning curves' },
  { href: '/metrics', label: 'Performance Metrics', icon: Gauge, description: 'Runtime and agent performance' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Simulation and backend configuration' },
]
