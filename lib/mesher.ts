// 区块网格构建：面剔除 + 逐面明暗 + UV 纹理采样，输出不透明 / 水 / 液态岩浆三类几何
import * as THREE from "three"
import { CHUNK_SIZE, WORLD_HEIGHT, chunkIndex } from "./worldgen"
import { BLOCKS, type BlockId, getBlock, isSolid, isTransparent, isLiquid } from "./blocks"
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

// 逐面 AO 明暗系数：结合面方向基色 + 该面 4 个角落周围的固体邻居数（经典 voxel AO）
// 再乘 skyExposure：头顶固体/液体越多，面越暗（让洞穴/被盖住的地方变暗）
function faceShade(
  world: World,
  block: BlockId,
  faceIndex: number,
  face: FaceDef,
  wx: number,
  wy: number,
  wz: number,
  baseShade: number,
): number {
  if (isLiquid(block)) return baseShade

  const sky = world.skyExposure(wx, wy, wz)

  // 3x3 邻域角落 AO：对该面的"平面坐标系"采样 4 个对角位置，数固体邻居
  // face.dir 是面法线；我们构造一个切平面局部坐标系（s, t），然后在 (wx + offsetX, wy + offsetY, wz + offsetZ) 取 3x3 四角
  let axis: "x" | "y" | "z" = "y"
  const d = face.dir
  if (d[0] !== 0) axis = "x"
  else if (d[1] !== 0) axis = "y"
  else axis = "z"

  // 生成该面 4 个"角落外侧"邻居坐标（相对方块中心向外的 3x3）
  // 经典 voxel 方案：一个面的四个 corner 各看 3 个邻居；简单点这里只数 4 个对角共面的 1 格外侧邻居有没有固体，每有一个扣 0.06
  let cornerOcclude = 0
  const sA = axis === "x" ? 1 : 0
  const sB = axis === "z" ? 1 : 0
  const sC = axis === "y" ? 1 : 0
  // s 轴 = 非法线第一轴（x→y；y→x；z→x）
  // t 轴 = 非法线第二轴（x→z；y→z；z→y）
  const AXIS_S_T: Record<"x" | "y" | "z", { s: "x" | "y" | "z"; t: "x" | "y" | "z" }> = {
    x: { s: "y", t: "z" },
    y: { s: "x", t: "z" },
    z: { s: "x", t: "y" },
  }
  const sAxis = AXIS_S_T[axis].s
  const tAxis = AXIS_S_T[axis].t
  const addVec = (dx: number, dy: number, dz: number): [number, number, number] => [wx + dx, wy + dy, wz + dz]
  const offsets: [number, number, number][] = []
  for (const sDir of [-1, 1]) {
    for (const tDir of [-1, 1]) {
      let ox = d[0]
      let oy = d[1]
      let oz = d[2]
      if (sAxis === "x") ox += sDir
      else if (sAxis === "y") oy += sDir
      else oz += sDir
      if (tAxis === "x") ox += tDir
      else if (tAxis === "y") oy += tDir
      else oz += tDir
      offsets.push([ox, oy, oz])
    }
  }
  for (const [ox, oy, oz] of offsets) {
    const nb = world.getBlock(wx + ox, wy + oy, wz + oz)
    if (isSolid(nb)) cornerOcclude++
  }
  void sA; void sB; void sC; void addVec

  // cornerOcclude 最多 4，每个 -0.06，共 -0.24
  const cornerAO = Math.max(0.76, 1 - cornerOcclude * 0.06)

  // sky 完全盖住（0）时整体再 × 0.55 → 极限 0.55 × baseShade
  const skyMul = 0.55 + 0.45 * sky

  const isOre = (block >= 16 && block <= 19) || (block >= 28 && block <= 31)
  const tint = isOre ? 0.96 : 1.0

  return Math.max(0.1, Math.min(1, baseShade * cornerAO * skyMul * tint))
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
          const ao = faceShade(world, block, f, face, wx, wy, wz, face.shade)
          // 液体用独立可平铺贴图（RepeatWrapping），每个面就是整张 tile 的 0..1；
          // 固体方块仍用图集 UV。
          const uvs = isLiquid(block)
            ? ([[0, 0], [0, 1], [1, 1], [1, 0]] as [number, number][])
            : getFaceUV(block, f)
          for (let ci = 0; ci < 4; ci++) {
            const corner = face.corners[ci]
            // 顶点用区块局部坐标（0..16），mesh 通过 position 放到世界位置 → 每个 chunk 有正确
            // bounding sphere，可开启视锥剔除，转视角时只渲染视野内区块，大幅降低 GPU 负载。
            target.pos.push(x + corner[0], y + corner[1] - (corner[1] === 1 ? liquidTopDrop : 0), z + corner[2])
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
