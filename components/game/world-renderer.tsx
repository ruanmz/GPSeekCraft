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
  const simulationDistance = useGame((s) => s.settings.simulationDistance)
  const { camera } = useThree()

  const loadedRef = useRef<Map<string, Loaded>>(new Map())
  const pregenRef = useRef<Set<string>>(new Set()) // 已预生成数据（模拟距离内、渲染距离外）的区块
  const queueRef = useRef<{ cx: number; cz: number; render: boolean }[]>([])
  const lastChunkRef = useRef<string>("")
  const lastRDRef = useRef<number>(renderDistance)
  const lastSimRef = useRef<number>(simulationDistance)
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
    pregenRef.current.clear()
    queueRef.current = []
    lastChunkRef.current = ""
    if (world) {
      // loading 阶段已预生成的区块直接登记，进入游戏立即完整显示，且不会重新入队逐帧生成
      const rd = useGame.getState().settings.renderDistance
      const sim = useGame.getState().settings.simulationDistance
      const cover = Math.max(rd, sim)
      const cx = 0
      const cz = 0
      for (let dx = -cover; dx <= cover; dx++) {
        for (let dz = -cover; dz <= cover; dz++) {
          const k = chunkKey(cx + dx, cz + dz)
          if (!world.hasChunk(cx + dx, cz + dz)) continue
          if (Math.abs(dx) <= rd && Math.abs(dz) <= rd) {
            loadedRef.current.set(k, { cx: cx + dx, cz: cz + dz, rev: 0 })
          } else {
            pregenRef.current.add(k)
          }
        }
      }
      world.ensureChunk(cx, cz)
      if (!loadedRef.current.has(chunkKey(cx, cz))) {
        loadedRef.current.set(chunkKey(cx, cz), { cx, cz, rev: 0 })
      }
    }
    bump()
  }, [world, bump])

  const recomputeDesired = useCallback(
    (pcx: number, pcz: number) => {
      if (!world) return
      const rd = renderDistance
      const sim = Math.max(simulationDistance, rd) // 模拟距离至少覆盖渲染距离
      const desired = new Set<string>()
      const pregen = new Set<string>()
      const toQueue: { cx: number; cz: number; d: number; render: boolean }[] = []
      for (let dx = -rd; dx <= rd; dx++) {
        for (let dz = -rd; dz <= rd; dz++) {
          const cx = pcx + dx
          const cz = pcz + dz
          const key = chunkKey(cx, cz)
          desired.add(key)
          if (!loadedRef.current.has(key)) {
            toQueue.push({ cx, cz, d: dx * dx + dz * dz, render: true })
          }
        }
      }
      // 模拟距离：渲染距离之外先预生成区块数据（不渲染），走进时无需等生成
      for (let dx = -sim; dx <= sim; dx++) {
        for (let dz = -sim; dz <= sim; dz++) {
          if (Math.abs(dx) <= rd && Math.abs(dz) <= rd) continue
          const cx = pcx + dx
          const cz = pcz + dz
          const key = chunkKey(cx, cz)
          pregen.add(key)
          if (!pregenRef.current.has(key)) {
            toQueue.push({ cx, cz, d: dx * dx + dz * dz, render: false })
          }
        }
      }
      // 卸载超出渲染范围的区块
      for (const key of Array.from(loadedRef.current.keys())) {
        if (!desired.has(key)) {
          loadedRef.current.delete(key)
          const [cx, cz] = key.split(",").map(Number)
          world.unloadChunk(cx, cz)
        }
      }
      // 卸载超出模拟范围的预生成区块（进入渲染范围的保留数据，仅移除记录）
      for (const key of Array.from(pregenRef.current)) {
        if (!pregen.has(key)) {
          pregenRef.current.delete(key)
          if (!desired.has(key)) {
            const [cx, cz] = key.split(",").map(Number)
            world.unloadChunk(cx, cz)
          }
        }
      }
      // 由近及远排序；渲染项优先于预生成项
      toQueue.sort((a, b) => (Number(b.render) - Number(a.render)) || a.d - b.d)
      queueRef.current = toQueue.map(({ cx, cz, render }) => ({ cx, cz, render }))
      bump()
    },
    [world, renderDistance, simulationDistance, bump],
  )

  useFrame(() => {
    if (!world) return
    const pcx = Math.floor(camera.position.x / CHUNK_SIZE)
    const pcz = Math.floor(camera.position.z / CHUNK_SIZE)
    const key = `${pcx},${pcz}`
    if (key !== lastChunkRef.current || lastRDRef.current !== renderDistance || lastSimRef.current !== simulationDistance) {
      lastChunkRef.current = key
      lastRDRef.current = renderDistance
      lastSimRef.current = simulationDistance
      recomputeDesired(pcx, pcz)
    }
    // 每帧生成少量区块，避免卡顿；渲染项优先
    let budget = 1
    while (budget-- > 0 && queueRef.current.length > 0) {
      const { cx, cz, render } = queueRef.current.shift()!
      const k = chunkKey(cx, cz)
      if (render) {
        if (loadedRef.current.has(k)) continue
        // eslint-disable-next-line no-console
        console.log(`[IN-GAME-LOAD] render-chunk (${cx},${cz}) playerChunk=${pcx},${pcz}`)
        world.ensureChunk(cx, cz)
        loadedRef.current.set(k, { cx, cz, rev: 0 })
        forceRender((v) => v + 1)
      } else {
        if (pregenRef.current.has(k)) continue
        // eslint-disable-next-line no-console
        console.log(`[IN-GAME-LOAD] pregen-chunk (${cx},${cz}) playerChunk=${pcx},${pcz}`)
        world.ensureChunk(cx, cz)
        pregenRef.current.add(k)
      }
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
