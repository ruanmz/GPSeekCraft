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
  const progressWidth = Math.max(0, Math.min(24, 24 * furnace.progress))

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="mc-panel relative"
        style={{ width: 380, height: 300, padding: 16 }}
      >
        <div className="relative" style={{ width: "100%", height: "100%" }}>
          <div className="absolute left-[30px] top-[20px]">
            <FurnaceSlot
              stack={furnace.input}
              size={52}
              onClick={(e) => furnaceClickSlot("input", e.button === 2 ? "right" : "left", e.shiftKey)}
            />
          </div>

          <div className="absolute left-[30px] top-[86px]">
            <FurnaceSlot
              stack={furnace.fuel}
              size={52}
              onClick={(e) => furnaceClickSlot("fuel", e.button === 2 ? "right" : "left", e.shiftKey)}
            />
          </div>

          <div className="absolute left-[124px] top-[96px]" style={{ width: 24, height: 18 }}>
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

          <div className="absolute left-[102px] top-[36px]" style={{ width: 24, height: 16 }}>
            <svg width="24" height="16" viewBox="0 0 24 16" style={{ display: "block", imageRendering: "pixelated" }}>
              <rect x="0" y="0" width="24" height="16" fill="#373737" />
              <rect
                x={0}
                y={0}
                width={progressWidth}
                height={16}
                fill="url(#arrowGrad)"
                style={{ imageRendering: "pixelated" }}
              />
              <defs>
                <linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#C0C0C0" />
                  <stop offset="100%" stopColor="#FFD700" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="absolute left-[196px] top-[18px]">
            <FurnaceSlot
              stack={furnace.output}
              size={56}
              onClick={(e) => furnaceClickSlot("output", e.button === 2 ? "right" : "left", e.shiftKey)}
            />
          </div>

          <div
            className="absolute left-0 grid gap-[2px]"
            style={{
              top: 150,
              gridTemplateColumns: "repeat(9, 40px)",
              padding: "4px 10px",
            }}
          >
            {inventory.map((stack, i) => (
              <InvSlot
                key={`inv-${i}`}
                stack={stack}
                size={40}
                onClick={(e) => clickSlot("inventory", i, e.button === 2 ? "right" : "left", e.shiftKey)}
              />
            ))}
          </div>

          <div
            className="absolute left-0 grid gap-[2px]"
            style={{
              top: 248,
              gridTemplateColumns: "repeat(9, 40px)",
              padding: "4px 10px",
            }}
          >
            {hotbar.map((stack, i) => (
              <InvSlot
                key={`hb-${i}`}
                stack={stack}
                size={40}
                selected={i === selectedHotbar}
                onClick={(e) => clickSlot("hotbar", i, e.button === 2 ? "right" : "left", e.shiftKey)}
              />
            ))}
          </div>

          <button
            className="mc-button absolute"
            style={{
              right: 16,
              bottom: 4,
              minHeight: 28,
              padding: "4px 14px",
              fontSize: 12,
            }}
            onClick={() => setOverlay(null)}
          >
            关闭
          </button>
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

