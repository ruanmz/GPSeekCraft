"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGame } from "@/lib/store"
import { player } from "@/lib/player-ref"
import { BLOCKS, isSolid } from "@/lib/blocks"
import { worldEvents, EV_BLOCK_CHANGE, EV_CHUNK_DIRTY } from "@/lib/emitter"
import { chunkKey } from "@/lib/world"
import { CHUNK_SIZE } from "@/lib/worldgen"
import { playSfx, placeTuneForBlock } from "@/lib/sound"

// 环境模拟：DIRT 随机 tick → GRASS（约 5 分钟均值）
// - 要求：1) dirt 顶面是空  2) 邻居 3x3 范围内有 grass/snow_grass
const TICK_INTERVAL = 2.0 // 每 2 秒一次 tick（省性能）
const SCAN_RADIUS_CHUNKS = 2 // 玩家周围多少 chunk 范围内扫
const SAMPLES_PER_CHUNK = 18 // 每个 chunk 每 tick 随机采样多少列
// 每次 tick 的单块尝试概率：均值 5 分钟 = 300 次 tick → 1/300 每次
const DIRT_TICK_PROB = 1 / 300

function hasGrassNeighbor(world: any, bx: number, by: number, bz: number): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue
      const n = world.getBlock(bx + dx, by, bz + dz)
      if (n === BLOCKS.GRASS || n === BLOCKS.SNOW_GRASS) return true
    }
  }
  return false
}

export function EnvironmentSim() {
  const tickAccumRef = useRef(0)
  const randRef = useRef(0)

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const world = useGame.getState().world
    if (!world || !player.ready) return

    tickAccumRef.current += dt
    if (tickAccumRef.current < TICK_INTERVAL) return
    tickAccumRef.current -= TICK_INTERVAL

    const pcx = Math.floor(player.x / CHUNK_SIZE)
    const pcz = Math.floor(player.z / CHUNK_SIZE)
    const R = SCAN_RADIUS_CHUNKS
    const dirtyChunks = new Set<string>()
    const changed: Array<{ x: number; y: number; z: number }> = []

    for (let ccx = pcx - R; ccx <= pcx + R; ccx++) {
      for (let ccz = pcz - R; ccz <= pcz + R; ccz++) {
        if (!world.hasChunk(ccx, ccz)) continue
        const baseX = ccx * CHUNK_SIZE
        const baseZ = ccz * CHUNK_SIZE

        // 每 chunk 随机采样 SAMPLES_PER_CHUNK 列，避免扫 256 列
        for (let s = 0; s < SAMPLES_PER_CHUNK; s++) {
          randRef.current = (randRef.current * 9301 + 49297) % 233280
          const r1 = randRef.current / 233280
          randRef.current = (randRef.current * 9301 + 49297) % 233280
          const r2 = randRef.current / 233280
          const lx = Math.min(CHUNK_SIZE - 1, Math.floor(r1 * CHUNK_SIZE))
          const lz = Math.min(CHUNK_SIZE - 1, Math.floor(r2 * CHUNK_SIZE))
          const wx = baseX + lx
          const wz = baseZ + lz

          // 找该列最高的实心方块（地面）
          const surfaceY = world.highestSolid(wx, wz)
          if (surfaceY < 1) continue
          const topId = world.getBlock(wx, surfaceY, wz)
          if (topId !== BLOCKS.DIRT) continue

          // 1) 顶面必须空（不是 solid）
          const aboveId = world.getBlock(wx, surfaceY + 1, wz)
          if (isSolid(aboveId ?? BLOCKS.AIR)) continue

          // 2) 邻居 3x3 内有 grass
          if (!hasGrassNeighbor(world, wx, surfaceY, wz)) continue

          // 3) 概率尝试
          randRef.current = (randRef.current * 9301 + 49297) % 233280
          if (randRef.current / 233280 > DIRT_TICK_PROB) continue

          // 雪原群系：顶面是雪 → 变 snow_grass（简单判断：y+1 是雪，或邻居里有 snow_grass 优先）
          let target = BLOCKS.GRASS
          for (let dx = -1; dx <= 1 && target === BLOCKS.GRASS; dx++) {
            for (let dz = -1; dz <= 1 && target === BLOCKS.GRASS; dz++) {
              if (world.getBlock(wx + dx, surfaceY, wz + dz) === BLOCKS.SNOW_GRASS) {
                target = BLOCKS.SNOW_GRASS
              }
            }
          }
          if (aboveId === BLOCKS.SNOW) target = BLOCKS.SNOW_GRASS

          const chunkDirties = world.setBlock(wx, surfaceY, wz, target) ?? []
          chunkDirties.forEach((k: string) => dirtyChunks.add(k))
          // 方块在 chunk 边界时联动
          const localBX = wx - baseX
          const localBZ = wz - baseZ
          if (localBX === 0) dirtyChunks.add(chunkKey(ccx - 1, ccz))
          if (localBX === CHUNK_SIZE - 1) dirtyChunks.add(chunkKey(ccx + 1, ccz))
          if (localBZ === 0) dirtyChunks.add(chunkKey(ccx, ccz - 1))
          if (localBZ === CHUNK_SIZE - 1) dirtyChunks.add(chunkKey(ccx, ccz + 1))

          changed.push({ x: wx, y: surfaceY, z: wz })
        }
      }
    }

    if (changed.length) {
      changed.forEach(({ x, y, z }) => {
        const id = world.getBlock(x, y, z) // 读一下实际写进去的（GRASS 或 SNOW_GRASS）
        worldEvents.emit(EV_BLOCK_CHANGE, { x, y, z, id })
      })
      if (dirtyChunks.size) worldEvents.emit(EV_CHUNK_DIRTY, [...dirtyChunks])

      // 给最近的那一块播一个轻"铺草"音（避免一次 tick 多个一起响）
      const first = changed[0]
      const tune = placeTuneForBlock(BLOCKS.GRASS)
      const camX = player.x
      const camZ = player.z
      const dx = first.x + 0.5 - camX
      const dz = first.z + 0.5 - camZ
      const dist = Math.hypot(dx, dz)
      const atten = Math.max(0.12, 1 - Math.min(1, dist / 8.0) * 0.9)
      playSfx("block_place", { volume: tune.volume * 0.35 * atten, pitch: tune.pitch * 1.02 })
    }
  })

  return null
}
