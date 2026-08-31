// 统一物品注册：方块（id<100，可放置）+ 纯物品（id>=100，不可放置）
import { BLOCK_DEFS, BLOCKS, getBlock, type BlockId } from "./blocks"

export const ITEMS = {
  STICK: 100,
  COAL: 101,
  IRON_INGOT: 102,
  GOLD_INGOT: 103,
  DIAMOND: 104,
  APPLE: 105,
  BREAD: 106,
  WHEAT: 107,
  RAW_PORK: 108,
  COOKED_PORK: 109,
  WOOD_PICKAXE: 110,
  STONE_PICKAXE: 111,
  IRON_PICKAXE: 112,
  DIAMOND_PICKAXE: 113,
  WOOD_SWORD: 114,
  STONE_SWORD: 115,
  IRON_SWORD: 116,
  WOOD_AXE: 117,
  WOOD_SHOVEL: 118,
  STICK_BUNDLE: 119,
  REDSTONE: 120,
  LAPIS: 121,
  EMERALD: 122,
  COPPER_INGOT: 123,
  CHARCOAL: 124,
  RAW_IRON: 1250,
  RAW_GOLD: 1251,
  RAW_COPPER: 1252,
  BONE: 125,
  BONE_MEAL: 126,
  INK_SAC: 127,
  SUGAR: 128,
  PAPER: 129,
  BOOK: 130,
  CARROT: 131,
  POTATO: 132,
  BAKED_POTATO: 133,
  BEEF: 134,
  COOKED_BEEF: 135,
  CHICKEN: 136,
  COOKED_CHICKEN: 137,
  MUTTON: 138,
  COOKED_MUTTON: 139,
  GOLDEN_APPLE: 140,
  SLIME_BALL: 141,
  MELON_SLICE: 142,
  PUMPKIN_SEEDS: 143,
  MELON_SEEDS: 144,
  WHEAT_SEEDS: 145,
  STONE_AXE: 146,
  STONE_SHOVEL: 147,
  IRON_AXE: 148,
  IRON_SHOVEL: 149,
  DIAMOND_AXE: 150,
  DIAMOND_SHOVEL: 151,
  GOLD_PICKAXE: 152,
  GOLD_SWORD: 153,
  GOLD_AXE: 154,
  GOLD_SHOVEL: 155,
  STRING: 156,
} as const

export type ItemId = number

export interface ItemMeta {
  id: ItemId
  name: string
  color: string // 图标底色 hex
  placeable: boolean // 是否为可放置方块
  maxStack: number
  food?: number // 恢复饥饿值
  toolType?: "pickaxe" | "axe" | "shovel" | "sword"
  toolTier?: number // 1木 2石 3铁 4钻
}

