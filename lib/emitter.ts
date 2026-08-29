// 极简发布订阅：用于世界方块变动通知（区块重建）
type Handler = (payload: unknown) => void

class Emitter {
  private map = new Map<string, Set<Handler>>()

  on(event: string, h: Handler) {
    if (!this.map.has(event)) this.map.set(event, new Set())
    this.map.get(event)!.add(h)
    return () => this.off(event, h)
  }
  off(event: string, h: Handler) {
    this.map.get(event)?.delete(h)
  }
  emit(event: string, payload?: unknown) {
    this.map.get(event)?.forEach((h) => h(payload))
  }
}

export const worldEvents = new Emitter()

// 事件名
export const EV_CHUNK_DIRTY = "chunkDirty" // payload: string[] 区块 key
export const EV_TELEPORT = "teleport" // payload: {x,y,z}
export const EV_BLOCK_CHANGE = "blockChange" // payload: {x,y,z,id,prev}
export const EV_ITEM_DROP = "itemDrop" // payload: {id,x,y,z,fromPlayer?}
