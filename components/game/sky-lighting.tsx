"use client"

import { useRef } from "react"
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
  const { scene } = useThree()
  const timeRef = useRef(useGame.getState().worldTime)
  const storeSync = useRef(0)

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

    // 先计算昼夜亮度，再交给太阳/月光和环境光使用。
    const dayness = THREE.MathUtils.smoothstep(sunY, -0.2, 0.35)
    const nightness = 1 - dayness
    const brightness = 0.18 + dayness * 0.82
    const horizonness = 1 - Math.min(1, Math.abs(sunY) * 3)

    if (sunRef.current) {
      sunRef.current.position.set(sunX * 100, 100 + sunY * 100, sunZ * 100)
      sunRef.current.target.position.set(0, 0, 0)
      sunRef.current.target.updateMatrixWorld()
      sunRef.current.intensity = Math.max(0, sunY) * 1.05 * brightness + 0.01
    }
    if (moonRef.current) {
      moonRef.current.position.set(-sunX * 100, -sunY * 100, -sunZ * 100)
      moonRef.current.intensity = Math.max(0, -sunY) * 0.32 * nightness + 0.015
    }

    // 亮度系统：以太阳高度计算昼夜亮度，并保留月光/洞穴的最低可见度。

    if (ambientRef.current) {
      ambientRef.current.intensity = 0.12 + brightness * 0.32
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.1 + brightness * 0.28
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
      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} args={["#bcd8ff", "#544433", 0.4]} />
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={1}
        color="#fff3d6"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={2}
        shadow-camera-far={120}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.0001}
        shadow-normalBias={0.012}
      />
      <directionalLight ref={moonRef} intensity={0.15} color="#8fa8d8" />
    </>
  )
}
