// 世界管理器：区块存储、跨区块方块读写、改动记录（用于存档）
import { WorldGenerator, CHUNK_SIZE, WORLD_HEIGHT, chunkIndex } from "./worldgen"
import { BLOCKS, type BlockId, isSolid } from "./blocks"

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

export interface ChunkRecord {
  cx: number
  cz: number
  blocks: Uint8Array
  version: number // 递增用于触发重新构建网格
}

export class World {
  private chunks = new Map<string, ChunkRecord>()
  // 玩家改动的方块记录：key `wx,wy,wz` -> blockId（用于存档，避免存整块）
  private edits = new Map<string, BlockId>()
  readonly gen: WorldGenerator
  readonly seed: number

  constructor(seed: number, savedEdits?: Record<string, number>) {
    this.seed = seed
    this.gen = new WorldGenerator(seed)
    if (savedEdits) {
      for (const k in savedEdits) this.edits.set(k, savedEdits[k])
    }
  }

  getEdits(): Record<string, number> {
    const obj: Record<string, number> = {}
    this.edits.forEach((v, k) => (obj[k] = v))
    return obj
  }

  hasChunk(cx: number, cz: number): boolean {
    return this.chunks.has(chunkKey(cx, cz))
  }

  ensureChunk(cx: number, cz: number): ChunkRecord {
    const key = chunkKey(cx, cz)
    let rec = this.chunks.get(key)
    if (rec) return rec
    const blocks = this.gen.generateChunk(cx, cz)
    // 应用该区块范围内的玩家改动
    const baseX = cx * CHUNK_SIZE
    const baseZ = cz * CHUNK_SIZE
    this.edits.forEach((v, k) => {
      const [ex, ey, ez] = k.split(",").map(Number)
      if (ex >= baseX && ex < baseX + CHUNK_SIZE && ez >= baseZ && ez < baseZ + CHUNK_SIZE) {
        if (ey >= 0 && ey < WORLD_HEIGHT) {
          blocks[chunkIndex(ex - baseX, ey, ez - baseZ)] = v
        }
      }
    })
    rec = { cx, cz, blocks, version: 0 }
    this.chunks.set(key, rec)
    return rec
  }

  getChunk(cx: number, cz: number): ChunkRecord | undefined {
    return this.chunks.get(chunkKey(cx, cz))
  }

  unloadChunk(cx: number, cz: number) {
    this.chunks.delete(chunkKey(cx, cz))
  }

  loadedChunks(): ChunkRecord[] {
    return Array.from(this.chunks.values())
  }

  getBlock(wx: number, wy: number, wz: number): BlockId {
    if (wy < 0 || wy >= WORLD_HEIGHT) return BLOCKS.AIR
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const rec = this.chunks.get(chunkKey(cx, cz))
    if (!rec) return BLOCKS.AIR
    const lx = wx - cx * CHUNK_SIZE
    const lz = wz - cz * CHUNK_SIZE
    return rec.blocks[chunkIndex(lx, wy, lz)]
  }

  // 设置方块，记录改动并标记相关区块需要重建
  setBlock(wx: number, wy: number, wz: number, id: BlockId, record = true): string[] {
    if (wy < 0 || wy >= WORLD_HEIGHT) return []
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const rec = this.ensureChunk(cx, cz)
    const lx = wx - cx * CHUNK_SIZE
    const lz = wz - cz * CHUNK_SIZE
    rec.blocks[chunkIndex(lx, wy, lz)] = id
    rec.version++
    if (record) this.edits.set(`${wx},${wy},${wz}`, id)

    const dirty = [chunkKey(cx, cz)]
    // 若处于区块边界，相邻区块也要重建
    if (lx === 0) dirty.push(chunkKey(cx - 1, cz))
    if (lx === CHUNK_SIZE - 1) dirty.push(chunkKey(cx + 1, cz))
    if (lz === 0) dirty.push(chunkKey(cx, cz - 1))
    if (lz === CHUNK_SIZE - 1) dirty.push(chunkKey(cx, cz + 1))
    dirty.forEach((k) => {
      const [dx, dz] = k.split(",").map(Number)
      const r = this.chunks.get(chunkKey(dx, dz))
      if (r) r.version++
    })
    return dirty
  }

  // 找到某列最高的固体方块 y（用于出生点）
  highestSolid(wx: number, wz: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    this.ensureChunk(cx, cz)
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (isSolid(this.getBlock(wx, y, wz))) return y
    }
    return 0
  }
}
