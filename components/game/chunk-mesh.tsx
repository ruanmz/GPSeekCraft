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

// 自定义着色器：采样纹理图集 × AO 明暗系数
const vertexShader = `
  attribute float ao;
  varying vec2 vUv;
  varying float vAo;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vAo = ao;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D atlas;
  uniform vec3 lightDir;
  varying vec2 vUv;
  varying float vAo;
  varying vec3 vNormal;
  void main() {
    vec4 tex = texture2D(atlas, vUv);
    if (tex.a < 0.5) discard;
    float ndl = max(0.4, dot(normalize(vNormal), normalize(lightDir)));
    vec3 col = tex.rgb * vAo * ndl;
    gl_FragColor = vec4(col, tex.a);
  }
`

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
    return new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: atlas },
        lightDir: { value: new THREE.Vector3(0.5, 1.0, 0.3) },
      },
      vertexShader,
      fragmentShader,
    })
  }, [atlas])

  return (
    <group>
      {geos.opaque && (
        <mesh geometry={geos.opaque} frustumCulled={false} castShadow receiveShadow material={opaqueMaterial} />
      )}
      {geos.water && (
        <mesh geometry={geos.water} frustumCulled={false} receiveShadow>
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
        <mesh geometry={geos.lava} frustumCulled={false} castShadow receiveShadow>
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
