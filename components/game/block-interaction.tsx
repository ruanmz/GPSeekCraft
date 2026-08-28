"use client"

import { useEffect, useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { BLOCKS, BLOCK_DEFS, isSolid, type BlockId } from "@/lib/blocks"
import { useGame } from "@/lib/store"
import { isPlaceable } from "@/lib/items"
import { worldEvents, EV_BLOCK_CHANGE, EV_CHUNK_DIRTY, EV_ITEM_DROP } from "@/lib/emitter"
import { chunkKey } from "@/lib/world"
import { player } from "@/lib/player-ref"
import {
  playSfx,
  ensureAudioResumed,
  breakTuneForBlock,
  placeTuneForBlock,
} from "@/lib/sound"
import { mobileInput, detectMobileMode } from "@/lib/player-ref"
import { triggerSwing } from "./hand-view"

// 挖掘/放置最大距离（MC 默认：生存 4.5m，创造 5.0m，不是无影手 6m）
export const REACH_SURVIVAL = 4.5
export const REACH_CREATIVE = 5.0
const REACH_DEFAULT = REACH_SURVIVAL

// 标准 Amanatides & Woo DDA 体素射线遍历
// 返回射线命中的第一个非空气 solid 方块；maxDist = 距离上限
export function raycastVoxel(origin: THREE.Vector3, direction: THREE.Vector3, maxDist = REACH_DEFAULT) {
  const world = useGame.getState().world
  if (!world) return null
  // 避免除 0
  const EPS = 1e-8
  const dx = Math.abs(direction.x) < EPS ? EPS : direction.x
  const dy = Math.abs(direction.y) < EPS ? EPS : direction.y
  const dz = Math.abs(direction.z) < EPS ? EPS : direction.z

  let vx = Math.floor(origin.x)
  let vy = Math.floor(origin.y)
  let vz = Math.floor(origin.z)

  const stepX = dx > 0 ? 1 : -1
  const stepY = dy > 0 ? 1 : -1
  const stepZ = dz > 0 ? 1 : -1

  const tDeltaX = Math.abs(1 / dx)
  const tDeltaY = Math.abs(1 / dy)
  const tDeltaZ = Math.abs(1 / dz)

  const voxelBoundaryX = stepX > 0 ? vx + 1 : vx
  const voxelBoundaryY = stepY > 0 ? vy + 1 : vy
  const voxelBoundaryZ = stepZ > 0 ? vz + 1 : vz
  let tMaxX = Math.abs(voxelBoundaryX - origin.x) < EPS ? tDeltaX : (voxelBoundaryX - origin.x) / dx
  let tMaxY = Math.abs(voxelBoundaryY - origin.y) < EPS ? tDeltaY : (voxelBoundaryY - origin.y) / dy
  let tMaxZ = Math.abs(voxelBoundaryZ - origin.z) < EPS ? tDeltaZ : (voxelBoundaryZ - origin.z) / dz
  if (tMaxX < 0) tMaxX = Infinity
  if (tMaxY < 0) tMaxY = Infinity
  if (tMaxZ < 0) tMaxZ = Infinity

  const maxSteps = 512
  let tAccum = 0
  // 记录"上一次跨越哪一轴"→ 作为命中方块面的法线方向（初始 = 从 origin 出发第一个跨过的面；若 origin 就在 solid 内，退化为相机反向法线）
  let faceAxis: "x" | "y" | "z" = "y"
  let faceSign = -1

  for (let i = 0; i < maxSteps; i++) {
    if (tAccum > maxDist) break
    const id = world.getBlock(vx, vy, vz)
    if (id !== undefined && id !== BLOCKS.AIR) {
      const def = BLOCK_DEFS[id as BlockId]
      if (def?.solid) {
        // 命中面法线：把 ray 进入这个方块时跨过的面方向，取反 sign（因为 step 是 ray 行进方向，被击中方块面朝向是 -step）
        const nx = faceAxis === "x" ? -faceSign : 0
        const ny = faceAxis === "y" ? -faceSign : 0
        const nz = faceAxis === "z" ? -faceSign : 0
        return { x: vx, y: vy, z: vz, id: id as BlockId, nx, ny, nz }
      }
    }
    // 步进到下一个体素边界，累计距离
    let tNext: number
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        tNext = tMaxX
        faceAxis = "x"; faceSign = stepX
        vx += stepX
        tMaxX += tDeltaX
      } else {
        tNext = tMaxZ
        faceAxis = "z"; faceSign = stepZ
        vz += stepZ
        tMaxZ += tDeltaZ
      }
    } else {
      if (tMaxY < tMaxZ) {
        tNext = tMaxY
        faceAxis = "y"; faceSign = stepY
        vy += stepY
        tMaxY += tDeltaY
      } else {
        tNext = tMaxZ
        faceAxis = "z"; faceSign = stepZ
        vz += stepZ
        tMaxZ += tDeltaZ
      }
    }
    if (!isFinite(tNext)) break
    tAccum = tNext
  }
  return null
}

