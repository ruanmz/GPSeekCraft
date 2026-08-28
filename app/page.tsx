"use client"

import { useEffect, useRef, useState } from "react"
import { GameScene } from "@/components/game/game-scene"
import { useGame, type GameMode } from "@/lib/store"
import { ItemIcon } from "@/components/ui-game/item-icon"
import { MobileControls } from "@/components/ui-game/mobile-controls"
import { TouchLookHandler } from "@/components/ui-game/touch-look-handler"
import { detectMobileMode } from "@/lib/player-ref"
import { InventoryOverlay } from "@/components/ui-game/inventory-overlay"
import { FurnaceOverlay } from "@/components/ui-game/furnace-overlay"
import { ItemToast } from "@/components/ui-game/toast"
import { UnderwaterOverlay } from "@/components/ui-game/underwater-overlay"
import { getBlock } from "@/lib/blocks"
import { getItem } from "@/lib/items"

function getBlockName(id: number) { return getBlock(id).name }
function getItemName(id: number) { return getItem(id).name }

// iOS Safari 上 click 事件可能被吞（只有 :active 视觉反馈，不触发 React onClick）。
// 用 pointerdown 兜底：触摸时立即触发，并设置 flag 阻止后续 click 重复触发。
// PC 鼠标点击仍走 onClick（pointerType === "mouse" 时 pointerdown 不兜底）。
// 注：该工厂函数返回带“去重”能力的事件处理器集合，调用方需自己持有一个 pointerFiredRef
// （ref 必须跨 render 稳定，因此挂到组件实例上，不能在 map 里动态创建）。
function makeTouchSafeHandlers(pointerFiredRef: React.MutableRefObject<boolean>) {
  return (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return
      pointerFiredRef.current = true
      fn()
    },
    onClick: () => {
      if (pointerFiredRef.current) {
        pointerFiredRef.current = false
        return
      }
      fn()
    },
  })
}

function Menu() {
  const initWorld = useGame((s) => s.initWorld)
  const setScreen = useGame((s) => s.setScreen)
  const [seed, setSeed] = useState(20260826)
  const [mode, setMode] = useState<GameMode>("survival")

  const start = () => {
    try {
      initWorld(seed, mode)
    } catch (err) {
      console.error("[initWorld] failed, still transition to playing screen so error is visible:", err)
    }
    setScreen("playing")
  }

  const pointerFiredRef = useRef(false)
  const makeHandlers = makeTouchSafeHandlers(pointerFiredRef)

  return (
    <main className="mc-menu">
      <div className="mc-logo">VOXELCRAFT</div>
      <p className="mc-subtitle">浏览器体素沙盒</p>
      <section className="mc-menu-panel" aria-label="主菜单">
        <button className="mc-button mc-wide" {...makeHandlers(start)}>开始游戏</button>
        <div className="mc-row">
          <label className="mc-field">种子<input value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} /></label>
          <button className="mc-button" {...makeHandlers(() => setMode(mode === "survival" ? "creative" : "survival"))}>
            {mode === "survival" ? "生存模式" : "创造模式"}
          </button>
        </div>
        <p className="mc-hint">WASD 移动 · 空格跳跃 · 左键挖掘 · 右键放置 · E 背包 · ESC 暂停</p>
      </section>
    </main>
  )
}

