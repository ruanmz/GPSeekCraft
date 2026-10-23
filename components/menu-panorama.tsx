"use client"

import { useEffect, useState } from "react"

const PANORAMA = Array.from({ length: 6 }, (_, index) =>
  `/assets/minecraft/textures/gui/title/background/panorama_${index}.png`,
)

export function MenuPanorama() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % PANORAMA.length)
    }, 5200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="mc-panorama" aria-label="Minecraft 1.21.8 世界预览">
      <div className="mc-panorama-viewport">
        {PANORAMA.map((src, index) => (
          <img
            key={src}
            className={`mc-panorama-image ${index === active ? "is-active" : ""}`}
            src={src}
            alt={`1.21.8 世界预览 ${index + 1}`}
            draggable={false}
          />
        ))}
        <div className="mc-panorama-shade" />
        <div className="mc-panorama-label">
          <span>1.21.8</span>
          <strong>探索方块世界</strong>
        </div>
      </div>
      <div className="mc-panorama-dots" aria-label="预览图片切换">
        {PANORAMA.map((src, index) => (
          <button
            key={src}
            type="button"
            className={`mc-panorama-dot ${index === active ? "is-active" : ""}`}
            aria-label={`查看预览 ${index + 1}`}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  )
}
