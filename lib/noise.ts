// 基于种子的 2D/3D 柏林噪声（Perlin），用于程序化地形生成

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}
function lerp(a: number, b: number, t: number) {
  return a + t * (b - a)
}
function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

// 用字符串/数字种子构建置换表
function buildPermutation(seed: number): Uint8Array {
  const p = new Uint8Array(512)
  const base = new Uint8Array(256)
  for (let i = 0; i < 256; i++) base[i] = i
  // 简单可复现的伪随机（mulberry32）
  let s = seed >>> 0
  const rand = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = base[i]
    base[i] = base[j]
    base[j] = tmp
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255]
  return p
}

export class Noise {
  private p: Uint8Array
  constructor(seed: number) {
    this.p = buildPermutation(seed)
  }

  perlin3(x: number, y: number, z: number): number {
    const p = this.p
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z
    return lerp(
      lerp(
        lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
        lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u),
        v,
      ),
      lerp(
        lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    )
  }

  perlin2(x: number, y: number): number {
    return this.perlin3(x, y, 0)
  }

  // 分形叠加噪声（fBm），返回大致 [-1,1]
  fbm2(x: number, y: number, octaves: number, persistence = 0.5, lacunarity = 2): number {
    let total = 0
    let freq = 1
    let amp = 1
    let max = 0
    for (let i = 0; i < octaves; i++) {
      total += this.perlin2(x * freq, y * freq) * amp
      max += amp
      amp *= persistence
      freq *= lacunarity
    }
    return total / max
  }

  fbm3(x: number, y: number, z: number, octaves: number, persistence = 0.5, lacunarity = 2): number {
    let total = 0
    let freq = 1
    let amp = 1
    let max = 0
    for (let i = 0; i < octaves; i++) {
      total += this.perlin3(x * freq, y * freq, z * freq) * amp
      max += amp
      amp *= persistence
      freq *= lacunarity
    }
    return total / max
  }
}
