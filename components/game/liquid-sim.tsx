"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGame } from "@/lib/store"
import { player } from "@/lib/player-ref"
import { BLOCKS, isSolid } from "@/lib/blocks"
import { worldEvents, EV_BLOCK_CHANGE, EV_CHUNK_DIRTY } from "@/lib/emitter"
import { chunkKey } from "@/lib/world"
import { CHUNK_SIZE } from "@/lib/worldgen"

const TICK_INTERVAL = 0.4
const SCAN_RADIUS = 2
const MAX_FLOW_PER_TICK = 80

type FlowOp = { x: number; y: number; z: number; id: number }

export function LiquidSim() {
  const tickAccum = useRef(0)

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

    const ops: FlowOp[] = []
    const dirtyChunks = new Set<string>()

    for (let ccx = pcx - R; ccx <= pcx + R; ccx++) {
      for (let ccz = pcz - R; ccz <= pcz + R; ccz++) {
        if (!world.hasChunk(ccx, ccz)) continue
        const baseX = ccx * CHUNK_SIZE
        const baseZ = ccz * CHUNK_SIZE

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const wx = baseX + lx
            const wz = baseZ + lz

            for (let y = 0; y < 64; y++) {
              const block = world.getBlock(wx, y, wz)
              if (block !== BLOCKS.WATER && block !== BLOCKS.LAVA) continue

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
          }
        }
      }
    }

    let count = 0
    for (const op of ops) {
      if (count >= MAX_FLOW_PER_TICK) break
      const cur = world.getBlock(op.x, op.y, op.z)
      if (cur !== BLOCKS.AIR) continue
      const dirty = world.setBlock(op.x, op.y, op.z, op.id, false) ?? []
      dirty.forEach((k) => dirtyChunks.add(k))
      const cx = Math.floor(op.x / CHUNK_SIZE)
      const cz = Math.floor(op.z / CHUNK_SIZE)
      if (op.x === cx * CHUNK_SIZE) dirtyChunks.add(chunkKey(cx - 1, cz))
      if (op.x === (cx + 1) * CHUNK_SIZE - 1) dirtyChunks.add(chunkKey(cx + 1, cz))
      if (op.z === cz * CHUNK_SIZE) dirtyChunks.add(chunkKey(cx, cz - 1))
      if (op.z === (cz + 1) * CHUNK_SIZE - 1) dirtyChunks.add(chunkKey(cx, cz + 1))
      worldEvents.emit(EV_BLOCK_CHANGE, { x: op.x, y: op.y, z: op.z, id: op.id })
      count++
    }

    if (dirtyChunks.size) worldEvents.emit(EV_CHUNK_DIRTY, [...dirtyChunks])
  })

  return null
}
