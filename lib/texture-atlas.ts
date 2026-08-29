// 纹理图集：把所有方块的顶/侧/底三面 16×16 像素纹理拼到一张 Canvas 上，
// 供 3D 世界 mesh 使用 UV 采样，替代之前的 flat vertex-color 渲染。
import * as THREE from "three"
import { BLOCKS, getBlock, type BlockId, type BlockDef } from "./blocks"

const TILE = 16
const COLS = 16

// 每个方块分配 3 个连续 tile：top / side / bottom
const tileMap = new Map<BlockId, { top: number; side: number; bottom: number }>()
{
  let next = 0
  for (const id of Object.values(BLOCKS)) {
    if (id === BLOCKS.AIR) continue
    tileMap.set(id, { top: next, side: next + 1, bottom: next + 2 })
    next += 3
  }
}
const totalTiles = Array.from(tileMap.values()).reduce((a, t) => a + 3, 0)
const ROWS = Math.ceil(totalTiles / COLS)

// ─── 像素纹理绘制（与 item-icon.tsx 中 drawFaceTexture 同源）──────────────
function drawFaceTexture(ctx: CanvasRenderingContext2D, def: BlockDef, face: "top" | "side" | "bottom"): void {
  const PX = 16
  const c = face === "top" ? def.top : face === "bottom" ? def.bottom : def.side
  const bR = Math.round(c[0] * 255), bG = Math.round(c[1] * 255), bB = Math.round(c[2] * 255)
  let s = (def.id * 73856 + face.charCodeAt(0) * 193) >>> 0
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }

  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const t = (rnd() - 0.5) * 0.16
    const r = Math.max(0, Math.min(255, Math.round(bR + bR * t)))
    const g = Math.max(0, Math.min(255, Math.round(bG + bG * t)))
    const b = Math.max(0, Math.min(255, Math.round(bB + bB * t)))
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x, y, 1, 1)
  }

  const k = def.key

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

  if ((k === "GRASS" || k === "SNOW_GRASS") && face === "top") {
    const gR = k === "SNOW_GRASS" ? 240 : 106, gG = k === "SNOW_GRASS" ? 248 : 168, gB = k === "SNOW_GRASS" ? 255 : 79
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const t = (rnd() - 0.5) * 0.2
      ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,Math.round(gR+gR*t)))},${Math.max(0,Math.min(255,Math.round(gG+gG*t)))},${Math.max(0,Math.min(255,Math.round(gB+gB*t)))})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
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

  if (/PLANKS|FENCE|CRAFTING_TABLE|BOOKSHELF|FENCE_GATE/.test(k)) {
    for (let y = 0; y < PX; y += 4) {
      ctx.fillStyle = `rgba(0,0,0,0.15)`; ctx.fillRect(0, y + (rnd() > 0.5 ? 1 : 0), PX, 1)
      ctx.fillStyle = `rgba(255,255,255,0.08)`; ctx.fillRect(0, y + 1, PX, 1)
    }
    ctx.fillStyle = `rgba(0,0,0,0.25)`; ctx.fillRect(7, 0, 1, PX)
  }
  if (/LOG/.test(k)) {
    if (face === "top" || face === "bottom") {
      ctx.strokeStyle = `rgba(0,0,0,0.3)`; ctx.lineWidth = 1
      for (let r = 2; r <= 7; r += 2) { ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI * 2); ctx.stroke() }
    } else { for (let x = 0; x < PX; x += 3) { ctx.fillStyle = `rgba(0,0,0,0.12)`; ctx.fillRect(x, 0, 1, PX) } }
  }
  if (/BRICK|COBBLESTONE|COBBLESTONE_WALL|STONE_BRICKS|CRACKED_STONE_BRICKS|MOSSY_STONE_BRICKS|CHISELED_STONE_BRICKS|NETHER_BRICKS/.test(k)) {
    ctx.fillStyle = `rgba(0,0,0,0.3)`
    ctx.fillRect(0, 7, PX, 1); ctx.fillRect(0, 15, PX, 1)
    ctx.fillRect(7, 0, 1, 8); ctx.fillRect(3, 8, 1, 8); ctx.fillRect(11, 8, 1, 8)
  }
  if (k === "SAND" || k === "GRAVEL" || k === "SANDSTONE") {
    for (let i = 0; i < 35; i++) { ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,0.15)` : `rgba(0,0,0,0.1)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) }
  }
  if (k === "WATER") {
    ctx.strokeStyle = `rgba(120,180,255,0.4)`; ctx.lineWidth = 1
    for (let y = 2; y < PX; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x < PX; x += 4) ctx.lineTo(x + 2, y + (x % 8 === 0 ? 1 : -1)); ctx.stroke() }
  }
  if (k === "LAVA") { for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,200,50,0.6)`; ctx.fillRect(Math.floor(rnd()*14), Math.floor(rnd()*14), 2, 2) } }
  if (/LEAVES/.test(k)) {
    for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(0,0,0,0.25)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) }
    for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,255,255,0.15)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) }
  }
  if (k === "FURNACE" && face === "side") { ctx.fillStyle = `rgb(40,40,40)`; ctx.fillRect(4, 6, 8, 6); ctx.fillStyle = `rgb(80,50,30)`; ctx.fillRect(5, 7, 6, 4) }
  if (k === "FURNACE" && face === "top") { ctx.fillStyle = `rgb(50,50,50)`; ctx.fillRect(5, 5, 6, 6) }
  if (k === "CRAFTING_TABLE" && face === "top") {
    ctx.strokeStyle = `rgba(0,0,0,0.4)`; ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, 15, 15); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, 16); ctx.moveTo(0, 8); ctx.lineTo(16, 8); ctx.stroke()
  }
  if (k === "GLASS" || k === "ICE") {
    ctx.strokeStyle = `rgba(255,255,255,0.4)`; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(6, 1); ctx.moveTo(10, 5); ctx.lineTo(14, 5); ctx.moveTo(4, 10); ctx.lineTo(8, 10); ctx.stroke()
  }
  if (k === "BEDROCK") { for (let i = 0; i < 20; i++) { ctx.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,0.4)` : `rgba(80,80,80,0.5)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) } }
  if (k === "GLOWSTONE") { for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(255,255,200,0.5)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 2, 2) } }
  if (k === "OBSIDIAN") { for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(80,40,120,0.3)`; ctx.fillRect(Math.floor(rnd()*PX), Math.floor(rnd()*PX), 1, 1) } }
  if (k === "PUMPKIN" && face === "side") { ctx.fillStyle = `rgba(0,0,0,0.2)`; ctx.fillRect(7, 0, 2, PX) }
  if (k === "MELON" && face === "side") { ctx.strokeStyle = `rgba(0,0,0,0.15)`; ctx.lineWidth = 1; for (let y = 2; y < PX; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PX, y); ctx.stroke() } }
  if (k === "HAY_BLOCK") { ctx.strokeStyle = `rgba(0,0,0,0.2)`; ctx.lineWidth = 1; for (let y = 3; y < PX; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PX, y); ctx.stroke() } }
  if (k === "DIRT_PATH" && face === "side") { ctx.fillStyle = `rgba(0,0,0,0.2)`; ctx.fillRect(0, 3, PX, 1) }
  if (k === "CHEST" && face === "side") { ctx.fillStyle = `rgba(0,0,0,0.3)`; ctx.fillRect(5, 6, 6, 4) }
}

