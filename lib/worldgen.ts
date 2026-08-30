// 世界程序化生成：多群系、洞穴、分层矿石、树木
import { Noise } from "./noise"
import { BLOCKS, type BlockId } from "./blocks"

export const CHUNK_SIZE = 16 // x/z 尺寸
export const WORLD_HEIGHT = 128 // y 高度
export const SEA_LEVEL = 48

export type Biome = "plains" | "forest" | "desert" | "snow" | "ocean"

export function chunkIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

export interface GeneratedChunk {
  cx: number
  cz: number
  blocks: Uint8Array // 长度 CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT
}

export class WorldGenerator {
  private heightNoise: Noise
  private biomeTemp: Noise
  private biomeHumid: Noise
  private caveNoise: Noise
  private oreNoise: Noise
  private treeNoise: Noise
  private wormNoiseA: Noise
  private wormNoiseB: Noise
  private biomeStoneNoise: Noise
  readonly seed: number

  constructor(seed: number) {
    this.seed = seed
    this.heightNoise = new Noise(seed)
    this.biomeTemp = new Noise(seed + 1000)
    this.biomeHumid = new Noise(seed + 2000)
    this.caveNoise = new Noise(seed + 3000)
    this.oreNoise = new Noise(seed + 4000)
    this.treeNoise = new Noise(seed + 5000)
    this.wormNoiseA = new Noise(seed + 6000)
    this.wormNoiseB = new Noise(seed + 7000)
    this.biomeStoneNoise = new Noise(seed + 8000)
  }

  getBiome(wx: number, wz: number): Biome {
    const t = this.biomeTemp.fbm2(wx * 0.004, wz * 0.004, 3)
    const h = this.biomeHumid.fbm2(wx * 0.004 + 100, wz * 0.004 + 100, 3)
    if (t > 0.35 && h < -0.1) return "desert"
    if (t < -0.3) return "snow"
    if (h > 0.15) return "forest"
    return "plains"
  }

  getHeight(wx: number, wz: number): number {
    const continent = this.heightNoise.fbm2(wx * 0.0035, wz * 0.0035, 4)
    const hills = this.heightNoise.fbm2(wx * 0.02 + 50, wz * 0.02 + 50, 4) * 0.5
    let h = SEA_LEVEL + 6 + continent * 24 + hills * 12
    return Math.floor(h)
  }

  getContinent(wx: number, wz: number): number {
    return this.heightNoise.fbm2(wx * 0.0035, wz * 0.0035, 4)
  }

  private pseudoRandom(x: number, z: number): number {
    const v = this.treeNoise.perlin2(x * 12.9898, z * 78.233)
    return v - Math.floor(v) < 0 ? v - Math.floor(v) + 1 : v - Math.floor(v)
  }

  private pseudoRandom3(x: number, y: number, z: number): number {
    const n = this.oreNoise.perlin3(x * 0.374761, y * 0.732441, z * 0.123456)
    const v = Math.sin(n * 43758.5453 + x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    return v - Math.floor(v) < 0 ? v - Math.floor(v) + 1 : v - Math.floor(v)
  }

  generateChunk(cx: number, cz: number): Uint8Array {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
    const baseX = cx * CHUNK_SIZE
    const baseZ = cz * CHUNK_SIZE

    const continentCache = new Float64Array(CHUNK_SIZE * CHUNK_SIZE)
    const pseudoCache = new Float64Array(CHUNK_SIZE * CHUNK_SIZE)
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = baseX + lx
        const wz = baseZ + lz
        continentCache[lx + lz * CHUNK_SIZE] = this.getContinent(wx, wz)
        pseudoCache[lx + lz * CHUNK_SIZE] = this.pseudoRandom(wx + 100, wz)
      }
    }

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = baseX + lx
        const wz = baseZ + lz
        const biome = this.getBiome(wx, wz)
        const height = this.getHeight(wx, wz)
        const isOcean = height < SEA_LEVEL - 3
        const continent = continentCache[lx + lz * CHUNK_SIZE]
        const colPseudo = pseudoCache[lx + lz * CHUNK_SIZE]
        const wormMaxY = Math.min(height - 2, 115)

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          let block: BlockId = BLOCKS.AIR
          let carvedByCheese = false
          let tubeValue = 1.0

