"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { player } from "@/lib/player-ref"
import { Canvas } from "@react-three/fiber"
import * as THREE from "three"
import { WorldRenderer } from "./world-renderer"
import { PlayerController } from "./player-controller"
import { SkyLighting } from "./sky-lighting"
import { BlockInteraction } from "./block-interaction"
import { EnvironmentSim } from "./environment-sim"
import { LiquidSim } from "./liquid-sim"
import { ItemDrops } from "./item-drops"
import { HandView } from "./hand-view"
import { useGame } from "@/lib/store"

function PlayerFireEffect() {
  const groupRef = useRef<THREE.Group>(null)
  const flameRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const burning = player.fireLeft > 0
    group.visible = burning
    if (!burning) return
    const t = clock.elapsedTime
    group.position.set(player.x, player.y + 0.65, player.z)
    group.scale.setScalar(0.92 + Math.sin(t * 18) * 0.08)
    if (flameRef.current) {
      flameRef.current.rotation.y = t * 1.6
      flameRef.current.scale.y = 1 + Math.sin(t * 14) * 0.12
    }
  })
  return (
    <group ref={groupRef} visible={false} renderOrder={20}>
      <mesh ref={flameRef} position={[0, 0.7, 0]}>
        <coneGeometry args={[0.42, 1.5, 8]} />
        <meshBasicMaterial color="#ff7a18" transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.3, 0]} scale={[0.75, 0.7, 0.75]}>
        <sphereGeometry args={[0.42, 8, 6]} />
        <meshBasicMaterial color="#ffd34e" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HighlightBox({ boxRef }: { boxRef: React.RefObject<THREE.LineSegments | null> }) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002))
  return (
    <lineSegments ref={boxRef} visible={false} renderOrder={999}>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#000000" transparent opacity={0.4} depthTest={false} />
    </lineSegments>
  )
}

export function GameScene() {
  const highlightRef = useRef<THREE.LineSegments | null>(null)
  const renderDistance = useGame((s) => s.settings.renderDistance)
  const fov = useGame((s) => s.settings.fov)

  return (
    <Canvas
      id="game-canvas"
      shadows={true}
      dpr={[1, 1]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov, near: 0.05, far: 1000, position: [0, 80, 0] }}
      onCreated={({ gl }) => {
        gl.setClearColor("#87ceeb")
        gl.shadowMap.enabled = true
        gl.shadowMap.type = THREE.PCFShadowMap
        gl.shadowMap.autoUpdate = true
      }}
    >
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#87ceeb", 60, 300]} />
      <SkyLighting />
      <WorldRenderer />
      <PlayerController />
      <PlayerFireEffect />
      <BlockInteraction highlightRef={highlightRef} />
      <EnvironmentSim />
      <LiquidSim />
      <ItemDrops />
      <HighlightBox boxRef={highlightRef} />
    </Canvas>
  )
}
