// 合成配方（有序/无序）与熔炉烧制
import { BLOCKS } from "./blocks"
import { ITEMS, type ItemId } from "./items"

export interface Recipe {
  // 有序配方用 pattern（每格 itemId 或 0=空），网格边长 size
  // 无序配方用 shapeless 列表
  result: { id: ItemId; count: number }
  pattern?: (ItemId | 0)[]
  size?: number // 2 或 3
  shapeless?: ItemId[]
}

const P = BLOCKS.PLANKS
const S = ITEMS.STICK

export const RECIPES: Recipe[] = [
  // 原木 -> 4 木板（无序，任意 1 个原木）
  { shapeless: [BLOCKS.LOG], result: { id: BLOCKS.PLANKS, count: 4 } },
  // 2 木板竖直 -> 4 木棍
  { pattern: [P, 0, P, 0], size: 2, result: { id: ITEMS.STICK, count: 4 } },
  // 4 木板 -> 工作台
  { pattern: [P, P, P, P], size: 2, result: { id: BLOCKS.CRAFTING_TABLE, count: 1 } },
  // 8 圆石 -> 熔炉
  {
    pattern: [
      BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
      BLOCKS.COBBLESTONE, 0, BLOCKS.COBBLESTONE,
      BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
    ],
    size: 3,
    result: { id: BLOCKS.FURNACE, count: 1 },
  },
  // 木镐
  {
    pattern: [P, P, P, 0, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.WOOD_PICKAXE, count: 1 },
  },
  // 石镐
  {
    pattern: [BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, 0, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.STONE_PICKAXE, count: 1 },
  },
  // 铁镐
  {
    pattern: [ITEMS.IRON_INGOT, ITEMS.IRON_INGOT, ITEMS.IRON_INGOT, 0, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.IRON_PICKAXE, count: 1 },
  },
  // 钻石镐
  {
    pattern: [ITEMS.DIAMOND, ITEMS.DIAMOND, ITEMS.DIAMOND, 0, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.DIAMOND_PICKAXE, count: 1 },
  },
  // 木剑
  { pattern: [P, 0, P, 0, S, 0], size: 2, result: { id: ITEMS.WOOD_SWORD, count: 1 } },
  // 石剑（3 格竖列，用 2x2 无法表达，用 3x3）
  {
    pattern: [0, BLOCKS.COBBLESTONE, 0, 0, BLOCKS.COBBLESTONE, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.STONE_SWORD, count: 1 },
  },
  // 铁剑
  {
    pattern: [0, ITEMS.IRON_INGOT, 0, 0, ITEMS.IRON_INGOT, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.IRON_SWORD, count: 1 },
  },
  // 木斧
  {
    pattern: [P, P, 0, P, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.WOOD_AXE, count: 1 },
  },
  // 木锹
  { pattern: [0, P, 0, 0, S, 0, 0, S, 0], size: 3, result: { id: ITEMS.WOOD_SHOVEL, count: 1 } },
  // 火把：煤 + 木棍
  { pattern: [ITEMS.COAL, 0, S, 0], size: 2, result: { id: BLOCKS.TORCH, count: 4 } },
  // 玻璃由熔炉烧沙（见 SMELTING），砖由熔炉烧... 这里给 4 砖 -> 无（跳过）
  // 3 小麦 -> 面包
  { pattern: [ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, 0], size: 2, result: { id: ITEMS.BREAD, count: 1 } },
  // 4 石头 -> 4 石砖
  { shapeless: [BLOCKS.STONE, BLOCKS.STONE, BLOCKS.STONE, BLOCKS.STONE], result: { id: BLOCKS.STONE_BRICKS, count: 4 } },
  // 1 石砖 -> 1 錾制石砖（简化）
  { shapeless: [BLOCKS.STONE_BRICKS], result: { id: BLOCKS.CHISELED_STONE_BRICKS, count: 1 } },
  // 4 线 -> 1 羊毛
  { shapeless: [ITEMS.STRING, ITEMS.STRING, ITEMS.STRING, ITEMS.STRING], result: { id: BLOCKS.WOOL, count: 1 } },
  // 9 西瓜片 -> 1 西瓜（无序）
  { shapeless: [ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE, ITEMS.MELON_SLICE], result: { id: BLOCKS.MELON, count: 1 } },
  // 9 小麦 -> 1 干草块（无序）
  { shapeless: [ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT, ITEMS.WHEAT], result: { id: BLOCKS.HAY_BLOCK, count: 1 } },
  // 木栅栏：6 木板+2 木棍 -> 2 栅栏（3x2）
  {
    pattern: [
      P, S, P,
      P, S, P,
    ],
    size: 3,
    result: { id: BLOCKS.FENCE, count: 2 },
  },
  // 栅栏门：4 木板+2 木棍 -> 1 FENCE_GATE（2x3）
  {
    pattern: [
      S, P, S,
      S, P, S,
    ],
    size: 3,
    result: { id: BLOCKS.FENCE_GATE, count: 1 },
  },
  // 圆石墙：6 圆石 -> 6 墙（3x2 两行）
  {
    pattern: [
      BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
      BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
    ],
    size: 3,
    result: { id: BLOCKS.COBBLESTONE_WALL, count: 6 },
  },
  // 梯子：7 木棍 -> 3 梯子（3x3 pattern：S 0 S / S S S / S 0 S）
  {
    pattern: [
      S, 0, S,
      S, S, S,
      S, 0, S,
    ],
    size: 3,
    result: { id: BLOCKS.LADDER, count: 3 },
  },
  // 金苹果：8 金锭+1 苹果 -> 1 金苹果（3x3 周围金）
  {
    pattern: [
      ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT,
      ITEMS.GOLD_INGOT, ITEMS.APPLE, ITEMS.GOLD_INGOT,
      ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT,
    ],
    size: 3,
    result: { id: ITEMS.GOLDEN_APPLE, count: 1 },
  },
  // 西瓜种子：1 西瓜片 -> 4 种子
  { shapeless: [ITEMS.MELON_SLICE], result: { id: ITEMS.MELON_SEEDS, count: 4 } },
  // 南瓜种子：1 南瓜 -> 4 种子
  { shapeless: [BLOCKS.PUMPKIN], result: { id: ITEMS.PUMPKIN_SEEDS, count: 4 } },
  // 骨粉：1 骨头 -> 3 骨粉
  { shapeless: [ITEMS.BONE], result: { id: ITEMS.BONE_MEAL, count: 3 } },
  // 石斧
  {
    pattern: [BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, 0, BLOCKS.COBBLESTONE, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.STONE_AXE, count: 1 },
  },
  // 石锹
  { pattern: [0, BLOCKS.COBBLESTONE, 0, 0, S, 0, 0, S, 0], size: 3, result: { id: ITEMS.STONE_SHOVEL, count: 1 } },
  // 铁斧
  {
    pattern: [ITEMS.IRON_INGOT, ITEMS.IRON_INGOT, 0, ITEMS.IRON_INGOT, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.IRON_AXE, count: 1 },
  },
  // 铁锹
  { pattern: [0, ITEMS.IRON_INGOT, 0, 0, S, 0, 0, S, 0], size: 3, result: { id: ITEMS.IRON_SHOVEL, count: 1 } },
  // 钻石斧
  {
    pattern: [ITEMS.DIAMOND, ITEMS.DIAMOND, 0, ITEMS.DIAMOND, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.DIAMOND_AXE, count: 1 },
  },
  // 钻石锹
  { pattern: [0, ITEMS.DIAMOND, 0, 0, S, 0, 0, S, 0], size: 3, result: { id: ITEMS.DIAMOND_SHOVEL, count: 1 } },
  // 金镐
  {
    pattern: [ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT, 0, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.GOLD_PICKAXE, count: 1 },
  },
  // 金剑
  {
    pattern: [0, ITEMS.GOLD_INGOT, 0, 0, ITEMS.GOLD_INGOT, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.GOLD_SWORD, count: 1 },
  },
  // 金斧
  {
    pattern: [ITEMS.GOLD_INGOT, ITEMS.GOLD_INGOT, 0, ITEMS.GOLD_INGOT, S, 0, 0, S, 0],
    size: 3,
    result: { id: ITEMS.GOLD_AXE, count: 1 },
  },
  // 金锹
  { pattern: [0, ITEMS.GOLD_INGOT, 0, 0, S, 0, 0, S, 0], size: 3, result: { id: ITEMS.GOLD_SHOVEL, count: 1 } },
  // 云杉原木 -> 4 云杉木板
  { shapeless: [BLOCKS.SPRUCE_LOG], result: { id: BLOCKS.SPRUCE_PLANKS, count: 4 } },
  // 白桦原木 -> 4 白桦木板
  { shapeless: [BLOCKS.BIRCH_LOG], result: { id: BLOCKS.BIRCH_PLANKS, count: 4 } },
  // 丛林原木 -> 4 丛林木板
  { shapeless: [BLOCKS.JUNGLE_LOG], result: { id: BLOCKS.JUNGLE_PLANKS, count: 4 } },
]

