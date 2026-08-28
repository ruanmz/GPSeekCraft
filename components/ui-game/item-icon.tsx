"use client"

import { useEffect, useRef } from "react"
import { getItem } from "@/lib/items"
import { getBlock, BLOCKS, BLOCK_DEFS } from "@/lib/blocks"

function rgb(value: [number, number, number], alpha = 1) {
  const r = Math.round(value[0] * 255)
  const g = Math.round(value[1] * 255)
  const b = Math.round(value[2] * 255)
  return `rgba(${r},${g},${b},${alpha})`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ]
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  const lr = Math.min(1, r + amt)
  const lg = Math.min(1, g + amt)
  const lb = Math.min(1, b + amt)
  return rgb([lr, lg, lb])
}

function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  const dr = Math.max(0, r - amt)
  const dg = Math.max(0, g - amt)
  const db = Math.max(0, b - amt)
  return rgb([dr, dg, db])
}

const STICK_COLOR = "#8a6a3a"

function ToolSvg({ toolType, color }: { toolType: string; color: string }) {
  const strokeW = 1.5
  const stickGradL = lighten(STICK_COLOR, 0.12)
  const stickGradD = darken(STICK_COLOR, 0.1)
  const hl = "rgba(255,255,255,0.22)"
  const sw = `${strokeW}`

  if (toolType === "pickaxe") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
        <polygon points="14,22 86,22 80,36 20,36" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="14,22 20,36 10,44 4,30" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="86,22 80,36 90,44 96,30" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="50,36 50,42 44,42 56,42" fill="none" />
        <rect x="45" y="36" width="10" height="58" fill={STICK_COLOR} stroke="#000" strokeWidth={sw} />
        <rect x="45" y="36" width="3" height="58" fill={stickGradL} />
        <rect x="52" y="36" width="3" height="58" fill={stickGradD} />
        <polygon points="20,22 50,22 40,30 20,30" fill={hl} />
      </svg>
    )
  }

  if (toolType === "sword") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
        <polygon points="50,8 62,30 50,68 38,30" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="50,8 62,30 56,26 50,14" fill={hl} />
        <polygon points="28,68 72,68 68,76 32,76" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <rect x="45" y="76" width="10" height="16" fill={STICK_COLOR} stroke="#000" strokeWidth={sw} />
        <rect x="45" y="76" width="3" height="16" fill={stickGradL} />
        <rect x="52" y="76" width="3" height="16" fill={stickGradD} />
        <polygon points="44,92 56,92 50,96" fill={darken(STICK_COLOR, 0.2)} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    )
  }

  if (toolType === "axe") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
        <polygon points="28,14 86,20 80,56 30,48" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="28,14 40,22 50,32 30,48 22,32" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="28,14 50,20 44,28 28,22" fill={hl} />
        <rect x="52" y="46" width="8" height="8" fill="none" />
        <polygon points="54,40 58,36 94,88 90,92" fill={STICK_COLOR} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="54,40 56,42 92,90 90,92 54,44" fill={stickGradL} opacity="0.6" />
      </svg>
    )
  }

  if (toolType === "shovel") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
        <polygon points="30,10 70,10 80,40 50,52 20,40" fill={color} stroke="#000" strokeWidth={sw} strokeLinejoin="round" />
        <polygon points="30,10 50,10 40,22 28,20" fill={hl} />
        <rect x="46" y="50" width="8" height="46" fill={STICK_COLOR} stroke="#000" strokeWidth={sw} />
        <rect x="46" y="50" width="2" height="46" fill={stickGradL} />
        <rect x="52" y="50" width="2" height="46" fill={stickGradD} />
      </svg>
    )
  }

  return null
}

function FoodIcon({ color, isApple }: { color: string; isApple: boolean }) {
  const darkCol = darken(color, 0.18)
  const hl = "rgba(255,255,255,0.35)"
  if (isApple) {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
        <path d="M50,26 C56,18 68,16 72,28 C86,30 90,54 78,74 C70,88 56,94 50,90 C44,94 30,88 22,74 C10,54 14,30 28,28 C32,16 44,18 50,26 Z" fill={color} stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M88,52 C94,48 96,56 90,62 C88,62 86,58 88,52 Z" fill="rgba(0,0,0,0)" />
        <polygon points="68,56 76,50 82,58 74,66" fill="#000" opacity="0" />
        <path d="M76,54 C84,50 88,58 82,64 C78,62 76,58 76,54 Z" fill="#fff" opacity="0" />
        <circle cx="38" cy="40" r="6" fill={hl} />
        <rect x="48" y="16" width="4" height="10" fill="#5a7d2a" stroke="#000" strokeWidth="1" rx="1" />
        <path d="M52,14 C62,6 68,10 64,20 C58,16 54,14 52,14 Z" fill="#5b8a3a" stroke="#000" strokeWidth="1" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
      <rect x="14" y="20" width="72" height="60" rx="14" fill={color} stroke="#000" strokeWidth="1.5" />
      <circle cx="34" cy="40" r="7" fill="rgba(255,255,255,0.3)" />
      <rect x="20" y="70" width="60" height="6" fill={darkCol} opacity="0.5" rx="2" />
    </svg>
  )
}

