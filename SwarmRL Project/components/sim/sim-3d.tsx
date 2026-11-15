'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { SwarmEngine } from '@/lib/sim/engine'
import { STATUS_COLORS } from '@/lib/sim/render'
import { useSim } from './simulation-provider'

const DRONE_ALT = 7

function Ground({ engine }: { engine: SwarmEngine }) {
  const { width, height, blocked } = engine.world
  const frame = useRef(0)
  const texture = useMemo(() => {
    const data = new Uint8Array(width * height * 4)
    const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearFilter
    tex.needsUpdate = true
    return tex
  }, [width, height])

  useFrame(() => {
    frame.current++
    if (frame.current % 10 !== 1) return
    const data = texture.image.data as Uint8Array
    const { visits } = engine
    for (let i = 0; i < visits.length; i++) {
      const o = i * 4
      const v = visits[i]
      if (blocked[i]) {
        data[o] = 20
        data[o + 1] = 26
        data[o + 2] = 38
      } else if (v === 0) {
        data[o] = 12
        data[o + 1] = 16
        data[o + 2] = 26
      } else {
        const t = Math.min(1, Math.log(v + 1) / Math.log(400))
        data[o] = 14 + t * 30
        data[o + 1] = 60 + t * 110
        data[o + 2] = 80 + t * 150
      }
      data[o + 3] = 255
    }
    texture.needsUpdate = true
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, height / 2]} scale={[1, -1, 1]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Buildings({ engine }: { engine: SwarmEngine }) {
  return (
    <group>
      {engine.world.buildings.map((b, i) => {
        const h = b.collapsed ? 1.2 : 2.5 + ((i * 37) % 7)
        return (
          <mesh key={b.id} position={[b.x + b.w / 2, h / 2, b.y + b.h / 2]}>
            <boxGeometry args={[b.w, h, b.h]} />
            <meshStandardMaterial
              color={b.collapsed ? '#7c2d12' : '#1e293b'}
              emissive={b.collapsed ? '#f97316' : '#2f7bff'}
              emissiveIntensity={b.collapsed ? 0.15 : 0.05}
              roughness={0.8}
            />
          </mesh>
        )
      })}
      {engine.world.dangerZones.map((z) => (
        <mesh key={z.id} position={[z.x, 1.5, z.y]}>
          <cylinderGeometry args={[z.r, z.r, 3, 32, 1, true]} />
          <meshBasicMaterial
            color={z.kind === 'Gas leak' ? '#facc15' : z.kind === 'Structural' ? '#f97316' : '#ef4444'}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh position={[engine.world.base.x, 0.3, engine.world.base.y]}>
        <cylinderGeometry args={[2.5, 2.5, 0.6, 32]} />
        <meshStandardMaterial color="#2f7bff" emissive="#2f7bff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

function Drones({ engine }: { engine: SwarmEngine }) {
  const { selectedAgentId } = useSim()
  const count = engine.agents.length
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const maxPairs = (count * (count - 1)) / 2
  const linePositions = useMemo(() => new Float32Array(maxPairs * 6), [maxPairs])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    engine.agents.forEach((a, i) => {
      const alt = a.status === 'charging' ? 0.8 : DRONE_ALT
      dummy.position.set(a.x, alt, a.y)
      dummy.rotation.set(0, -a.heading, -Math.PI / 2)
      const s = a.id === selectedAgentId ? 1.8 : 1
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      color.set(a.collisionFlash > 0 ? '#ef4444' : a.id === selectedAgentId ? '#ffffff' : STATUS_COLORS[a.status])
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    const lines = linesRef.current
    if (!lines) return
    const r = engine.settings.commRange
    let n = 0
    const list = engine.agents
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (Math.hypot(a.x - b.x, a.y - b.y) < r) {
          linePositions.set([a.x, DRONE_ALT, a.y, b.x, DRONE_ALT, b.y], n * 6)
          n++
        }
      }
    }
    const geom = lines.geometry
    geom.setDrawRange(0, n * 2)
    ;(geom.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[0.55, 1.6, 4]} />
        <meshStandardMaterial emissiveIntensity={0.9} toneMapped={false} />
      </instancedMesh>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2f7bff" transparent opacity={0.35} />
      </lineSegments>
    </group>
  )
}

export default function Sim3D() {
  const { engine } = useSim()
  if (!engine) return null
  const { width, height } = engine.world
  return (
    <Canvas
      key={engine.world.buildings.length + engine.agents.length + engine.settings.seed}
      camera={{ position: [width / 2, 75, height + 45], fov: 45 }}
      dpr={[1, 2]}
      aria-label="3D view of the drone swarm"
    >
      <color attach="background" args={['#080b12']} />
      <fog attach="fog" args={['#080b12', 120, 260]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[60, 100, 40]} intensity={1.2} />
      <Ground engine={engine} />
      <Buildings engine={engine} />
      <Drones engine={engine} />
      <OrbitControls target={[width / 2, 0, height / 2]} maxPolarAngle={Math.PI / 2.1} minDistance={30} maxDistance={220} />
    </Canvas>
  )
}
