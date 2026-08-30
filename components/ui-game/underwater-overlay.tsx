"use client"

import { useEffect, useRef } from "react"
import { player } from "@/lib/player-ref"

export function UnderwaterOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const el = overlayRef.current
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
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2,
        opacity: 0,
        transition: "opacity 0.3s ease",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    />
  )
}
