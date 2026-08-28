"use client"
import { useGame } from "@/lib/store"

export function ItemToast() {
  const toast = useGame(s => s.toast)
  if (!toast) return null

  return (
    <div
      key={toast.id}
      style={{
        position: "absolute",
        bottom: "160px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.72)",
        color: "#ffffff",
        padding: "8px 16px",
        borderRadius: 6,
        fontSize: 15,
        pointerEvents: "none",
        zIndex: 9999,
        textShadow: "1px 1px 2px #000",
        whiteSpace: "nowrap",
        animation: "toastFadeIn 180ms ease-out",
      }}
    >
      {toast.name}
    </div>
  )
}
