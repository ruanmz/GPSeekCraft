"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { EV_ITEM_DROP, worldEvents } from "@/lib/emitter"
import { getItem, type ItemId } from "@/lib/items"
import { player } from "@/lib/player-ref"
import { useGame } from "@/lib/store"
import { playSfx } from "@/lib/sound"
import { BLOCKS, isSolid, getBlock } from "@/lib/blocks"

const GRAVITY = 20
const TERMINAL_VY = -24
const PICK_RADIUS = 1.55
const ABSORB_DURATION = 0.1
const DESPAWN_SECONDS = 300
const PICKUP_COOLDOWN = 1.75

function createDropMaterial(id: ItemId, color: string) {
  const canvas = document.createElement("canvas")
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 16, 16)
  let seed = id * 9973
  for (let i = 0; i < 42; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const x = seed % 16
    seed = (seed * 1664525 + 1013904223) >>> 0
    const y = seed % 16
    const light = ((seed >>> 8) & 1) ? 18 : -18
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) + light))},${Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) + light))},${Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) + light))})`
    ctx.fillRect(x, y, 1, 1)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshLambertMaterial({ map: texture })
  material.userData.canvasTexture = texture
  return material
}

type Drop = {
  key: number
  id: ItemId
  count: number
  ox: number
  oy: number
  oz: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
  bouncing: boolean
  absorbing: boolean
  absorbT: number
}

export function ItemDrops() {
  const groupRef = useRef<THREE.Group>(null)
  const dropsRef = useRef<Drop[]>([])
  const meshMapRef = useRef<Map<number, THREE.Mesh>>(new Map())
  const nextKey = useRef(1)
  const addItem = useGame((s) => s.addItem)

  const materialCacheRef = useRef<Map<string, THREE.MeshLambertMaterial>>(new Map())
  const getMaterial = (id: ItemId, colorStr: string) => {
    const cacheKey = `${id}:${colorStr}`
    let m = materialCacheRef.current.get(cacheKey)
    if (!m) {
      m = createDropMaterial(id, colorStr)
      materialCacheRef.current.set(cacheKey, m)
    }
    return m
  }

  const sharedBox = useMemo(() => new THREE.BoxGeometry(0.22, 0.22, 0.22), [])

  const disposeDrop = (drop: Drop) => {
    const mesh = meshMapRef.current.get(drop.key)
    if (mesh) {
      if (mesh.parent) mesh.parent.remove(mesh)
      meshMapRef.current.delete(drop.key)
    }
  }

  const spawnDrop = (item: { id: ItemId; x: number; y: number; z: number; count?: number; vx?: number; vy?: number; vz?: number }) => {
    const key = nextKey.current++
    const drop: Drop = {
      key,
      id: item.id,
      count: item.count ?? 1,
      ox: item.x,
      oy: item.y,
      oz: item.z,
      x: item.x,
      y: item.y,
      z: item.z,
      vx: item.vx ?? (Math.random() - 0.5) * 0.3,
      vy: item.vy ?? (2.2 + Math.random() * 1.4),
      vz: item.vz ?? (Math.random() - 0.5) * 0.3,
      age: 0,
      bouncing: true,
      absorbing: false,
      absorbT: 0,
    }
    dropsRef.current.push(drop)
    const mat = getMaterial(item.id, getItem(item.id).color)
    const mesh = new THREE.Mesh(sharedBox, mat)
    mesh.position.set(drop.x, drop.y, drop.z)
    mesh.scale.setScalar(0.78)
    meshMapRef.current.set(key, mesh)
    if (groupRef.current) groupRef.current.add(mesh)
  }

  useEffect(() => {
    return worldEvents.on(EV_ITEM_DROP, (payload) => {
      spawnDrop(payload as { id: ItemId; x: number; y: number; z: number })
    })
  }, [])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const world = useGame.getState().world
    const playerX = player.x
    const playerY = player.y + 0.75
    const playerZ = player.z
    const PICK_R2 = PICK_RADIUS * PICK_RADIUS

    const drops = dropsRef.current
    if (!drops.length) return

    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i]

      if (drop.age >= DESPAWN_SECONDS) {
        disposeDrop(drop)
        drops.splice(i, 1)
        continue
      }
      drop.age += dt

      const mesh = meshMapRef.current.get(drop.key)
      if (!mesh) continue

      if (world) {
        const bx = Math.floor(drop.x)
        const by = Math.floor(drop.y)
        const bz = Math.floor(drop.z)
        if (
          (world.getBlock(bx, by, bz) ?? BLOCKS.AIR) === BLOCKS.LAVA ||
          (world.getBlock(bx, by - 1, bz) ?? BLOCKS.AIR) === BLOCKS.LAVA
        ) {
          disposeDrop(drop)
          drops.splice(i, 1)
          continue
        }
      }

      if (drop.absorbing) {
        drop.absorbT = Math.min(1, drop.absorbT + dt / ABSORB_DURATION)
        const t = easeOutCubic(drop.absorbT)
        const nx = drop.ox + (playerX - drop.ox) * t
        const ny = drop.oy + (playerY - drop.oy) * t
        const nz = drop.oz + (playerZ - drop.oz) * t
        mesh.position.set(nx, ny, nz)
        const sc = 0.8 + (1 - drop.absorbT) * 0.35
        mesh.scale.setScalar(sc)
        mesh.rotation.y += dt * 2.4
        if (drop.absorbT >= 1) {
          addItem(drop.id, drop.count)
          playSfx("pickup", { volume: 0.5, pitch: 0.96 + Math.random() * 0.12 })
          const name = drop.id < 100 ? getBlock(drop.id).name : getItem(drop.id).name
          useGame.getState().showToast(name)
          disposeDrop(drop)
          drops.splice(i, 1)
        }
        continue
      }

      // 水平移动（有简单的水平空气阻力：空中几乎不受力，落地后摩擦停下）
      let nx = drop.x + drop.vx * dt
      let nz = drop.z + drop.vz * dt
      // 简易水平实体 vs 方块碰撞：如果目标格被固体占，就不往那方向走，并清零轴速度
      if (world) {
        const bnx = Math.floor(nx)
        const bnz = Math.floor(nz)
        const curBy = Math.floor(drop.y)
        // X 轴
        const bTestX = world.getBlock(bnx, curBy, Math.floor(drop.z)) ?? BLOCKS.AIR
        if (isSolid(bTestX)) {
          nx = drop.x
          drop.vx = 0
        }
        // Z 轴
        const bTestZ = world.getBlock(Math.floor(nx), curBy, Math.floor(nz)) ?? BLOCKS.AIR
        if (isSolid(bTestZ)) {
          nz = drop.z
          drop.vz = 0
        }
      }
      drop.x = nx
      drop.z = nz

      drop.vy = Math.max(TERMINAL_VY, drop.vy - GRAVITY * dt)
      let ny = drop.y + drop.vy * dt

      if (world && drop.vy <= 0) {
        const bx = Math.floor(drop.x)
        const bz = Math.floor(drop.z)
        const floorIdx = Math.floor(ny - 0.0001)
        if (floorIdx >= 0) {
          const below = world.getBlock(bx, floorIdx, bz) ?? BLOCKS.AIR
          if (isSolid(below)) {
            const standY = (floorIdx + 1) + 0.11
            if (ny < standY) {
              ny = standY
              if (drop.bouncing && drop.vy < -0.6) {
                drop.vy = Math.min(-drop.vy * 0.38, 3.6)
                // 水平也稍微反弹 + 衰减
                drop.vx *= 0.55
                drop.vz *= 0.55
              } else {
                drop.vy = 0
                drop.bouncing = false
                // 落地后摩擦：把水平速度按比例阻尼到 0
                drop.vx *= 0.72
                drop.vz *= 0.72
                if (Math.abs(drop.vx) < 0.01) drop.vx = 0
                if (Math.abs(drop.vz) < 0.01) drop.vz = 0
              }
            }
          }
        }
      }
      drop.y = ny

      const dx = playerX - drop.x
      const dy = playerY - drop.y
      const dz = playerZ - drop.z
      if (drop.age >= PICKUP_COOLDOWN && dx * dx + dy * dy + dz * dz <= PICK_R2) {
        drop.absorbing = true
        drop.absorbT = 0
        drop.ox = drop.x
        drop.oy = drop.y
        drop.oz = drop.z
        drop.bouncing = false
      }

      const visualY = drop.absorbing ? drop.y : drop.y + Math.sin(drop.age * 3.3) * 0.04
      const scale = drop.absorbing ? 0.8 + (1 - drop.absorbT) * 0.35 : 0.78
      mesh.position.set(drop.x, visualY, drop.z)
      mesh.rotation.x = 0.3
      mesh.rotation.y = drop.age * 2.4
      mesh.rotation.z = 0.1
      mesh.scale.setScalar(scale)
    }
  })

  return <group ref={groupRef} />
}

function easeOutCubic(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return 1 - Math.pow(1 - t, 3)
}