function hex(rgb: [number, number, number]): string {
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`
}

// 从方块定义生成方块物品元数据
const blockItemMeta: Record<number, ItemMeta> = {}
for (const idStr in BLOCK_DEFS) {
  const id = Number(idStr)
  if (id === BLOCKS.AIR) continue
  const def = getBlock(id)
  blockItemMeta[id] = {
    id,
    name: def.name,
    color: hex(def.top),
    placeable: true,
    maxStack: 64,
  }
}

const pureItemMeta: Record<number, ItemMeta> = {
  [ITEMS.STICK]: { id: ITEMS.STICK, name: "木棍", color: "#8a6a3a", placeable: false, maxStack: 64 },
  [ITEMS.COAL]: { id: ITEMS.COAL, name: "煤炭", color: "#2b2b2b", placeable: false, maxStack: 64 },
  [ITEMS.IRON_INGOT]: { id: ITEMS.IRON_INGOT, name: "铁锭", color: "#d8d8d8", placeable: false, maxStack: 64 },
  [ITEMS.GOLD_INGOT]: { id: ITEMS.GOLD_INGOT, name: "金锭", color: "#e6cf5a", placeable: false, maxStack: 64 },
  [ITEMS.DIAMOND]: { id: ITEMS.DIAMOND, name: "钻石", color: "#5fd3c6", placeable: false, maxStack: 64 },
  [ITEMS.APPLE]: { id: ITEMS.APPLE, name: "苹果", color: "#d43b2f", placeable: false, maxStack: 64, food: 4 },
  [ITEMS.BREAD]: { id: ITEMS.BREAD, name: "面包", color: "#c8964f", placeable: false, maxStack: 64, food: 5 },
  [ITEMS.WHEAT]: { id: ITEMS.WHEAT, name: "小麦", color: "#d9c56a", placeable: false, maxStack: 64 },
  [ITEMS.RAW_PORK]: { id: ITEMS.RAW_PORK, name: "生猪排", color: "#e78a8a", placeable: false, maxStack: 64, food: 3 },
  [ITEMS.COOKED_PORK]: { id: ITEMS.COOKED_PORK, name: "熟猪排", color: "#b5673a", placeable: false, maxStack: 64, food: 8 },
  [ITEMS.WOOD_PICKAXE]: { id: ITEMS.WOOD_PICKAXE, name: "木镐", color: "#b5904f", placeable: false, maxStack: 1, toolType: "pickaxe", toolTier: 1 },
  [ITEMS.STONE_PICKAXE]: { id: ITEMS.STONE_PICKAXE, name: "石镐", color: "#8a8a8a", placeable: false, maxStack: 1, toolType: "pickaxe", toolTier: 2 },
  [ITEMS.IRON_PICKAXE]: { id: ITEMS.IRON_PICKAXE, name: "铁镐", color: "#d8d8d8", placeable: false, maxStack: 1, toolType: "pickaxe", toolTier: 3 },
  [ITEMS.DIAMOND_PICKAXE]: { id: ITEMS.DIAMOND_PICKAXE, name: "钻石镐", color: "#5fd3c6", placeable: false, maxStack: 1, toolType: "pickaxe", toolTier: 4 },
  [ITEMS.WOOD_SWORD]: { id: ITEMS.WOOD_SWORD, name: "木剑", color: "#b5904f", placeable: false, maxStack: 1, toolType: "sword", toolTier: 1 },
  [ITEMS.STONE_SWORD]: { id: ITEMS.STONE_SWORD, name: "石剑", color: "#8a8a8a", placeable: false, maxStack: 1, toolType: "sword", toolTier: 2 },
  [ITEMS.IRON_SWORD]: { id: ITEMS.IRON_SWORD, name: "铁剑", color: "#d8d8d8", placeable: false, maxStack: 1, toolType: "sword", toolTier: 3 },
  [ITEMS.WOOD_AXE]: { id: ITEMS.WOOD_AXE, name: "木斧", color: "#b5904f", placeable: false, maxStack: 1, toolType: "axe", toolTier: 1 },
  [ITEMS.WOOD_SHOVEL]: { id: ITEMS.WOOD_SHOVEL, name: "木锹", color: "#b5904f", placeable: false, maxStack: 1, toolType: "shovel", toolTier: 1 },
  [ITEMS.REDSTONE]: { id: ITEMS.REDSTONE, name: "红石粉", color: "#a02020", placeable: false, maxStack: 64 },
  [ITEMS.LAPIS]: { id: ITEMS.LAPIS, name: "青金石", color: "#2a4bd8", placeable: false, maxStack: 64 },
  [ITEMS.EMERALD]: { id: ITEMS.EMERALD, name: "绿宝石", color: "#17c864", placeable: false, maxStack: 64 },
  [ITEMS.COPPER_INGOT]: { id: ITEMS.COPPER_INGOT, name: "铜锭", color: "#d97a49", placeable: false, maxStack: 64 },
  [ITEMS.RAW_IRON]: { id: ITEMS.RAW_IRON, name: "粗铁", color: "#b79b86", placeable: false, maxStack: 64 },
  [ITEMS.RAW_GOLD]: { id: ITEMS.RAW_GOLD, name: "粗金", color: "#d9c56a", placeable: false, maxStack: 64 },
  [ITEMS.RAW_COPPER]: { id: ITEMS.RAW_COPPER, name: "粗铜", color: "#d97a49", placeable: false, maxStack: 64 },
  [ITEMS.CHARCOAL]: { id: ITEMS.CHARCOAL, name: "木炭", color: "#2a2a2a", placeable: false, maxStack: 64 },
  [ITEMS.BONE]: { id: ITEMS.BONE, name: "骨头", color: "#e8e2c8", placeable: false, maxStack: 64 },
  [ITEMS.BONE_MEAL]: { id: ITEMS.BONE_MEAL, name: "骨粉", color: "#f0eacf", placeable: false, maxStack: 64 },
  [ITEMS.INK_SAC]: { id: ITEMS.INK_SAC, name: "墨囊", color: "#1a1a2a", placeable: false, maxStack: 64 },
  [ITEMS.SUGAR]: { id: ITEMS.SUGAR, name: "糖", color: "#f5f5f5", placeable: false, maxStack: 64 },
  [ITEMS.PAPER]: { id: ITEMS.PAPER, name: "纸", color: "#f0ecd8", placeable: false, maxStack: 64 },
  [ITEMS.BOOK]: { id: ITEMS.BOOK, name: "书", color: "#8a4b2a", placeable: false, maxStack: 64 },
  [ITEMS.CARROT]: { id: ITEMS.CARROT, name: "胡萝卜", color: "#e87a2a", placeable: false, maxStack: 64, food: 3 },
  [ITEMS.POTATO]: { id: ITEMS.POTATO, name: "土豆", color: "#c8a86a", placeable: false, maxStack: 64, food: 2 },
  [ITEMS.BAKED_POTATO]: { id: ITEMS.BAKED_POTATO, name: "烤土豆", color: "#a87840", placeable: false, maxStack: 64, food: 6 },
  [ITEMS.BEEF]: { id: ITEMS.BEEF, name: "生牛肉", color: "#c84a4a", placeable: false, maxStack: 64, food: 3 },
  [ITEMS.COOKED_BEEF]: { id: ITEMS.COOKED_BEEF, name: "牛排", color: "#a04a2a", placeable: false, maxStack: 64, food: 8 },
  [ITEMS.CHICKEN]: { id: ITEMS.CHICKEN, name: "生鸡肉", color: "#e8c8a8", placeable: false, maxStack: 64, food: 2 },
  [ITEMS.COOKED_CHICKEN]: { id: ITEMS.COOKED_CHICKEN, name: "熟鸡肉", color: "#c8a878", placeable: false, maxStack: 64, food: 6 },
  [ITEMS.MUTTON]: { id: ITEMS.MUTTON, name: "生羊肉", color: "#d8a8a8", placeable: false, maxStack: 64, food: 2 },
  [ITEMS.COOKED_MUTTON]: { id: ITEMS.COOKED_MUTTON, name: "熟羊肉", color: "#b88868", placeable: false, maxStack: 64, food: 6 },
  [ITEMS.GOLDEN_APPLE]: { id: ITEMS.GOLDEN_APPLE, name: "金苹果", color: "#e6cf5a", placeable: false, maxStack: 64, food: 4 },
  [ITEMS.SLIME_BALL]: { id: ITEMS.SLIME_BALL, name: "史莱姆球", color: "#7fff7f", placeable: false, maxStack: 64 },
  [ITEMS.MELON_SLICE]: { id: ITEMS.MELON_SLICE, name: "西瓜片", color: "#87e06a", placeable: false, maxStack: 64, food: 2 },
  [ITEMS.PUMPKIN_SEEDS]: { id: ITEMS.PUMPKIN_SEEDS, name: "南瓜种子", color: "#c8a85a", placeable: false, maxStack: 64 },
  [ITEMS.MELON_SEEDS]: { id: ITEMS.MELON_SEEDS, name: "西瓜种子", color: "#9a783a", placeable: false, maxStack: 64 },
  [ITEMS.WHEAT_SEEDS]: { id: ITEMS.WHEAT_SEEDS, name: "小麦种子", color: "#a89858", placeable: false, maxStack: 64 },
  [ITEMS.STONE_AXE]: { id: ITEMS.STONE_AXE, name: "石斧", color: "#8a8a8a", placeable: false, maxStack: 1, toolType: "axe", toolTier: 2 },
  [ITEMS.STONE_SHOVEL]: { id: ITEMS.STONE_SHOVEL, name: "石锹", color: "#8a8a8a", placeable: false, maxStack: 1, toolType: "shovel", toolTier: 2 },
  [ITEMS.IRON_AXE]: { id: ITEMS.IRON_AXE, name: "铁斧", color: "#d8d8d8", placeable: false, maxStack: 1, toolType: "axe", toolTier: 3 },
  [ITEMS.IRON_SHOVEL]: { id: ITEMS.IRON_SHOVEL, name: "铁锹", color: "#d8d8d8", placeable: false, maxStack: 1, toolType: "shovel", toolTier: 3 },
  [ITEMS.DIAMOND_AXE]: { id: ITEMS.DIAMOND_AXE, name: "钻石斧", color: "#5fd3c6", placeable: false, maxStack: 1, toolType: "axe", toolTier: 4 },
  [ITEMS.DIAMOND_SHOVEL]: { id: ITEMS.DIAMOND_SHOVEL, name: "钻石锹", color: "#5fd3c6", placeable: false, maxStack: 1, toolType: "shovel", toolTier: 4 },
  [ITEMS.GOLD_PICKAXE]: { id: ITEMS.GOLD_PICKAXE, name: "金镐", color: "#e6cf5a", placeable: false, maxStack: 1, toolType: "pickaxe", toolTier: 2 },
  [ITEMS.GOLD_SWORD]: { id: ITEMS.GOLD_SWORD, name: "金剑", color: "#e6cf5a", placeable: false, maxStack: 1, toolType: "sword", toolTier: 2 },
  [ITEMS.GOLD_AXE]: { id: ITEMS.GOLD_AXE, name: "金斧", color: "#e6cf5a", placeable: false, maxStack: 1, toolType: "axe", toolTier: 2 },
  [ITEMS.GOLD_SHOVEL]: { id: ITEMS.GOLD_SHOVEL, name: "金锹", color: "#e6cf5a", placeable: false, maxStack: 1, toolType: "shovel", toolTier: 2 },
  [ITEMS.STRING]: { id: ITEMS.STRING, name: "线", color: "#e8e8e8", placeable: false, maxStack: 64 },
}

export function getItem(id: ItemId): ItemMeta {
  return blockItemMeta[id] ?? pureItemMeta[id] ?? { id, name: "未知", color: "#ff00ff", placeable: false, maxStack: 64 }
}

export function isPlaceable(id: ItemId): boolean {
  return getItem(id).placeable
}

// 创造模式物品栏（可取用的全部方块 + 常用物品）
export function creativeItems(): ItemId[] {
  const list: ItemId[] = []
  for (const idStr in BLOCK_DEFS) {
    const id = Number(idStr)
    if (id === BLOCKS.AIR) continue
    list.push(id)
  }
  list.push(
    ITEMS.STICK, ITEMS.COAL, ITEMS.IRON_INGOT, ITEMS.GOLD_INGOT, ITEMS.DIAMOND,
    ITEMS.APPLE, ITEMS.BREAD, ITEMS.WHEAT, ITEMS.COOKED_PORK,
    ITEMS.WOOD_PICKAXE, ITEMS.STONE_PICKAXE, ITEMS.IRON_PICKAXE, ITEMS.DIAMOND_PICKAXE,
    ITEMS.WOOD_SWORD, ITEMS.STONE_SWORD, ITEMS.IRON_SWORD, ITEMS.WOOD_AXE, ITEMS.WOOD_SHOVEL,
    ITEMS.REDSTONE, ITEMS.LAPIS, ITEMS.EMERALD, ITEMS.COPPER_INGOT, ITEMS.CHARCOAL,
    ITEMS.RAW_IRON, ITEMS.RAW_GOLD, ITEMS.RAW_COPPER,
    ITEMS.BONE, ITEMS.BONE_MEAL, ITEMS.INK_SAC, ITEMS.SUGAR, ITEMS.PAPER, ITEMS.BOOK,
    ITEMS.CARROT, ITEMS.POTATO, ITEMS.BAKED_POTATO, ITEMS.BEEF, ITEMS.COOKED_BEEF,
    ITEMS.CHICKEN, ITEMS.COOKED_CHICKEN, ITEMS.MUTTON, ITEMS.COOKED_MUTTON,
    ITEMS.GOLDEN_APPLE, ITEMS.SLIME_BALL, ITEMS.MELON_SLICE, ITEMS.PUMPKIN_SEEDS,
    ITEMS.MELON_SEEDS, ITEMS.WHEAT_SEEDS, ITEMS.STONE_AXE, ITEMS.STONE_SHOVEL,
    ITEMS.IRON_AXE, ITEMS.IRON_SHOVEL, ITEMS.DIAMOND_AXE, ITEMS.DIAMOND_SHOVEL,
    ITEMS.GOLD_PICKAXE, ITEMS.GOLD_SWORD, ITEMS.GOLD_AXE, ITEMS.GOLD_SHOVEL, ITEMS.STRING,
  )
  return list
}

export { BLOCKS }
