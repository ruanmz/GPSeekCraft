"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGame } from "@/lib/store"
const DAY_LENGTH = 1200 // 一整天 1200 秒（20 分钟）

const nightColor = new THREE.Color("#0a1330")
const dayColor = new THREE.Color("#8ec5ff")
const sunsetColor = new THREE.Color("#e8834a")

export function SkyLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const moonRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const { scene, camera, gl } = useThree()
  const timeRef = useRef(useGame.getState().worldTime)
  const storeSync = useRef(0)
  const shadows = useGame((s) => s.settings.shadows)

  // 阴影开关：动态启停 shadow map，关闭后跳过阴影 pass 省算力
  useEffect(() => {
    gl.shadowMap.enabled = shadows
  }, [gl, shadows])

  useFrame((state, delta) => {
    // 推进时间
    timeRef.current = (timeRef.current + delta / DAY_LENGTH) % 1
    const t = timeRef.current

    // 每 0.5s 同步到 store（供 HUD 显示，减少重渲染）
    storeSync.current += delta
    if (storeSync.current > 0.5) {
      storeSync.current = 0
      useGame.getState().setWorldTime(t)
    }

    // 太阳位置：0.25 日出(东) 0.5 正午(顶) 0.75 日落(西) 0 午夜(底)
    const ang = (t - 0.25) * Math.PI * 2
    const sunY = Math.sin(ang)
    const sunX = Math.cos(ang)
    const sunZ = 0.3
    const sunDir = new THREE.Vector3(sunX, Math.max(sunY, 0.1), sunZ).normalize()

    // 先计算昼夜亮度，再交给太阳/月光和环境光使用。
    const dayness = THREE.MathUtils.smoothstep(sunY, -0.2, 0.35)
    const nightness = 1 - dayness
    const brightness = 0.18 + dayness * 0.82
    const horizonness = 1 - Math.min(1, Math.abs(sunY) * 3)

    // ====== 阴影相机：跟随玩家移动，让 ShadowMap 始终保持在玩家附近 =====
      // 用玩家世界坐标（camera 下方 player.y 玩家脚底）
      const px = camera.position.x
      const py = camera.position.y
      const pz = camera.position.z

    if (sunRef.current) {
      // 覆盖范围尽量压缩（±40m，约渲染距离 2.5 格），阴影多用于玩家近处地面，
      // 远处的大块几何渲染进 shadowmap 是最大的性能杀手。
      const SIZE = 80 // 覆盖 ±40 m
      const FAR = 320
      const NEAR = 2
      const sun = sunRef.current
      sun.position.set(
        px + sunDir.x * FAR * 0.55,
        py + Math.max(sunDir.y, 0.05) * FAR * 0.55,
        pz + sunDir.z * FAR * 0.55,
      )
      // 阴影"看向"玩家位置
      sun.target.position.set(px, py, pz)
      sun.target.updateMatrixWorld()
      sun.intensity = Math.max(0, sunY) * 1.25 * brightness + 0.01

      const sh = sun.shadow as THREE.DirectionalLightShadow
      // 分辨率降到 1536：覆盖范围缩小后 texel 密度足够，还能再省一档算力
      const targetSize = 1536
      if (sh.mapSize.width !== targetSize) {
        sh.mapSize.set(targetSize, targetSize)
        sh.needsUpdate = true
      }
      // 相机盒 = (px ± SIZE/2, py ± SIZE/2)
      const half = SIZE / 2
      sh.camera.left = -half
      sh.camera.right = half
      sh.camera.top = half
      sh.camera.bottom = -half
      sh.camera.near = NEAR
      sh.camera.far = FAR
      // 调 bias：太小→阴影条带，太大→阴影"脱离"方块被吞
      sh.bias = -0.0004
      sh.normalBias = 0.06
      sh.camera.updateProjectionMatrix()
    }
    if (moonRef.current) {
      moonRef.current.position.set(px - sunDir.x * 160, py - sunDir.y * 160, pz - sunDir.z * 160)
      moonRef.current.intensity = Math.max(0, -sunY) * 0.32 * nightness + 0.015
    }

    // === 环境/半球：压低基础值，让上面盖住的方块主要靠 shadowmap + ao_v 变暗 ===
    // 白天总环境(ambient 0.22 + hemi 0.28)≈0.5，夜晚≈0.13 能看清路，洞穴再叠 ao*0.55 就更黑
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.08 + brightness * 0.18
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.06 + brightness * 0.26
    }

    // 天空/雾颜色
    const base = new THREE.Color().copy(nightColor).lerp(dayColor, dayness)
    base.multiplyScalar(0.72 + brightness * 0.28)
    if (sunY > -0.25 && sunY < 0.35) {
      base.lerp(sunsetColor, horizonness * 0.55)
    }
    scene.background = base
    if (scene.fog) {
      ;(scene.fog as THREE.Fog).color.copy(base)
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.3} />
      <hemisphereLight ref={hemiRef} args={["#bcd8ff", "#544433", 0.35]} />
      <directionalLight
        ref={sunRef}
        castShadow={shadows}
        intensity={1}
        color="#fff3d6"
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={2}
        shadow-camera-far={320}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
      />
      <directionalLight ref={moonRef} intensity={0.15} color="#8fa8d8" />
    </>
  )
}