function ResourceDustIcon({ color }: { color: string }) {
  const hl = lighten(color, 0.25)
  const hexes = [
    { cx: 28, cy: 32, s: 9 },
    { cx: 64, cy: 28, s: 8 },
    { cx: 74, cy: 54, s: 10 },
    { cx: 36, cy: 62, s: 8 },
    { cx: 52, cy: 44, s: 7 },
    { cx: 20, cy: 50, s: 6 },
  ]
  const hexPts = (cx: number, cy: number, s: number) => {
    const pts: string[] = []
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6
      pts.push(`${cx + Math.cos(a) * s},${cy + Math.sin(a) * s}`)
    }
    return pts.join(" ")
  }
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden shapeRendering="crispEdges">
      <rect x="10" y="10" width="80" height="80" fill="#3f3f3f" stroke="#000" strokeWidth="1.5" rx="4" />
      {hexes.map((h, i) => (
        <polygon key={i} points={hexPts(h.cx, h.cy, h.s)} fill={color} stroke="#000" strokeWidth="0.8" strokeLinejoin="round" />
      ))}
      {hexes.slice(0, 3).map((h, i) => (
        <polygon key={`h${i}`} points={hexPts(h.cx - h.s * 0.2, h.cy - h.s * 0.2, h.s * 0.45)} fill={hl} opacity="0.7" />
      ))}
    </svg>
  )
}

// 16x16 像素方块纹理：用 Canvas 程序化绘制每种方块的顶/侧/底三面纹理
type BlockDef = NonNullable<ReturnType<typeof getBlock>>