type Hit = { x: number; y: number; z: number; id: BlockId; nx: number; ny: number; nz: number }

// 挖掘动画：10 个破坏阶段对应的裂纹纹理程序化生成（Canvas）
function makeCrackTexture(stage: number): THREE.Texture {
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, size, size)
  if (stage <= 0) {
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }
  // 绘制 0..9 级裂纹，越多越深
  ctx.strokeStyle = `rgba(0,0,0,${0.25 + stage * 0.07})`
  ctx.lineWidth = 1 + stage * 0.4
  ctx.lineCap = "round"
  const seeds = [
    [0.1, 0.3], [0.5, 0.1], [0.85, 0.4], [0.2, 0.75], [0.7, 0.85], [0.5, 0.5],
  ]
  const cracks = Math.min(seeds.length, 2 + Math.floor(stage * 0.9))
  for (let i = 0; i < cracks; i++) {
    const [sx, sy] = seeds[i]
    const startX = sx * size
    const startY = sy * size
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    let cx = startX
    let cy = startY
    const steps = 3 + Math.floor(stage / 2)
    for (let s = 0; s < steps; s++) {
      const ang = (i * 1.3 + s * 0.8 + stage * 0.2) + (Math.sin(i * 9 + s * 3) * 0.8)
      const len = (6 + stage * 2) * (0.7 + Math.sin(i + s) * 0.3)
      cx += Math.cos(ang) * len
      cy += Math.sin(ang) * len
      cx = Math.max(2, Math.min(size - 2, cx))
      cy = Math.max(2, Math.min(size - 2, cy))
      ctx.lineTo(cx, cy)
    }
    ctx.stroke()
  }
  // 后期阶段加一些深色凹坑
  if (stage >= 5) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + (stage - 5) * 0.02})`
    for (let i = 0; i < stage - 4; i++) {
      const px = ((i * 17 + 13) % (size - 8)) + 4
      const py = ((i * 31 + 7) % (size - 8)) + 4
      const r = 1 + (i % 3)
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

export function BlockInteraction({ highlightRef }: { highlightRef: React.RefObject<THREE.LineSegments | null> }) {
  const { camera, gl, scene } = useThree()
  const [, forceTick] = useState(0)

  // 左键按下状态（即"正在长按"）
  const miningPressed = useRef(false)
  // 当前正在挖掘的目标方块与进度
  const miningTarget = useRef<Hit | null>(null)
  const miningProgress = useRef(0) // 0..1
  // 创造模式连挖冷却
  const lastCreativeBreak = useRef(0)
  // 放置按钮上升沿检测（移动端 placePressed 一次性放一块）
  const lastPlacePressed = useRef(false)
  // 右键长按连续放置：1 秒间隔
  const placingPressed = useRef(false)
  const placeCooldownRef = useRef(0)
  // 日志节流
  const logThrottle = useRef<Record<string, number>>({})
  const throttleLog = (key: string, msg: () => string, intervalMs = 400) => {
    const now = performance.now()
    if (now - (logThrottle.current[key] ?? -9999) >= intervalMs) {
      logThrottle.current[key] = now
      // eslint-disable-next-line no-console
      console.log(`[MINING] ${msg()}`)
    }
  }

  // 破坏进度覆盖层 mesh（贴在被挖方块表面，显示裂纹纹理）
  const crackOverlayRef = useRef<THREE.Mesh | null>(null)
  const crackTexCache = useRef<(THREE.Texture | null)[]>(new Array(10).fill(null))
  const crackStageRef = useRef(-1)
  const lastSfxStageRef = useRef(-1) // 用于每进一档 stage 触发一次敲击音效

  // 初始化裂纹覆盖层 & 缓存纹理
  useEffect(() => {
    for (let i = 0; i < 10; i++) {
      crackTexCache.current[i] = makeCrackTexture(i)
    }
    const geo = new THREE.BoxGeometry(1.004, 1.004, 1.004)
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    mesh.renderOrder = 998
    scene.add(mesh)
    crackOverlayRef.current = mesh
    return () => {
      scene.remove(mesh)
      geo.dispose()
      mat.dispose()
      crackTexCache.current.forEach((t) => t?.dispose())
    }
  }, [scene])

  // 根据玩家-方块相对位置计算空间化 pan/音量
  const spatialFor = (bx: number, by: number, bz: number) => {
    const cam = camera.getWorldPosition(new THREE.Vector3())
    const forward = camera.getWorldDirection(new THREE.Vector3())
    forward.y = 0
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    const dx = bx + 0.5 - cam.x
    const dy = by + 0.5 - cam.y
    const dz = bz + 0.5 - cam.z
    const distSq = dx * dx + dy * dy + dz * dz
    const dist = Math.sqrt(distSq)
    const pan = Math.max(-1, Math.min(1, right.x * dx + right.z * dz))
    // 距离衰减：0~6 范围内 1→0.15（reach 限制在 4.5/5.0，所以 6m 基本就是边缘）
    const atten = Math.max(0.15, 1 - Math.min(1, dist / 6.0) * 0.85)
    return { pan, atten }
  }

  // 根据 progress 更新裂纹材质，并在阶段推进时播放敲击音效
  const updateCrackOverlay = (hit: Hit | null, progress: number) => {
    const mesh = crackOverlayRef.current
    if (!mesh) return
    const mat = mesh.material as THREE.MeshBasicMaterial
    if (!hit || progress <= 0) {
      mesh.visible = false
      mat.opacity = 0
      crackStageRef.current = -1
      lastSfxStageRef.current = -1
      if (mat.map) {
        mat.map = null
        mat.needsUpdate = true
      }
      return
    }
    mesh.visible = true
    mesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)
    const stage = Math.min(9, Math.floor(progress * 10))
    mat.opacity = 0.55 + progress * 0.2
    if (stage !== crackStageRef.current) {
      crackStageRef.current = stage
      mat.map = crackTexCache.current[stage] ?? null
      mat.needsUpdate = true
    }
    // 每当 stage 推进一档（0→1→…→9），播一次敲击
    if (stage > lastSfxStageRef.current) {
      lastSfxStageRef.current = stage
      const { pan, atten } = spatialFor(hit.x, hit.y, hit.z)
      const tune = breakTuneForBlock(hit.id)
      // block_hit 比 break 轻一点，再按硬度稍作微调
      const pitch = tune.pitch * (0.96 + Math.random() * 0.08)
      playSfx("block_hit", { volume: 0.6 * tune.volume * atten, pitch, pan })
    }
  }

  // 完成一次方块破坏
  const breakBlock = (hit: Hit) => {
    triggerSwing()
    const world = useGame.getState().world
    if (!world) return
    const previous = hit.id
    const drop = (BLOCK_DEFS[previous]?.drop ?? previous) as BlockId
    const dirtyChunks = new Set<string>(world.setBlock(hit.x, hit.y, hit.z, BLOCKS.AIR) ?? [])
    // 方块在 chunk 边界时需要把相邻 chunk 也标 dirty（面剔除会联动）
    const cx = Math.floor(hit.x / 16), cz = Math.floor(hit.z / 16)
    if (hit.x === cx * 16) dirtyChunks.add(chunkKey(cx - 1, cz))
    if (hit.x === (cx + 1) * 16 - 1) dirtyChunks.add(chunkKey(cx + 1, cz))
    if (hit.z === cz * 16) dirtyChunks.add(chunkKey(cx, cz - 1))
    if (hit.z === (cz + 1) * 16 - 1) dirtyChunks.add(chunkKey(cx, cz + 1))
    if (useGame.getState().gameMode !== "creative") {
      worldEvents.emit(EV_ITEM_DROP, { id: drop, x: hit.x + 0.5, y: hit.y + 0.65, z: hit.z + 0.5 })
    }
    worldEvents.emit(EV_BLOCK_CHANGE, { x: hit.x, y: hit.y, z: hit.z, id: BLOCKS.AIR, prev: previous })
    if (dirtyChunks.size) worldEvents.emit(EV_CHUNK_DIRTY, [...dirtyChunks])
    // eslint-disable-next-line no-console
    console.log(
      `[MINING] breakBlock (${hit.x},${hit.y},${hit.z}) id=${hit.id} def=${BLOCK_DEFS[hit.id]?.key ?? "?"}` +
        ` mode=${useGame.getState().gameMode} dirtyChunks=[${[...dirtyChunks].join(",")}]`
    )
    // 破坏音效
    const { pan, atten } = spatialFor(hit.x, hit.y, hit.z)
    const tune = breakTuneForBlock(hit.id)
    const pitch = tune.pitch * (0.94 + Math.random() * 0.12)
    playSfx("block_break", { volume: tune.volume * atten, pitch, pan })
  }

  // 放置方块
  const placeBlock = (hit: Hit) => {
    triggerSwing()
    const world = useGame.getState().world
    if (!world) return
    const selected = useGame.getState().getSelected()
    if (!selected || selected.id >= 100) return
    const x = hit.x + hit.nx
    const y = hit.y + hit.ny
    const z = hit.z + hit.nz
    // 1) 目标格必须是空气或可替代液体（水/岩浆被放进去就被顶掉），否则拒绝
    const cur = world.getBlock(x, y, z) ?? BLOCKS.AIR
    const curDef = BLOCK_DEFS[cur as BlockId]
    const curSolid = curDef?.solid ?? false
    if (cur !== BLOCKS.AIR && curSolid) return
    // 2) 不能把方块塞进玩家身体里（生存搭脚除外——仅当目标格 < 玩家脚底时允许，玩家会被顶上去）
    {
      const hw = 0.3 // 和碰撞检测保持一致（PLAYER_WIDTH = 0.6 的一半）
      const height = 1.78
      const px = player.x
      const py = player.y
      const pz = player.z
      const overlapX = (px + hw) > x && (px - hw) < (x + 1)
      const overlapZ = (pz + hw) > z && (pz - hw) < (z + 1)
      const overlapY = (py + height) > y && py < (y + 1)
      // 只有目标格完全高于脚底 (y+1 <= py) 或完全低于头顶 (y >= py + height) 才算安全；否则拒放，避免卡头/卡裆
      if (overlapX && overlapZ && overlapY) {
        const topOfBlock = y + 1
        // 允许"搭脚"这种情况：方块顶刚好低于或等于玩家脚，或方块本身在脚底下
        const standCase = topOfBlock <= py + 0.001
        if (!standCase) return
      }
    }
    const dirtyChunks = new Set<string>(world.setBlock(x, y, z, selected.id as BlockId) ?? [])
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16)
    if (x === cx * 16) dirtyChunks.add(chunkKey(cx - 1, cz))
    if (x === (cx + 1) * 16 - 1) dirtyChunks.add(chunkKey(cx + 1, cz))
    if (z === cz * 16) dirtyChunks.add(chunkKey(cx, cz - 1))
    if (z === (cz + 1) * 16 - 1) dirtyChunks.add(chunkKey(cx, cz + 1))
    if (useGame.getState().gameMode !== "creative") useGame.getState().consumeSelected(1)
    worldEvents.emit(EV_BLOCK_CHANGE, { x, y, z, id: selected.id })
    if (dirtyChunks.size) worldEvents.emit(EV_CHUNK_DIRTY, [...dirtyChunks])
    // 往脚下/身体里搭方块：如果新方块顶在玩家脚底下，立刻把玩家顶到方块顶上站好（搭梯/自救），避免卡死
    {
      const hw = 0.3
      const px = player.x
      const py = player.y
      const pz = player.z
      const overlapX = (px + hw) > x && (px - hw) < (x + 1)
      const overlapZ = (pz + hw) > z && (pz - hw) < (z + 1)
      const topOfBlock = y + 1
      const blockHitsFeet = overlapX && overlapZ && topOfBlock >= py && topOfBlock <= py + 0.6
      if (blockHitsFeet) {
        const standY = topOfBlock + 0.002
        player.y = standY
        player.vy = 0
        player.onGround = true
        player.fallStartY = standY
      }
    }
    // 放置音效
    const { pan, atten } = spatialFor(x, y, z)
    const tune = placeTuneForBlock(selected.id as BlockId)
    const pitch = tune.pitch * (0.96 + Math.random() * 0.08)
    playSfx("block_place", { volume: tune.volume * atten, pitch, pan })
  }

  useEffect(() => {
    // 统一的按下/抬起处理函数（同时挂在 mousedown/pointerdown 上，避免被 R3F 合成事件吞）
    const handleDown = (event: { button: number; type: string }) => {
      // 移动端：触屏只负责转视角，挖掘/放置完全由右下角 mc-mine / mc-place 按钮
      // 这里直接返回，避免 pointer/mouse 合成事件把 miningPressed.current 误置 true
      if (detectMobileMode().isMobile) return
      // 防抖：pointerdown 和 mousedown 会连续触发两次；只在"当前未按下"时接受第一次 down
      if (event.button === 0 && miningPressed.current) return
      // 首次交互时解锁 AudioContext（浏览器自动播放策略）
      ensureAudioResumed()
      const pointerLocked = !!document.pointerLockElement
      const mode = useGame.getState().gameMode
      const world = useGame.getState().world
      const origin = camera.getWorldPosition(new THREE.Vector3())
      const dir = camera.getWorldDirection(new THREE.Vector3())
      const maxReach = mode === "creative" ? REACH_CREATIVE : REACH_SURVIVAL
      const hit = raycastVoxel(origin, dir, maxReach)
      // eslint-disable-next-line no-console
      console.log(
        `[MINING] down type=${event.type} button=${event.button} pointerLocked=${pointerLocked}` +
          ` mode=${mode} world=${!!world} hit=${hit ? `(${hit.x},${hit.y},${hit.z}) id=${hit.id} solid=${!!BLOCK_DEFS[hit.id]?.solid}` : "null"}`
      )
      if (!pointerLocked) return
      if (!world) return

      if (event.button === 0) {
        miningPressed.current = true
        if (hit) {
          const st = useGame.getState()
          const def = BLOCK_DEFS[hit.id]
          // 创造模式 / 基岩等不可破坏的特殊处理
          if (st.gameMode === "creative") {
            if (def?.hardness !== -1) breakBlock(hit)
            miningTarget.current = null
            miningProgress.current = 0
          } else {
            // 生存模式：开始累积进度
            miningTarget.current = { ...hit }
            miningProgress.current = 0
            // eslint-disable-next-line no-console
            console.log(
              `[MINING] newTarget (${hit.x},${hit.y},${hit.z}) hardness=${def?.hardness ?? 1}`
            )
          }
        }
      }
      if (event.button === 2) {
        // 防抖：pointerdown 和 mousedown 会连续触发两次
        if (placingPressed.current) return
        placingPressed.current = true
        if (hit) {
          // 优先打开工作台/熔炉 UI（即使手里有方块）
          if (hit.id === BLOCKS.FURNACE) {
            useGame.getState().setOverlay("furnace")
          } else if (hit.id === BLOCKS.CRAFTING_TABLE) {
            useGame.getState().setOverlay("inventory")
          } else {
            const sel = useGame.getState().getSelected()
            const holdingPlaceable = sel && sel.id < 100 && isPlaceable(sel.id)
            if (holdingPlaceable) {
              placeBlock(hit)
              placeCooldownRef.current = 1000 // 1 秒后才连续放
            }
          }
        }
      }
    }
    const handleUp = (event: { button: number; type: string }) => {
      // 移动端同样不处理 PC up（移动端 miningPressed 只由挖掘按钮控制）
      if (detectMobileMode().isMobile) return
      if (event.button === 0) {
        // 防抖：pointerup 和 mouseup 会连续触发两次；只在"当前还按着"时接受第一次 up
        if (!miningPressed.current) return
        const wasPressed = miningPressed.current
        miningPressed.current = false
        const hadProgress = miningProgress.current
        // 松开左键：若还没挖完，则重置进度
        if (miningProgress.current < 1) {
          miningTarget.current = null
          miningProgress.current = 0
        }
        // eslint-disable-next-line no-console
        console.log(
          `[MINING] up type=${event.type} button=0 pressedBefore=${wasPressed} progress=${hadProgress.toFixed(3)} targetCleared=${hadProgress < 1}`
        )
      }
      if (event.button === 2) {
        placingPressed.current = false
      }
    }
    const context = (event: Event) => event.preventDefault()

    // 关键修复：挂 window 并启用 capture 阶段；同时监听 mousedown + pointerdown（Pointer Lock 时 pointer* 更靠谱）
    // 这样不会被 R3F Canvas 内部的合成事件 stopPropagation 吞掉。
    const opts: AddEventListenerOptions = { capture: true, passive: true }
    const downWrapMouse = (e: MouseEvent) => handleDown({ button: e.button, type: "mousedown" })
    const upWrapMouse = (e: MouseEvent) => handleUp({ button: e.button, type: "mouseup" })
    const downWrapPointer = (e: PointerEvent) =>
      handleDown({ button: e.button, type: `pointerdown#${e.pointerType}` })
    const upWrapPointer = (e: PointerEvent) =>
      handleUp({ button: e.button, type: `pointerup#${e.pointerType}` })

    window.addEventListener("mousedown", downWrapMouse, opts)
    window.addEventListener("mouseup", upWrapMouse, opts)
    window.addEventListener("pointerdown", downWrapPointer, opts)
    window.addEventListener("pointerup", upWrapPointer, opts)
    gl.domElement.addEventListener("contextmenu", context)

    return () => {
      window.removeEventListener("mousedown", downWrapMouse, opts)
      window.removeEventListener("mouseup", upWrapMouse, opts)
      window.removeEventListener("pointerdown", downWrapPointer, opts)
      window.removeEventListener("pointerup", upWrapPointer, opts)
      gl.domElement.removeEventListener("contextmenu", context)
    }
  }, [camera, gl])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const origin = camera.getWorldPosition(new THREE.Vector3())
    const dir = camera.getWorldDirection(new THREE.Vector3())
    const mode = useGame.getState().gameMode
    const maxReach = mode === "creative" ? REACH_CREATIVE : REACH_SURVIVAL
    const hit = raycastVoxel(origin, dir, maxReach)
    const st = useGame.getState()

    const mobile = detectMobileMode().isMobile
    if (mobile) {
      miningPressed.current = false
    }

    // ===== 移动端：place 按钮上升沿 → 放一块 =====
    const placeNow = mobileInput.placePressed && !lastPlacePressed.current
    lastPlacePressed.current = mobileInput.placePressed
    if (placeNow && hit) {
      if (hit.id === BLOCKS.FURNACE) {
        useGame.getState().setOverlay("furnace")
      } else if (hit.id === BLOCKS.CRAFTING_TABLE) {
        useGame.getState().setOverlay("inventory")
      } else {
        const sel = useGame.getState().getSelected()
        const holdingPlaceable = sel && sel.id < 100 && isPlaceable(sel.id)
        if (holdingPlaceable) {
          placeBlock(hit)
        }
      }
    }

    // ===== PC 右键长按连续放置（1 秒间隔）=====
    if (placingPressed.current && !mobile) {
      placeCooldownRef.current -= rawDelta * 1000
      if (placeCooldownRef.current <= 0 && hit) {
        const sel = useGame.getState().getSelected()
        if (sel && sel.id < 100 && isPlaceable(sel.id)) {
          placeBlock(hit)
          placeCooldownRef.current = 1000
        }
      }
    }

    // ===== 挖掘按下状态：PC 端 = 左键(miningPressed.current)；移动端 = 仅 mc-mine 按钮(mobileInput.minePressed)
    // 注意：移动端任何手长按/点击屏幕（包括空白区、摇杆上的长按）都绝对不触发挖掘
    const pressed = mobile ? mobileInput.minePressed : (miningPressed.current || mobileInput.minePressed)

    // --- raycast 节流日志（每 0.5s，方便知道"为什么没命中方块"）---
    throttleLog(
      "raycast",
      () =>
        `raycast mode=${st.gameMode} cam=(${origin.x.toFixed(2)},${origin.y.toFixed(2)},${origin.z.toFixed(2)})` +
        ` dir=(${dir.x.toFixed(2)},${dir.y.toFixed(2)},${dir.z.toFixed(2)})` +
        ` hit=${hit ? `(${hit.x},${hit.y},${hit.z}) id=${hit.id} ${BLOCK_DEFS[hit.id]?.key ?? "?"} solid=${!!BLOCK_DEFS[hit.id]?.solid} hardness=${BLOCK_DEFS[hit.id]?.hardness}` : "null"}` +
        ` pressed=${pressed} target=${miningTarget.current ? `(${miningTarget.current.x},${miningTarget.current.y},${miningTarget.current.z})` : "null"} progress=${miningProgress.current.toFixed(3)} playerReady=${player.ready}`,
      500
    )

    // 高亮框
    if (highlightRef.current) {
      highlightRef.current.visible = !!hit
      if (hit) highlightRef.current.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)
    }

    // --- 挖掘进度累积（仅生存模式）---
    if (st.gameMode === "survival" && pressed) {
      // 主 bug 修复：如果正按着左键但还没建立挖掘目标（比如 mousedown 当时没命中方块、或先按后对准），
      // 只要当前帧 raycast 命中了方块，就立刻建立目标开始累积。
      if (!miningTarget.current && hit) {
        const def = BLOCK_DEFS[hit.id]
        if (def?.hardness !== -1) {
          miningTarget.current = { ...hit }
          miningProgress.current = 0
          // eslint-disable-next-line no-console
          console.log(
            `[MINING] useframe-newTarget (${hit.x},${hit.y},${hit.z}) hardness=${def?.hardness ?? 1}`
          )
        }
      }
      if (hit && miningTarget.current) {
        // 必须持续瞄准同一个方块才算
        const sameTarget =
          hit.x === miningTarget.current.x &&
          hit.y === miningTarget.current.y &&
          hit.z === miningTarget.current.z &&
          hit.id === miningTarget.current.id
        if (!sameTarget) {
          // eslint-disable-next-line no-console
          console.log(
            `[MINING] switchTarget old=(${miningTarget.current.x},${miningTarget.current.y},${miningTarget.current.z})` +
              ` new=(${hit.x},${hit.y},${hit.z})`
          )
        }
        if (sameTarget && player.ready) {
          const def = BLOCK_DEFS[hit.id]
          const hardness = def?.hardness ?? 1
          if (hardness >= 0) {
            const prevStage = Math.floor(miningProgress.current * 10)
            // hardness = 秒数基准。徒手：每 1 秒累积 (1/hardness) 的进度。
            const speed = 1 / Math.max(0.05, hardness + 0.2)
            miningProgress.current = Math.min(1, miningProgress.current + speed * dt)
            const curStage = Math.floor(miningProgress.current * 10)
            if (curStage !== prevStage && curStage >= 1 && curStage <= 9) {
              // eslint-disable-next-line no-console
              console.log(
                `[MINING] progress (${hit.x},${hit.y},${hit.z}) stage=${curStage}/9 progress=${miningProgress.current.toFixed(3)} speed/s=${speed.toFixed(2)}`
              )
            }
            if (miningProgress.current >= 1) {
              breakBlock(miningTarget.current)
              miningTarget.current = null
              miningProgress.current = 0
            }
          }
        } else {
          // 目标变了或丢失：如果现在有新 hit 就立刻切目标（不丢按住左键时切下一块的情况），否则清空
          miningTarget.current = hit ? { ...hit } : null
          miningProgress.current = 0
        }
      } else if (!hit) {
        // 没命中任何方块也没 target → 清空
        miningTarget.current = null
        miningProgress.current = 0
      }
    } else if (!pressed) {
      miningTarget.current = null
      miningProgress.current = 0
    }

    // 创造模式：长按左键按冷却节奏连挖（每块 1 秒间隔，与放置节奏一致）
    if (st.gameMode === "creative" && pressed && hit && player.ready) {
      const def = BLOCK_DEFS[hit.id]
      if (def?.hardness !== -1) {
        const now = performance.now()
        if (now - lastCreativeBreak.current >= 1000) {
          lastCreativeBreak.current = now
          // eslint-disable-next-line no-console
          console.log(
            `[MINING] creative-break (${hit.x},${hit.y},${hit.z}) id=${hit.id} key=${BLOCK_DEFS[hit.id]?.key}`
          )
          breakBlock(hit)
        }
      }
    }

    // 创造模式也用 mining 标志（虽然即点即挖）
    const isMining =
      !!hit &&
      player.ready &&
      pressed &&
      (st.gameMode === "creative" || (st.gameMode === "survival" && !!miningTarget.current))

    // 更新裂纹覆盖层
    if (st.gameMode === "survival" && miningTarget.current && miningProgress.current > 0) {
      updateCrackOverlay(miningTarget.current, miningProgress.current)
    } else {
      updateCrackOverlay(null, 0)
    }

    // 防止 lint 抱怨
    void isMining
    void forceTick
  })
  return null
}