function Game() {
  const screen = useGame((s) => s.screen)
  const setScreen = useGame((s) => s.setScreen)
  const overlay = useGame((s) => s.overlay)
  const setOverlay = useGame((s) => s.setOverlay)
  const health = useGame((s) => s.health)
  const hunger = useGame((s) => s.hunger)
  const hotbar = useGame((s) => s.hotbar)
  const selected = useGame((s) => s.selectedHotbar)
  const selectHotbar = useGame((s) => s.selectHotbar)

  const [mobileInfo, setMobileInfo] = useState<{ isMobile: boolean; isTablet: boolean; force: boolean }>({
    isMobile: false, isTablet: false, force: false,
  })
  useEffect(() => {
    const update = () => setMobileInfo(detectMobileMode())
    update()
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])
  const { isMobile, isTablet } = mobileInfo

  // hotbar 选中格切换：复用和主菜单同样的 touch-safe 事件包装
  const hotbarPointerRef = useRef(false)
  const makeHandlers = makeTouchSafeHandlers(hotbarPointerRef)

  const dropSelected = useGame((s) => s.dropSelected)
  const dropSlot = useGame((s) => s.dropSlot)
  const showToast = useGame((s) => s.showToast)
  // 每个 hotbar 槽位的长按定时器 + 长按是否已触发 的 ref，放在顶层（数量固定 9 个，用 useMemo 初始化一次即可）
  const slotLongTimers = useRef<Array<ReturnType<typeof setTimeout> | null>>([null, null, null, null, null, null, null, null, null])
  const slotLongFired = useRef<boolean[]>([false, false, false, false, false, false, false, false, false])

  useEffect(() => {
    if (screen !== "playing") return
    const onKey = (e: KeyboardEvent) => {
      // 任何 overlay（背包/暂停/熔炉等）打开时，阻止 Q 丢物和 E 切换背包
      if (!overlay) {
        const k = e.key.toLowerCase()
        if (k === "e") setOverlay("inventory")
        if (k === "q") {
          e.preventDefault()
          const n = e.ctrlKey || e.metaKey ? 64 : 1
          dropSelected(n)
        }
      } else {
        if (e.key === "Escape") setOverlay(null)
        if (e.key.toLowerCase() === "e" && overlay === "inventory") setOverlay(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [screen, overlay, setOverlay, dropSelected])

  if (screen !== "playing") return <Menu />
  return (
    <main
      className={`game-root ${isMobile ? (isTablet ? "is-tablet" : "is-phone") : "is-desktop"}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GameScene />
      <div className={`game-hud ${isMobile ? "is-mobile" : ""}`} aria-live="polite">
        <div className={`bars ${isMobile ? "top-left" : "center"}`}>
          <McHealthBar health={health} maxHealth={20} />
          <McHungerBar hunger={hunger} />
        </div>
        <div className="crosshair" aria-hidden>
          <span className="crosshair-v" />
          <span className="crosshair-h" />
        </div>
        <div className={`hotbar ${isMobile ? "mc-hotbar-mobile" : ""}`}>
          {hotbar.map((item, i) => {
            const h = makeHandlers(() => selectHotbar(i))
            return (
              <div
                className={`slot ${selected === i ? "selected" : ""}`}
                key={i}
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  // 先把 touch-safe 的 onPointerDown 跑掉（用于切换选中），再启动长按定时器
                  h.onPointerDown(e)
                  slotLongFired.current[i] = false
                  if (item) {
                    const name = item.id < 100 ? getBlockName(item.id) : getItemName(item.id)
                    showToast(name)
                  }
                  if (slotLongTimers.current[i]) clearTimeout(slotLongTimers.current[i]!)
                  slotLongTimers.current[i] = setTimeout(() => {
                    slotLongFired.current[i] = true
                    selectHotbar(i)
                    dropSlot("hotbar", i, 1)
                    // 触发一次轻微的震动反馈
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      try { (navigator as Navigator).vibrate?.(18) } catch (_) { /* noop */ }
                    }
                  }, 500)
                }}
                onPointerUp={(e) => {
                  if (slotLongTimers.current[i]) { clearTimeout(slotLongTimers.current[i]!); slotLongTimers.current[i] = null }
                  // 如果长按已经触发过 drop，就吞掉 onClick 避免随后再走 selectHotbar（切换选中）
                  if (slotLongFired.current[i]) {
                    slotLongFired.current[i] = false
                    e.stopPropagation()
                    return
                  }
                  h.onClick()
                }}
                onPointerLeave={() => {
                  if (slotLongTimers.current[i]) { clearTimeout(slotLongTimers.current[i]!); slotLongTimers.current[i] = null }
                }}
                onPointerCancel={() => {
                  if (slotLongTimers.current[i]) { clearTimeout(slotLongTimers.current[i]!); slotLongTimers.current[i] = null }
                }}
                onClick={(e) => {
                  // 仅 PC 鼠标路径需要这个：touch 路径会被 onPointerUp 里的 stopPropagation 拦截
                  if (slotLongFired.current[i]) {
                    slotLongFired.current[i] = false
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }}
              >
                {item ? (
                  <>
                    <div className="slot-icon"><ItemIcon id={item.id} size={isMobile ? (isTablet ? 48 : 40) : 44} /></div>
                    {item.count > 1 && <span className="slot-count">{item.count}</span>}
                  </>
                ) : null}
              </div>
            )
          })}
          {isMobile && (
            <button
              className="mc-hotbar-more"
              onClick={() => setOverlay("inventory")}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="打开背包"
              title="打开背包"
            >
              ⋯
            </button>
          )}
        </div>
        {isMobile && <MobileControls isTablet={isTablet} />}
        {isMobile && <TouchLookHandler />}
      </div>
      {overlay === "pause" && <div className="overlay"><h2>游戏菜单</h2><button className="mc-button" onClick={() => setOverlay(null)}>返回游戏</button><button className="mc-button" onClick={() => setScreen("menu")}>返回主菜单</button></div>}
      {overlay === "dead" && <DeathOverlay />}
      {overlay === "inventory" && <InventoryOverlay />}
      {overlay === "furnace" && <FurnaceOverlay />}
      <UnderwaterOverlay />
      <ItemToast />
    </main>
  )
}

// Minecraft 风格状态栏：生命使用心形，饥饿使用鸡腿；不复用物品栏的食物图标。
// 用内联 SVG（10 颗心横向平铺），每��颗分为左半+右半，支持"半颗"着色
function McHealthBar({ health, maxHealth = 20 }: { health: number; maxHealth?: number }) {
  const clamped = Math.max(0, Math.min(maxHealth, health))
  // 总共有 20 个"半心"单位
  const halfUnits = Math.round((clamped / maxHealth) * 20)
  const unitW = 13, unitH = 12, gap = 2
  const count = 10
  const totalW = count * unitW + (count - 1) * gap
  const stroke = "#1a1008"
  // 生成 10 颗心的 SVG path
  const hearts = Array.from({ length: count }).map((_, i) => {
    // 这颗心前半是否满血？后半是否满血？
    const idx = i * 2
    const leftFull = halfUnits >= idx + 1
    const rightFull = halfUnits >= idx + 2
    const ox = i * (unitW + gap)
    const oy = 0
    // 心形路径（13×12，纯像素感）
    return (
      <g key={`h-${i}`} transform={`translate(${ox} ${oy})`}>
        {/* 左半（深/浅红填充 + 高光小点） */}
        <path
          d="M1 2 L3 2 L3 1 L4 1 L4 2 L6 2 L6 4 L4 6 L4 9 L3 10 L1 8 Z"
          fill={leftFull ? "#d42a2a" : "#4a2020"}
          stroke={stroke}
          strokeWidth={1}
        />
        {/* 右半 */}
        <path
          d="M6 2 L8 2 L8 1 L9 1 L9 2 L11 2 L11 4 L9 6 L9 9 L8 10 L6 8 Z"
          fill={rightFull ? "#e83c3c" : "#3a1818"}
          stroke={stroke}
          strokeWidth={1}
        />
        {/* 高光 */}
        {leftFull && <rect x={2} y={3} width={1} height={1} fill="#ffb4b4" />}
        {rightFull && <rect x={7} y={3} width={1} height={1} fill="#ffc6c6" />}
      </g>
    )
  })
  return (
    <div className="mc-bar mc-bar-health" aria-label={`生命 ${Math.floor(clamped)}/${maxHealth}`}>
      <svg
        viewBox={`0 0 ${totalW} ${unitH}`}
        width={totalW * 2}
        height={unitH * 2}
        shapeRendering="crispEdges"
        style={{ imageRendering: "pixelated", display: "block" }}
      >
        {hearts}
      </svg>
    </div>
  )
}

function McHungerBar({ hunger, maxHunger = 20 }: { hunger: number; maxHunger?: number }) {
  const clamped = Math.max(0, Math.min(maxHunger, hunger))
  const halfUnits = Math.round((clamped / maxHunger) * 20)
  const unitW = 13, unitH = 12, gap = 2
  const count = 10
  const totalW = count * unitW + (count - 1) * gap
  const stroke = "#140b02"
  const diamonds = Array.from({ length: count }).map((_, i) => {
    const idx = i * 2
    const leftFull = halfUnits >= idx + 1
    const rightFull = halfUnits >= idx + 2
    const ox = i * (unitW + gap)
    const oy = 0
    // 饱和 ♦/🍗 风格用像素化的"熟猪排"(鸡腿形)：13x12
    // 这里统一画鸡腿形：左侧(骨头+肉)与右侧(肉) —— 每半边各自着色
    return (
      <g key={`fd-${i}`} transform={`translate(${ox} ${oy})`}>
        {/* 骨头：左 4 列（骨头色） */}
        <path
          d="M0 5 L3 5 L3 6 L1 6 L1 8 L3 8 L3 10 L2 10 L2 11 L4 11 L4 9 L5 9 L5 4 L4 4 L4 2 L3 2 L3 3 L2 3 L2 5 Z"
          fill={leftFull ? "#f3e5c4" : "#6e5a3a"}
          stroke={stroke}
          strokeWidth={1}
        />
        {/* 肉：右 8 列棕色；分左右半各 4 列作为"半颗单位"着色 */}
        <path
          d="M5 1 L9 1 L11 3 L12 6 L12 8 L11 10 L9 11 L5 11 Z"
          fill={rightFull ? "#b5651d" : "#4a2a0c"}
          stroke={stroke}
          strokeWidth={1}
        />
        {/* 左半肉 = 第1-2行的 5-8 列，作为半单位指示 */}
        <path
          d="M5 1 L7 1 L8 2 L8 10 L7 11 L5 11 Z"
          fill={leftFull ? "#c97524" : "#3d2209"}
          stroke="none"
        />
        {/* 高光小点 */}
        {leftFull && <rect x={6} y={3} width={1} height={1} fill="#f1b478" />}
        {rightFull && <rect x={10} y={5} width={1} height={1} fill="#f1b478" />}
      </g>
    )
  })
  return (
    <div className="mc-bar mc-bar-hunger" aria-label={`饥饿 ${Math.floor(clamped)}/${maxHunger}`}>
      <svg
        viewBox={`0 0 ${totalW} ${unitH}`}
        width={totalW * 2}
        height={unitH * 2}
        shapeRendering="crispEdges"
        style={{ imageRendering: "pixelated", display: "block" }}
      >
        {diamonds}
      </svg>
    </div>
  )
}

function DeathOverlay() {
  const respawn = useGame((s) => s.respawn)
  const setScreen = useGame((s) => s.setScreen)
  const setOverlay = useGame((s) => s.setOverlay)
  // 2s 内从 0 变暗到 0.88，营造慢慢黑下去的死亡动画
  const [t, setT] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const loop = (now: number) => {
      const k = Math.min(1, (now - start) / 2000)
      setT(k)
      if (k < 1) rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
  return (
    <div
      className="overlay"
      style={{
        background: `rgba(0,0,0,${0.1 + t * 0.78})`,
        color: "#fff",
        backdropFilter: "blur(1px)",
        WebkitBackdropFilter: "blur(1px)",
        animation: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h2 style={{ fontSize: 40, marginBottom: 8, color: "#ff6a6a", textShadow: "0 2px 0 #000" }}>你死了</h2>
      <p style={{ opacity: 0.75, marginBottom: 24 }}>已在死亡时保存进度（点击重生即可回到出生点）</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          className="mc-button"
          onClick={() => {
            setOverlay(null)
            queueMicrotask(() => respawn())
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          重生
        </button>
        <button
          className="mc-button"
          onClick={() => {
            respawn()
            setScreen("menu")
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          回到主菜单
        </button>
      </div>
    </div>
  )
}

export default function Page() { return <Game /> }
