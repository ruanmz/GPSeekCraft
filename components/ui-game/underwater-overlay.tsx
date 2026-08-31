"use client"

import { useEffect, useRef } from "react"
import { player } from "@/lib/player-ref"

export function UnderwaterOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const fireRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const el = overlayRef.current
      const fire = fireRef.current
      if (el) {
        if (player.headUnderLava) {
          el.style.opacity = "1"
          el.style.background = "rgba(180, 60, 20, 0.45)"
        } else if (player.headUnderWater) {
          el.style.opacity = "1"
          el.style.background = "rgba(40, 80, 180, 0.35)"
        } else {
          el.style.opacity = "0"
        }
      }
      if (fire) {
        const inner = fire.querySelector<HTMLElement>(".mc-fire-inner")
        if (player.fireLeft > 0) {
          fire.style.opacity = "1"
          if (inner) {
            // 剩余燃烧时间（0..5）映射到火焰高度
            const p = Math.min(1, player.fireLeft / 5)
            inner.style.height = `${16 + p * 40}%`
          }
        } else {
          fire.style.opacity = "0"
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 20,
          opacity: 0,
          transition: "opacity 0.3s ease",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
      <div
        ref={fireRef}
        className="mc-fire"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 25,
          opacity: 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <div className="mc-fire-inner" />
      </div>
    </>
  )
}
