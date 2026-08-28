// 本地存档：localStorage
import type { BlockId } from "./blocks"

const SAVE_KEY = "mc-clone-save-v1"

export interface ItemStack {
  id: BlockId
  count: number
}

export interface SaveData {
  seed: number
  gameMode: "survival" | "creative"
  player: {
    x: number
    y: number
    z: number
    yaw: number
    pitch: number
    health: number
    hunger: number
  }
  spawn: { x: number; y: number; z: number }
  hotbar: (ItemStack | null)[]
  inventory: (ItemStack | null)[]
  edits: Record<string, number>
  time: number // 世界时间 0..1
  settings: {
    renderDistance: number
    mouseSensitivity: number
  }
}

export function saveGame(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    console.log("[v0] 存档失败:", (e as Error).message)
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SaveData
  } catch (e) {
    console.log("[v0] 读档失败:", (e as Error).message)
    return null
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null
  } catch {
    return false
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {}
}
