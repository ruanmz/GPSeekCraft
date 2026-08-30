"use client"

import { useEffect, useRef } from "react"
import { player } from "@/lib/player-ref"

export function FireOverlay() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const active = player.burningUntil > performance.now()
      if (ref.current) ref.current.style.opacity = active ? "1" : "0"
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={ref} className="fire-overlay" aria-hidden="true" />
}
