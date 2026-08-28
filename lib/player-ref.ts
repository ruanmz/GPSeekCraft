// 玩家运行时状态（非响应式，跨组件共享，逐帧读写以保证性能）
export interface PlayerRuntime {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  vx: number
  vy: number
  vz: number
  onGround: boolean
  inWater: boolean
  headUnderWater: boolean
  headUnderLava: boolean
  sprinting: boolean
  sneaking: boolean
  // 上一帧脚下方块，用于摔落伤害计算
  fallStartY: number
  ready: boolean
}

export const player: PlayerRuntime = {
  x: 0,
  y: 40,
  z: 0,
  yaw: 0,
  pitch: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  onGround: false,
  inWater: false,
  headUnderWater: false,
  headUnderLava: false,
  sprinting: false,
  sneaking: false,
  fallStartY: 40,
  ready: false,
}

// 移动端输入：由 UI 组件写，player-controller 每帧读取
// - forward/strafe: -1..1 归一化摇杆输出（与键盘 W/S/A/D 语义一致：forward += 1 表示 W）
// - jump: true 表示按下跳跃键
// - sprint: true 表示冲刺（可做独立按钮或摇杆外推自动触发）
export interface MobileInput {
  forward: number
  strafe: number
  jump: boolean
  sprint: boolean
  sneak: boolean
  // 视角拖动（触屏 swipe）
  lookDx: number
  lookDy: number
  // 挖掘/放置（触屏点按）
  minePressed: boolean
  placePressed: boolean
  consumeLook: () => void // 读完清零 lookDx/lookDy
}

function makeMobileInput(): MobileInput {
  let dx = 0
  let dy = 0
  return {
    forward: 0,
    strafe: 0,
    jump: false,
    sprint: false,
    sneak: false,
    get lookDx() { return dx },
    set lookDx(v: number) { dx = v },
    get lookDy() { return dy },
    set lookDy(v: number) { dy = v },
    minePressed: false,
    placePressed: false,
    consumeLook() { dx = 0; dy = 0 },
  }
}

export const mobileInput: MobileInput = makeMobileInput()

/** 移动端模式检测：
 *   1. URL ?phone=1 | ?phone=true | hash #phone → 强制手机（debug 机制，不检测设备）
 *   2. 否则 触屏 + (移动端 UA 或 iPadOS Mac+Touch 或 窄屏) → 自动漫
 *   3. 否则 PC
 *   手机/平板统一启用移动端 UI，只在尺寸上做断点适配（摇杆/按钮大小）
 *
 *   注意：iPadOS 13+ 的 Safari UA 伪装成 Macintosh，不再包含 "iPad" 字样。
 *   需要用 navigator.maxTouchPoints > 1 来检测 iPad（Mac UA + 触摸点）。
 */
export function detectMobileMode(): { isMobile: boolean; force: boolean; isTablet: boolean } {
  if (typeof window === "undefined") return { isMobile: false, force: false, isTablet: false }
  const url = new URL(window.location.href)
  const q = url.searchParams.get("phone")
  const force = q !== null && (q === "" || q === "1" || q.toLowerCase() === "true") || url.hash.toLowerCase().includes("phone")
  const w = window.innerWidth
  const h = window.innerHeight
  const short = Math.min(w, h)
  const long = Math.max(w, h)
  // 平板：短边 >= 600 且 长宽比 <= 1.6（大致 iPad 级别）
  const isTablet = !force && short >= 600 && long / short <= 1.6
  const ua = navigator.userAgent
  const uaTouch = /Mobi|Android|iPhone|iPad|iPod|HarmonyOS|Silk|Mobile/i.test(ua) ||
    (navigator as any).userAgentData?.mobile === true
  // iPadOS 13+ 的 Safari UA 伪装成 Mac，但仍有触摸点；用 maxTouchPoints>1 检测 iPad
  const isMacTouch = /Macintosh|Mac OS X/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1
  const hasTouch = window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0
  if (force) return { isMobile: true, force: true, isTablet: short >= 600 }
  const auto = hasTouch && (uaTouch || isMacTouch)
  return { isMobile: auto, force: false, isTablet: auto && short >= 600 && long / short <= 1.6 }
}

export function resetPlayer(x: number, y: number, z: number) {
  player.x = x
  player.y = y
  player.z = z
  player.vx = 0
  player.vy = 0
  player.vz = 0
  player.onGround = false
  player.fallStartY = y
  player.ready = true
}
