// 区块网格构建：面剔除 + 逐面明暗 + UV 纹理采样，输出不透明 / 水 / 液态岩浆三类几何
import * as THREE from "three"
import { CHUNK_SIZE, WORLD_HEIGHT, chunkIndex } from "./worldgen"
import { BLOCKS, type BlockId, getBlock, isTransparent, isLiquid } from "./blocks"
import { getFaceUV } from "./texture-atlas"
import type { World } from "./world"

// 6 个面：法线方向与该面 4 个顶点（单位立方体，原点在方块角）
interface FaceDef {
  dir: [number, number, number]
  corners: [number, number, number][]
  shade: number // 明暗系数
}

const FACES: FaceDef[] = [
  // +X
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.8 },
  // -X
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], shade: 0.8 },
  // +Y (top)
  { dir: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], shade: 1.0 },
  // -Y (bottom)
  { dir: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], shade: 0.5 },
  // +Z
  { dir: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], shade: 0.9 },
  // -Z
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], shade: 0.9 },
]

export interface ChunkGeometries {
  opaque: THREE.BufferGeometry | null
  water: THREE.BufferGeometry | null
  lava: THREE.BufferGeometry | null
}

// 逐面 AO 明暗系数（替代旧的 vertex-color tint）
function faceShade(block: BlockId, faceIndex: number, shade: number, wx: number, wy: number, wz: number): number {
  if (isLiquid(block)) return shade
  // 不对每个坐标随机染色：随机明暗会在远处形成规则列和分层，且会被阳光误认为阴影。
  const isOre = (block >= 16 && block <= 19) || (block >= 28 && block <= 31)
  const tint = isOre ? 0.96 : 1
  return Math.max(0, Math.min(1, shade * tint))
}

// 判断是否需要绘制该面（邻居透明且不是同种液体）
function shouldRenderFace(current: BlockId, neighbor: BlockId): boolean {
  if (neighbor === BLOCKS.AIR) return true
  if (isLiquid(current)) {
    return neighbor !== current && isTransparent(neighbor)
  }
  if (isTransparent(neighbor)) {
    if (neighbor === current) return false
    return true
  }
  return false
}

interface MeshData {
  pos: number[]
  norm: number[]
  uv: number[]
  ao: number[]
  idx: number[]
}

function newMeshData(): MeshData {
  return { pos: [], norm: [], uv: [], ao: [], idx: [] }
}

export function buildChunkGeometry(world: World, cx: number, cz: number): ChunkGeometries {
  const rec = world.getChunk(cx, cz)
  if (!rec) return { opaque: null, water: null, lava: null }
  const blocks = rec.blocks
  const baseX = cx * CHUNK_SIZE
  const baseZ = cz * CHUNK_SIZE

  const op = newMeshData()
  const wa = newMeshData()
  const la = newMeshData()

  const getNeighbor = (lx: number, ly: number, lz: number): BlockId => {
    if (ly < 0 || ly >= WORLD_HEIGHT) return BLOCKS.AIR
    if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
      return blocks[chunkIndex(lx, ly, lz)]
    }
    const nb = world.getBlock(baseX + lx, ly, baseZ + lz)
    // If the neighbor chunk isn't loaded, assume it's the same liquid so we
    // don't render phantom side faces at every chunk boundary (causes banding).
    if (nb === BLOCKS.AIR && !world.hasChunk(Math.floor((baseX + lx) / CHUNK_SIZE), Math.floor((baseZ + lz) / CHUNK_SIZE))) {
      const current = blocks[chunkIndex(
        Math.max(0, Math.min(CHUNK_SIZE - 1, lx)),
        Math.max(0, Math.min(WORLD_HEIGHT - 1, ly)),
        Math.max(0, Math.min(CHUNK_SIZE - 1, lz)),
      )]
      if (isLiquid(current)) return current
    }
    return nb
  }

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const block = blocks[chunkIndex(x, y, z)]
        if (block === BLOCKS.AIR) continue

        const target = block === BLOCKS.WATER ? wa : block === BLOCKS.LAVA ? la : op

        for (let f = 0; f < 6; f++) {
          const face = FACES[f]
          const nx = x + face.dir[0]
          const ny = y + face.dir[1]
          const nz = z + face.dir[2]
          const neighbor = getNeighbor(nx, ny, nz)
          if (!shouldRenderFace(block, neighbor)) continue

          const liquidTopDrop = isLiquid(block) && f === 2 ? 0.12 : 0
          const startIndex = target.pos.length / 3
          const wx = baseX + x
          const wy = y
          const wz = baseZ + z
          const ao = faceShade(block, f, face.shade, wx, wy, wz)
          const uvs = getFaceUV(block, f)
          for (let ci = 0; ci < 4; ci++) {
            const corner = face.corners[ci]
            target.pos.push(wx + corner[0], y + corner[1] - (corner[1] === 1 ? liquidTopDrop : 0), baseZ + z + corner[2])
            target.norm.push(face.dir[0], face.dir[1], face.dir[2])
            target.uv.push(uvs[ci][0], uvs[ci][1])
            target.ao.push(ao)
          }
          target.idx.push(
            startIndex, startIndex + 1, startIndex + 2,
            startIndex, startIndex + 2, startIndex + 3,
          )
        }
      }
    }
  }

  const make = (d: MeshData): THREE.BufferGeometry | null => {
    if (d.pos.length === 0) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(d.pos, 3))
    g.setAttribute("normal", new THREE.Float32BufferAttribute(d.norm, 3))
    g.setAttribute("uv", new THREE.Float32BufferAttribute(d.uv, 2))
    g.setAttribute("ao", new THREE.Float32BufferAttribute(d.ao, 1))
    g.setIndex(d.idx)
    return g
  }

  return { opaque: make(op), water: make(wa), lava: make(la) }
}
