"use client"

import { useEffect } from "react"
import { mobileInput } from "@/lib/player-ref"

/**
 * 触屏只负责转视角（lookDx/lookDy）。
 * 挖掘/放置完全交给右下角的操作按钮。
 * 命中摇杆/动作按钮/物品栏等 UI 的 pointer 事件不拦截（交给控件自己处理）。
 */
export function TouchLookHandler() {
  useEffect(() => {
    let pointerId: number | null = null
    let lastX = 0
    let lastY = 0

    const isUiTarget = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false
      return !!t.closest(
        ".mc-stick, .mc-action, .hotbar, .overlay, .mc-button, .bars, .slot, .mc-mobile"
      )
    }

    const onDown = (e: PointerEvent) => {
      if (pointerId !== null) return
      // 鼠标右键/中键不处理；触屏/笔都处理
      if (e.pointerType === "mouse" && e.button !== 0) return
      if (isUiTarget(e.target)) return
      pointerId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      mobileInput.lookDx += dx
      mobileInput.lookDy += dy
    }

    const onUp = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return
      pointerId = null
    }

    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)

    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [])

  return null
}
