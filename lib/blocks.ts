// 方块系统定义：类型、外观（逐面颜色）、物理属性

export type BlockId = number

// 方块数字 ID（0 = 空气）
export const BLOCKS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  SAND: 5,
  SANDSTONE: 6,
  GRAVEL: 7,
  WATER: 8,
  LOG: 9,
  LEAVES: 10,
  PLANKS: 11,
  SNOW: 12,
  SNOW_GRASS: 13,
  ICE: 14,
  BEDROCK: 15,
  COAL_ORE: 16,
  IRON_ORE: 17,
  GOLD_ORE: 18,
  DIAMOND_ORE: 19,
  GLASS: 20,
  CRAFTING_TABLE: 21,
  FURNACE: 22,
  CACTUS: 23,
  LAVA: 24,
  BRICK: 25,
  GLOWSTONE: 26,
  TORCH: 27,
  REDSTONE_ORE: 28,
  LAPIS_ORE: 29,
  EMERALD_ORE: 30,
  COPPER_ORE: 31,
  GRANITE: 32,
  POLISHED_GRANITE: 33,
  DIORITE: 34,
  POLISHED_DIORITE: 35,
  ANDESITE: 36,
  POLISHED_ANDESITE: 37,
  STONE_BRICKS: 38,
  CRACKED_STONE_BRICKS: 39,
  MOSSY_STONE_BRICKS: 40,
  CHISELED_STONE_BRICKS: 41,
  NETHER_BRICKS: 42,
  QUARTZ_BLOCK: 43,
  SPRUCE_PLANKS: 44,
  BIRCH_PLANKS: 45,
  JUNGLE_PLANKS: 46,
  SPRUCE_LOG: 47,
  BIRCH_LOG: 48,
  JUNGLE_LOG: 49,
  SPRUCE_LEAVES: 50,
  BIRCH_LEAVES: 51,
  JUNGLE_LEAVES: 52,
  BOOKSHELF: 53,
  PUMPKIN: 54,
  MELON: 55,
  HAY_BLOCK: 56,
  SLIME_BLOCK: 57,
  WOOL: 58,
  DIRT_PATH: 59,
  PODZOL: 60,
  MYCELIUM: 61,
  OBSIDIAN: 62,
  END_STONE: 63,
  ENCHANTING_TABLE: 64,
  ANVIL: 65,
  CHEST: 66,
  LADDER: 67,
  RAIL: 68,
  COBBLESTONE_WALL: 69,
  FENCE: 70,
  FENCE_GATE: 71,
} as const

export type BlockKey = keyof typeof BLOCKS

// [r,g,b] 0-1
type RGB = [number, number, number]

export interface BlockDef {
  id: BlockId
  key: BlockKey
  name: string
  // 面颜色：top / side / bottom
  top: RGB
  side: RGB
  bottom: RGB
  solid: boolean // 是否阻挡移动/可站立
  transparent: boolean // 是否需要渲染相邻面（如玻璃、树叶、水）
  liquid: boolean // 液体
  gravity: boolean // 受重力下落（沙子/砂砾）
  luminance: number // 自发光 0-15
  hardness: number // 挖掘时间系数（越大越慢），-1 = 不可破坏
  // 破坏后掉落的方块 id（默认掉落自身）
  drop?: BlockId
  // 燃料燃烧时长（tick），用于熔炉
  fuel?: number
}