// ─── 图集生成 ──────────────────────────────────────────────
let atlasTexture: THREE.CanvasTexture | null = null

export function getAtlasTexture(): THREE.CanvasTexture {
  if (atlasTexture) return atlasTexture
  const canvas = document.createElement("canvas")
  canvas.width = COLS * TILE
  canvas.height = ROWS * TILE
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false

  for (const [id, tile] of tileMap) {
    const def = getBlock(id)
    drawTile(ctx, tile.top, def, "top")
    drawTile(ctx, tile.side, def, "side")
    drawTile(ctx, tile.bottom, def, "bottom")
  }

  atlasTexture = new THREE.CanvasTexture(canvas)
  atlasTexture.magFilter = THREE.NearestFilter
  // 像素图集不能使用 mipmap：低分辨率远景会混合相邻 tile，导致草顶采样成黄色并产生接缝。
  atlasTexture.minFilter = THREE.LinearFilter
  atlasTexture.magFilter = THREE.NearestFilter
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping
  atlasTexture.colorSpace = THREE.SRGBColorSpace
  atlasTexture.generateMipmaps = false
  return atlasTexture
}

function drawTile(ctx: CanvasRenderingContext2D, tileIndex: number, def: BlockDef, face: "top" | "side" | "bottom") {
  const col = tileIndex % COLS
  const row = Math.floor(tileIndex / COLS)
  const ox = col * TILE
  const oy = row * TILE
  ctx.save()
  ctx.translate(ox, oy)
  drawFaceTexture(ctx, def, face)
  ctx.restore()
}

// Half-texel inset for nearest sampling; larger inset for mipmap levels to prevent bleeding
const INSET = 1.5 / (COLS * TILE)

function tileUV(tileIndex: number) {
  const col = tileIndex % COLS
  const row = Math.floor(tileIndex / COLS)
  const u0 = col / COLS + INSET
  const u1 = (col + 1) / COLS - INSET
  // flipY=true（CanvasTexture 默认）：canvas row 0 → V=1
  const v0 = 1 - (row + 1) / ROWS + INSET
  const v1 = 1 - row / ROWS - INSET
  return { u0, v0, u1, v1 }
}

// 返回 4 个顶点的 UV（对应 FACES 中 corners 的顺序）
export function getFaceUV(block: BlockId, faceIndex: number): [number, number][] {
  const tile = tileMap.get(block)
  if (!tile) return [[0, 0], [0, 0], [0, 0], [0, 0]]
  let ti: number
  if (faceIndex === 2) ti = tile.top
  else if (faceIndex === 3) ti = tile.bottom
  else ti = tile.side
  const { u0, v0, u1, v1 } = tileUV(ti)
  // 标准 quad UV：(0,0)→(0,1)→(1,1)→(1,0)
  return [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]
}
