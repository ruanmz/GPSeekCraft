"use client"

import { useEffect, useRef, useState } from "react"
import { useGame } from "@/lib/store"
import { player, debugTarget } from "@/lib/player-ref"
import { BLOCK_DEFS } from "@/lib/blocks"

// 仿原版 Minecraft F3 调试面板。F3 键开关，约 5Hz 刷新数据（避免每帧重渲染）。
export function DebugOverlay() {
  const [visible, setVisible] = useState(false)
  const [info, setInfo] = useState<string[]>([])
  const screen = useGame((s) => s.screen)
  const world = useGame((s) => s.world)

  // F3 开关
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // 数据采集：fps 用 rAF 平滑，其余在 setInterval 里读 ref
  useEffect(() => {
    if (!visible) return
    let raf = 0
    let last = performance.now()
    let fps = 0
    const tick = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      if (dt > 0) fps = fps * 0.9 + (1 / dt) * 0.1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const build = () => {
      const p = player
      const w = world
      const lines: string[] = []
      const px = p.x
      const py = p.y
      const pz = p.z

      // 版本
      lines.push(`GPSeekCraft (TRAE × GPT 生成)`)
      // fps / 图形
      const mem = (performance as any).memory
      const memStr = mem
        ? `${(mem.usedJSHeapSize / 1048576).toFixed(1)}M/${(mem.totalJSHeapSize / 1048576).toFixed(1)}M`
        : "n/a"
      lines.push(`${fps.toFixed(0)} fps T: inf  fancy-clouds  B: 0  GPU: 0%`)
      lines.push(`Mem: ${memStr}`)

      // 区块统计
      const renderDistance = useGame.getState().settings.renderDistance
      const simDistance = useGame.getState().settings.simulationDistance
      const loaded = w ? w.loadedChunks().length : 0
      lines.push(`C: ${loaded} D: ${renderDistance}`)
      lines.push(`SD: ${simDistance}  E: 0  P: 0  T: 0`)

      // 维度
      lines.push(`minecraft:overworld  FC: 0`)

      // 坐标
      lines.push(`XYZ: ${px.toFixed(3)} / ${py.toFixed(3)} / ${pz.toFixed(3)}`)
      lines.push(`Block: ${Math.floor(px)} ${Math.floor(py)} ${Math.floor(pz)}`)
      const pcx = Math.floor(px / 16)
      const pcz = Math.floor(pz / 16)
      const inX = Math.floor(px - pcx * 16)
      const inZ = Math.floor(pz - pcz * 16)
      lines.push(`Chunk: ${inX} ${inZ} in ${pcx} ${pcz}`)

      // 朝向
      const fwd = {
        x: -Math.sin(p.yaw),
        z: -Math.cos(p.yaw),
      }
      let dir = "South (+Z)"
      if (Math.abs(fwd.x) < 0.4) dir = fwd.z < -0.4 ? "North (-Z)" : "South (+Z)"
      else if (Math.abs(fwd.z) < 0.4) dir = fwd.x > 0.4 ? "East (+X)" : "West (-X)"
      else dir = fwd.x > 0.4 ? (fwd.z > 0.4 ? "South East" : "North East") : fwd.z > 0.4 ? "South West" : "North West"
      lines.push(`Facing: ${dir} (${dir.split(" ")[0]}) (${(p.yaw * 180 / Math.PI).toFixed(1)} / ${(p.pitch * 180 / Math.PI).toFixed(1)})`)

      // 生态域
      if (w) {
        const biome = (w as any).gen?.getBiome?.(Math.floor(px), Math.floor(pz))
        lines.push(`Biome: ${biome ?? "plains"}`)
      }

      // 指向的方块
      if (debugTarget.block != null) {
        const def = BLOCK_DEFS[debugTarget.block]
        lines.push(`Targeted Block: ${def?.key ?? debugTarget.block}`)
      } else {
        lines.push(`Targeted Block: minecraft:air`)
      }

      setInfo(lines)
    }
    const iv = setInterval(build, 200)
    build()
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(iv)
    }
  }, [visible, world, screen])

  if (!visible || screen !== "playing") return null
  return (
    <div className="mc-debug">
      {info.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}