function c(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const BLOCK_DEFS: Record<BlockId, BlockDef> = {
  [BLOCKS.AIR]: {
    id: 0, key: "AIR", name: "空气",
    top: [0, 0, 0], side: [0, 0, 0], bottom: [0, 0, 0],
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0,
  },
  [BLOCKS.GRASS]: {
    id: 1, key: "GRASS", name: "草方块",
    top: c("#78b85a"), side: c("#c49a6a"), bottom: c("#b8895c"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.6, drop: BLOCKS.DIRT,
  },
  [BLOCKS.DIRT]: {
    id: 2, key: "DIRT", name: "泥土",
    top: c("#c49a6a"), side: c("#c49a6a"), bottom: c("#b8895c"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.5,
  },
  [BLOCKS.STONE]: {
    id: 3, key: "STONE", name: "石头",
    top: c("#8a8a8a"), side: c("#828282"), bottom: c("#828282"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1.5, drop: BLOCKS.COBBLESTONE,
  },
  [BLOCKS.COBBLESTONE]: {
    id: 4, key: "COBBLESTONE", name: "圆石",
    top: c("#7d7d7d"), side: c("#767676"), bottom: c("#767676"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 0,
  },
  [BLOCKS.SAND]: {
    id: 5, key: "SAND", name: "沙子",
    top: c("#dcd29a"), side: c("#dbd199"), bottom: c("#dbd199"),
    solid: true, transparent: false, liquid: false, gravity: true, luminance: 0, hardness: 0.5,
  },
  [BLOCKS.SANDSTONE]: {
    id: 6, key: "SANDSTONE", name: "砂岩",
    top: c("#e3d9a6"), side: c("#d8ce9a"), bottom: c("#cfc48d"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.8,
  },
  [BLOCKS.GRAVEL]: {
    id: 7, key: "GRAVEL", name: "砂砾",
    top: c("#8a8480"), side: c("#847e7a"), bottom: c("#847e7a"),
    solid: true, transparent: false, liquid: false, gravity: true, luminance: 0, hardness: 0.6,
  },
  [BLOCKS.WATER]: {
    id: 8, key: "WATER", name: "水",
    top: c("#3a6ff0"), side: c("#3a6ff0"), bottom: c("#3a6ff0"),
    solid: false, transparent: true, liquid: true, gravity: false, luminance: 0, hardness: -1,
  },
  [BLOCKS.LOG]: {
    id: 9, key: "LOG", name: "橡木原木",
    top: c("#d0aa6c"), side: c("#ad7f4e"), bottom: c("#d0aa6c"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1, fuel: 300,
  },
  [BLOCKS.LEAVES]: {
    id: 10, key: "LEAVES", name: "树叶",
    top: c("#4f8a3a"), side: c("#4f8a3a"), bottom: c("#3f6f2e"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.2, drop: BLOCKS.AIR,
  },
  [BLOCKS.PLANKS]: {
    id: 11, key: "PLANKS", name: "木板",
    top: c("#b5904f"), side: c("#b5904f"), bottom: c("#b5904f"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.8, fuel: 300,
  },
  [BLOCKS.SNOW]: {
    id: 12, key: "SNOW", name: "雪块",
    top: c("#f5f7fa"), side: c("#eef1f6"), bottom: c("#eef1f6"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.3,
  },
  [BLOCKS.SNOW_GRASS]: {
    id: 13, key: "SNOW_GRASS", name: "雪草方块",
    top: c("#f5f7fa"), side: c("#8a7c5e"), bottom: c("#7a5c3e"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.6, drop: BLOCKS.DIRT,
  },
  [BLOCKS.ICE]: {
    id: 14, key: "ICE", name: "冰",
    top: c("#a8c8f0"), side: c("#9dbef0"), bottom: c("#9dbef0"),
    solid: true, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.5,
  },
  [BLOCKS.BEDROCK]: {
    id: 15, key: "BEDROCK", name: "基岩",
    top: c("#3a3a3a"), side: c("#333333"), bottom: c("#2c2c2c"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: -1,
  },
  [BLOCKS.COAL_ORE]: {
    id: 16, key: "COAL_ORE", name: "煤矿石",
    top: c("#5a5a5a"), side: c("#585858"), bottom: c("#585858"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.IRON_ORE]: {
    id: 17, key: "IRON_ORE", name: "铁矿石",
    top: c("#b79b86"), side: c("#af9480"), bottom: c("#af9480"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.GOLD_ORE]: {
    id: 18, key: "GOLD_ORE", name: "金矿石",
    top: c("#d9c56a"), side: c("#cbb85f"), bottom: c("#cbb85f"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.DIAMOND_ORE]: {
    id: 19, key: "DIAMOND_ORE", name: "钻石矿石",
    top: c("#5fd3c6"), side: c("#57c6ba"), bottom: c("#57c6ba"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.GLASS]: {
    id: 20, key: "GLASS", name: "玻璃",
    top: c("#cfe8f5"), side: c("#cfe8f5"), bottom: c("#cfe8f5"),
    solid: true, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.3, drop: BLOCKS.AIR,
  },
  [BLOCKS.CRAFTING_TABLE]: {
    id: 21, key: "CRAFTING_TABLE", name: "工作台",
    top: c("#a06a3a"), side: c("#8a5a30"), bottom: c("#b5904f"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1.5, fuel: 300,
  },
  [BLOCKS.FURNACE]: {
    id: 22, key: "FURNACE", name: "熔炉",
    top: c("#6f6f6f"), side: c("#5f5f5f"), bottom: c("#5f5f5f"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2.5,
  },
  [BLOCKS.CACTUS]: {
    id: 23, key: "CACTUS", name: "仙人掌",
    top: c("#4f7a3a"), side: c("#3f6f2e"), bottom: c("#3f6f2e"),
    solid: true, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.4,
  },
  [BLOCKS.LAVA]: {
    id: 24, key: "LAVA", name: "岩浆",
    top: c("#e2632a"), side: c("#d9531f"), bottom: c("#d9531f"),
    solid: false, transparent: true, liquid: true, gravity: false, luminance: 15, hardness: -1,
  },
  [BLOCKS.BRICK]: {
    id: 25, key: "BRICK", name: "砖块",
    top: c("#9c5b4b"), side: c("#96564a"), bottom: c("#96564a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.GLOWSTONE]: {
    id: 26, key: "GLOWSTONE", name: "荧石",
    top: c("#e8d98a"), side: c("#e0cf7a"), bottom: c("#e0cf7a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 15, hardness: 0.4,
  },
  [BLOCKS.TORCH]: {
    id: 27, key: "TORCH", name: "火把",
    top: c("#ffd25a"), side: c("#c88a3a"), bottom: c("#c88a3a"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 14, hardness: 0,
  },
  [BLOCKS.REDSTONE_ORE]: {
    id: 28, key: "REDSTONE_ORE", name: "红石矿石",
    top: c("#8a3030"), side: c("#7a2828"), bottom: c("#7a2828"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 5, hardness: 3,
  },
  [BLOCKS.LAPIS_ORE]: {
    id: 29, key: "LAPIS_ORE", name: "青金石矿石",
    top: c("#1a3a8a"), side: c("#16307a"), bottom: c("#16307a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.EMERALD_ORE]: {
    id: 30, key: "EMERALD_ORE", name: "绿宝石矿石",
    top: c("#206a3a"), side: c("#1a5a30"), bottom: c("#1a5a30"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.COPPER_ORE]: {
    id: 31, key: "COPPER_ORE", name: "铜矿石",
    top: c("#a8683a"), side: c("#9a5c30"), bottom: c("#9a5c30"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.GRANITE]: {
    id: 32, key: "GRANITE", name: "花岗岩",
    top: c("#c88a7a"), side: c("#b87a6a"), bottom: c("#b87a6a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1.5,
  },
  [BLOCKS.POLISHED_GRANITE]: {
    id: 33, key: "POLISHED_GRANITE", name: "磨制花岗岩",
    top: c("#d89a8a"), side: c("#c88a7a"), bottom: c("#c88a7a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.DIORITE]: {
    id: 34, key: "DIORITE", name: "闪长岩",
    top: c("#bcbcbc"), side: c("#b0b0b0"), bottom: c("#b0b0b0"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1.5,
  },
  [BLOCKS.POLISHED_DIORITE]: {
    id: 35, key: "POLISHED_DIORITE", name: "磨制闪长岩",
    top: c("#cccccc"), side: c("#c0c0c0"), bottom: c("#c0c0c0"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.ANDESITE]: {
    id: 36, key: "ANDESITE", name: "安山岩",
    top: c("#8a8278"), side: c("#807870"), bottom: c("#807870"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1.5,
  },
  [BLOCKS.POLISHED_ANDESITE]: {
    id: 37, key: "POLISHED_ANDESITE", name: "磨制安山岩",
    top: c("#9a9288"), side: c("#908880"), bottom: c("#908880"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.STONE_BRICKS]: {
    id: 38, key: "STONE_BRICKS", name: "石砖",
    top: c("#7d7d7d"), side: c("#767676"), bottom: c("#767676"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.CRACKED_STONE_BRICKS]: {
    id: 39, key: "CRACKED_STONE_BRICKS", name: "裂石砖",
    top: c("#7a7a7a"), side: c("#737373"), bottom: c("#737373"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.MOSSY_STONE_BRICKS]: {
    id: 40, key: "MOSSY_STONE_BRICKS", name: "苔石砖",
    top: c("#6a7d6a"), side: c("#637663"), bottom: c("#637663"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.CHISELED_STONE_BRICKS]: {
    id: 41, key: "CHISELED_STONE_BRICKS", name: "錾制石砖",
    top: c("#808080"), side: c("#797979"), bottom: c("#797979"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.NETHER_BRICKS]: {
    id: 42, key: "NETHER_BRICKS", name: "下界砖块",
    top: c("#3a1a1a"), side: c("#301515"), bottom: c("#301515"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.QUARTZ_BLOCK]: {
    id: 43, key: "QUARTZ_BLOCK", name: "石英块",
    top: c("#f0ebe0"), side: c("#e8e2d5"), bottom: c("#e8e2d5"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.8,
  },
  [BLOCKS.SPRUCE_PLANKS]: {
    id: 44, key: "SPRUCE_PLANKS", name: "云杉木板",
    top: c("#6b4a2a"), side: c("#6b4a2a"), bottom: c("#6b4a2a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.BIRCH_PLANKS]: {
    id: 45, key: "BIRCH_PLANKS", name: "白桦木板",
    top: c("#e8dcb8"), side: c("#e8dcb8"), bottom: c("#e8dcb8"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.JUNGLE_PLANKS]: {
    id: 46, key: "JUNGLE_PLANKS", name: "丛林木板",
    top: c("#8a6a3a"), side: c("#8a6a3a"), bottom: c("#8a6a3a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.SPRUCE_LOG]: {
    id: 47, key: "SPRUCE_LOG", name: "云杉原木",
    top: c("#8a6a4a"), side: c("#4a2f1a"), bottom: c("#8a6a4a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.BIRCH_LOG]: {
    id: 48, key: "BIRCH_LOG", name: "白桦原木",
    top: c("#d8cea8"), side: c("#c8c0a0"), bottom: c("#d8cea8"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.JUNGLE_LOG]: {
    id: 49, key: "JUNGLE_LOG", name: "丛林原木",
    top: c("#a9885f"), side: c("#6b4f2f"), bottom: c("#a9885f"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.SPRUCE_LEAVES]: {
    id: 50, key: "SPRUCE_LEAVES", name: "云杉树叶",
    top: c("#2f5a2a"), side: c("#2f5a2a"), bottom: c("#264a22"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.2, drop: BLOCKS.AIR,
  },
  [BLOCKS.BIRCH_LEAVES]: {
    id: 51, key: "BIRCH_LEAVES", name: "白桦树叶",
    top: c("#7ac84a"), side: c("#7ac84a"), bottom: c("#6ab83a"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.2, drop: BLOCKS.AIR,
  },
  [BLOCKS.JUNGLE_LEAVES]: {
    id: 52, key: "JUNGLE_LEAVES", name: "丛林树叶",
    top: c("#4f9a3a"), side: c("#4f9a3a"), bottom: c("#3f8a2e"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.2, drop: BLOCKS.AIR,
  },
  [BLOCKS.BOOKSHELF]: {
    id: 53, key: "BOOKSHELF", name: "书架",
    top: c("#b5904f"), side: c("#8a5a30"), bottom: c("#b5904f"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1.5, fuel: 300,
  },
  [BLOCKS.PUMPKIN]: {
    id: 54, key: "PUMPKIN", name: "南瓜",
    top: c("#e89a3a"), side: c("#d88a2a"), bottom: c("#d88a2a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1,
  },
  [BLOCKS.MELON]: {
    id: 55, key: "MELON", name: "西瓜",
    top: c("#9ac86a"), side: c("#8ab85a"), bottom: c("#8ab85a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 1,
  },
  [BLOCKS.HAY_BLOCK]: {
    id: 56, key: "HAY_BLOCK", name: "干草块",
    top: c("#e8d06a"), side: c("#dcc05a"), bottom: c("#dcc05a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.5,
  },
  [BLOCKS.SLIME_BLOCK]: {
    id: 57, key: "SLIME_BLOCK", name: "粘液块",
    top: c("#7fff7f"), side: c("#7fff7f"), bottom: c("#7fff7f"),
    solid: true, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0,
  },
  [BLOCKS.WOOL]: {
    id: 58, key: "WOOL", name: "羊毛",
    top: c("#e8e8e8"), side: c("#e0e0e0"), bottom: c("#e0e0e0"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.8,
  },
  [BLOCKS.DIRT_PATH]: {
    id: 59, key: "DIRT_PATH", name: "草径",
    top: c("#b89a6a"), side: c("#7a5c3e"), bottom: c("#7a5c3e"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.6,
  },
  [BLOCKS.PODZOL]: {
    id: 60, key: "PODZOL", name: "灰化土",
    top: c("#5a4a3a"), side: c("#6a5a4a"), bottom: c("#7a5c3e"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.5,
  },
  [BLOCKS.MYCELIUM]: {
    id: 61, key: "MYCELIUM", name: "菌丝",
    top: c("#a88ac8"), side: c("#8a6a9a"), bottom: c("#7a5c3e"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 0.5,
  },
  [BLOCKS.OBSIDIAN]: {
    id: 62, key: "OBSIDIAN", name: "黑曜石",
    top: c("#1a102a"), side: c("#150a20"), bottom: c("#150a20"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 50,
  },
  [BLOCKS.END_STONE]: {
    id: 63, key: "END_STONE", name: "末地石",
    top: c("#e8e0a8"), side: c("#dcd49a"), bottom: c("#dcd49a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 3,
  },
  [BLOCKS.ENCHANTING_TABLE]: {
    id: 64, key: "ENCHANTING_TABLE", name: "附魔台",
    top: c("#2a2a3a"), side: c("#1a1a2a"), bottom: c("#1a1a2a"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 7, hardness: 5,
  },
  [BLOCKS.ANVIL]: {
    id: 65, key: "ANVIL", name: "铁砧",
    top: c("#5a5a62"), side: c("#4a4a52"), bottom: c("#4a4a52"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 5,
  },
  [BLOCKS.CHEST]: {
    id: 66, key: "CHEST", name: "箱子",
    top: c("#a06a3a"), side: c("#8a5a30"), bottom: c("#8a5a30"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2.5,
  },
  [BLOCKS.LADDER]: {
    id: 67, key: "LADDER", name: "梯子",
    top: c("#b5904f"), side: c("#b5904f"), bottom: c("#b5904f"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.4,
  },
  [BLOCKS.RAIL]: {
    id: 68, key: "RAIL", name: "铁轨",
    top: c("#a0a0a8"), side: c("#8a8a92"), bottom: c("#8a8a92"),
    solid: false, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 0.7,
  },
  [BLOCKS.COBBLESTONE_WALL]: {
    id: 69, key: "COBBLESTONE_WALL", name: "圆石墙",
    top: c("#7d7d7d"), side: c("#767676"), bottom: c("#767676"),
    solid: true, transparent: false, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
  [BLOCKS.FENCE]: {
    id: 70, key: "FENCE", name: "木栅栏",
    top: c("#b5904f"), side: c("#b5904f"), bottom: c("#b5904f"),
    solid: true, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 2, fuel: 300,
  },
  [BLOCKS.FENCE_GATE]: {
    id: 71, key: "FENCE_GATE", name: "栅栏门",
    top: c("#b5904f"), side: c("#b5904f"), bottom: c("#b5904f"),
    solid: true, transparent: true, liquid: false, gravity: false, luminance: 0, hardness: 2,
  },
}

export function getBlock(id: BlockId): BlockDef {
  return BLOCK_DEFS[id] ?? BLOCK_DEFS[BLOCKS.AIR]
}

export function isSolid(id: BlockId): boolean {
  return getBlock(id).solid
}

export function isTransparent(id: BlockId): boolean {
  return getBlock(id).transparent
}

export function isLiquid(id: BlockId): boolean {
  return getBlock(id).liquid
}

// 破坏方块得到的掉落物 id
export function getDrop(id: BlockId): BlockId {
  const def = getBlock(id)
  return def.drop !== undefined ? def.drop : id
}

// 方块适宜工具 + 开采所需最低工具材质等级（toolTier：1木 2石 3铁 4钻）
export interface BlockToolInfo {
  tool: "pickaxe" | "axe" | "shovel"
  minTier?: number
}

const BLOCK_TOOL: Partial<Record<BlockId, BlockToolInfo>> = {
  // 石头/矿物类 → 镐
  [BLOCKS.STONE]: { tool: "pickaxe" },
  [BLOCKS.COBBLESTONE]: { tool: "pickaxe" },
  [BLOCKS.SANDSTONE]: { tool: "pickaxe" },
  [BLOCKS.COAL_ORE]: { tool: "pickaxe" },
  [BLOCKS.IRON_ORE]: { tool: "pickaxe", minTier: 2 },
  [BLOCKS.GOLD_ORE]: { tool: "pickaxe", minTier: 3 },
  [BLOCKS.DIAMOND_ORE]: { tool: "pickaxe", minTier: 3 },
  [BLOCKS.REDSTONE_ORE]: { tool: "pickaxe", minTier: 3 },
  [BLOCKS.LAPIS_ORE]: { tool: "pickaxe", minTier: 2 },
  [BLOCKS.EMERALD_ORE]: { tool: "pickaxe", minTier: 3 },
  [BLOCKS.COPPER_ORE]: { tool: "pickaxe", minTier: 2 },
  [BLOCKS.GRANITE]: { tool: "pickaxe" },
  [BLOCKS.DIORITE]: { tool: "pickaxe" },
  [BLOCKS.ANDESITE]: { tool: "pickaxe" },
  [BLOCKS.POLISHED_GRANITE]: { tool: "pickaxe" },
  [BLOCKS.POLISHED_DIORITE]: { tool: "pickaxe" },
  [BLOCKS.POLISHED_ANDESITE]: { tool: "pickaxe" },
  [BLOCKS.STONE_BRICKS]: { tool: "pickaxe" },
  [BLOCKS.CRACKED_STONE_BRICKS]: { tool: "pickaxe" },
  [BLOCKS.MOSSY_STONE_BRICKS]: { tool: "pickaxe" },
  [BLOCKS.CHISELED_STONE_BRICKS]: { tool: "pickaxe" },
  [BLOCKS.NETHER_BRICKS]: { tool: "pickaxe" },
  [BLOCKS.QUARTZ_BLOCK]: { tool: "pickaxe" },
  [BLOCKS.BRICK]: { tool: "pickaxe" },
  [BLOCKS.GLOWSTONE]: { tool: "pickaxe" },
  [BLOCKS.END_STONE]: { tool: "pickaxe" },
  [BLOCKS.OBSIDIAN]: { tool: "pickaxe", minTier: 4 },
  [BLOCKS.ENCHANTING_TABLE]: { tool: "pickaxe" },
  [BLOCKS.ANVIL]: { tool: "pickaxe" },
  [BLOCKS.FURNACE]: { tool: "pickaxe" },
  [BLOCKS.COBBLESTONE_WALL]: { tool: "pickaxe" },
  // 木质类 → 斧
  [BLOCKS.LOG]: { tool: "axe" },
  [BLOCKS.SPRUCE_LOG]: { tool: "axe" },
  [BLOCKS.BIRCH_LOG]: { tool: "axe" },
  [BLOCKS.JUNGLE_LOG]: { tool: "axe" },
  [BLOCKS.PLANKS]: { tool: "axe" },
  [BLOCKS.SPRUCE_PLANKS]: { tool: "axe" },
  [BLOCKS.BIRCH_PLANKS]: { tool: "axe" },
  [BLOCKS.JUNGLE_PLANKS]: { tool: "axe" },
  [BLOCKS.CRAFTING_TABLE]: { tool: "axe" },
  [BLOCKS.BOOKSHELF]: { tool: "axe" },
  [BLOCKS.CHEST]: { tool: "axe" },
  [BLOCKS.FENCE]: { tool: "axe" },
  [BLOCKS.FENCE_GATE]: { tool: "axe" },
  [BLOCKS.PUMPKIN]: { tool: "axe" },
  [BLOCKS.MELON]: { tool: "axe" },
  [BLOCKS.LADDER]: { tool: "axe" },
  // 土质类 → 锹
  [BLOCKS.GRASS]: { tool: "shovel" },
  [BLOCKS.DIRT]: { tool: "shovel" },
  [BLOCKS.SAND]: { tool: "shovel" },
  [BLOCKS.GRAVEL]: { tool: "shovel" },
  [BLOCKS.SNOW]: { tool: "shovel" },
  [BLOCKS.SNOW_GRASS]: { tool: "shovel" },
  [BLOCKS.DIRT_PATH]: { tool: "shovel" },
  [BLOCKS.PODZOL]: { tool: "shovel" },
  [BLOCKS.MYCELIUM]: { tool: "shovel" },
}

export function getBlockTool(id: BlockId): BlockToolInfo | undefined {
  return BLOCK_TOOL[id]
}
