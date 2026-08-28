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
        if (player.headUnderWater) {
          el.style.opacity = "1"
          // 头在岩浆里时用橙红色滤镜，水里用蓝色
          el.style.background = player.headInLava
            ? "rgba(200, 60, 20, 0.55)"
            : "rgba(40, 80, 180, 0.35)"
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
        zIndex: 20,
        opacity: 0,
        transition: "opacity 0.3s ease",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    />
  )
}
