"use client"

import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGame } from "@/lib/store"
import { player, resetPlayer } from "@/lib/player-ref"
import {
  moveAndCollide,
  collides,
  inLiquid,
  headInLiquid,
  GRAVITY,
  JUMP_SPEED,
  WALK_SPEED,
  SPRINT_SPEED,
  SNEAK_SPEED,
  FLY_SPEED,
  TERMINAL_VELOCITY,
  EYE_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
} from "@/lib/physics"
import { worldEvents, EV_TELEPORT } from "@/lib/emitter"
import { playSfx, ensureAudioResumed } from "@/lib/sound"
import { isSolid, isLiquid, BLOCKS, getBlock } from "@/lib/blocks"
import { getItem } from "@/lib/items"
import { mobileInput, detectMobileMode } from "@/lib/player-ref"

export function PlayerController() {
  const { camera } = useThree()
  const world = useGame((s) => s.world)
  const keys = useRef<Record<string, boolean>>({})
  const lastSpaceTap = useRef(0)
  const autoStepCooldownRef = useRef(0) // 自动跳一格的冷却（秒），避免连续推两次
  const overlayRef = useRef(useGame.getState().overlay)
  const damageAccum = useRef({ lava: 0, cactus: 0, void_: 0, regen: 0 })
  const settings = useGame((s) => s.settings)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // 出生初始化
  useEffect(() => {
    if (!world) return
    const st = useGame.getState()
    const sx = st.spawn.x
    const sz = st.spawn.z
    world.ensureChunk(Math.floor(sx / 16), Math.floor(sz / 16))
    const groundY = world.highestSolid(Math.floor(sx), Math.floor(sz)) + 1
    resetPlayer(sx + 0.5, Math.max(groundY, st.spawn.y), sz + 0.5)
    player.yaw = 0
    player.pitch = -0.7
  }, [world])

  // 传送事件（重生）
  useEffect(() => {
    const off = worldEvents.on(EV_TELEPORT, (p) => {
      const { x, y, z } = p as { x: number; y: number; z: number }
      resetPlayer(x, y, z)
    })
    return off
  }, [])

  // 键盘输入
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      ensureAudioResumed()
      const st = useGame.getState()
      const code = e.code
      // 全局热键
      if (code === "Escape") {
        if (st.overlay === "inventory" || st.overlay === "crafting" || st.overlay === "furnace") {
          st.setOverlay(null)
        } else if (st.overlay === null && st.screen === "playing") {
          st.setOverlay("pause")
        } else if (st.overlay === "pause") {
          st.setOverlay(null)
        }
        return
      }
      if (st.screen !== "playing") return
      if (code === "KeyE") {
        if (st.overlay === null) st.setOverlay("inventory")
        else if (st.overlay === "inventory") st.setOverlay(null)
        return
      }
      if (st.overlay !== null) return // UI 打开时不处理移动

      if (code === "F5") {
        e.preventDefault()
        st.toggleThirdPerson()
        return
      }
      if (code.startsWith("Digit")) {
        const n = Number(code.replace("Digit", ""))
        if (n >= 1 && n <= 9) {
          st.selectHotbar(n - 1)
          const item = st.hotbar[n - 1]
          if (item) {
            const name = item.id < 100 ? getBlock(item.id).name : getItem(item.id).name
            st.showToast(name)
          }
        }
      }
      if (code === "Space") {
        const now = performance.now()
        if (st.gameMode === "creative" && now - lastSpaceTap.current < 300) {
          st.setFlying(!st.flying)
        }
        lastSpaceTap.current = now
      }
      keys.current[code] = true
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  // 指针锁定 + 鼠标视角
  useEffect(() => {
    const canvas = document.getElementById("game-canvas")
    if (!canvas) return

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      const sens = 0.0022 * settingsRef.current.mouseSensitivity
      player.yaw -= e.movementX * sens
      player.pitch -= e.movementY * sens
      const lim = Math.PI / 2 - 0.01
      player.pitch = Math.max(-lim, Math.min(lim, player.pitch))
    }

    const onClickCanvas = () => {
      // iPadOS 18 触屏下 requestPointerLock 会被拒绝（无鼠标光标），
      // 移动端用 TouchLookHandler 处理转视角，完全不走指针锁路径。
      if (detectMobileMode().isMobile) return
      const st = useGame.getState()
      if (st.screen === "playing" && st.overlay === null) {
        try { canvas.requestPointerLock?.() } catch (_) { /* 静默失败即可，不影响继续玩 */ }
      }
    }

    const onLockChange = () => {
      const st = useGame.getState()
      if (document.pointerLockElement !== canvas && st.screen === "playing" && st.overlay === null) {
        st.setOverlay("pause")
      }
    }

    document.addEventListener("mousemove", onMove)
    canvas.addEventListener("mousedown", onClickCanvas)
    document.addEventListener("pointerlockchange", onLockChange)

    const onWheel = (e: WheelEvent) => {
      if (document.pointerLockElement !== canvas) return
      const st = useGame.getState()
      if (st.screen !== "playing" || st.overlay !== null) return
      const dir = e.deltaY > 0 ? 1 : -1
      st.scrollHotbar(dir)
      const item = useGame.getState().hotbar[useGame.getState().selectedHotbar]
      if (item) {
        const name = item.id < 100 ? getBlock(item.id).name : getItem(item.id).name
        st.showToast(name)
      }
    }
    document.addEventListener("wheel", onWheel, { passive: true })

    return () => {
      document.removeEventListener("mousemove", onMove)
      canvas.removeEventListener("mousedown", onClickCanvas)
      document.removeEventListener("pointerlockchange", onLockChange)
      document.removeEventListener("wheel", onWheel)
    }
  }, [])

  // 打开 UI 时释放指针锁
  useEffect(() => {
    const unsub = useGame.subscribe((st) => {
      if (st.overlay !== overlayRef.current) {
        overlayRef.current = st.overlay
        if (st.overlay !== null && document.pointerLockElement) {
          document.exitPointerLock?.()
        }
      }
    })
    return unsub
  }, [])

  // 受伤/死亡音效（通过订阅血量变化）
  useEffect(() => {
    let lastHealth = useGame.getState().health
    let lastDead = useGame.getState().overlay === "dead"
    const unsub = useGame.subscribe((st) => {
      const h = st.health
      if (h < lastHealth) {
        const dmg = lastHealth - h
        // 轻微伤和重伤音量不同
        const vol = Math.min(1, 0.45 + dmg * 0.05)
        const pitch = Math.max(0.75, 1.08 - dmg * 0.03)
        playSfx("hurt", { volume: vol, pitch })
      }
      lastHealth = h
      const dead = st.overlay === "dead"
      if (dead && !lastDead) {
        playSfx("death", { volume: 0.8, pitch: 0.96 + Math.random() * 0.08 })
      }
      lastDead = dead
    })
    return unsub
  }, [])

  const tmpEuler = useRef(new THREE.Euler(0, 0, 0, "YXZ"))

  useFrame((_, rawDelta) => {
    if (!world || !player.ready) return
    const st = useGame.getState()
    const dt = Math.min(rawDelta, 0.05)

    // ================================
    // 环境伤害 / 回血（按秒积累，到阈值触发一次）
    // ================================
    const x = Math.floor(player.x)
    const z = Math.floor(player.z)
    const yHead = Math.floor(player.y + EYE_HEIGHT)
    const yFeet = Math.floor(player.y)
    const blockH = world.getBlock(x, yHead, z) ?? 0
    const blockF = world.getBlock(x, yFeet, z) ?? 0
    const inLavaNow = blockH === BLOCKS.LAVA || blockF === BLOCKS.LAVA
    // 仙人掌：在玩家 bbox 内任意一格是仙人掌就算触碰到
    let touchCactusNow = false
    {
      const minX = Math.floor(player.x - 0.3), maxX = Math.floor(player.x + 0.3)
      const minZ = Math.floor(player.z - 0.3), maxZ = Math.floor(player.z + 0.3)
      const minY = yFeet, maxY = yHead
      outer:
      for (let cx = minX; cx <= maxX; cx++)
        for (let cz = minZ; cz <= maxZ; cz++)
          for (let cy = minY; cy <= maxY; cy++)
            if ((world.getBlock(cx, cy, cz) ?? 0) === BLOCKS.CACTUS) { touchCactusNow = true; break outer }
    }
    const inVoidNow = player.y < -32

    damageAccum.current.lava += rawDelta
    damageAccum.current.cactus += rawDelta
    damageAccum.current.void_ += rawDelta
    damageAccum.current.regen += rawDelta

    const isCreative = st.gameMode === "creative"
    if (inLavaNow && !isCreative && damageAccum.current.lava >= 0.5) {
      damageAccum.current.lava = 0
      st.damage(2)
    } else if (!inLavaNow) damageAccum.current.lava = 0

    if (touchCactusNow && !isCreative && damageAccum.current.cactus >= 0.5) {
      damageAccum.current.cactus = 0
      st.damage(1)
    } else if (!touchCactusNow) damageAccum.current.cactus = 0

    if (inVoidNow && !isCreative && damageAccum.current.void_ >= 0.5) {
      damageAccum.current.void_ = 0
      st.damage(2)
    } else if (!inVoidNow) damageAccum.current.void_ = 0

    if (!isCreative && st.hunger >= 20 && st.health < st.maxHealth && damageAccum.current.regen >= 4.0) {
      damageAccum.current.regen = 0
      st.heal(1)
    } else if (!(st.hunger >= 20 && st.health < st.maxHealth)) damageAccum.current.regen = 0

    // 死亡 / UI 打开：不执行物理，但仍同步相机位置
    const overlay = st.overlay
    const uiOpen = overlay !== null
    if (overlay === "inventory" || overlay === "crafting" || overlay === "furnace" || overlay === "dead") {
      const eyeY = player.y + EYE_HEIGHT
      camera.position.set(player.x, eyeY, player.z)
      tmpEuler.current.set(player.pitch, player.yaw, 0, "YXZ")
      camera.quaternion.setFromEuler(tmpEuler.current)
      return
    }

    const k = keys.current

    const creativeFly = st.gameMode === "creative" && st.flying
    player.inWater = inLiquid(world, player.x, player.y, player.z)
    player.headUnderWater = headInLiquid(world, player.x, player.y, player.z)

    // 前进方向（水平）
    const sinY = Math.sin(player.yaw)
    const cosY = Math.cos(player.yaw)
    let forward = 0
    let strafe = 0
    if (k["KeyW"]) forward += 1
    if (k["KeyS"]) forward -= 1
    if (k["KeyA"]) strafe -= 1
    if (k["KeyD"]) strafe += 1

    // 合并移动端摇杆（摇杆是 -1..1 连续值，直接加上相当于模拟按下的程度）
    forward += mobileInput.forward
    strafe += mobileInput.strafe
    // 钳制到 [-1,1]，避免按 W + 推摇杆同时触发导致超 2x 速度
    forward = Math.max(-1, Math.min(1, forward))
    strafe = Math.max(-1, Math.min(1, strafe))

    const sneaking = (!!k["ShiftLeft"] || mobileInput.sneak) && !creativeFly
    player.sneaking = sneaking
    // 冲刺：左 Ctrl（PC） 或 摇杆外推触发的 sprint（移动端）
    const sprinting = (!!k["ControlLeft"] || mobileInput.sprint) && forward > 0
    player.sprinting = sprinting

    let speed = WALK_SPEED
    if (sneaking) speed = SNEAK_SPEED
    else if (sprinting) speed = SPRINT_SPEED
    if (creativeFly) speed = FLY_SPEED * (sprinting ? 1.8 : 1)
    if (player.inWater && !creativeFly) speed *= 0.6

    // 每帧 tick 自动跳一格台阶的冷却（避免"顶两下才上去"）
    autoStepCooldownRef.current = Math.max(0, autoStepCooldownRef.current - dt)

    // 前后为 -Z 方向
    let moveX = (-sinY * forward + cosY * strafe) * speed
    let moveZ = (-cosY * forward - sinY * strafe) * speed

    if (creativeFly) {
      player.vx = moveX
      player.vz = moveZ
      let vy = 0
      if (k["Space"]) vy += speed
      if (k["ShiftLeft"]) vy -= speed
      player.vy = vy
      const res = moveAndCollide(
        world,
        player.x, player.y, player.z,
        player.vx * dt, player.vy * dt, player.vz * dt,
        player.vy,
      )
      player.x = res.x
      player.y = res.y
      player.z = res.z
      player.onGround = res.onGround
      player.fallStartY = player.y
    } else {
      // ===== 自动跳一格台阶（auto-jump）：onGround 在地面上有前进方向 → 设起跳 vy，而不是瞬移 y =====
      if (
        player.onGround && !player.inWater && autoStepCooldownRef.current <= 0 &&
        (Math.abs(moveX) + Math.abs(moveZ)) > 0.15 // 明确向前移动才触发（避免原地抖）
      ) {
        const hw = PLAYER_WIDTH / 2
        const stepExtra = 0.22
        const speedLen = Math.max(1e-6, Math.hypot(moveX, moveZ))
        const nx = moveX / speedLen // 归一化水平方向
        const nz = moveZ / speedLen
        // 预探测：当前位置 + 1 帧预计位移 + 归一化方向 0.22m 前置量
        const futX = player.x + moveX * dt + nx * stepExtra
        const futZ = player.z + moveZ * dt + nz * stepExtra
        const footY = Math.floor(player.y)
        // 身体采样 5 个点（四角 + 中心）覆盖玩家 AABB 宽度
        const samples: Array<[number, number]> = [
          [futX - hw, futZ - hw], [futX + hw, futZ - hw],
          [futX - hw, futZ + hw], [futX + hw, futZ + hw],
          [futX, futZ],
        ]
        let canStep = false
        for (const [sx, sz] of samples) {
          const bx = Math.floor(sx)
          const bz = Math.floor(sz)
          const belowBlk = world.getBlock(bx, footY, bz) ?? BLOCKS.AIR
          const oneUpBlk = world.getBlock(bx, footY + 1, bz) ?? BLOCKS.AIR
          if (isSolid(belowBlk) && !isSolid(oneUpBlk)) {
            const standY = footY + 1
            let headRoom = true
            for (let cy = 0; cy <= Math.ceil(PLAYER_HEIGHT); cy++) {
              if (isSolid(world.getBlock(bx, standY + cy, bz) ?? BLOCKS.AIR)) {
                headRoom = false; break
              }
            }
            if (headRoom && !collides(world, futX, standY + 0.001, futZ)) {
              canStep = true; break
            }
          }
        }
        if (canStep) {
          // 给一个刚好能跳上 1 格高台的起跳速度（比正常 JUMP_SPEED=8.6 略小，避免飞太高）
          // v^2 = 2 g h, h~1.2 m → v ≈ 8.2
          const STEP_VY = 8.2
          player.vy = STEP_VY
          player.onGround = false
          autoStepCooldownRef.current = 0.35 // 冷却 0.35 秒，绝对避免连续再触发第二次
          // fallStartY 设成当前 y，等落地时不会算成"坠落受伤"
          player.fallStartY = player.y
        }
      }

      // 重力 + 跳跃 + 游泳
      player.vx = moveX
      player.vz = moveZ

      if (player.inWater) {
        player.vy -= GRAVITY * 0.25 * dt
        if (player.vy < -3) player.vy = -3
        if (k["Space"] || mobileInput.jump) player.vy = 3.2 // 上浮
      } else {
        player.vy -= GRAVITY * dt
        if (player.vy < -TERMINAL_VELOCITY) player.vy = -TERMINAL_VELOCITY
        if ((k["Space"] || mobileInput.jump) && player.onGround) {
          player.vy = JUMP_SPEED
          player.onGround = false
        }
      }

      const wasOnGround = player.onGround
      const res = moveAndCollide(
        world,
        player.x, player.y, player.z,
        player.vx * dt, player.vy * dt, player.vz * dt,
        player.vy,
      )

      // 潜行防掉落：若离地且潜行，撤销会走出边缘的水平移动
      if (sneaking && wasOnGround && !res.onGround && !player.inWater) {
        // 仅当脚下无支撑时回退水平位移
        if (!collides(world, res.x, res.y - 0.05, res.z)) {
          res.x = player.x
          res.z = player.z
        }
      }

      // 落地伤害（落地音效已取消）
      if (!wasOnGround && res.onGround) {
        const fallDist = player.fallStartY - res.y
        if (!player.inWater) {
          if (fallDist > 3) {
            const dmg = Math.floor(fallDist - 3)
            if (dmg > 0) st.damage(dmg)
          }
        }
      }
      if (res.onGround || player.inWater) {
        player.fallStartY = res.y
      } else if (res.y > player.fallStartY) {
        player.fallStartY = res.y
      }

      player.x = res.x
      player.y = res.y
      player.z = res.z
      player.vy = res.vy
      player.onGround = res.onGround
    }

    // 世界边界坠落保护（掉出世界底部则受伤/重生由 survival 系统处理）
    if (player.y < -10) {
      st.damage(4)
      const sp = st.spawn
      resetPlayer(sp.x + 0.5, sp.y, sp.z + 0.5)
    }

    // 相机朝向：鼠标移动 + 触屏滑动
    // 触屏灵敏度按屏幕尺寸归一化：整屏滑过 → 水平 ≈ 1.5π (270°)，垂直 ≈ 1.0π (180°)
    // 相对之前的 0.9π/0.6π 提升约 1.6 倍，避免 iPad 大尺寸下滑屏 2/3 都转不到半圈
    if (typeof window !== "undefined") {
      const sens = settingsRef.current.mouseSensitivity
      const touchYawPerPx = (Math.PI * 1.5) / Math.max(320, window.innerWidth)
      const touchPitchPerPx = (Math.PI * 1.0) / Math.max(320, window.innerHeight)
      player.yaw -= mobileInput.lookDx * touchYawPerPx * sens
      player.pitch -= mobileInput.lookDy * touchPitchPerPx * sens
      mobileInput.consumeLook()
    }
    const lim = Math.PI / 2 - 0.01
    player.pitch = Math.max(-lim, Math.min(lim, player.pitch))

    tmpEuler.current.set(player.pitch, player.yaw, 0, "YXZ")
    camera.quaternion.setFromEuler(tmpEuler.current)

    // 相机位置（第一/第三人称）
    const eyeY = player.y + EYE_HEIGHT - (sneaking ? 0.15 : 0)
    if (st.thirdPerson) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      const dist = 4
      camera.position.set(
        player.x - dir.x * dist,
        eyeY - dir.y * dist + 0.5,
        player.z - dir.z * dist,
      )
    } else {
      camera.position.set(player.x, eyeY, player.z)
    }
  })

  return null
}