          if (y === 0) {
            block = BLOCKS.BEDROCK
          } else if (y <= height) {
            const depth = height - y
            if (y < height - 4) {
              block = BLOCKS.STONE
            } else if (depth === 0) {
              if (isOcean) {
                block = BLOCKS.SAND
              } else if (biome === "desert") {
                block = BLOCKS.SAND
              } else if (biome === "snow") {
                block = BLOCKS.SNOW_GRASS
              } else {
                block = BLOCKS.GRASS
              }
            } else {
              if (biome === "desert") block = depth < 3 ? BLOCKS.SAND : BLOCKS.SANDSTONE
              else if (isOcean) block = BLOCKS.SAND
              else block = BLOCKS.DIRT
            }

            let carveAir = false

            if (y >= 4 && y <= height - 3) {
              const cheese =
                this.caveNoise.fbm3(wx * 0.035, y * 0.05, wz * 0.035, 3) * 0.6 +
                this.caveNoise.fbm3(wx * 0.09 + 50, y * 0.15 + 50, wz * 0.09 + 50, 2) * 0.4
              if (cheese > 0.52) {
                carveAir = true
                carvedByCheese = true
              }
            }

            if (y >= 6 && y <= wormMaxY) {
              const wormA = this.wormNoiseA.fbm3(wx * 0.04, y * 0.06, wz * 0.04, 3)
              const wormB = this.wormNoiseB.fbm3(wx * 0.08 + 20, y * 0.1 + 20, wz * 0.08 + 20, 2) * 0.6
              const tube = Math.abs(wormA) + Math.abs(wormB)
              tubeValue = tube
              const verticalBias = 1.0 + Math.abs(this.wormNoiseA.perlin3(wx * 0.02, y * 0.01, wz * 0.02)) * 0.5
              if (tube < 0.08 || (tube < 0.18 * verticalBias && tube < 0.18)) {
                carveAir = true
              }
            }

            if (carveAir && block !== BLOCKS.BEDROCK) {
              block = BLOCKS.AIR
            }

            if (block === BLOCKS.STONE && y < height - 4) {
              const g = this.biomeStoneNoise.fbm3(wx * 0.06, y * 0.08, wz * 0.06, 2)
              if (g > 0.45) {
                block = BLOCKS.GRANITE
              } else {
                const d = this.biomeStoneNoise.fbm3(wx * 0.06 + 50, y * 0.08 + 50, wz * 0.06 + 50, 2)
                if (d > 0.45) {
                  block = BLOCKS.DIORITE
                } else {
                  const a = this.biomeStoneNoise.fbm3(wx * 0.06 + 100, y * 0.08 + 100, wz * 0.06 + 100, 2)
                  if (a > 0.45) {
                    block = BLOCKS.ANDESITE
                  }
                }
              }
            }

            if (
              block === BLOCKS.STONE ||
              block === BLOCKS.GRANITE ||
              block === BLOCKS.DIORITE ||
              block === BLOCKS.ANDESITE
            ) {
              const oreBlock = this.placeOre(wx, y, wz, block)
              block = oreBlock
            }

            if (
              (biome === "plains" || biome === "forest") &&
              continent > 0.3 &&
              colPseudo > 0.998 &&
              y < height - 3 &&
              y > height - 24 &&
              (block === BLOCKS.STONE || block === BLOCKS.GRANITE || block === BLOCKS.DIORITE || block === BLOCKS.ANDESITE)
            ) {
              block = BLOCKS.EMERALD_ORE
            }
          }

          if (block === BLOCKS.AIR) {
            const belowSeaLevel = y < SEA_LEVEL
            const isCaveAir = y <= Math.max(0, height - 1)
            if (belowSeaLevel && y > height && y > 0) {
              block = BLOCKS.WATER
            } else if (isCaveAir) {
              const fillRand = this.pseudoRandom3(wx, y, wz)
              if (y <= 10) {
                if (fillRand < 0.6) {
                  block = BLOCKS.LAVA
                }
              } else if (y >= 11 && y <= 18) {
                if (carvedByCheese && tubeValue > 0.18 && fillRand < 0.3) {
                  block = BLOCKS.WATER
                }
              }
            }
          }

