// 玩家 AABB 碰撞与体素世界求解
import { isSolid, isLiquid } from "./blocks"
import type { World } from "./world"

export const PLAYER_WIDTH = 0.6
export const PLAYER_HEIGHT = 1.8
export const EYE_HEIGHT = 1.62
export const GRAVITY = 28 // 方块/秒^2
export const JUMP_SPEED = 8.6
export const WALK_SPEED = 4.3
export const SPRINT_SPEED = 5.6
export const SNEAK_SPEED = 1.5
export const FLY_SPEED = 10
export const TERMINAL_VELOCITY = 55

const HW = PLAYER_WIDTH / 2

// 检测给定 AABB（以 pos 为脚底中心）是否与固体方块相交
export function collides(world: World, x: number, y: number, z: number): boolean {
  const minX = Math.floor(x - HW)
  const maxX = Math.floor(x + HW)
  const minY = Math.floor(y)
  const maxY = Math.floor(y + PLAYER_HEIGHT)
  const minZ = Math.floor(z - HW)
  const maxZ = Math.floor(z + HW)
  for (let bx = minX; bx <= maxX; bx++) {
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        if (isSolid(world.getBlock(bx, by, bz))) return true
      }
    }
  }
  return false
}

// 玩家脚部/身体是否在液体中
export function inLiquid(world: World, x: number, y: number, z: number): boolean {
  const bx = Math.floor(x)
  const bz = Math.floor(z)
  const byFeet = Math.floor(y + 0.2)
  const byHead = Math.floor(y + EYE_HEIGHT)
  return isLiquid(world.getBlock(bx, byFeet, bz)) || isLiquid(world.getBlock(bx, byHead, bz))
}

export function headInLiquid(world: World, x: number, y: number, z: number): boolean {
  return isLiquid(world.getBlock(Math.floor(x), Math.floor(y + EYE_HEIGHT), Math.floor(z)))
}

export interface MoveResult {
  x: number
  y: number
  z: number
  onGround: boolean
  vy: number
}

// 分轴移动并逐轴解决碰撞，返回新的坐标与是否落地
export function moveAndCollide(
  world: World,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
  vy: number,
): MoveResult {
  let onGround = false

  // X 轴
  let nx = x + dx
  if (collides(world, nx, y, z)) {
    nx = x
  }
  x = nx

  // Z 轴
  let nz = z + dz
  if (collides(world, x, y, nz)) {
    nz = z
  }
  z = nz

  // Y 轴
  let ny = y + dy
  if (collides(world, x, ny, z)) {
    if (dy < 0) {
      onGround = true
    }
    ny = y
    vy = 0
  }
  y = ny

  return { x, y, z, onGround, vy }
}
