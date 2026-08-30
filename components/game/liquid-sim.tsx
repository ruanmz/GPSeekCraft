"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGame } from "@/lib/store"
import { player } from "@/lib/player-ref"
import { BLOCKS, isSolid } from "@/lib/blocks"
import { worldEvents, EV_BLOCK_CHANGE, EV_CHUNK_DIRTY } from "@/lib/emitter"
import { chunkKey } from "@/lib/world"
import { CHUNK_SIZE, WORLD_HEIGHT } from "@/lib/worldgen"

const TICK_INTERVAL = 0.4
const SCAN_RADIUS = 1 // 只扫玩家周围 3×3 chunk（原 5×5）
const MAX_FLOW_PER_TICK = 48
// 攒够时间再统一触发一次网格重建，避免每次流动 tick 都重建整个 chunk
const DIRTY_EMIT_INTERVAL = 0.8

type FlowOp = { x: number; y: number; z: number; id: number }

export function LiquidSim() {
  const tickAccum = useRef(0)
  const dirtyAccum = useRef(0)
  const pendingDirty = useRef<Set<string>>(new Set())
  // 已知含液体的"列"（chunk 内列坐标）集合，只扫这些列，避免每 tick 全量扫 409600 格
  const liquidCols = useRef<Set<string>>(new Set())
  const seededFor = useRef<string>("")

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const world = useGame.getState().world
    if (!world || !player.ready) return

    tickAccum.current += dt
    if (tickAccum.current < TICK_INTERVAL) return
    tickAccum.current -= TICK_INTERVAL

    const pcx = Math.floor(player.x / CHUNK_SIZE)
    const pcz = Math.floor(player.z / CHUNK_SIZE)
    const R = SCAN_RADIUS
    const pck = `${pcx},${pcz}`

    // 首次 / 玩家跨 chunk 时：全量扫 3×3 建立"含液体的列"集合（合并，不清旧列）
    if (seededFor.current !== pck) {
      seededFor.current = pck
      for (let ccx = pcx - R; ccx <= pcx + R; ccx++) {
        for (let ccz = pcz - R; ccz <= pcz + R; ccz++) {
          if (!world.hasChunk(ccx, ccz)) continue
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
              for (let y = 0; y < WORLD_HEIGHT; y++) {
                const b = world.getBlock(ccx * CHUNK_SIZE + lx, y, ccz * CHUNK_SIZE + lz)
                if (b === BLOCKS.WATER || b === BLOCKS.LAVA) {
                  liquidCols.current.add(`${ccx}|${ccz}|${lx}|${lz}`)
                  break
                }
              }
            }
          }
        }
      }
    }

    const ops: FlowOp[] = []
    const stillLiquid = new Set<string>()

    for (const colKey of Array.from(liquidCols.current)) {
      const [ccx, ccz, lx, lz] = colKey.split("|").map(Number)
      const wx = ccx * CHUNK_SIZE + lx
      const wz = ccz * CHUNK_SIZE + lz
      let found = false
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const block = world.getBlock(wx, y, wz)
        if (block !== BLOCKS.WATER && block !== BLOCKS.LAVA) continue
        found = true
        const below = world.getBlock(wx, y - 1, wz)
        if (below === BLOCKS.AIR) {
          ops.push({ x: wx, y: y - 1, z: wz, id: block })
          continue
        }
        if (isSolid(below) || below === block) {
          const neighbors: [number, number, number][] = [
            [wx + 1, y, wz], [wx - 1, y, wz],
            [wx, y, wz + 1], [wx, y, wz - 1],
          ]
          for (const [nx, ny, nz] of neighbors) {
            const nBlock = world.getBlock(nx, ny, nz)
            if (nBlock !== BLOCKS.AIR) continue
            const nBelow = world.getBlock(nx, ny - 1, nz)
            if (isSolid(nBelow) || nBelow === block) {
              ops.push({ x: nx, y: ny, z: nz, id: block })
            }
          }
        }
      }
      if (found) stillLiquid.add(colKey)
    }

    let count = 0
    for (const op of ops) {
      if (count >= MAX_FLOW_PER_TICK) break
      const cur = world.getBlock(op.x, op.y, op.z)
      if (cur !== BLOCKS.AIR) continue
      const dirty = world.setBlock(op.x, op.y, op.z, op.id, false) ?? []
      dirty.forEach((k) => pendingDirty.current.add(k))
      const cx = Math.floor(op.x / CHUNK_SIZE)
      const cz = Math.floor(op.z / CHUNK_SIZE)
      if (op.x === cx * CHUNK_SIZE) pendingDirty.current.add(chunkKey(cx - 1, cz))
      if (op.x === (cx + 1) * CHUNK_SIZE - 1) pendingDirty.current.add(chunkKey(cx + 1, cz))
      if (op.z === cz * CHUNK_SIZE) pendingDirty.current.add(chunkKey(cx, cz - 1))
      if (op.z === (cz + 1) * CHUNK_SIZE - 1) pendingDirty.current.add(chunkKey(cx, cz + 1))
      // 新产生液体的列加入跟踪
      const ncx = Math.floor(op.x / CHUNK_SIZE)
      const ncz = Math.floor(op.z / CHUNK_SIZE)
      liquidCols.current.add(`${ncx}|${ncz}|${op.x - ncx * CHUNK_SIZE}|${op.z - ncz * CHUNK_SIZE}`)
      worldEvents.emit(EV_BLOCK_CHANGE, { x: op.x, y: op.y, z: op.z, id: op.id })
      count++
    }

    // 移除已不含液体的列（流动收敛后自动停止扫描）
    for (const k of Array.from(liquidCols.current)) {
      if (!stillLiquid.has(k)) liquidCols.current.delete(k)
    }

    // 攒够时间再统一触发一次重建
    if (pendingDirty.current.size) {
      dirtyAccum.current += TICK_INTERVAL
      if (dirtyAccum.current >= DIRTY_EMIT_INTERVAL) {
        worldEvents.emit(EV_CHUNK_DIRTY, [...pendingDirty.current])
        pendingDirty.current.clear()
        dirtyAccum.current = 0
      }
    } else {
      dirtyAccum.current = 0
    }
  })

  return null
}