function drawFaceTexture(ctx: CanvasRenderingContext2D, def: BlockDef, face: "top" | "side" | "bottom"): void {
  const PX = 16
  const c = face === "top" ? def.top : face === "bottom" ? def.bottom : def.side
  const bR = Math.round(c[0] * 255), bG = Math.round(c[1] * 255), bB = Math.round(c[2] * 255)
  let s = (def.id * 73856 + face.charCodeAt(0) * 193) >>> 0
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }

  // 底色 + 像素噪声
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const t = (rnd() - 0.5) * 0.16
    const r = Math.max(0, Math.min(255, Math.round(bR + bR * t)))
    const g = Math.max(0, Math.min(255, Math.round(bG + bG * t)))
    const b = Math.max(0, Math.min(255, Math.round(bB + bB * t)))
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x, y, 1, 1)
  }

  const k = def.key

  // 矿石斑点
  if (/\w_ORE$/.test(k) && face !== "bottom") {
    let oR = 200, oG = 200, oB = 200
    if (k === "COAL_ORE") { oR = 40; oG = 40; oB = 40 }
    else if (k === "IRON_ORE") { oR = 200; oG = 160; oB = 130 }
    else if (k === "GOLD_ORE") { oR = 220; oG = 190; oB = 80 }
    else if (k === "DIAMOND_ORE") { oR = 90; oG = 220; oB = 210 }
    else if (k === "REDSTONE_ORE") { oR = 200; oG = 40; oB = 30 }
    else if (k === "LAPIS_ORE") { oR = 30; oG = 60; oB = 180 }
    else if (k === "EMERALD_ORE") { oR = 30; oG = 160; oB = 80 }
    for (let i = 0; i < 6; i++) {
      const sx = 1 + Math.floor(rnd() * 13), sy = 1 + Math.floor(rnd() * 13), sz = 1 + Math.floor(rnd() * 3)
      ctx.fillStyle = `rgb(${oR},${oG},${oB})`; ctx.fillRect(sx, sy, sz, sz)
      ctx.fillStyle = `rgb(${Math.min(255, oR + 40)},${Math.min(255, oG + 40)},${Math.min(255, oB + 40)})`; ctx.fillRect(sx, sy, 1, 1)
    }
  }

  // 草顶面
  if ((k === "GRASS" || k === "SNOW_GRASS") && face === "top") {
    const gR = k === "SNOW_GRASS" ? 240 : 106, gG = k === "SNOW_GRASS" ? 248 : 168, gB = k === "SNOW_GRASS" ? 255 : 79
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const t = (rnd() - 0.5) * 0.2
      ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,Math.round(gR+gR*t)))},${Math.max(0,Math.min(255,Math.round(gG+gG*t)))},${Math.max(0,Math.min(255,Math.round(gB+gB*t)))})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  // 草侧面顶部草色渐变
  if ((k === "GRASS" || k === "SNOW_GRASS") && face === "side") {
    const gR = k === "SNOW_GRASS" ? 240 : 106, gG = k === "SNOW_GRASS" ? 248 : 168, gB = k === "SNOW_GRASS" ? 255 : 79
    for (let x = 0; x < PX; x++) {
      const h = 3 + Math.floor(rnd() * 2)
      for (let y = 0; y < h; y++) {
        const bl = y / h
        ctx.fillStyle = `rgb(${Math.round(gR*(1-bl)+bR*bl)},${Math.round(gG*(1-bl)+bG*bl)},${Math.round(gB*(1-bl)+bB*bl)})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  // 木板纹理
  if (/PLANKS|FENCE|CRAFTING_TABLE|BOOKSHELF/.test(k)) {
    for (let y = 0; y < PX; y += 4) {
      ctx.fillStyle = `rgba(0,0,0,0.15)`; ctx.fillRect(0, y + (rnd() > 0.5 ? 1 : 0), PX, 1)
      ctx.fillStyle = `rgba(255,255,255,0.08)`; ctx.fillRect(0, y + 1, PX, 1)
    }
    ctx.fillStyle = `rgba(0,0,0,0.25)`; ctx.fillRect(7, 0, 1, PX)
  }
  // 原木年轮
  if (/LOG/.test(k)) {
    if (face === "top" || face === "bottom") {
      ctx.strokeStyle = `rgba(0,0,0,0.3)`; ctx.lineWidth = 1
      for (let r = 2; r <= 7; r += 2) { ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI * 2); ctx.stroke() }
    } else { for (let x = 0; x < PX; x += 3) { ctx.fillStyle = `rgba(0,0,0,0.12)`; ctx.fillRect(x, 0, 1, PX) } }
  }
  // 砖块缝隙
  if (/BRICK|COBBLESTONE|COBBLESTONE_WALL/.test(k)) {
    ctx.fillStyle = `rgba(0,0,0,0.3)`
    ctx.fillRect(0, 7, PX, 1); ctx.fillRect(0, 15, PX, 1)
    ctx.fillRect(7, 0, 1, 8); ctx.fillRect(3, 8, 1, 8); ctx.fillRect(11, 8, 1, 8)
  }
  // 沙子颗粒
  if (k === "SAND" || k === "GRAVEL" || k === "SANDSTONE") {
    for (let i = 0; i < 35; i++) { ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,0.15)` : `rgba(0,0,0,0.1)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) }
  }
  // 水波纹
  if (k === "WATER") {
    ctx.strokeStyle = `rgba(120,180,255,0.4)`; ctx.lineWidth = 1
    for (let y = 2; y < PX; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x < PX; x += 4) ctx.lineTo(x + 2, y + (x % 8 === 0 ? 1 : -1)); ctx.stroke() }
  }
  // 岩浆气泡
  if (k === "LAVA") { for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,200,50,0.6)`; ctx.fillRect(Math.floor(rnd()*14), Math.floor(rnd()*14), 2, 2) } }
  // 树叶透光孔
  if (/LEAVES/.test(k)) {
    for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(0,0,0,0.25)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) }
    for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,255,255,0.15)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) }
  }
  // 熔炉
  if (k === "FURNACE" && face === "side") { ctx.fillStyle = `rgb(40,40,40)`; ctx.fillRect(4, 6, 8, 6); ctx.fillStyle = `rgb(80,50,30)`; ctx.fillRect(5, 7, 6, 4) }
  if (k === "FURNACE" && face === "top") { ctx.fillStyle = `rgb(50,50,50)`; ctx.fillRect(5, 5, 6, 6) }
  // 工作台网格
  if (k === "CRAFTING_TABLE" && face === "top") {
    ctx.strokeStyle = `rgba(0,0,0,0.4)`; ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, 15, 15); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, 16); ctx.moveTo(0, 8); ctx.lineTo(16, 8); ctx.stroke()
  }
  // 玻璃反光
  if (k === "GLASS" || k === "ICE") {
    ctx.strokeStyle = `rgba(255,255,255,0.4)`; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(6, 1); ctx.moveTo(10, 5); ctx.lineTo(14, 5); ctx.moveTo(4, 10); ctx.lineTo(8, 10); ctx.stroke()
  }
  // 基岩斑点
  if (k === "BEDROCK") { for (let i = 0; i < 20; i++) { ctx.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,0.4)` : `rgba(80,80,80,0.5)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) } }
}

