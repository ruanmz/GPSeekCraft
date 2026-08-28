"use client"

import { create } from "zustand"
import { getItem, creativeItems, type ItemId } from "./items"
import type { ItemStack } from "./save"
import { World } from "./world"
import { matchRecipe, SMELTING, fuelBurnTime, smeltResult } from "./crafting"
import { worldEvents, EV_ITEM_DROP, EV_TELEPORT } from "@/lib/emitter"
import { player } from "@/lib/player-ref"

export type Screen = "menu" | "playing" | "settings" | "credits"
export type Overlay = null | "pause" | "inventory" | "crafting" | "furnace" | "dead"
export type GameMode = "survival" | "creative"
export type SlotArea = "hotbar" | "inventory" | "craft" | "craftResult"

export interface FurnaceState {
  input: ItemStack | null
  fuel: ItemStack | null
  output: ItemStack | null
  progress: number // 0..1
  burnLeft: number // 剩余燃料 tick
  burnMax: number
}

interface Settings {
  renderDistance: number
  mouseSensitivity: number
  fov: number
}

interface GameState {
  screen: Screen
  overlay: Overlay
  gameMode: GameMode
  seed: number
  world: World | null

  health: number
  hunger: number
  maxHealth: number

  hotbar: (ItemStack | null)[]
  inventory: (ItemStack | null)[]
  selectedHotbar: number

  craftGrid: (ItemStack | null)[]
  craftResult: ItemStack | null
  cursor: ItemStack | null

  flying: boolean
  thirdPerson: boolean
  spawn: { x: number; y: number; z: number }
  worldTime: number // 0..1，0.25=清晨 0.5=正午

  furnace: FurnaceState
  settings: Settings

  // 物品名称提示
  toast: { id: number; name: string } | null
  showToast: (name: string) => void
  _toastTimer: ReturnType<typeof setTimeout> | null

  // actions
  setScreen: (s: Screen) => void
  setOverlay: (o: Overlay) => void
  setGameMode: (m: GameMode) => void
  toggleGameMode: () => void
  initWorld: (seed: number, gameMode: GameMode) => void
  setWorld: (w: World) => void
  selectHotbar: (i: number) => void
  scrollHotbar: (dir: number) => void
  setSlot: (area: "hotbar" | "inventory", index: number, stack: ItemStack | null) => void
  addItem: (id: ItemId, count: number) => number // 返回未放入的数量
  consumeSelected: (count: number) => void
  getSelected: () => ItemStack | null
  setHealth: (h: number) => void
  setHunger: (h: number) => void
  damage: (amount: number) => void
  heal: (amount: number) => void
  setFlying: (f: boolean) => void
  toggleThirdPerson: () => void
  setSpawn: (x: number, y: number, z: number) => void
  setWorldTime: (t: number) => void
  setFurnace: (f: Partial<FurnaceState>) => void
  resetFurnace: () => void
  setSettings: (s: Partial<Settings>) => void
  loadState: (partial: Partial<GameState>) => void

  setCraftSlot: (i: number, stack: ItemStack | null) => void
  setCraftResult: (r: ItemStack | null) => void
  refreshCraftResult: () => void
  setCursor: (stack: ItemStack | null) => void
  clearCraft: () => void
  takeCraftResult: () => boolean
  quickMoveItem: (area: SlotArea, index: number) => void
  clickSlot: (area: SlotArea, index: number, button: "left" | "right", shift: boolean) => void
  dropSlot: (area: "hotbar" | "inventory", index: number, count: number) => number
  dropSelected: (count: number) => number
  respawn: () => void

  tickFurnace: (dt: number) => void
  furnaceClickSlot: (area: "input" | "fuel" | "output", button: "left" | "right", shift: boolean) => void
}

function emptySlots(n: number): (ItemStack | null)[] {
  return new Array(n).fill(null)
}

const initialFurnace: FurnaceState = {
  input: null,
  fuel: null,
  output: null,
  progress: 0,
  burnLeft: 0,
  burnMax: 0,
}

function cloneStack(s: ItemStack | null): ItemStack | null {
  return s ? { id: s.id, count: s.count } : null
}