// 把网格裁剪到最小包围盒后与配方比对（支持平移不变）
function normalizeGrid(grid: (ItemId | 0)[], size: number): (ItemId | 0)[] | null {
  let minR = size, maxR = -1, minC = size, maxC = -1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r * size + c] !== 0) {
        minR = Math.min(minR, r)
        maxR = Math.max(maxR, r)
        minC = Math.min(minC, c)
        maxC = Math.max(maxC, c)
      }
    }
  }
  if (maxR < 0) return null // 空网格
  const h = maxR - minR + 1
  const w = maxC - minC + 1
  const out: (ItemId | 0)[] = []
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out.push(grid[(minR + r) * size + (minC + c)])
    }
  }
  // 用宽度前缀标记：[w, ...cells]
  return [w as ItemId, ...out]
}

function patternSignature(pattern: (ItemId | 0)[], size: number): string {
  const norm = normalizeGrid(pattern, size)
  if (!norm) return ""
  return norm.join(",")
}

export function matchRecipe(grid: (ItemId | 0)[], size: number): { id: ItemId; count: number } | null {
  // 无序匹配
  const present = grid.filter((g) => g !== 0)
  for (const r of RECIPES) {
    if (r.shapeless) {
      if (present.length === r.shapeless.length) {
        const a = [...present].sort()
        const b = [...r.shapeless].sort()
        if (a.every((v, i) => v === b[i])) return r.result
      }
    }
  }
  // 有序匹配（平移不变）
  const gridSig = patternSignature(grid, size)
  if (gridSig === "") return null
  for (const r of RECIPES) {
    if (r.pattern && r.size) {
      const sig = patternSignature(r.pattern, r.size)
      if (sig === gridSig) return r.result
    }
  }
  return null
}

