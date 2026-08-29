"use client"

import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { buildChunkGeometry } from "@/lib/mesher"
import { getAtlasTexture } from "@/lib/texture-atlas"
import type { World } from "@/lib/world"

interface Props {
  world: World
  cx: number
  cz: number
  rev: number
}

export function ChunkMesh({ world, cx, cz, rev }: Props) {
  const waterRef = useRef<THREE.MeshLambertMaterial>(null)
  const lavaRef = useRef<THREE.MeshLambertMaterial>(null)
  const atlas = useMemo(() => getAtlasTexture(), [])

  const geos = useMemo(() => {
    return buildChunkGeometry(world, cx, cz)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, cx, cz, rev])

  useEffect(() => {
    return () => {
      geos.opaque?.dispose()
      geos.water?.dispose()
      geos.lava?.dispose()
    }
  }, [geos])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (waterRef.current) {
      waterRef.current.opacity = 0.72 + Math.sin(t * 2 + cx) * 0.05
    }
    if (lavaRef.current) {
      const pulse = 0.6 + Math.sin(t * 3 + cz) * 0.25
      lavaRef.current.emissiveIntensity = pulse
    }
  })

  const opaqueMaterial = useMemo(() => {
    const material = new THREE.MeshLambertMaterial({ map: atlas })
    material.shadowSide = THREE.DoubleSide
    return material
  }, [atlas])

  return (
    <group>
      {geos.opaque && (
        <mesh geometry={geos.opaque} receiveShadow material={opaqueMaterial} />
      )}
      {geos.water && (
        <mesh geometry={geos.water} receiveShadow>
          <meshLambertMaterial
            ref={waterRef}
            map={atlas}
            transparent
            opacity={0.72}
            depthWrite={false}
          />
        </mesh>
      )}
      {geos.lava && (
        <mesh geometry={geos.lava} castShadow receiveShadow>
          <meshLambertMaterial
            ref={lavaRef}
            map={atlas}
            emissive={new THREE.Color("#ff6a2a")}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </group>
  )
}
