"use client"

import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { buildChunkGeometry } from "@/lib/mesher"
import { getAtlasTexture, getWaterTexture, getLavaTexture } from "@/lib/texture-atlas"
import type { World } from "@/lib/world"

interface Props {
  world: World
  cx: number
  cz: number
  rev: number
}

// 基于 MeshLambertMaterial 的自定义：在 Three.js 内置 Lambert 着色前注入 attribute float ao，
// 片段末尾把 final color.rgb 再乘 varying vAo。这样太阳/ambient/hemi/shadowmap/alphaTest
// 完整保留，只额外叠一层"顶点 AO/洞穴曝光"。
function makeOpaqueMaterial(atlas: THREE.Texture): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ map: atlas })
  ;(mat as any).shadowSide = THREE.DoubleSide

  // onBeforeCompile 只在第一次编译时跑（shader 字符串闭包）；后续通过 uniforms 改参数
  ;(mat as any).userData._beforeCompilePatched = false
  mat.onBeforeCompile = (shader: any) => {
    // === vertex shader 打补丁：声明 attribute ao；声明 varying vAo；在 main() 末尾写 varying ===
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       attribute float ao;
       varying float vAo;`,
    )
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vAo = clamp(ao, 0.0, 1.0);`,
    )
    // === fragment shader 打补丁：varying vAo 声明 + 末尾 gl_FragColor.rgb *= vAo
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       varying float vAo;`,
    )
    // 在 dithering_fragment 之后、返回之前强制乘 vAo
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
       gl_FragColor.rgb *= vAo;`,
    )
    ;(mat as any).userData._shader = shader
  }
  mat.needsUpdate = true
  return mat
}

// 全局单例：所有 chunk 共享同一份带 AO 补丁的 opaque 材质（只编译一次 shader）
let sharedOpaque: THREE.MeshLambertMaterial | null = null
function getSharedOpaque(atlas: THREE.Texture): THREE.MeshLambertMaterial {
  if (!sharedOpaque) sharedOpaque = makeOpaqueMaterial(atlas)
  return sharedOpaque
}

export function ChunkMesh({ world, cx, cz, rev }: Props) {
  const waterRef = useRef<THREE.MeshLambertMaterial>(null)
  const lavaRef = useRef<THREE.MeshLambertMaterial>(null)
  const { scene } = useThree()
  const atlas = useMemo(() => getAtlasTexture(), [])
  const waterTex = useMemo(() => getWaterTexture(), [])
  const lavaTex = useMemo(() => getLavaTexture(), [])
  // 几何现在是区块局部坐标，mesh 放到自己区块的世界位置，才能正确做视锥剔除
  const position = useMemo(() => new THREE.Vector3(cx * 16, 0, cz * 16), [cx, cz])

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

  // 所有 chunk 复用同一个材质实例
  const opaqueMaterial = getSharedOpaque(atlas)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (waterRef.current) {
      waterRef.current.opacity = 0.72 + Math.sin(t * 2 + cx) * 0.05
    }
    if (lavaRef.current) {
      const pulse = 0.6 + Math.sin(t * 3 + cz) * 0.25
      lavaRef.current.emissiveIntensity = pulse
    }
    // 液体流动动画：偏移量按时间匀速滚动（取模 1 保持精度），RepeatWrapping 无缝衔接
    waterTex.offset.x = (t * 0.06) % 1
    waterTex.offset.y = (t * 0.09) % 1
    lavaTex.offset.x = (t * 0.04) % 1
    lavaTex.offset.y = (t * 0.07) % 1
  })

  return (
    <group position={position}>
      {geos.opaque && (
        <mesh
          geometry={geos.opaque}
          material={opaqueMaterial}
          castShadow
          receiveShadow
        />
      )}
      {geos.water && (
        <mesh geometry={geos.water} receiveShadow>
          <meshLambertMaterial
            ref={waterRef}
            map={waterTex}
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
            map={lavaTex}
            emissive={new THREE.Color("#ff6a2a")}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </group>
  )
}