export const useGame = create<GameState>((set, get) => ({
  screen: "menu",
  overlay: null,
  gameMode: "survival",
  seed: 0,
  world: null,

  health: 20,
  hunger: 20,
  maxHealth: 20,

  hotbar: emptySlots(9),
  inventory: emptySlots(27),
  selectedHotbar: 0,

  craftGrid: emptySlots(9),
  craftResult: null,
  cursor: null,

  flying: false,
  thirdPerson: false,
  spawn: { x: 0, y: 40, z: 0 },
  worldTime: 0.3,

  furnace: { ...initialFurnace },
  settings: { renderDistance: 4, mouseSensitivity: 1, fov: 75 },
  toast: null,
  _toastTimer: null,

  setScreen: (s) => set({ screen: s }),
  setOverlay: (o) => set({ overlay: o }),
  setGameMode: (m) => set({ gameMode: m, flying: m === "creative" ? get().flying : false }),
  toggleGameMode: () =>
    set((st) => {
      const next = st.gameMode === "creative" ? "survival" : "creative"
      return { gameMode: next, flying: next === "creative" ? st.flying : false }
    }),

  initWorld: (seed, gameMode) => {
    const world = new World(seed)
    const creativeStacks = gameMode === "creative"
      ? creativeItems().map((id) => ({ id, count: 64 } as ItemStack))
      : []
    set({
      world,
      seed,
      gameMode,
      health: 20,
      hunger: 20,
      hotbar: gameMode === "creative" ? [...creativeStacks.slice(0, 9)] : emptySlots(9),
      inventory: gameMode === "creative" ? [...creativeStacks.slice(9, 36), ...emptySlots(Math.max(0, 27 - creativeStacks.slice(9, 36).length))] : emptySlots(27),
      selectedHotbar: 0,
      craftGrid: emptySlots(9),
      craftResult: null,
      cursor: null,
      worldTime: 0.3,
      furnace: { ...initialFurnace },
      overlay: null,
    })
  },
  setWorld: (w) => set({ world: w }),

  selectHotbar: (i) => set({ selectedHotbar: Math.max(0, Math.min(8, i)) }),
  scrollHotbar: (dir) =>
    set((st) => ({ selectedHotbar: (st.selectedHotbar + dir + 9) % 9 })),

  setSlot: (area, index, stack) =>
    set((st) => {
      const arr = area === "hotbar" ? [...st.hotbar] : [...st.inventory]
      arr[index] = stack
      const partial: Partial<GameState> = area === "hotbar" ? { hotbar: arr } : { inventory: arr }
      return partial
    }),

  addItem: (id, count) => {
    const st = get()
    const maxStack = getItem(id).maxStack
    const hotbar = [...st.hotbar]
    const inventory = [...st.inventory]
    let remaining = count

    const tryFill = (arr: (ItemStack | null)[]) => {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        const s = arr[i]
        if (s && s.id === id && s.count < maxStack) {
          const add = Math.min(maxStack - s.count, remaining)
          arr[i] = { id, count: s.count + add }
          remaining -= add
        }
      }
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        if (!arr[i]) {
          const add = Math.min(maxStack, remaining)
          arr[i] = { id, count: add }
          remaining -= add
        }
      }
    }

    tryFill(hotbar)
    tryFill(inventory)
    set({ hotbar, inventory })
    return remaining
  },

  consumeSelected: (count) =>
    set((st) => {
      const hotbar = [...st.hotbar]
      const s = hotbar[st.selectedHotbar]
      if (!s) return {}
      const left = s.count - count
      hotbar[st.selectedHotbar] = left > 0 ? { id: s.id, count: left } : null
      return { hotbar }
    }),

  getSelected: () => {
    const st = get()
    return st.hotbar[st.selectedHotbar]
  },

  // 把指定格的物品丢出 N 个；返回实际丢弃数量
  dropSlot: (area, index, count) => {
    if (count <= 0) return 0
    const st = get()
    const world = st.world
    const arr = area === "hotbar" ? [...st.hotbar] : [...st.inventory]
    const slot = arr[index]
    if (!slot || !world) return 0
    const actual = Math.min(count, slot.count)
    const dropCount = actual
    // 从玩家身边掉出：眼睛正前方约 0.8m
    const yaw = player.yaw
    const pitch = player.pitch
    // 只按 yaw 方向水平甩出，避免往头顶/地下丢
    const dx = -Math.sin(yaw)
    const dz = -Math.cos(yaw)
    // 初始：玩家体中高度（eye 高约 1.62，这里用 1.4）
    const originX = player.x + dx * 0.9
    const originY = player.y + 1.15
    const originZ = player.z + dz * 0.9
    // 连续掉出（同一种类）时，每一个稍微错开位置，避免堆叠同坐标
    for (let i = 0; i < dropCount; i++) {
      const jitterX = (Math.random() - 0.5) * 0.08
      const jitterY = 0.05 + Math.random() * 0.1
      const jitterZ = (Math.random() - 0.5) * 0.08
      worldEvents.emit(EV_ITEM_DROP, {
        id: slot.id,
        count: 1,
        x: originX + jitterX,
        y: originY + jitterY,
        z: originZ + jitterZ,
        vx: dx * 1.15 + (Math.random() - 0.5) * 0.12,
        vy: 1.25 + Math.random() * 0.35,
        vz: dz * 1.15 + (Math.random() - 0.5) * 0.12,
      })
    }
    const left = slot.count - actual
    arr[index] = left > 0 ? { id: slot.id, count: left } : null
    const partial: Partial<GameState> = area === "hotbar" ? { hotbar: arr } : { inventory: arr }
    set(partial)
    return actual
  },

  // 丢选中格的 N 个（按 Q 键通常丢 1；长按可能丢更多，但这里一次只扣 1 由调用方循环）
  dropSelected: (count) => {
    const idx = get().selectedHotbar
    return get().dropSlot("hotbar", idx, count)
  },

  setHealth: (h) => set({ health: Math.max(0, Math.min(get().maxHealth, h)) }),
  setHunger: (h) => set({ hunger: Math.max(0, Math.min(20, h)) }),
  damage: (amount) =>
    set((st) => {
      if (st.gameMode === "creative") return {}
      const health = Math.max(0, st.health - amount)
      if (health <= 0 && st.overlay !== "dead") {
        return { health: 0, overlay: "dead" }
      }
      return { health }
    }),
  heal: (amount) =>
    set((st) => {
      if (st.gameMode === "creative") return { health: st.maxHealth }
      return { health: Math.min(st.maxHealth, st.health + amount) }
    }),
  respawn: () => {
    const st = get()
    set({ health: st.maxHealth, hunger: 20, overlay: null })
    const s2 = get()
    const sx = s2.spawn.x
    const sz = s2.spawn.z
    const w = s2.world
    const sy = w ? (w.highestSolid(Math.floor(sx), Math.floor(sz)) + 1) : s2.spawn.y
    worldEvents.emit(EV_TELEPORT, { x: sx + 0.5, y: sy, z: sz + 0.5 })
  },

  setFlying: (f) => set({ flying: f }),
  toggleThirdPerson: () => set((st) => ({ thirdPerson: !st.thirdPerson })),
  setSpawn: (x, y, z) => set({ spawn: { x, y, z } }),
  setWorldTime: (t) => set({ worldTime: t % 1 }),

  setFurnace: (f) => set((st) => ({ furnace: { ...st.furnace, ...f } })),
  resetFurnace: () => set({ furnace: { ...initialFurnace } }),

  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

  showToast: (name) => {
    const id = Date.now() + Math.random()
    set((st) => {
      if (st._toastTimer) clearTimeout(st._toastTimer)
      const timer = setTimeout(() => set({ toast: null, _toastTimer: null }), 2000)
      return { toast: { id, name }, _toastTimer: timer }
    })
  },

  loadState: (partial) => set(partial),

  setCraftSlot: (i, stack) =>
    set((st) => {
      const craftGrid = [...st.craftGrid]
      craftGrid[i] = stack
      return { craftGrid }
    }),

  setCraftResult: (r) => set({ craftResult: r }),

  refreshCraftResult: () => {
    const st = get()
    const grid = st.craftGrid.map((s) => (s ? (s.id as ItemId | 0) : 0))
    const result = matchRecipe(grid, 3)
    if (!result) { set({ craftResult: null }); return }
    // 批量合成：输出数量 = 配方基础数量 × 网格中最小堆叠数
    const minStack = Math.min(...st.craftGrid.filter((s): s is ItemStack => !!s).map((s) => s.count))
    const batch = Math.max(1, minStack)
    set({ craftResult: { id: result.id as ItemId, count: result.count * batch } })
  },

  setCursor: (stack) => set({ cursor: stack }),

  clearCraft: () => {
    const st = get()
    let hotbar = [...st.hotbar]
    let inventory = [...st.inventory]
    const craftGrid = [...st.craftGrid]

    const pushStack = (stack: ItemStack): ItemStack | null => {
      const maxStack = getItem(stack.id).maxStack
      let remaining = stack.count
      const tryFill = (arr: (ItemStack | null)[]) => {
        for (let i = 0; i < arr.length && remaining > 0; i++) {
          const s = arr[i]
          if (s && s.id === stack.id && s.count < maxStack) {
            const add = Math.min(maxStack - s.count, remaining)
            arr[i] = { id: stack.id, count: s.count + add }
            remaining -= add
          }
        }
        for (let i = 0; i < arr.length && remaining > 0; i++) {
          if (!arr[i]) {
            const add = Math.min(maxStack, remaining)
            arr[i] = { id: stack.id, count: add }
            remaining -= add
          }
        }
      }
      tryFill(hotbar)
      tryFill(inventory)
      return remaining > 0 ? { id: stack.id, count: remaining } : null
    }

    for (let i = 0; i < 9; i++) {
      if (craftGrid[i]) {
        const leftover = pushStack(craftGrid[i]!)
        craftGrid[i] = leftover
      }
    }

    set({ hotbar, inventory, craftGrid, craftResult: null })
    get().refreshCraftResult()
  },

  takeCraftResult: () => {
    const st = get()
    if (!st.craftResult) return false

    const resultId = st.craftResult.id
    const resultCount = st.craftResult.count
    let cursor = st.cursor ? cloneStack(st.cursor) : null
    const maxStack = getItem(resultId).maxStack

    if (cursor) {
      if (cursor.id !== resultId) return false
      if (cursor.count + resultCount > maxStack) return false
      cursor.count += resultCount
    } else {
      cursor = { id: resultId, count: resultCount }
    }

    // 批量合成：计算实际消耗的批量数
    const filledSlots = st.craftGrid.filter((s): s is ItemStack => !!s)
    const batch = filledSlots.length > 0 ? Math.min(...filledSlots.map((s) => s.count)) : 1

    const craftGrid = [...st.craftGrid]
    for (let i = 0; i < 9; i++) {
      if (craftGrid[i]) {
        const left = craftGrid[i]!.count - batch
        craftGrid[i] = left > 0 ? { id: craftGrid[i]!.id, count: left } : null
      }
    }

    set({ craftGrid, cursor })
    get().refreshCraftResult()
    return true
  },

  quickMoveItem: (area, index) => {
    const st = get()

    if (area === "craftResult") {
      const MAX_ITER = 64
      let iter = 0
      while (iter++ < MAX_ITER) {
        const s = get()
        if (!s.craftResult) break
        const beforeResult = s.craftResult
        const beforeGridEmpty = s.craftGrid.map((v) => !v)
        const ok = get().takeCraftResult()
        if (!ok) break
        const s2 = get()
        if (!s2.cursor) break
        const leftover = get().addItem(s2.cursor.id, s2.cursor.count)
        if (leftover > 0) {
          set({ cursor: { id: s2.cursor.id, count: leftover } })
          break
        } else {
          set({ cursor: null })
        }
        const s3 = get()
        if (!s3.craftResult) break
        const sameResult = s3.craftResult.id === beforeResult.id && s3.craftResult.count === beforeResult.count
        const sameGrid = s3.craftGrid.every((v, i) => !v === beforeGridEmpty[i])
        if (sameResult && sameGrid) break
      }
      return
    }

    if (area === "craft") {
      const stack = st.craftGrid[index]
      if (!stack) return
      const leftover = get().addItem(stack.id, stack.count)
      const craftGrid = [...st.craftGrid]
      craftGrid[index] = leftover > 0 ? { id: stack.id, count: leftover } : null
      set({ craftGrid })
      get().refreshCraftResult()
      return
    }

    const fromArr = area === "hotbar" ? st.hotbar : st.inventory
    const stack = fromArr[index]
    if (!stack) return

    const toArea: "hotbar" | "inventory" = area === "hotbar" ? "inventory" : "hotbar"
    const toArr = toArea === "hotbar" ? [...st.hotbar] : [...st.inventory]
    const maxStack = getItem(stack.id).maxStack
    let remaining = stack.count

    for (let i = 0; i < toArr.length && remaining > 0; i++) {
      const s = toArr[i]
      if (s && s.id === stack.id && s.count < maxStack) {
        const add = Math.min(maxStack - s.count, remaining)
        toArr[i] = { id: stack.id, count: s.count + add }
        remaining -= add
      }
    }
    for (let i = 0; i < toArr.length && remaining > 0; i++) {
      if (!toArr[i]) {
        const add = Math.min(maxStack, remaining)
        toArr[i] = { id: stack.id, count: add }
        remaining -= add
      }
    }

    const fromArrNew = [...fromArr]
    fromArrNew[index] = remaining > 0 ? { id: stack.id, count: remaining } : null

    if (toArea === "hotbar") {
      set({ hotbar: toArr, inventory: fromArrNew })
    } else {
      set({ inventory: toArr, hotbar: fromArrNew })
    }
  },

  clickSlot: (area, index, button, shift) => {
    const st = get()

    if (shift) {
      get().quickMoveItem(area, index)
      return
    }

    if (area === "craftResult") {
      const s = get()
      if (!s.craftResult) return
      if (!s.cursor) {
        get().takeCraftResult()
      } else if (s.cursor.id === s.craftResult.id) {
        const maxStack = getItem(s.cursor.id).maxStack
        const MAX_ITER2 = 64
        let iter2 = 0
        while (iter2++ < MAX_ITER2) {
          const s2 = get()
          if (!s2.craftResult || !s2.cursor || s2.cursor.id !== s2.craftResult.id) break
          if (s2.cursor.count + s2.craftResult.count > maxStack) break
          const before = s2.craftResult
          const ok = get().takeCraftResult()
          if (!ok) break
          const s3 = get()
          if (!s3.craftResult) break
          if (s3.craftResult.id === before.id && s3.craftResult.count === before.count) break
        }
      }
      return
    }

    const getAreaArr = (a: SlotArea): (ItemStack | null)[] => {
      switch (a) {
        case "hotbar": return get().hotbar
        case "inventory": return get().inventory
        case "craft": return get().craftGrid
        default: return get().hotbar
      }
    }

    const setAreaArr = (a: SlotArea, arr: (ItemStack | null)[]) => {
      switch (a) {
        case "hotbar": set({ hotbar: arr }); break
        case "inventory": set({ inventory: arr }); break
        case "craft": set({ craftGrid: arr }); get().refreshCraftResult(); break
      }
    }

    const arr = [...getAreaArr(area)]
    const slot = arr[index]
    let cursor = get().cursor ? cloneStack(get().cursor) : null

    if (!cursor) {
      if (!slot) return
      if (button === "left") {
        cursor = cloneStack(slot)
        arr[index] = null
      } else {
        const half = Math.ceil(slot.count / 2)
        cursor = { id: slot.id, count: half }
        arr[index] = slot.count - half > 0 ? { id: slot.id, count: slot.count - half } : null
      }
    } else {
      if (!slot) {
        if (button === "left") {
          arr[index] = cursor
          cursor = null
        } else {
          arr[index] = { id: cursor.id, count: 1 }
          cursor.count -= 1
          if (cursor.count <= 0) cursor = null
        }
      } else if (slot.id === cursor.id) {
        const maxStack = getItem(slot.id).maxStack
        if (button === "left") {
          const space = maxStack - slot.count
          const move = Math.min(space, cursor.count)
          arr[index] = { id: slot.id, count: slot.count + move }
          cursor.count -= move
          if (cursor.count <= 0) cursor = null
        } else {
          if (slot.count < maxStack) {
            arr[index] = { id: slot.id, count: slot.count + 1 }
            cursor.count -= 1
            if (cursor.count <= 0) cursor = null
          }
        }
      } else {
        if (button === "left") {
          arr[index] = cursor
          cursor = cloneStack(slot)
        }
      }
    }

    setAreaArr(area, arr)
    set({ cursor })
  },

  tickFurnace: (dt) => {
    const st = get()
    const f = { ...st.furnace }

    const smeltOut = f.input ? smeltResult(f.input.id) : null
    const canSmelt =
      f.input !== null &&
      smeltOut !== null &&
      (f.output === null || (f.output.id === smeltOut && f.output.count < 64))

    if (f.burnLeft <= 0) {
      if (canSmelt && f.fuel && fuelBurnTime(f.fuel.id) > 0) {
        const burnTime = fuelBurnTime(f.fuel.id)
        f.fuel.count--
        if (f.fuel.count <= 0) f.fuel = null
        f.burnLeft = burnTime
        f.burnMax = burnTime
      } else if (f.progress > 0) {
        f.progress = Math.max(0, f.progress - 0.02)
      }
    }

    if (f.burnLeft > 0) {
      f.burnLeft -= dt
      if (f.burnLeft < 0) f.burnLeft = 0

      if (canSmelt) {
        f.progress += dt / 100
        if (f.progress >= 1) {
          const resultId = smeltResult(f.input!.id)!
          if (f.output === null) {
            f.output = { id: resultId, count: 1 }
          } else {
            f.output = { id: resultId, count: f.output.count + 1 }
          }
          f.input!.count--
          if (f.input!.count <= 0) f.input = null
          f.progress = 0
        }
      } else if (f.progress > 0) {
        f.progress = Math.max(0, f.progress - 0.02)
      }
    }

    set({ furnace: f })
  },

  furnaceClickSlot: (area, button, shift) => {
    const st = get()
    const f = { ...st.furnace }
    let cursor = st.cursor ? cloneStack(st.cursor) : null

    if (shift) {
      if (area === "output") {
        if (f.output) {
          const leftover = get().addItem(f.output.id, f.output.count)
          if (leftover > 0) {
            f.output = { id: f.output.id, count: leftover }
          } else {
            f.output = null
          }
          set({ furnace: f })
        }
      } else if (area === "input" || area === "fuel") {
        const stack = area === "input" ? f.input : f.fuel
        if (stack) {
          const leftover = get().addItem(stack.id, stack.count)
          if (leftover > 0) {
            const newStack = { id: stack.id, count: leftover }
            if (area === "input") f.input = newStack
            else f.fuel = newStack
          } else {
            if (area === "input") f.input = null
            else f.fuel = null
          }
          set({ furnace: f })
        }
      }
      return
    }

    const slot = area === "input" ? f.input : area === "fuel" ? f.fuel : f.output
    const setSlot = (s: ItemStack | null) => {
      if (area === "input") f.input = s
      else if (area === "fuel") f.fuel = s
      else f.output = s
    }

    if (area === "output") {
      if (!slot) {
        set({ furnace: f, cursor })
        return
      }
      if (cursor === null) {
        if (button === "left") {
          cursor = cloneStack(slot)
          setSlot(null)
        } else {
          const take = 1
          cursor = { id: slot.id, count: take }
          const remain = slot.count - take
          setSlot(remain > 0 ? { id: slot.id, count: remain } : null)
        }
      } else if (cursor.id === slot.id) {
        const maxStack = getItem(slot.id).maxStack
        const space = maxStack - cursor.count
        if (space > 0) {
          const move = Math.min(space, slot.count)
          cursor.count += move
          const remain = slot.count - move
          setSlot(remain > 0 ? { id: slot.id, count: remain } : null)
        }
      }
      set({ furnace: f, cursor })
      return
    }

    if (cursor === null) {
      if (!slot) return
      if (button === "left") {
        cursor = cloneStack(slot)
        setSlot(null)
      } else {
        const half = Math.ceil(slot.count / 2)
        cursor = { id: slot.id, count: half }
        setSlot(slot.count - half > 0 ? { id: slot.id, count: slot.count - half } : null)
      }
    } else {
      if (area === "input") {
        if (!SMELTING[cursor.id]) {
          set({ furnace: f, cursor })
          return
        }
      }
      if (area === "fuel") {
        if (fuelBurnTime(cursor.id) <= 0) {
          set({ furnace: f, cursor })
          return
        }
      }

      if (!slot) {
        if (button === "left") {
          setSlot(cursor)
          cursor = null
        } else {
          setSlot({ id: cursor.id, count: 1 })
          cursor.count -= 1
          if (cursor.count <= 0) cursor = null
        }
      } else if (slot.id === cursor.id) {
        const maxStack = getItem(slot.id).maxStack
        if (button === "left") {
          const space = maxStack - slot.count
          const move = Math.min(space, cursor.count)
          setSlot({ id: slot.id, count: slot.count + move })
          cursor.count -= move
          if (cursor.count <= 0) cursor = null
        } else {
          if (slot.count < maxStack) {
            setSlot({ id: slot.id, count: slot.count + 1 })
            cursor.count -= 1
            if (cursor.count <= 0) cursor = null
          }
        }
      } else {
        if (button === "left") {
          setSlot(cursor)
          cursor = cloneStack(slot)
        }
      }
    }

    set({ furnace: f, cursor })
  },
}))
