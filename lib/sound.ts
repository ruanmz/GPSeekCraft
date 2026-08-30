// 程序化 WAV 音效系统
// 使用 Web Audio API 在内存中合成 PCM 样本（等效于解码后的 WAV），并缓存为 AudioBuffer。
// 所有音效纯代码生成，不依赖任何外部音频文件。

import { BLOCK_DEFS, type BlockId, BLOCKS } from "./blocks"

// ---- 工具：确定性伪随机 ----
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- Web Audio Context 懒初始化 ----
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let sfxGain: GainNode | null = null

export function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const win = window as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const Ctor = win.AudioContext ?? win.webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.9
    masterGain.connect(audioCtx.destination)
    sfxGain = audioCtx.createGain()
    sfxGain.gain.value = 0.75
    sfxGain.connect(masterGain)
  }
  return audioCtx
}

// 在用户首次输入时恢复（浏览器自动播放策略）
export function ensureAudioResumed(): void {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === "suspended") void ctx.resume()
}

export function setMasterVolume(v: number): void {
  const ctx = getAudioCtx()
  if (!ctx || !masterGain) return
  masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.01)
}

export function setSfxVolume(v: number): void {
  const ctx = getAudioCtx()
  if (!ctx || !sfxGain) return
  sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.01)
}

// ---- Buffer 合成框架 ----
type SynthFn = (t: number, rnd: () => number) => number // t 秒，返回 -1..1 样本

function synthesize(
  ctx: AudioContext,
  durationSec: number,
  seed: number,
  sampleRate: number,
  fn: SynthFn,
): AudioBuffer {
  const nSamples = Math.max(1, Math.floor(durationSec * sampleRate))
  const buf = ctx.createBuffer(1, nSamples, sampleRate)
  const ch = buf.getChannelData(0)
  const rnd = mulberry32(seed)
  for (let i = 0; i < nSamples; i++) {
    const t = i / sampleRate
    let s = fn(t, rnd)
    if (!isFinite(s)) s = 0
    if (s > 1) s = 1
    else if (s < -1) s = -1
    ch[i] = s
  }
  return buf
}

// 包络：attack-decay 指数衰减
function envAD(t: number, attack: number, decay: number): number {
  if (t < 0) return 0
  const a = attack <= 0 ? 1 : 1 - Math.exp(-t / attack)
  const d = Math.exp(-Math.max(0, t - attack) / decay)
  return a * d
}

// 低通平滑（样本级，one-pole），避免过刺耳
function smooth(buf: AudioBuffer, amount: number): AudioBuffer {
  const ch = buf.getChannelData(0)
  const out = new Float32Array(ch.length)
  let prev = 0
  const a = 1 - Math.max(0.001, Math.min(0.999, amount))
  for (let i = 0; i < ch.length; i++) {
    prev = prev * (1 - a) + ch[i] * a
    out[i] = prev
  }
  buf.copyToChannel(out, 0)
  return buf
}

// ---- 音效名定义 + 多变体缓存 ----
export type SfxName =
  | "block_break"
  | "block_hit"
  | "block_place"
  | "step_grass"
  | "step_stone"
  | "step_sand"
  | "step_wood"
  | "step_snow"
  | "step_gravel"
  | "jump"
  | "land"
  | "hurt"
  | "death"
  | "pickup"
  | "ui_click"

const SFX_VARIANTS = 3
const bufferCache = new Map<string, AudioBuffer>()

