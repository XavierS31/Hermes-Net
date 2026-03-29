/**
 * Three.js hurricane overlay — motion plan:
 *
 * 1. Cyclonic shell — parent group spins CCW; rate scales with sustained wind (sim physics).
 * 2. Differential rotation — inner toruses use opposite/faster spin for eyewall shear visual.
 * 3. Wind field — instanced motes on a logarithmic spiral; each bobs in Y + orbits in XZ (twirl).
 * 4. Translation lean — group tilt from storm bearing (forward motion), small roll wobble.
 * 5. Eye — calm core with emissive pulse tied to category.
 *
 * Anchored to map via Mapbox project(); no geographic coupling inside the Canvas.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { MapRef } from 'react-map-gl/mapbox'
import * as THREE from 'three'

const CANVAS_PX = 400

interface OverlayProps {
  mapRef: React.RefObject<MapRef | null>
  lng: number
  lat: number
  windSpeed: number
  category: number
  r34Nm: number
  /** Storm motion (deg); drives subtle lean of the 3D stack */
  bearingDeg: number
}

function EyeCore({ category }: { category: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) {
      const s = 0.38 + 0.06 * category + 0.04 * Math.sin(t * 2.2)
      ref.current.scale.setScalar(s)
    }
    if (mat.current) {
      mat.current.emissiveIntensity = 0.22 + 0.09 * category + 0.14 * Math.sin(t * Math.PI)
    }
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial
        ref={mat}
        color="#fff7d6"
        roughness={0.15}
        metalness={0.05}
        emissive="#fbbf24"
        emissiveIntensity={0.35}
      />
    </mesh>
  )
}

function DifferentialBands({
  spinOuter,
  spinInner,
  scale,
}: {
  spinOuter: number
  spinInner: number
  scale: number
}) {
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    if (outer.current) outer.current.rotation.y += spinOuter * dt
    if (inner.current) inner.current.rotation.y -= spinInner * dt
  })

  return (
    <group scale={scale}>
      <group ref={outer}>
        <mesh rotation={[Math.PI / 2, 0.15, 0.05]}>
          <torusGeometry args={[2.65, 0.26, 10, 56]} />
          <meshStandardMaterial
            color="#5b8fd9"
            transparent
            opacity={0.38}
            roughness={0.42}
            metalness={0.12}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, -0.2, 0.12]}>
          <torusGeometry args={[3.05, 0.14, 8, 44]} />
          <meshStandardMaterial
            color="#93c5fd"
            transparent
            opacity={0.22}
            roughness={0.55}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={inner}>
        <mesh rotation={[Math.PI / 2, 0.45, -0.1]}>
          <torusGeometry args={[1.72, 0.2, 10, 40]} />
          <meshStandardMaterial
            color="#f59e0b"
            transparent
            opacity={0.48}
            roughness={0.32}
            emissive="#b45309"
            emissiveIntensity={0.12}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, -0.35, 0.2]}>
          <torusGeometry args={[1.18, 0.12, 8, 32]} />
          <meshStandardMaterial
            color="#fcd34d"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}

const PARTICLE_COUNT = 56

function WindParticleField({ spinMult, scale }: { spinMult: number; scale: number }) {
  const inst = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const base = useMemo(() => {
    const arr: [number, number, number][] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = i / PARTICLE_COUNT
      const r = (0.22 + u * u * 2.95) * scale
      const theta = u * 16 * Math.PI
      const y = (Math.sin(i * 12.9898) * 0.5) * 0.32 * scale
      arr.push([r * Math.cos(theta), y, r * Math.sin(theta)])
    }
    return arr
  }, [scale])

  useFrame(({ clock }) => {
    const mesh = inst.current
    if (!mesh) return
    const t = clock.getElapsedTime()
    const twist = t * spinMult
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [bx, by, bz] = base[i]
      const bob = Math.sin(t * 3.4 + i * 0.37) * 0.14 * scale
      const c = Math.cos(twist + i * 0.11)
      const s = Math.sin(twist + i * 0.11)
      const x = bx * c - bz * s
      const z = bx * s + bz * c
      dummy.position.set(x, by + bob, z)
      const sc = (0.1 + 0.05 * Math.sin(t * 2.8 + i)) * scale
      dummy.scale.setScalar(sc)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={inst} args={[undefined as never, undefined as never, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#a5d8ff" transparent opacity={0.52} depthWrite={false} />
    </instancedMesh>
  )
}

function StormScene({
  windSpeed,
  category,
  r34Nm,
  bearingDeg,
}: {
  windSpeed: number
  category: number
  r34Nm: number
  bearingDeg: number
}) {
  const root = useRef<THREE.Group>(null)
  const w = Math.max(35, Math.min(185, windSpeed))
  const cat = Math.max(0, Math.min(5, category))
  const scale = Math.max(0.62, Math.min(1.58, r34Nm / 95))

  const spinOuter = 0.28 + w / 420 + cat * 0.07
  const spinInner = spinOuter * 1.75
  const particleSpin = spinOuter * 2.2

  const bearingRad = useMemo(() => (bearingDeg * Math.PI) / 180, [bearingDeg])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!root.current) return
    root.current.rotation.x = 0.1 + Math.sin(t * 0.9) * 0.055
    root.current.rotation.z = Math.sin(bearingRad) * 0.09 + Math.cos(t * 0.65) * 0.03
  })

  return (
    <group ref={root}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 12, 8]} intensity={1.15} color="#e8eef7" />
      <directionalLight position={[-8, 4, -6]} intensity={0.35} color="#38bdf8" />
      <pointLight position={[0, 1.5, 0]} intensity={0.9} color="#fde68a" distance={10} />

      <DifferentialBands spinOuter={spinOuter} spinInner={spinInner} scale={scale} />
      <WindParticleField spinMult={particleSpin} scale={scale} />
      <EyeCore category={cat} />
    </group>
  )
}

export function HurricaneThreeOverlay({
  mapRef,
  lng,
  lat,
  windSpeed,
  category,
  r34Nm,
  bearingDeg,
}: OverlayProps) {
  const [pos, setPos] = useState({ left: 0, top: 0, ok: false })

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    function project() {
      const m = mapRef.current?.getMap()
      if (!m) return
      try {
        const p = m.project([lng, lat])
        setPos({ left: p.x - CANVAS_PX / 2, top: p.y - CANVAS_PX / 2, ok: true })
      } catch {
        setPos((s) => ({ ...s, ok: false }))
      }
    }

    project()
    map.on('move', project)
    map.on('zoom', project)
    map.on('rotate', project)
    map.on('pitch', project)
    map.on('resize', project)
    return () => {
      map.off('move', project)
      map.off('zoom', project)
      map.off('rotate', project)
      map.off('pitch', project)
      map.off('resize', project)
    }
  }, [mapRef, lng, lat])

  if (!pos.ok) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.left,
        top: pos.top,
        width: CANVAS_PX,
        height: CANVAS_PX,
        pointerEvents: 'none',
        zIndex: 6,
        overflow: 'visible',
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 3.2, 8.4], fov: 40, near: 0.1, far: 50 }}
        style={{ width: CANVAS_PX, height: CANVAS_PX, background: 'transparent' }}
        dpr={[1, 2]}
      >
        <StormScene
          windSpeed={windSpeed}
          category={category}
          r34Nm={r34Nm}
          bearingDeg={bearingDeg}
        />
      </Canvas>
    </div>
  )
}
