"use client"

import { useEffect, useRef } from "react"
import { mobileInput } from "@/lib/player-ref"

/**
 * 移动端控制：
 *  - 左下角：虚拟摇杆（forward/strafe），死区 15%，外圈 88% 自动冲刺
 *  - 右下角动作群：
 *      · 跳跃（右下大圆 绿色）
 *      · 挖掘（右上大圆 紫色）— 长按持续挖
 *      · 放置（上中蓝小圆）— 按下上升沿放一块
 *      · 潜行（左下黄小圆）— 切换式
 *  - 屏幕空白处单指滑动：仅转视角（由 TouchLookHandler 负责，本组件不处理）
 */
export function MobileControls({ isTablet = false }: { isTablet?: boolean }) {
  const stickWrapRef = useRef<HTMLDivElement | null>(null)
  const stickKnobRef = useRef<HTMLDivElement | null>(null)
  const jumpRef = useRef<HTMLDivElement | null>(null)
  const mineRef = useRef<HTMLDivElement | null>(null)
  const sneakRef = useRef<HTMLDivElement | null>(null)
  const placeRef = useRef<HTMLDivElement | null>(null)

  // ===== 虚拟摇杆 =====
  useEffect(() => {
    const wrap = stickWrapRef.current
    if (!wrap) return
    let pointerId: number | null = null
    let cx = 0
    let cy = 0
    let radius = 0

    const updateOutput = (dx: number, dy: number) => {
      const len = Math.hypot(dx, dy)
      if (len < 0.001) {
        mobileInput.forward = 0
        mobileInput.strafe = 0
        mobileInput.sprint = false
        return
      }
      const t = Math.min(1, len / radius)
      const dead = 0.15
      const k = t < dead ? 0 : (t - dead) / (1 - dead)
      const nx = (dx / len) * k
      const ny = (dy / len) * k
      mobileInput.forward = -ny
      mobileInput.strafe = nx
      mobileInput.sprint = k >= 0.88
    }

    const resetKnob = () => {
      const knob = stickKnobRef.current
      if (knob) knob.style.transform = "translate(-50%, -50%)"
      updateOutput(0, 0)
    }

    const onDown = (e: PointerEvent) => {
      if (pointerId !== null) return
      // Safari iPad 18 防御：getBoundingClientRect、setPointerCapture、style 写都可能异常
      // 任何一处失败，也必须把 pointerId 赋值上 + 走 onMove，保证摇杆起码 fallback 工作
      try {
        const rect = wrap.getBoundingClientRect()
        cx = rect.left + rect.width / 2
        cy = rect.top + rect.height / 2
        radius = rect.width * 0.42
        // 用容器自身 capture，不要用 e.target（可能是子节点 / SVG 文本节点 / 已分离节点，会抛 InvalidStateError）
        // 失败直接忽略：没 capture 也没事，window pointermove 照样能接收
        try { wrap.setPointerCapture(e.pointerId) } catch {}
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[stick] onDown init failed, fallback:", err)
        // fallback：radius 兜底 42px（最小情况），cx/cy 按事件 clientX/Y 偏移估算
        radius = Math.max(42, (wrap.clientWidth || 140) * 0.42)
        cx = e.clientX
        cy = e.clientY
      }
      pointerId = e.pointerId
      try { onMove(e) } catch (_) { /* onMove 中 DOM/样式异常不影响输出值 */ }
    }
    const onMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return
      try {
        let dx = e.clientX - cx
        let dy = e.clientY - cy
        const len = Math.hypot(dx, dy)
        if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius }
        const knob = stickKnobRef.current
        if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
        updateOutput(e.clientX - cx, e.clientY - cy)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[stick] onMove failed:", err)
      }
    }
    const onUp = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return
      pointerId = null
      try { resetKnob() } catch (_) { /* DOM 异常兜底，至少把输入清零 */
        mobileInput.forward = 0
        mobileInput.strafe = 0
        mobileInput.sprint = false
      }
    }

    wrap.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      wrap.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      resetKnob()
    }
  }, [])

  // ===== 跳跃按钮 =====
  useEffect(() => {
    const el = jumpRef.current
    if (!el) return
    const press = (p: boolean) => { mobileInput.jump = p }
    const dn = (e: PointerEvent) => { press(true); try { el.setPointerCapture(e.pointerId) } catch {} e.preventDefault() }
    const up = () => press(false)
    el.addEventListener("pointerdown", dn)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", dn)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      up()
    }
  }, [])

  // ===== 挖掘按钮（长按持续挖）=====
  useEffect(() => {
    const el = mineRef.current
    if (!el) return
    const press = (p: boolean) => { mobileInput.minePressed = p }
    const dn = (e: PointerEvent) => { press(true); try { el.setPointerCapture(e.pointerId) } catch {} e.preventDefault() }
    const up = () => press(false)
    el.addEventListener("pointerdown", dn)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", dn)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      up()
    }
  }, [])

  // ===== 潜行按钮（切换式）=====
  useEffect(() => {
    const el = sneakRef.current
    if (!el) return
    let on = false
    const dn = (e: PointerEvent) => {
      on = !on
      mobileInput.sneak = on
      el.classList.toggle("is-on", on)
      e.preventDefault()
    }
    el.addEventListener("pointerdown", dn)
    return () => {
      el.removeEventListener("pointerdown", dn)
      mobileInput.sneak = false
    }
  }, [])

  // ===== 放置按钮（按下上升沿放一块，在 block-interaction 里判）=====
  useEffect(() => {
    const el = placeRef.current
    if (!el) return
    const dn = (e: PointerEvent) => { mobileInput.placePressed = true; try { el.setPointerCapture(e.pointerId) } catch {} e.preventDefault() }
    const up = () => { mobileInput.placePressed = false }
    el.addEventListener("pointerdown", dn)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", dn)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      up()
    }
  }, [])

  return (
    <div className={`mc-mobile ${isTablet ? "mc-tablet" : ""}`} aria-hidden>
      {/* 左下：摇杆 */}
      <div className="mc-stick" ref={stickWrapRef}>
        <div className="mc-stick-ring" />
        <div className="mc-stick-knob" ref={stickKnobRef} />
      </div>

      {/* 右下：动作按钮群 */}
      <div className="mc-action">
        {/* 放置（上中蓝色小圆） */}
        <div className="mc-btn mc-place" ref={placeRef} title="放置"><span>▣</span></div>
        {/* 挖掘（右上紫色大圆，长按） */}
        <div className="mc-btn mc-mine" ref={mineRef} title="挖掘"><span>⛏</span></div>
        {/* 潜行（左下黄色小圆，切换） */}
        <div className="mc-btn mc-sneak" ref={sneakRef} title="潜行"><span>⇩</span></div>
        {/* 跳跃（右下绿色大圆） */}
        <div className="mc-btn mc-jump" ref={jumpRef} title="跳跃"><span>⤒</span></div>
      </div>
    </div>
  )
}