function cacheKey(name: SfxName, variant: number): string {
  return `${name}#${variant}`
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function getBuffer(name: SfxName, variant: number): AudioBuffer | null {
  const ctx = getAudioCtx()
  if (!ctx) return null
  const sr = ctx.sampleRate
  const key = cacheKey(name, variant)
  let b = bufferCache.get(key)
  if (b) return b
  const seedBase = hashStr(name) + variant * 1009
  b = buildSfx(ctx, name, seedBase, sr)
  bufferCache.set(key, b)
  return b
}

// --------- 各音效合成（短促、干脆、消除低频嘭声） ---------
function buildSfx(ctx: AudioContext, name: SfxName, seed: number, sr: number): AudioBuffer {
  switch (name) {
    case "block_break": {
      // Minecraft 风格碎裂：超短瞬态高通噪声爆破 + 中高频噼啪，无低频 tone
      const raw = synthesize(ctx, 0.18, seed, sr, (t, rnd) => {
        // 高通噪声：微分噪声（n[i] - n[i-1] 的近似）
        const n = rnd() * 2 - 1
        const n2 = rnd() * 2 - 1
        const hpNoise = n - n2
        // 主包络：<1ms attack + 快速衰减到 60ms
        const env = envAD(t, 0.0006, 0.035)
        // 碎裂噼啪：在 t=10~50ms 内叠加几簇更高频瞬态
        const crackleEnv = envAD(t - 0.005, 0.0008, 0.02) + envAD(t - 0.02, 0.0006, 0.018) + envAD(t - 0.04, 0.0005, 0.014)
        const crackle = (rnd() * 2 - 1) * crackleEnv * 0.6
        // 中频一点"碎块撞击"（~900Hz 短瞬态），不要太低
        const chime = Math.sin(2 * Math.PI * (850 + (rnd() - 0.5) * 220) * t) * envAD(t, 0.0005, 0.02) * 0.22
        return (hpNoise * 0.7 + crackle + chime) * env
      })
      // 极轻微微平滑，保留脆感
      return smooth(raw, 0.03)
    }
    case "block_hit": {
      // 敲击：~1.2kHz 的极短 click（像凿子敲石头/木头，短促不拖）
      return synthesize(ctx, 0.06, seed, sr, (t, rnd) => {
        const click = (rnd() * 2 - 1) * envAD(t, 0.0004, 0.006) * 0.65
        // 一个 1.2~1.6kHz 短 tone，衰减 10ms
        const freq = 1200 + rnd() * 400
        const body = Math.sin(2 * Math.PI * freq * t) * envAD(t, 0.0005, 0.01) * 0.55
        return click + body
      })
    }
    case "block_place": {
      // 放置：中高频"咔嗒"（~700Hz），绝不低于 400Hz，彻底消灭嘭声
      const raw = synthesize(ctx, 0.09, seed, sr, (t, rnd) => {
        // 瞬态咔
        const click = (rnd() * 2 - 1) * envAD(t, 0.0005, 0.008) * 0.55
        // 主体：700Hz 左右的方波+正弦混合，衰减快
        const freq = 620 + rnd() * 220
        const s = Math.sin(2 * Math.PI * freq * t)
        const sq = s > 0 ? 1 : -1
        const body = (s * 0.6 + sq * 0.4) * envAD(t, 0.0007, 0.022) * 0.55
        return click + body
      })
      return smooth(raw, 0.02)
    }
    case "step_grass": {
      // 草地：中低频闷噗(~320Hz) + 沙沙，有自然拖尾 180ms
      const raw = synthesize(ctx, 0.18, seed, sr, (t, rnd) => {
        const n = rnd() * 2 - 1
        const n2 = rnd() * 2 - 1
        const rustle = (n - n2) // 高通沙沙
        const freq = 300 + rnd() * 60
        const thud = Math.sin(2 * Math.PI * freq * t) * 0.55
        // 软噗噗包络
        const env = envAD(t, 0.002, 0.06)
        const tail = envAD(t, 0.01, 0.09) * 0.35
        return (rustle * 0.55 + thud) * (env + tail) * 0.9
      })
      return smooth(raw, 0.07)
    }
    case "step_stone": {
      // 石头：500~650Hz 扎实"咚咔"，不是高频乒乓
      return synthesize(ctx, 0.18, seed, sr, (t, rnd) => {
        // 瞬态咔（起始接触）
        const click = (rnd() * 2 - 1) * envAD(t, 0.0008, 0.01) * 0.5
        // 中频 body：主 560Hz + 一点次谐波 280Hz 增加"踩在石头上"的厚重感
        const fBody = 540 + rnd() * 140
        const body1 = Math.sin(2 * Math.PI * fBody * t) * envAD(t, 0.0012, 0.05) * 0.55
        const body2 = Math.sin(2 * Math.PI * (fBody * 0.5) * t) * envAD(t, 0.001, 0.07) * 0.25
        // 尾音：中频稍延，避免"断一下"
        const reverb = Math.sin(2 * Math.PI * (fBody * 1.2) * t) * envAD(t - 0.01, 0.0015, 0.06) * 0.12
        return click + body1 + body2 + reverb
      })
    }
    case "step_sand": {
      // 沙：粗颗粒噪声 + 轻微中频 body，时长 200ms 连续嚓
      const raw = synthesize(ctx, 0.2, seed, sr, (t, rnd) => {
        const n = rnd() * 2 - 1
        // 多层噪声
        const grain = Math.tanh(n * 2.2)
        const grain2 = Math.tanh((rnd() * 2 - 1) * 1.2) * 0.6
        const freq = 240 + rnd() * 60
        const soft = Math.sin(2 * Math.PI * freq * t) * 0.2
        const env1 = envAD(t, 0.003, 0.05)
        const env2 = envAD(t, 0.01, 0.09) * 0.65
        return ((grain + grain2) * 0.5 + soft) * (env1 + env2) * 0.85
      })
      return smooth(raw, 0.05)
    }
    case "step_wood": {
      // 木头：~380Hz 主音（像木板敲击），加一点共振拖尾
      const raw = synthesize(ctx, 0.19, seed, sr, (t, rnd) => {
        const click = (rnd() * 2 - 1) * envAD(t, 0.0008, 0.009) * 0.4
        const fBody = 360 + rnd() * 90
        // 2个叠加正弦，模拟木板谐波
        const body = (Math.sin(2 * Math.PI * fBody * t) * 0.7 + Math.sin(2 * Math.PI * fBody * 2.03 * t) * 0.3) * envAD(t, 0.001, 0.055) * 0.6
        const tail = Math.sin(2 * Math.PI * fBody * 0.8 * t) * envAD(t - 0.012, 0.0015, 0.075) * 0.18
        return click + body + tail
      })
      return smooth(raw, 0.055)
    }
    case "step_snow": {
      // 雪：软闷咔嚓 + 拖尾 190ms
      const raw = synthesize(ctx, 0.19, seed, sr, (t, rnd) => {
        const n = rnd() * 2 - 1
        const n2 = rnd() * 2 - 1
        const crunch = Math.abs(n - n2) * (n < 0 ? -1 : 1)
        const soft = Math.sin(2 * Math.PI * (200 + rnd() * 50) * t) * 0.2
        const env1 = envAD(t, 0.003, 0.045)
        const env2 = envAD(t, 0.015, 0.09) * 0.55
        return (crunch * 0.75 + soft) * (env1 + env2) * 0.85
      })
      return smooth(raw, 0.11)
    }
    case "step_gravel": {
      // 砾石：多层颗粒噪声 + 一点中频 body，180ms
      return synthesize(ctx, 0.18, seed, sr, (t, rnd) => {
        const n = rnd() * 2 - 1
        const n2 = rnd() * 2 - 1
        const sharp = (n - n2) // 高通颗粒
        const tiny = Math.abs(rnd() * 2 - 1) * (rnd() < 0.5 ? -1 : 1) * 0.6
        const freq = 420 + rnd() * 180
        const body = Math.sin(2 * Math.PI * freq * t) * 0.2
        const env1 = envAD(t, 0.001, 0.035)
        const env2 = envAD(t, 0.01, 0.08) * 0.5
        return (sharp * 0.8 + tiny + body) * (env1 + env2) * 0.85
      })
    }
    case "jump": {
      // 保留合成（虽不播放，但避免缓存 miss 分支出问题）：静音零
      return synthesize(ctx, 0.02, seed, sr, () => 0)
    }
    case "land": {
      // 着地：稍低频但极短的闷咔，衰减 <50ms，不要拖长的咚
      const raw = synthesize(ctx, 0.12, seed, sr, (t, rnd) => {
        const body = Math.sin(2 * Math.PI * (180 + rnd() * 60) * t) * envAD(t, 0.001, 0.035) * 0.7
        const click = (rnd() * 2 - 1) * envAD(t, 0.0005, 0.009) * 0.45
        return body + click
      })
      return smooth(raw, 0.08)
    }
    case "hurt": {
      // 受伤：短促"呃！"——650Hz 快速下滑 + 少量噪声，时长 <200ms
      return synthesize(ctx, 0.18, seed, sr, (t, rnd) => {
        const f = 680 - 380 * Math.min(1, t / 0.13)
        const osc = Math.sin(2 * Math.PI * f * t)
        const distorted = Math.tanh(osc * 3) // 轻失真
        const noise = (rnd() * 2 - 1) * envAD(t, 0.001, 0.02) * 0.15
        const env = envAD(t, 0.003, 0.055)
        return (distorted * 0.6 + noise) * env
      })
    }
    case "death": {
      // 死亡：700ms 足够，但下滑更干脆，包络更陡不发闷
      return synthesize(ctx, 0.7, seed, sr, (t, rnd) => {
        const f = 560 - 520 * Math.min(1, t / 0.55)
        const osc = Math.sin(2 * Math.PI * f * t)
        // 一个轻微的颤音让它更像"倒下"而不是闷呜
        const wobble = Math.sin(2 * Math.PI * 11 * t) * 0.03
        const osc2 = Math.sin(2 * Math.PI * (f * 0.5 + wobble * f) * t + 1.3)
        const env = envAD(t, 0.01, 0.28)
        const noise = (rnd() * 2 - 1) * envAD(t, 0.003, 0.05) * 0.1
        return (osc * 0.38 + osc2 * 0.32 + noise) * env
      })
    }
    case "pickup": {
      // 拾取：~1100Hz 单音短促叮，<100ms，无长尾巴
      return synthesize(ctx, 0.09, seed, sr, (t, rnd) => {
        const f = 1080 + rnd() * 80
        const e = envAD(t, 0.0008, 0.032)
        // 加一点点 2x 泛音，更亮但不拖
        const a = Math.sin(2 * Math.PI * f * t)
        const b = Math.sin(2 * Math.PI * f * 2 * t) * 0.15
        return (a * 0.55 + b) * e
      })
    }
    case "ui_click": {
      // UI 点击：超短咔
      return synthesize(ctx, 0.04, seed, sr, (t, rnd) => {
        const click = (rnd() * 2 - 1) * envAD(t, 0.0003, 0.006) * 0.5
        const tone = Math.sin(2 * Math.PI * 900 * t) * envAD(t, 0.0005, 0.01) * 0.3
        return click + tone
      })
    }
  }
}

// ---------- 播放接口 ----------
interface PlayOpts {
  volume?: number
  pitch?: number
  pan?: number
  variant?: number
}

const hasStereoPanner =
  typeof window !== "undefined" &&
  !!(window as unknown as { StereoPannerNode?: unknown }).StereoPannerNode

// 默认高通截止频率（根据音效名选，避免低频"嘭"）
// 注意：脚步需要中低频"脚感"，cutoff 开 140Hz 刚好把 130Hz 以下的排球嘭拦掉
function defaultHighpassHzFor(name: SfxName): number {
  switch (name) {
    case "land":
      return 90
    case "death":
      return 160
    case "step_grass":
    case "step_stone":
    case "step_sand":
    case "step_wood":
    case "step_snow":
    case "step_gravel":
      return 140
    case "block_break":
    case "block_hit":
    case "block_place":
    case "hurt":
    case "pickup":
    case "ui_click":
      return 380
    case "jump": // 静音
      return 40
    default:
      return 200
  }
}

// 播放 /assets/click.mp3（Minecraft 样式按钮点击音）
let uiClickBuf: AudioBuffer | null = null
export async function playUiClick(): Promise<void> {
  const ctx = getAudioCtx()
  if (!ctx || !sfxGain) return
  ensureAudioResumed()
  try {
    if (!uiClickBuf) {
      const res = await fetch("/assets/click.mp3")
      const arr = await res.arrayBuffer()
      uiClickBuf = await ctx.decodeAudioData(arr)
    }
    const src = ctx.createBufferSource()
    src.buffer = uiClickBuf
    const g = ctx.createGain()
    g.gain.value = 0.9
    src.connect(g)
    g.connect(sfxGain)
    src.start()
  } catch {
    /* 文件加载失败则静默 */
  }
}

export function playSfx(name: SfxName, opts: PlayOpts = {}): void {
  const ctx = getAudioCtx()
  if (!ctx || !sfxGain) return
  ensureAudioResumed()
  const variant = opts.variant ?? Math.floor(Math.random() * SFX_VARIANTS)
  const buf = getBuffer(name, variant % SFX_VARIANTS)
  if (!buf) return

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = Math.max(0.25, Math.min(4, opts.pitch ?? 1))

  const g = ctx.createGain()
  g.gain.value = Math.max(0, Math.min(2, opts.volume ?? 1))

  // 高通兜底：BiQuad highpass, Q=0.7
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = defaultHighpassHzFor(name)
  hp.Q.value = 0.7

  if (opts.pan !== undefined && hasStereoPanner) {
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.max(-1, Math.min(1, opts.pan))
    src.connect(hp)
    hp.connect(g)
    g.connect(pan)
    pan.connect(sfxGain)
  } else {
    src.connect(hp)
    hp.connect(g)
    g.connect(sfxGain)
  }
  src.start()
}

// ---------- 方块材质 → 脚步声映射 ----------
export function stepSfxForBlock(blockId: BlockId): SfxName {
  const def = BLOCK_DEFS[blockId]
  const key = def?.key
  switch (key) {
    case "GRASS":
    case "SNOW_GRASS":
    case "LEAVES":
      return "step_grass"
    case "STONE":
    case "COBBLESTONE":
    case "SANDSTONE":
    case "COAL_ORE":
    case "IRON_ORE":
    case "GOLD_ORE":
    case "DIAMOND_ORE":
    case "BRICK":
    case "FURNACE":
    case "GLOWSTONE":
    case "GLASS":
      return "step_stone"
    case "SAND":
      return "step_sand"
    case "GRAVEL":
      return "step_gravel"
    case "LOG":
    case "PLANKS":
    case "CRAFTING_TABLE":
      return "step_wood"
    case "SNOW":
    case "ICE":
      return "step_snow"
    default: {
      const h = def?.hardness ?? 1
      if (h <= 0.3) return "step_sand"
      if (h <= 0.8) return "step_grass"
      if (h >= 1.5) return "step_stone"
      return "step_wood"
    }
  }
}

export interface BlockSfxTune {
  volume: number
  pitch: number
}

export function breakTuneForBlock(blockId: BlockId): BlockSfxTune {
  const h = Math.max(0, BLOCK_DEFS[blockId]?.hardness ?? 1)
  const pitch = Math.max(0.7, 1.2 - h * 0.15)
  const volume = 0.8 + Math.min(0.4, h * 0.08)
  return { volume, pitch }
}

export function placeTuneForBlock(blockId: BlockId): BlockSfxTune {
  const h = Math.max(0, BLOCK_DEFS[blockId]?.hardness ?? 1)
  const pitch = Math.max(0.75, 1.1 - h * 0.1)
  const volume = 0.75 + Math.min(0.25, h * 0.06)
  return { volume, pitch }
}

// 防止未使用 import 警告（lint 用）
void BLOCKS.AIR