// 缓存：每个方块的 16x16 三面纹理
const texCache = new Map<number, { top: HTMLCanvasElement; side: HTMLCanvasElement; bottom: HTMLCanvasElement }>()
function getTex(def: BlockDef) {
  let c = texCache.get(def.id)
  if (!c) {
    const make = (f: "top" | "side" | "bottom") => { const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16; drawFaceTexture(cv.getContext("2d")!, def, f); return cv }
    c = { top: make("top"), side: make("side"), bottom: make("bottom") }
    texCache.set(def.id, c)
  }
  return c
}

// 把 16x16 纹理画到等距菱形面上（仿射变换映射平行四边形）
function drawIsoFace(ctx: CanvasRenderingContext2D, tex: HTMLCanvasElement, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], shade: number) {
  ctx.save()
  // p0=tex(0,0) p1=tex(16,0) p2=tex(16,16) p3=tex(0,16)
  const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1]
  const dx2 = p3[0] - p0[0], dy2 = p3[1] - p0[1]
  ctx.transform(dx1 / 16, dy1 / 16, dx2 / 16, dy2 / 16, p0[0], p0[1])
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = shade
  ctx.drawImage(tex, 0, 0)
  ctx.restore()
}

// 等距三面方块图标：Canvas 绘制 16x16 像素纹理 → 等距投影
function BlockIcon({ def, size }: { def: BlockDef; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = size * dpr; cv.height = size * dpr
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)
    const tex = getTex(def)
    // 等距投影顶点（viewBox 0..100 → 映射到 0..size）
    const S = size / 100
    const T: [number, number] = [50 * S, 6 * S]
    const R: [number, number] = [88 * S, 30 * S]
    const B: [number, number] = [50 * S, 54 * S]
    const L: [number, number] = [12 * S, 30 * S]
    const BR: [number, number] = [88 * S, 78 * S]
    const BB: [number, number] = [50 * S, 96 * S]
    const BL: [number, number] = [12 * S, 78 * S]
    // 右侧面 (tex: top-left=T, top-right=R, bottom-right=BR, bottom-left=B)
    drawIsoFace(ctx, tex.side, R, BR, BB, B, 0.72)
    // 左侧面
    drawIsoFace(ctx, tex.bottom, L, B, BB, BL, 0.55)
    // 顶面
    drawIsoFace(ctx, tex.top, T, R, B, L, 1.0)
    // 描边
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(T[0], T[1]); ctx.lineTo(R[0], R[1]); ctx.lineTo(BR[0], BR[1]); ctx.lineTo(BB[0], BB[1]); ctx.lineTo(BL[0], BL[1]); ctx.lineTo(L[0], L[1]); ctx.closePath(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(R[0], R[1]); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(BB[0], BB[1]); ctx.stroke()
  }, [def, size])
  return <canvas ref={ref} style={{ width: size, height: size, imageRendering: "pixelated" }} aria-label={def.name} title={def.name} />
}

export function ItemIcon({ id, size = 32 }: { id: number; size?: number }) {
  if (id >= 100) {
    const item = getItem(id)
    if (item.toolType) {
      return (
        <span
          style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          aria-label={item.name}
          title={item.name}
        >
          <span style={{ width: size * 0.9, height: size * 0.9, display: "block" }}>
            <ToolSvg toolType={item.toolType} color={item.color} />
          </span>
        </span>
      )
    }
    if (item.food !== undefined) {
      const isApple = id === 105 || id === 140
      return (
        <span
          style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          aria-label={item.name}
          title={item.name}
        >
          <span style={{ width: size * 0.82, height: size * 0.82, display: "block" }}>
            <FoodIcon color={item.color} isApple={isApple} />
          </span>
        </span>
      )
    }
    const dustIds = [101, 120, 121, 122, 124, 125, 126, 127, 128, 129, 141, 143, 144, 145, 156]
    if (dustIds.includes(id)) {
      return (
        <span
          style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          aria-label={item.name}
          title={item.name}
        >
          <span style={{ width: size * 0.82, height: size * 0.82, display: "block" }}>
            <ResourceDustIcon color={item.color} />
          </span>
        </span>
      )
    }
    return (
      <span
        style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        aria-label={item.name}
        title={item.name}
      >
        <span
          style={{
            width: size * 0.62,
            height: size * 0.62,
            background: item.color,
            border: `${Math.max(1, size * 0.06)}px solid rgba(0,0,0,.45)`,
            boxShadow: `inset ${size * 0.09}px ${size * 0.09}px rgba(255,255,255,.25)`,
          }}
        />
      </span>
    )
  }

  // Fallback：防止 BLOCK_DEFS 里 id 没定义（比如 0 / 未知 id）
  let def = getBlock(id)
  if (!def || !def.top) def = getBlock(BLOCKS.AIR) ?? BLOCK_DEFS[1] // AIR 或石头兜底

  return <BlockIcon def={def} size={size} />
}