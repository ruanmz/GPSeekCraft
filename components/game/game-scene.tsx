"use client"

import { useRef } from "react"
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
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#87ceeb", 60, 300]} />
      <SkyLighting />
      <WorldRenderer />
      <PlayerController />
      <BlockInteraction highlightRef={highlightRef} />
      <EnvironmentSim />
      <LiquidSim />
      <ItemDrops />
      <HighlightBox boxRef={highlightRef} />
    </Canvas>
  )
}