// 熔炉烧制映射：输入 -> 输出
export const SMELTING: Record<number, ItemId> = {
  [BLOCKS.IRON_ORE]: ITEMS.IRON_INGOT,
  [BLOCKS.GOLD_ORE]: ITEMS.GOLD_INGOT,
  [BLOCKS.SAND]: BLOCKS.GLASS,
  [BLOCKS.COBBLESTONE]: BLOCKS.STONE,
  [BLOCKS.LOG]: ITEMS.CHARCOAL,
  [ITEMS.RAW_PORK]: ITEMS.COOKED_PORK,
  [BLOCKS.CACTUS]: BLOCKS.SAND,
  [BLOCKS.COPPER_ORE]: ITEMS.COPPER_INGOT,
  [BLOCKS.SPRUCE_LOG]: ITEMS.CHARCOAL,
  [BLOCKS.BIRCH_LOG]: ITEMS.CHARCOAL,
  [BLOCKS.JUNGLE_LOG]: ITEMS.CHARCOAL,
  [ITEMS.POTATO]: ITEMS.BAKED_POTATO,
  [ITEMS.BEEF]: ITEMS.COOKED_BEEF,
  [ITEMS.CHICKEN]: ITEMS.COOKED_CHICKEN,
  [ITEMS.MUTTON]: ITEMS.COOKED_MUTTON,
}

export function smeltResult(inputId: number): ItemId | null {
  return SMELTING[inputId] ?? null
}

// 燃料燃烧时长（tick 数，1 tick ≈ 0.1s），近似原版
export function fuelBurnTime(id: number): number {
  switch (id) {
    case ITEMS.COAL:
      return 80
    case BLOCKS.LOG:
    case BLOCKS.PLANKS:
    case BLOCKS.CRAFTING_TABLE:
      return 15
    case ITEMS.STICK:
      return 5
    case ITEMS.CHARCOAL:
      return 80
    case BLOCKS.SPRUCE_LOG:
    case BLOCKS.BIRCH_LOG:
    case BLOCKS.JUNGLE_LOG:
    case BLOCKS.SPRUCE_PLANKS:
    case BLOCKS.BIRCH_PLANKS:
    case BLOCKS.JUNGLE_PLANKS:
      return 15
    case BLOCKS.HAY_BLOCK:
      return 100
    case BLOCKS.BOOKSHELF:
      return 135
    case BLOCKS.FENCE:
    case BLOCKS.FENCE_GATE:
      return 15
    default:
      return 0
  }
}
