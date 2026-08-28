"use client"

// 第一人称手：固定在屏幕右下角的 3D 手臂 + 手持物品模型。
// 挖掘/放置时触发一次挥动动画（手臂前后摆动）。
import { useRef, useMemo, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGame } from "@/lib/store"
import { worldEvents, EV_BLOCK_CHANGE } from "@/lib/emitter"
import { getBlock, BLOCKS } from "@/lib/blocks"
import { getItem } from "@/lib/items"
import { getAtlasTexture, getFaceUV } from "@/lib/texture-atlas"
import { player } from "@/lib/player-ref"

// 手臂皮肤色
const SKIN = "#e8b88a"
const SKIN_DARK = "#c89868"
const SLEEVE = "#4a7a3a"
const SLEEVE_DARK = "#3a6a2a"

// 挥动动画状态（全局 ref，由事件触发）
let swingTime = -1
let prevSwingTime = -1

export function triggerSwing() {
  swingTime = 0
}

export function HandView() {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const armRef = useRef<THREE.Group>(null)
  const itemRef = useRef<THREE.Group>(null)
  const atlas = useMemo(() => getAtlasTexture(), [])
  const selectedId = useGame((s) => {
    const item = s.hotbar[s.selectedHotbar]
    return item ? item.id : 0
  })

  // 监听方块变动 → 触发挥动
  useEffect(() => {
    const off = worldEvents.on(EV_BLOCK_CHANGE, () => {
      swingTime = 0
    })
    return off
  }, [])

  // 手持物品的纹理材质
  const itemMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({ map: atlas, transparent: true, alphaTest: 0.5 })
  }, [atlas])

  // 构建手持方块的小立方体 geometry（6 面 UV）
  const blockGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1)
    const uvAttr = g.getAttribute("uv")
    const uvs = uvAttr as THREE.BufferAttribute
    // BoxGeometry 面顺序：+X, -X, +Y, -Y, +Z, -Z，每面 4 顶点
    // uv 默认每面是 (0,1)(1,1)(0,0)(1,0) 等，我们需要按 getFaceUV 映射
    const faceOrder = [0, 1, 2, 3, 4, 5] // +X=side, -X=side, +Y=top, -Y=bottom, +Z=side, -Z=side
    for (let face = 0; face < 6; face++) {
      const faceIndex = faceOrder[face]
      const blockId = selectedId > 0 && selectedId < 100 ? selectedId : BLOCKS.STONE
      const faceUVs = getFaceUV(blockId, faceIndex)
      const base = face * 4
      uvs.setXY(base + 0, faceUVs[0][0], faceUVs[0][1])
      uvs.setXY(base + 1, faceUVs[1][0], faceUVs[1][1])
      uvs.setXY(base + 2, faceUVs[2][0], faceUVs[2][1])
      uvs.setXY(base + 3, faceUVs[3][0], faceUVs[3][1])
    }
    uvs.needsUpdate = true
    return g
  }, [selectedId])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const g = groupRef.current
    if (!g) return

    // 第三人称或 UI 打开时隐藏手
    const st = useGame.getState()
    if (st.thirdPerson || st.overlay !== null || st.screen !== "playing") {
      g.visible = false
      return
    }
    g.visible = true

    // 将手固定到相机前方右下角
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    // 局部偏移：右 0.5, 下 -0.45, 前 -1.1
    const offset = new THREE.Vector3(0.55, -0.5, -1.15)
    offset.applyQuaternion(camera.quaternion)
    g.position.add(offset)

    // 挥动动画
    if (swingTime >= 0) {
      swingTime += dt
    }
    const swing = swingTime >= 0 && swingTime < 0.4 ? swingTime : -1
    const arm = armRef.current
    if (arm) {
      if (swing >= 0) {
        // 0→0.15s 向前挥，0.15→0.4s 回弹
        const phase = swing < 0.15 ? swing / 0.15 : 1 - (swing - 0.15) / 0.25
        const eased = Math.sin(phase * Math.PI) // 0→1→0
        arm.rotation.x = -eased * 1.2
        arm.position.z = -eased * 0.15
      } else {
        arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, 0, 0.2)
        arm.position.z = THREE.MathUtils.lerp(arm.position.z, 0, 0.2)
      }
    }

    // 行走时手臂轻微摆动
    if (player.onGround && (Math.abs(player.vx) + Math.abs(player.vz)) > 0.5) {
      const t = performance.now() / 1000
      const bob = Math.sin(t * 8) * 0.06
      if (arm && swing < 0) {
        arm.rotation.x = bob
        arm.position.y = Math.abs(Math.sin(t * 8)) * 0.02
      }
    }

    // 显示/隐藏手持物品
    if (itemRef.current) {
      itemRef.current.visible = selectedId > 0
    }

    void prevSwingTime
  })

  // 手臂几何体：上臂 + 袖子
  const armGeo = useMemo(() => new THREE.BoxGeometry(0.22, 0.5, 0.22), [])
  const sleeveGeo = useMemo(() => new THREE.BoxGeometry(0.24, 0.26, 0.24), [])

  const isTool = selectedId >= 100 && !!getItem(selectedId).toolType
  const isBlock = selectedId > 0 && selectedId < 100

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* 手臂 */}
      <group ref={armRef}>
        {/* 上臂（皮肤色） */}
        <mesh geometry={armGeo} castShadow>
          <meshLambertMaterial color={SKIN} />
        </mesh>
        {/* 袖子（覆盖上臂上半部分） */}
        <mesh geometry={sleeveGeo} position={[0, 0.12, 0]} castShadow>
          <meshLambertMaterial color={SLEEVE} />
        </mesh>
        {/* 手部（前段，皮肤色） */}
        <mesh geometry={armGeo} position={[0, -0.36, 0]} castShadow>
          <meshLambertMaterial color={SKIN} />
        </mesh>

        {/* 手持物品 */}
        <group ref={itemRef} position={[0, -0.42, 0.15]} visible={selectedId > 0}>
          {isBlock && (
            <mesh geometry={blockGeo} material={itemMaterial} scale={[0.35, 0.35, 0.35]} rotation={[0.3, 0.6, 0]}>
            </mesh>
          )}
          {isTool && <ToolModel itemId={selectedId} />}
        </group>
      </group>
    </group>
  )
}

// 简易工具模型：手柄 + 工具头
function ToolModel({ itemId }: { itemId: number }) {
  const item = getItem(itemId)
  const color = item.color
  const handleGeo = useMemo(() => new THREE.BoxGeometry(0.04, 0.4, 0.04), [])
  const headGeo = useMemo(() => {
    const t = item.toolType
    if (t === "pickaxe") return new THREE.BoxGeometry(0.2, 0.06, 0.04)
    if (t === "axe") return new THREE.BoxGeometry(0.14, 0.12, 0.04)
    if (t === "shovel") return new THREE.BoxGeometry(0.1, 0.12, 0.04)
    return new THREE.BoxGeometry(0.06, 0.22, 0.04) // sword
  }, [item.toolType])

  return (
    <group rotation={[0.5, 0, 0]}>
      {/* 手柄 */}
      <mesh geometry={handleGeo} position={[0, 0, 0]}>
        <meshLambertMaterial color="#8a6a3a" />
      </mesh>
      {/* 工具头 */}
      <mesh geometry={headGeo} position={[0, 0.22, 0]} castShadow>
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  )
}
