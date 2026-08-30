// 多存档系统：localStorage（世界由 seed 确定性生成，只额外保存玩家改动 edits，体积极小）
import type { BlockId } from "./blocks"

const STORE_KEY = "mc-clone-saves-v1"

export interface ItemStack {
  id: BlockId
  count: number
}

export type GameMode = "survival" | "creative"

export interface SaveData {
  id: string
  name: string
  seed: number
  gameMode: GameMode
  createdAt: number
  lastPlayed: number
  player: { x: number; y: number; z: number; yaw: number; pitch: number }
  health: number
  hunger: number
  spawn: { x: number; y: number; z: number }
  hotbar: (ItemStack | null)[]
  inventory: (ItemStack | null)[]
  edits: Record<string, number>
  worldTime: number
  flying?: boolean
  thirdPerson?: boolean
}

function readAll(): SaveData[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as SaveData[]) : []
  } catch {
    return []
  }
}

function writeAll(list: SaveData[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch (e) {
    console.log("[saves] 保存失败:", (e as Error).message)
  }
}

/** 所有存档，按最近游玩时间倒序 */
export function listSaves(): SaveData[] {
  return readAll().sort((a, b) => b.lastPlayed - a.lastPlayed)
}

export function getSave(id: string): SaveData | null {
  return readAll().find((s) => s.id === id) ?? null
}

export function hasAnySave(): boolean {
  return readAll().length > 0
}

/** 新建或覆盖某个存档 */
export function upsertSave(data: SaveData): void {
  const list = readAll()
  const i = list.findIndex((s) => s.id === data.id)
  if (i >= 0) list[i] = data
  else list.push(data)
  writeAll(list)
}

export function deleteSave(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id))
}
