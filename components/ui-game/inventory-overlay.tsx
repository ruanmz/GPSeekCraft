"use client"

import { useEffect, useRef, useState } from "react"
import { ItemIcon } from "./item-icon"
import { useGame, type SlotArea } from "@/lib/store"
import type { ItemStack } from "@/lib/save"

// 手机端长按手势：按住不动 450ms 视为右键点击（用于拆分堆叠）
function touchRightClick(fn: () => void) {
  return (e: React.TouchEvent) => {
    const t = e.touches[0]
    const sx = t.clientX, sy = t.clientY
    let cancelled = false
    let fired = false
    const move = (ev: TouchEvent) => {
      const c = ev.touches[0]
      if (Math.abs(c.clientX - sx) > 14 || Math.abs(c.clientY - sy) > 14) cancelled = true
    }
    const up = () => {
      if (!cancelled && !fired) { fired = true; fn() }
      cleanup()
    }
    const cleanup = () => {
      document.removeEventListener("touchmove", move)
      document.removeEventListener("touchend", up)
      document.removeEventListener("touchcancel", up)
      clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      if (!cancelled && !fired) { fired = true; fn(); cleanup() }
    }, 450)
    document.addEventListener("touchmove", move, { passive: true })
    document.addEventListener("touchend", up, { passive: true })
    document.addEventListener("touchcancel", up, { passive: true })
  }
}

function Slot({
  stack,
  area,
  index,
  size = 40,
  className = "",
}: {
  stack: ItemStack | null
  area: SlotArea
  index: number
  size?: number
  className?: string
}) {
  const clickSlot = useGame((s) => s.clickSlot)

  return (
    <div
      className={`mc-slot ${className}`}
      style={{ width: size, height: size }}
      onMouseDown={(e) => {
        e.preventDefault()
        const button = e.button === 2 ? "right" : "left"
        clickSlot(area, index, button, e.shiftKey)
      }}
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={touchRightClick(() => clickSlot(area, index, "right", false))}
    >
      {stack && (
        <>
          <ItemIcon id={stack.id} size={size - 4} />
          {stack.count > 1 && <span className="slot-count">{stack.count}</span>}
        </>
      )}
    </div>
  )
}

function CraftResultSlot({
  stack,
  size = 52,
}: {
  stack: ItemStack | null
  size?: number
}) {
  const clickSlot = useGame((s) => s.clickSlot)

  return (
    <div
      className="mc-slot mc-slot-result"
      style={{ width: size, height: size }}
      onMouseDown={(e) => {
        e.preventDefault()
        const button = e.button === 2 ? "right" : "left"
        clickSlot("craftResult", 0, button, e.shiftKey)
      }}
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={touchRightClick(() => clickSlot("craftResult", 0, "right", false))}
    >
      {stack && (
        <>
          <ItemIcon id={stack.id} size={size - 8} />
          {stack.count > 1 && <span className="slot-count">{stack.count}</span>}
        </>
      )}
    </div>
  )
}

function CursorLayer() {
  const cursor = useGame((s) => s.cursor)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY })
      })
    }
    window.addEventListener("mousemove", handle)
    return () => {
      window.removeEventListener("mousemove", handle)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!cursor) return null

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x - 20,
        top: pos.y - 20,
        width: 40,
        height: 40,
        pointerEvents: "none",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ItemIcon id={cursor.id} size={36} />
      {cursor.count > 1 && (
        <span
          className="slot-count"
          style={{
            position: "absolute",
            right: 2,
            bottom: 0,
          }}
        >
          {cursor.count}
        </span>
      )}
    </div>
  )
}

export function InventoryOverlay() {
  const overlay = useGame((s) => s.overlay)
  const setOverlay = useGame((s) => s.setOverlay)
  const clearCraft = useGame((s) => s.clearCraft)
  const refreshCraftResult = useGame((s) => s.refreshCraftResult)

  const hotbar = useGame((s) => s.hotbar)
  const inventory = useGame((s) => s.inventory)
  const craftGrid = useGame((s) => s.craftGrid)
  const craftResult = useGame((s) => s.craftResult)

  const isOpen = overlay === "inventory" || overlay === "crafting"
  const isWorkbench = overlay === "crafting"
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    refreshCraftResult()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "e" || e.key === "E") {
        e.preventDefault()
        clearCraft()
        setOverlay(null)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, setOverlay, clearCraft, refreshCraftResult])

  if (!isOpen) return null

  const handleClose = () => {
    clearCraft()
    setOverlay(null)
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          background: "rgba(0,0,0,0.5)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        <div
          ref={panelRef}
          className="mc-panel"
          style={{
            width: "fit-content",
            minWidth: 410,
            padding: 16,
            position: "relative",
            userSelect: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 随身合成区 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              marginBottom: 16,
            }}
          >
            {/* 3x3 合成网格 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${isWorkbench ? 3 : 2}, 44px)`,
                gridTemplateRows: `repeat(${isWorkbench ? 3 : 2}, 44px)`,
                gap: 2,
              }}
            >
              {(isWorkbench
                ? Array.from({ length: 9 }, (_, i) => i)
                : [0, 1, 3, 4] // 2×2 随身合成对应 3×3 网格的左上 2×2 角
              ).map((i) => (
                <Slot
                  key={i}
                  area="craft"
                  index={i}
                  stack={craftGrid[i]}
                  size={44}
                />
              ))}
            </div>

            {/* 箭头 */}
            <svg width="32" height="32" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
              <path
                d="M4 16 L24 16 M18 10 L26 16 L18 22"
                stroke="#8b8b8b"
                strokeWidth="3"
                fill="none"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>

            {/* 输出格 */}
            <CraftResultSlot stack={craftResult} size={52} />
          </div>

          {/* 3x9 背包主栏 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(9, 40px)",
              gridTemplateRows: "repeat(3, 40px)",
              gap: 2,
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {Array.from({ length: 27 }, (_, i) => (
              <Slot
                key={`inv-${i}`}
                area="inventory"
                index={i}
                stack={inventory[i]}
              />
            ))}
          </div>

          {/* 分割线 */}
          <div
            style={{
              height: 2,
              background: "#373737",
              margin: "8px 4px 12px 4px",
              borderRadius: 1,
            }}
          />

          {/* 1x9 hotbar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(9, 40px)",
              gap: 2,
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <Slot
                key={`hb-${i}`}
                area="hotbar"
                index={i}
                stack={hotbar[i]}
              />
            ))}
          </div>

          {/* 关闭按钮 */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              className="mc-btn"
              onClick={handleClose}
              style={{ padding: "6px 24px" }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
      <CursorLayer />
    </>
  )
}
