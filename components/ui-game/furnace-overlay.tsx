"use client"

import { useEffect, useState } from "react"
import { useGame } from "@/lib/store"
import { ItemIcon } from "@/components/ui-game/item-icon"
import type { ItemStack } from "@/lib/save"

function FurnaceSlot({
  stack,
  size = 52,
  onClick,
}: {
  stack: ItemStack | null
  size?: number
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className="mc-slot relative flex items-center justify-center cursor-pointer select-none"
      style={{ width: size, height: size }}
      onMouseDown={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {stack && (
        <>
          <div className="slot-icon" style={{ lineHeight: 0 }}>
            <ItemIcon id={stack.id} size={size - 12} />
          </div>
          {stack.count > 1 && (
            <span
              className="slot-count"
              style={{
                position: "absolute",
                left: 2,
                bottom: 0,
                fontSize: 14,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1,
                textShadow: "1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000",
                letterSpacing: "0.2px",
                whiteSpace: "nowrap",
              }}
            >
              {stack.count}
            </span>
          )}
        </>
      )}
    </div>
  )
}

function InvSlot({
  stack,
  size = 40,
  selected = false,
  onClick,
}: {
  stack: ItemStack | null
  size?: number
  selected?: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`mc-slot relative flex items-center justify-center cursor-pointer select-none ${selected ? "ring-2 ring-white" : ""}`}
      style={{ width: size, height: size }}
      onMouseDown={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {stack && (
        <>
          <div className="slot-icon" style={{ lineHeight: 0 }}>
            <ItemIcon id={stack.id} size={size - 10} />
          </div>
          {stack.count > 1 && (
            <span
              className="slot-count"
              style={{
                position: "absolute",
                left: 2,
                bottom: 0,
                fontSize: 12,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1,
                textShadow: "1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000",
                letterSpacing: "0.2px",
                whiteSpace: "nowrap",
              }}
            >
              {stack.count}
            </span>
          )}
        </>
      )}
    </div>
  )
}

export function FurnaceOverlay() {
  const setOverlay = useGame((s) => s.setOverlay)
  const overlay = useGame((s) => s.overlay)
  const furnace = useGame((s) => s.furnace)
  const hotbar = useGame((s) => s.hotbar)
  const inventory = useGame((s) => s.inventory)
  const cursor = useGame((s) => s.cursor)
  const selectedHotbar = useGame((s) => s.selectedHotbar)
  const clickSlot = useGame((s) => s.clickSlot)
  const furnaceClickSlot = useGame((s) => s.furnaceClickSlot)
  const tickFurnace = useGame((s) => s.tickFurnace)

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (overlay !== "furnace") return
    const interval = setInterval(() => {
      tickFurnace(1)
    }, 100)
    return () => clearInterval(interval)
  }, [overlay, tickFurnace])

  useEffect(() => {
    if (overlay !== "furnace") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "e") {
        setOverlay(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [overlay, setOverlay])

  useEffect(() => {
    if (overlay !== "furnace") return
    const onMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [overlay])

  const burnRatio = furnace.burnMax > 0 ? furnace.burnLeft / furnace.burnMax : 0
  const flameHeight = Math.max(0, Math.min(18, 18 * burnRatio))

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="mc-panel relative"
        style={{ width: 380, height: 360, padding: 16, overflow: "visible" }}
      >
        <button
          className="mc-btn-x"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            lineHeight: 1,
          }}
          onClick={() => setOverlay(null)}
          aria-label="关闭"
        >
          ✕
        </button>
        <div className="relative" style={{ width: "100%", height: "100%" }}>
          <div className="absolute" style={{ left: 20, top: 10 }}>
            <FurnaceSlot
              stack={furnace.input}
              size={52}
              onClick={(e) => furnaceClickSlot("input", e.button === 2 ? "right" : "left", e.shiftKey)}
            />
          </div>

          <div className="absolute" style={{ left: 20, top: 68 }}>
            <FurnaceSlot
              stack={furnace.fuel}
              size={52}
              onClick={(e) => furnaceClickSlot("fuel", e.button === 2 ? "right" : "left", e.shiftKey)}
            />
          </div>

          <div className="absolute" style={{ left: 88, top: 80, width: 24, height: 18 }}>
            <svg width="24" height="18" viewBox="0 0 24 18" style={{ display: "block", imageRendering: "pixelated" }}>
              <rect x="0" y="0" width="24" height="18" fill="#373737" />
              <rect
                x={0}
                y={18 - flameHeight}
                width={24}
                height={flameHeight}
                fill="url(#flameGrad)"
                style={{ imageRendering: "pixelated" }}
              />
              <defs>
                <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#FF4500" />
                  <stop offset="50%" stopColor="#FFA500" />
                  <stop offset="100%" stopColor="#FFE135" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 进度条 + 指向输出的箭头 */}
          <div className="absolute flex items-center" style={{ left: 88, top: 24 }}>
            <div style={{ width: 22, height: 16 }}>
              <svg width="22" height="16" viewBox="0 0 22 16" style={{ display: "block", imageRendering: "pixelated" }}>
                <rect x="0" y="0" width="22" height="16" fill="#373737" />
                <rect x={0} y={0} width={Math.max(0, Math.min(22, 22 * furnace.progress))} height={16} fill="#C0C0C0" style={{ imageRendering: "pixelated" }} />
              </svg>
            </div>
            <div style={{ width: 24, height: 16, marginLeft: 2 }}>
              <svg width="24" height="16" viewBox="0 0 24 16" style={{ display: "block", imageRendering: "pixelated" }}>
                {/* 箭头本体：始终画完整的灰色箭头 */}
                <path d="M3 5 L14 5 L14 1 L22 8 L14 15 L14 11 L3 11 Z" fill="#C0C0C0" />
                {/* 进度未到右侧部分用暗色盖掉，进度越大露出的箭头越多（从左到右点亮） */}
                <rect x={Math.max(0, Math.min(24, 24 * furnace.progress))} y="0" width={24 - Math.max(0, Math.min(24, 24 * furnace.progress))} height="16" fill="#373737" />
              </svg>
            </div>
          </div>

          <div className="absolute" style={{ left: 172, top: 8 }}>
            <FurnaceSlot
              stack={furnace.output}
              size={56}
              onClick={(e) => furnaceClickSlot("output", e.button === 2 ? "right" : "left", e.shiftKey)}
            />
          </div>

          <div
            className="absolute left-0 grid gap-[2px]"
            style={{
              top: 146,
              gridTemplateColumns: "repeat(9, 34px)",
              padding: "0 13px",
            }}
          >
            {inventory.map((stack, i) => (
              <InvSlot
                key={`inv-${i}`}
                stack={stack}
                size={34}
                onClick={(e) => clickSlot("inventory", i, e.button === 2 ? "right" : "left", e.shiftKey)}
              />
            ))}
          </div>

          <div
            className="absolute left-0 grid gap-[2px]"
            style={{
              top: 252,
              gridTemplateColumns: "repeat(9, 34px)",
              padding: "0 13px",
            }}
          >
            {hotbar.map((stack, i) => (
              <InvSlot
                key={`hb-${i}`}
                stack={stack}
                size={34}
                selected={i === selectedHotbar}
                onClick={(e) => clickSlot("hotbar", i, e.button === 2 ? "right" : "left", e.shiftKey)}
              />
            ))}
          </div>
        </div>
      </div>

      {cursor && (
        <div
          className="fixed pointer-events-none z-[60]"
          style={{
            left: mousePos.x - 16,
            top: mousePos.y - 16,
            width: 32,
            height: 32,
          }}
        >
          <ItemIcon id={cursor.id} size={32} />
          {cursor.count > 1 && (
            <span
              style={{
                position: "absolute",
                left: 2,
                bottom: -2,
                fontSize: 12,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1,
                textShadow: "1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000",
                letterSpacing: "0.2px",
                whiteSpace: "nowrap",
              }}
            >
              {cursor.count}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