          blocks[chunkIndex(lx, y, lz)] = block
        }

        if (biome === "snow" && !isOcean && height + 1 < WORLD_HEIGHT) {
          if (blocks[chunkIndex(lx, height, lz)] !== BLOCKS.AIR) {
            blocks[chunkIndex(lx, height + 1, lz)] = BLOCKS.SNOW
          }
        }

      }
    }

    for (let centerX = baseX; centerX < baseX + CHUNK_SIZE; centerX++) {
      for (let centerZ = baseZ; centerZ < baseZ + CHUNK_SIZE; centerZ++) {
        const localX = centerX - baseX
        const localZ = centerZ - baseZ
        const centerBiome = this.getBiome(centerX, centerZ)
        const centerHeight = this.getHeight(centerX, centerZ)
        const centerOcean = centerHeight < SEA_LEVEL - 3
        const r = this.pseudoRandom(centerX, centerZ)
        const isTree = !centerOcean && centerHeight >= SEA_LEVEL && (centerBiome === "forest" || centerBiome === "plains") &&
          ((centerBiome === "forest" && r > 0.975) || (centerBiome === "plains" && r > 0.993))
        if (isTree) {
          this.placeTreeWorld(blocks, baseX, baseZ, centerX, centerHeight + 1, centerZ)
        }
      }
    }

    return blocks
  }

  private placeOre(wx: number, y: number, wz: number, fallback: BlockId): BlockId {
    const n = this.oreNoise.perlin3(wx * 0.1, y * 0.1, wz * 0.1)
    const n2 = this.oreNoise.perlin3(wx * 0.2 + 10, y * 0.2 + 10, wz * 0.2 + 10)
    const n3 = this.oreNoise.perlin3(wx * 0.15 + 30, y * 0.15 + 30, wz * 0.15 + 30)
    const n4 = this.oreNoise.perlin3(wx * 0.12 + 40, y * 0.12 + 40, wz * 0.12 + 40)

    // 按 y 分层放置：钻石/红石在深层，金/青金石中层，铁/煤/铜分布更广
    if (y < 16 && n > 0.58 && n2 > 0.35) return BLOCKS.DIAMOND_ORE
    if (y < 24 && n3 < -0.64) return BLOCKS.REDSTONE_ORE
    if (y < 28 && n > 0.6 && n2 < -0.25) return BLOCKS.GOLD_ORE
    if (y < 36 && n4 > 0.62) return BLOCKS.LAPIS_ORE
    if (y < 60 && n > 0.5) return BLOCKS.IRON_ORE
    if (y < 48 && y > 22 && n > 0.56) return BLOCKS.COPPER_ORE
    if (y < 22 && n > 0.6) return BLOCKS.COPPER_ORE
    if (y < 80 && n < -0.4) return BLOCKS.COAL_ORE
    return fallback
  }

  private placeTreeWorld(blocks: Uint8Array, baseX: number, baseZ: number, worldX: number, baseY: number, worldZ: number) {
    this.placeTree(blocks, worldX - baseX, baseY, worldZ - baseZ)
  }

  private placeTree(blocks: Uint8Array, lx: number, baseY: number, lz: number) {
    const trunkH = 4 + Math.floor(this.pseudoRandom(lx * 3, lz * 7) * 3)
    for (let i = 0; i < trunkH; i++) {
      const y = baseY + i
      if (y < WORLD_HEIGHT) blocks[chunkIndex(lx, y, lz)] = BLOCKS.LOG
    }
    const topY = baseY + trunkH
    for (let dy = -3; dy <= 1; dy++) {
      let radius: number
      if (dy <= -2) radius = 2
      else if (dy === -1) radius = 2
      else if (dy === 0) radius = 1
      else radius = 1
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const y = topY + dy
          const x = lx + dx
          const z = lz + dz
          if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) continue
          if (dx === 0 && dz === 0 && dy < 1) continue
          if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) {
            const corner = this.pseudoRandom(lx * 11 + dx, lz * 13 + dz + dy)
            if (corner > 0.55) continue
          }
          const idx = chunkIndex(x, y, z)
          if (blocks[idx] === BLOCKS.AIR) blocks[idx] = BLOCKS.LEAVES
        }
      }
    }
    if (topY + 1 < WORLD_HEIGHT) {
      const idx = chunkIndex(lx, topY + 1, lz)
      if (blocks[idx] === BLOCKS.AIR) blocks[idx] = BLOCKS.LEAVES
    }
  }

  private placeCactus(blocks: Uint8Array, lx: number, baseY: number, lz: number) {
    const h = 2 + Math.floor(this.pseudoRandom(lx * 5, lz * 9) * 2)
    for (let i = 0; i < h; i++) {
      const y = baseY + i
      if (y < WORLD_HEIGHT) blocks[chunkIndex(lx, y, lz)] = BLOCKS.CACTUS
    }
  }
}
