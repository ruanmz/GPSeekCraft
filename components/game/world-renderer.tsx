"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { ChunkMesh } from "./chunk-mesh"
import { useGame } from "@/lib/store"
import { CHUNK_SIZE } from "@/lib/worldgen"
import { chunkKey } from "@/lib/world"
import { worldEvents, EV_CHUNK_DIRTY } from "@/lib/emitter"

interface Loaded {
  cx: number
  cz: number
  rev: number
}

export function WorldRenderer() {
  const world = useGame((s) => s.world)
  const renderDistance = useGame((s) => s.settings.renderDistance)
  const { camera } = useThree()

  const loadedRef = useRef<Map<string, Loaded>>(new Map())
  const queueRef = useRef<{ cx: number; cz: number }[]>([])
  const lastChunkRef = useRef<string>("")
  const lastRDRef = useRef<number>(renderDistance)
  const [, forceRender] = useState(0)
  const bump = useCallback(() => forceRender((v) => v + 1), [])

  // 方块变动 -> 相关区块 rev++
  useEffect(() => {
    const off = worldEvents.on(EV_CHUNK_DIRTY, (payload) => {
      const keys = payload as string[]
      let changed = false
      for (const k of keys) {
        const rec = loadedRef.current.get(k)
        if (rec) {
          rec.rev++
          changed = true
        }
      }
      if (changed) bump()
    })
    return off
  }, [bump])

  // 世界切换时清空，并立即准备出生点区块，避免首帧黑屏
  useEffect(() => {
    loadedRef.current.clear()
    queueRef.current = []
    lastChunkRef.current = ""
    if (world) {
      const cx = 0
      const cz = 0
      world.ensureChunk(cx, cz)
      loadedRef.current.set(chunkKey(cx, cz), { cx, cz, rev: 0 })
    }
    bump()
  }, [world, bump])

  const recomputeDesired = useCallback(
    (pcx: number, pcz: number) => {
      if (!world) return
      const rd = renderDistance
      const desired = new Set<string>()
      const toQueue: { cx: number; cz: number; d: number }[] = []
      for (let dx = -rd; dx <= rd; dx++) {
        for (let dz = -rd; dz <= rd; dz++) {
          const cx = pcx + dx
          const cz = pcz + dz
          const key = chunkKey(cx, cz)
          desired.add(key)
          if (!loadedRef.current.has(key)) {
            toQueue.push({ cx, cz, d: dx * dx + dz * dz })
          }
        }
      }
      // 卸载超出范围的区块
      for (const key of Array.from(loadedRef.current.keys())) {
        if (!desired.has(key)) {
          loadedRef.current.delete(key)
          const [cx, cz] = key.split(",").map(Number)
          world.unloadChunk(cx, cz)
        }
      }
      // 由近及远排序生成队列
      toQueue.sort((a, b) => a.d - b.d)
      queueRef.current = toQueue.map(({ cx, cz }) => ({ cx, cz }))
      bump()
    },
    [world, renderDistance, bump],
  )

  useFrame(() => {
    if (!world) return
    const pcx = Math.floor(camera.position.x / CHUNK_SIZE)
    const pcz = Math.floor(camera.position.z / CHUNK_SIZE)
    const key = `${pcx},${pcz}`
    if (key !== lastChunkRef.current || lastRDRef.current !== renderDistance) {
      lastChunkRef.current = key
      lastRDRef.current = renderDistance
      recomputeDesired(pcx, pcz)
    }
    // 每帧生成少量区块，避免卡顿
    let budget = 1
    while (budget-- > 0 && queueRef.current.length > 0) {
      const { cx, cz } = queueRef.current.shift()!
      const k = chunkKey(cx, cz)
      if (loadedRef.current.has(k)) continue
      world.ensureChunk(cx, cz)
      loadedRef.current.set(k, { cx, cz, rev: 0 })
      forceRender((v) => v + 1)
    }
  })

  if (!world) return null

  return (
    <>
      {Array.from(loadedRef.current.values()).map((c) => (
        <ChunkMesh key={`${c.cx},${c.cz}`} world={world} cx={c.cx} cz={c.cz} rev={c.rev} />
      ))}
    </>
  )
}
