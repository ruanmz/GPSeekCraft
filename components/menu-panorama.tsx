"use client"

import { useEffect, useState } from "react"

const PANORAMA = Array.from({ length: 6 }, (_, index) =>
  `/assets/minecraft/textures/gui/title/background/panorama_${index}.png`,
)

export function MenuPanorama() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let frame = 0
    let started = performance.now()
    const animate = (now: number) => {
      setRotation(((now - started) / 1000) * 0.75)
      frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="mc-panorama" aria-hidden="true">
      <div className="mc-panorama-scene">
        <div className="mc-panorama-cube" style={{ transform: `rotateY(${rotation}deg) rotateX(-8deg)` }}>
          {PANORAMA.map((src, index) => (
            <img
              key={src}
              className={`mc-panorama-face mc-panorama-face-${index}`}
              src={src}
              alt=""
              draggable={false}
            />
          ))}
        </div>
      </div>
      <div className="mc-panorama-shade" />
    </div>
  )
}
