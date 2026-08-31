"use client"

import { useEffect, useRef, useState } from "react"
import { GameScene } from "@/components/game/game-scene"
import { useGame, type GameMode } from "@/lib/store"
import { ItemIcon } from "@/components/ui-game/item-icon"
import { MobileControls } from "@/components/ui-game/mobile-controls"
import { TouchLookHandler } from "@/components/ui-game/touch-look-handler"
import { detectMobileMode } from "@/lib/player-ref"
import { InventoryOverlay } from "@/components/ui-game/inventory-overlay"
import { FurnaceOverlay } from "@/components/ui-game/furnace-overlay"
import { ItemToast } from "@/components/ui-game/toast"
import { UnderwaterOverlay } from "@/components/ui-game/underwater-overlay"
import { DebugOverlay } from "@/components/ui-game/debug-overlay"
import { getBlock } from "@/lib/blocks"
import { getItem } from "@/lib/items"
import { listSaves, deleteSave, type SaveData } from "@/lib/save"
import { ensureMenuMusic, playUiClick, setMusicVolume } from "@/lib/sound"

function getBlockName(id: number) { return getBlock(id).name }
function getItemName(id: number) { return getItem(id).name }

// iOS Safari 上 click 事件可能被吞（只有 :active 视觉反馈，不触发 React onClick）。
// 用 pointerdown 兜底：触摸时立即触发，并设置 flag 阻止后续 click 重复触发。
// PC 鼠标点击仍走 onClick（pointerType === "mouse" 时 pointerdown 不兜底）。
// 注：该工厂函数返回带“去重”能力的事件处理器集合，调用方需自己持有一个 pointerFiredRef
// （ref 必须跨 render 稳定，因此挂到组件实例上，不能在 map 里动态创建）。
function makeTouchSafeHandlers(pointerFiredRef: React.MutableRefObject<boolean>) {
  return (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return
      pointerFiredRef.current = true
      fn()
    },
    onClick: () => {
      if (pointerFiredRef.current) {
        pointerFiredRef.current = false
        return
      }
      fn()
    },
  })
}

function SettingsPanel({ onBack }: { onBack: () => void }) {
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  const pointerFiredRef = useRef(false)
  const makeHandlers = makeTouchSafeHandlers(pointerFiredRef)

  return (
    <section className="mc-menu-panel" aria-label="设置">
      <h2 className="mc-panel-title">设置</h2>
      <label className="mc-field">
        <span>渲染区块：{settings.renderDistance}</span>
        <input
          type="range" min={2} max={12} step={1}
          value={settings.renderDistance}
          onChange={(e) => setSettings({ renderDistance: Number(e.target.value) })}
        />
      </label>
      <label className="mc-field">
        <span>模拟距离：{settings.simulationDistance}</span>
        <input
          type="range" min={2} max={16} step={1}
          value={settings.simulationDistance}
          onChange={(e) => setSettings({ simulationDistance: Number(e.target.value) })}
        />
      </label>
      <label className="mc-field">
        <span>环境音乐：{Math.round(settings.musicVolume * 100)}%</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={settings.musicVolume}
          onChange={(e) => {
            const musicVolume = Number(e.target.value)
            setSettings({ musicVolume })
            setMusicVolume(musicVolume)
          }}
        />
      </label>
      <button
        className={`mc-button mc-wide mc-toggle ${settings.shadows ? "is-on" : ""}`}
        {...makeHandlers(() => setSettings({ shadows: !settings.shadows }))}
      >
        阴影：{settings.shadows ? "开" : "关"}
      </button>
      <button
        className={`mc-button mc-wide mc-toggle ${settings.autoJump ? "is-on" : ""}`}
        {...makeHandlers(() => setSettings({ autoJump: !settings.autoJump }))}
      >
        自动跳跃：{settings.autoJump ? "开" : "关"}
      </button>
      <button className="mc-button mc-wide" {...makeHandlers(onBack)}>返回</button>
    </section>
  )
}

function LoadingScreen() {
  const world = useGame((s) => s.world)
  const loadProgress = useGame((s) => s.loadProgress)
  const setLoadProgress = useGame((s) => s.setLoadProgress)
  const finishLoad = useGame((s) => s.finishLoad)
  const renderDistance = useGame((s) => s.settings.renderDistance)
  const simulationDistance = useGame((s) => s.settings.simulationDistance)
  const isNewWorld = useGame((s) => s.isNewWorld)
  const spawn = useGame((s) => s.spawn)

  useEffect(() => {
    if (!world) return
    // 移动端性能有限：只预生成"渲染距离"（而非模拟距离），并缩小每帧批处理，
    // 否则一次性生成 289 个高区块会极慢、甚至让移动端标签页崩溃/重载回到主菜单。
    const mobile = detectMobileMode().isMobile
    const rd = mobile ? Math.max(2, Math.min(renderDistance, 4)) : Math.max(renderDistance, simulationDistance)
    // 以玩家实际出生点为中心预生成，而不是 (0,0)。
    // 否则读档时玩家若已远离出生点，周围没有任何已生成的区块，进游戏会"空无一物"。
    const scx = Math.floor(spawn.x / 16)
    const scz = Math.floor(spawn.z / 16)
    const jobs: { cx: number; cz: number }[] = []
    for (let dx = -rd; dx <= rd; dx++)
      for (let dz = -rd; dz <= rd; dz++)
        jobs.push({ cx: scx + dx, cz: scz + dz })
    const total = jobs.length
    let done = 0
    let raf = 0
    let timedOut = false
    const BATCH = mobile ? 2 : 8
    const start = performance.now()
    const step = () => {
      // 每帧生成一批，分摊主线程负载，进度条实时反馈
      for (let i = 0; i < BATCH && jobs.length > 0; i++) {
        const { cx, cz } = jobs.pop()!
        world.ensureChunk(cx, cz)
        done++
      }
      setLoadProgress(done / total)
      // 超时兜底：避免移动端生成过慢时一直卡在加载页
      if (jobs.length > 0 && !timedOut && performance.now() - start < 60000) {
        raf = requestAnimationFrame(step)
      } else {
        timedOut = true
        finishLoad()
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [world, renderDistance, simulationDistance, setLoadProgress, finishLoad, spawn])

  const pct = Math.round(loadProgress * 100)
  return (
    <main className="mc-menu">
      <div className="mc-logo">GPSEEKCRAFT</div>
      <p className="mc-subtitle">{isNewWorld ? "正在生成世界…" : "正在进入世界…"}</p>
      <div className="load-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="load-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="mc-hint">{pct}%</p>
    </main>
  )
}

function Menu() {
  const createWorld = useGame((s) => s.createWorld)
  const loadSaveById = useGame((s) => s.loadSaveById)
  const [view, setView] = useState<"main" | "create" | "saves" | "settings">("main")
  const [name, setName] = useState("我的世界")
  const [seed, setSeed] = useState(20260826)
  const [mode, setMode] = useState<GameMode>("survival")
  const [saves, setSaves] = useState<SaveData[]>([])
  const [error, setError] = useState("")
  const [confirmDel, setConfirmDel] = useState<SaveData | null>(null)

  const start = () => {
    const list = listSaves()
    if (list.length > 0) {
      setSaves(list)
      setView("saves")
    } else {
      setView("create")
    }
  }

  const doCreate = () => {
    try {
      createWorld(name, seed, mode)
      // 进入 loading 状态，由 LoadingScreen 预生成区块后自动进入游戏
    } catch (err) {
      setError("创建世界失败，请重试")
    }
  }

  const doLoad = (id: string) => {
    try {
      if (!loadSaveById(id)) setError("读档��败")
    } catch (err) {
      setError("读档失败")
    }
  }

  const pointerFiredRef = useRef(false)
  const makeHandlers = makeTouchSafeHandlers(pointerFiredRef)

  if (view === "settings") {
    return (
      <main className="mc-menu">
        <div className="mc-logo">GPSEEKCRAFT</div>
        <SettingsPanel onBack={() => { setError(""); setView("main") }} />
      </main>
    )
  }

  if (view === "create") {
    return (
      <main className="mc-menu">
        <div className="mc-logo">GPSEEKCRAFT</div>
        <section className="mc-menu-panel" aria-label="创建新世界">
          <h2 className="mc-panel-title">创建新世界</h2>
          <label className="mc-field">世界名称<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="mc-field">种子<input value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} /></label>
          <button className="mc-button mc-wide" {...makeHandlers(() => setMode(mode === "survival" ? "creative" : "survival"))}>
            {mode === "survival" ? "生存模式" : "创造模式"}
          </button>
          {error && <p className="mc-hint" style={{ color: "#ffd27d" }}>{error}</p>}
          <button className="mc-button mc-wide" {...makeHandlers(doCreate)}>创建并进入世界</button>
          <button className="mc-button mc-wide" {...makeHandlers(() => { setError(""); setView("main") })}>返回</button>
        </section>
      </main>
    )
  }

  if (view === "saves") {
    return (
      <main className="mc-menu">
        <div className="mc-logo">GPSEEKCRAFT</div>
        <section className="mc-menu-panel" aria-label="选择世界">
          <h2 className="mc-panel-title">选择世界</h2>
          <div className="mc-save-list">
            {saves.map((s) => (
              <div key={s.id} className="mc-save-row">
                <button
                  className="mc-button mc-wide mc-save-item"
                  {...makeHandlers(() => doLoad(s.id))}
                >
                  <span>{s.name}</span>
                  <span className="mc-save-meta">
                    {s.gameMode === "creative" ? "创造" : "生存"} · {new Date(s.lastPlayed).toLocaleString()}
                  </span>
                </button>
                <button
                  className="mc-button mc-del"
                  aria-label={`删除存档 ${s.name}`}
                  {...makeHandlers(() => setConfirmDel(s))}
                >✕</button>
              </div>
            ))}
            {saves.length === 0 && <p className="mc-hint">暂无存档</p>}
          </div>
          <button className="mc-button mc-wide" {...makeHandlers(() => { setError(""); setView("create") })}>创建新世界</button>
          <button className="mc-button mc-wide" {...makeHandlers(() => { setError(""); setView("main") })}>返回</button>
        </section>
        {confirmDel && (
          <div className="mc-modal" role="dialog" aria-modal="true" aria-label="删除存档">
            <div className="mc-modal-box">
              <h3>删除存档</h3>
              <p>确定删除存档「{confirmDel.name}」吗？此操作无法撤销。</p>
              <div className="mc-modal-actions">
                <button
                  className="mc-button mc-wide mc-del-confirm"
                  {...makeHandlers(() => {
                    deleteSave(confirmDel.id)
                    setSaves(listSaves())
                    setConfirmDel(null)
                  })}
                >删除</button>
                <button className="mc-button mc-wide" {...makeHandlers(() => setConfirmDel(null))}>取消</button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="mc-menu">
      <div className="mc-logo">GPSEEKCRAFT</div>
      <p className="mc-subtitle">浏览器体素沙盒</p>
      <section className="mc-menu-panel" aria-label="主菜单">
        <button className="mc-button mc-wide" {...makeHandlers(start)}>开始游戏</button>
        <button className="mc-button mc-wide" {...makeHandlers(() => { setError(""); setView("settings") })}>设置</button>
        <p className="mc-hint">WASD 移动 · 空格跳跃 · 左键挖掘 · 右键放置 · E 背包 · ESC 暂停</p>
      </section>
    </main>
  )
}

function Game() {
  const screen = useGame((s) => s.screen)
  const setScreen = useGame((s) => s.setScreen)
  const overlay = useGame((s) => s.overlay)
  const setOverlay = useGame((s) => s.setOverlay)
  const gameMode = useGame((s) => s.gameMode)
  const health = useGame((s) => s.health)
  const hunger = useGame((s) => s.hunger)
  const hotbar = useGame((s) => s.hotbar)
  const selected = useGame((s) => s.selectedHotbar)
  const selectHotbar = useGame((s) => s.selectHotbar)

  const [mobileInfo, setMobileInfo] = useState<{ isMobile: boolean; isTablet: boolean; force: boolean }>({
    isMobile: false, isTablet: false, force: false,
  })
  // 所有 Minecraft 样式按钮（.mc-button）点击时播放 click.mp3（全局委托，鼠标/触摸皆可）
  useEffect(() => {
  const onPointer = (e: PointerEvent) => {
    // 菜单音乐必须在用户手势内启动，否则会被浏览器自动播放策略拦截。
    ensureMenuMusic()
    const t = e.target as Element | null
    if (t && t.closest && t.closest(".mc-button")) void playUiClick()
  }

    document.addEventListener("pointerdown", onPointer)
    return () => document.removeEventListener("pointerdown", onPointer)
  }, [])
  useEffect(() => {
    const update = () => setMobileInfo(detectMobileMode())
    update()
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])
  const { isMobile, isTablet } = mobileInfo

  // hotbar 选中格切换：复用和主菜单同样的 touch-safe 事件包装
  const hotbarPointerRef = useRef(false)
  const makeHandlers = makeTouchSafeHandlers(hotbarPointerRef)

  const dropSelected = useGame((s) => s.dropSelected)
  const dropSlot = useGame((s) => s.dropSlot)
  const showToast = useGame((s) => s.showToast)
  const saveCurrentGame = useGame((s) => s.saveCurrentGame)
  // 自动存档：每 15s 存一次；离开游玩（回菜单）时再存一次
  useEffect(() => {
    if (screen !== "playing") return
    const t = setInterval(() => {
      try { saveCurrentGame() } catch { /* noop */ }
    }, 15000)
    return () => {
      clearInterval(t)
      try { saveCurrentGame() } catch { /* noop */ }
    }
  }, [screen, saveCurrentGame])
  // 每个 hotbar 槽位的长按定时器 + 长按是否已触发 的 ref，放在顶层（数量固定 9 个，用 useMemo 初始化一次即可）
  const slotLongTimers = useRef<Array<ReturnType<typeof setTimeout> | null>>([null, null, null, null, null, null, null, null, null])
  const slotLongFired = useRef<boolean[]>([false, false, false, false, false, false, false, false, false])

  useEffect(() => {
    if (screen !== "playing") return
    const onKey = (e: KeyboardEvent) => {
      // 任何 overlay（背包/暂停/熔炉等）打开时，阻止 Q 丢物和 E 切换背包
      if (!overlay) {
        const k = e.key.toLowerCase()
        if (k === "e") setOverlay("inventory")
        if (k === "q") {
          e.preventDefault()
          const n = e.ctrlKey || e.metaKey ? 64 : 1
          dropSelected(n)
        }
      } else {
        if (e.key === "Escape") setOverlay(null)
        if (e.key.toLowerCase() === "e" && overlay === "inventory") setOverlay(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [screen, overlay, setOverlay, dropSelected])

  if (screen === "loading") return <LoadingScreen />
  if (screen !== "playing") return <Menu />
  return (
    <main
      className={`game-root ${isMobile ? (isTablet ? "is-tablet" : "is-phone") : "is-desktop"}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GameScene />
      <div className={`game-hud ${isMobile ? "is-mobile" : ""}`} aria-live="polite">
        <div className={`bars ${isMobile ? "top-left" : "center"}`}>
          {gameMode !== "creative" && <McHealthBar health={health} maxHealth={20} />}
          {gameMode !== "creative" && <McHungerBar hunger={hunger} />}
        </div>
        <div className="crosshair" aria-hidden>
          <span className="crosshair-v" />
          <span className="crosshair-h" />
        </div>
        {isMobile && (
          <button
            className="mc-pause-btn"
            onClick={() => setOverlay("pause")}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="暂停菜单"
            title="暂停菜单"
          >
            ❚❚
          </button>
        )}
        <div className={`hotbar ${isMobile ? "mc-hotbar-mobile" : ""}`}>
          {hotbar.map((item, i) => {
            const h = makeHandlers(() => selectHotbar(i))
            return (
              <div
                className={`slot ${selected === i ? "selected" : ""}`}
                key={i}
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  // 先把 touch-safe 的 onPointerDown 跑掉（用于切换选中），再启动长按定时器
                  h.onPointerDown(e)
                  slotLongFired.current[i] = false
                  if (item) {
                    const name = item.id < 100 ? getBlockName(item.id) : getItemName(item.id)
                    showToast(name)
                  }
                  if (slotLongTimers.current[i]) clearTimeout(slotLongTimers.current[i]!)
                  slotLongTimers.current[i] = setTimeout(() => {
                    slotLongFired.current[i] = true
                    selectHotbar(i)
                    dropSlot("hotbar", i, 1)
                    // 触发一次轻微的震动反馈
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      try { (navigator as Navigator).vibrate?.(18) } catch (_) { /* noop */ }
                    }
                  }, 500)
                }}
                onPointerUp={(e) => {
                  if (slotLongTimers.current[i]) { clearTimeout(slotLongTimers.current[i]!); slotLongTimers.current[i] = null }
                  // 如果长按已经触发过 drop，就吞掉 onClick 避免随后再走 selectHotbar（切换选中）
                  if (slotLongFired.current[i]) {
                    slotLongFired.current[i] = false
                    e.stopPropagation()
                    return
                  }
                  h.onClick()
                }}
                onPointerLeave={() => {
                  if (slotLongTimers.current[i]) { clearTimeout(slotLongTimers.current[i]!); slotLongTimers.current[i] = null }
                }}
                onPointerCancel={() => {
                  if (slotLongTimers.current[i]) { clearTimeout(slotLongTimers.current[i]!); slotLongTimers.current[i] = null }
                }}
                onClick={(e) => {
                  // 仅 PC 鼠标路径需要这个：touch 路径会被 onPointerUp 里的 stopPropagation 拦截
                  if (slotLongFired.current[i]) {
                    slotLongFired.current[i] = false
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }}
              >
                {item ? (
                  <>
                    <div className="slot-icon"><ItemIcon id={item.id} size={isMobile ? (isTablet ? 56 : 40) : 48} /></div>
                    {item.count > 1 && <span className="slot-count">{item.count}</span>}
                  </>
                ) : null}
              </div>
            )
          })}
          {isMobile && (
            <button
              className="mc-hotbar-more"
              onClick={() => setOverlay("inventory")}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="打开背包"
              title="打开背包"
            >
              ⋯
            </button>
          )}
        </div>
        {isMobile && <MobileControls isTablet={isTablet} />}
        {isMobile && <TouchLookHandler />}
      </div>
      {overlay === "pause" && <div className="overlay"><h2>游戏菜单</h2><button className="mc-button" onClick={() => setOverlay(null)}>返回游戏</button><button className="mc-button" onClick={() => setOverlay("settings")}>设置</button><button className="mc-button" onClick={() => setScreen("menu")}>返回主菜单</button></div>}
      {overlay === "settings" && <div className="overlay"><SettingsPanel onBack={() => setOverlay("pause")} /></div>}
      {overlay === "dead" && <DeathOverlay />}
      {(overlay === "inventory" || overlay === "crafting") && <InventoryOverlay />}
      {overlay === "furnace" && <FurnaceOverlay />}
      <DebugOverlay />
      <UnderwaterOverlay />
      <ItemToast />
    </main>
  )
}

// Minecraft 风格状态栏：直接用整条 PNG 精灵图（20=满血 … 0=空）
function McHealthBar({ health, maxHealth = 20 }: { health: number; maxHealth?: number }) {
  const clamped = Math.max(0, Math.min(maxHealth, Math.round(health)))
  const src = `/assets/Healthbar/${clamped}.png`
  return (
    <div className="mc-bar mc-bar-health" aria-label={`生命 ${clamped}/${maxHealth}`}>
      <img src={src} alt="" width={267} height={30} draggable={false} className="mc-bar-img" />
    </div>
  )
}

// 饥饿条：目前没有饥饿减少机制，只准备了满（20）的一张图
function McHungerBar({ hunger, maxHunger = 20 }: { hunger: number; maxHunger?: number }) {
  const clamped = Math.max(0, Math.min(maxHunger, Math.round(hunger)))
  return (
    <div className="mc-bar mc-bar-hunger" aria-label={`饥饿 ${clamped}/${maxHunger}`}>
      <img src="/assets/Hungerbar/20.png" alt="" width={267} height={30} draggable={false} className="mc-bar-img" />
    </div>
  )
}

function DeathOverlay() {
  const respawn = useGame((s) => s.respawn)
  const setScreen = useGame((s) => s.setScreen)
  const setOverlay = useGame((s) => s.setOverlay)
  // 2s 内从 0 变暗到 0.88，营造慢慢黑下去的死亡动画
  const [t, setT] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const loop = (now: number) => {
      const k = Math.min(1, (now - start) / 2000)
      setT(k)
      if (k < 1) rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
  return (
    <div
      className="overlay"
      style={{
        background: `rgba(0,0,0,${0.1 + t * 0.78})`,
        color: "#fff",
        backdropFilter: "blur(1px)",
        WebkitBackdropFilter: "blur(1px)",
        animation: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h2 style={{ fontSize: 40, marginBottom: 8, color: "#ff6a6a", textShadow: "0 2px 0 #000" }}>你死了</h2>
      <p style={{ opacity: 0.75, marginBottom: 24 }}>已在死亡时保存进度（点击重生即可回到出生点）</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          className="mc-button"
          onClick={() => {
            setOverlay(null)
            queueMicrotask(() => respawn())
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          重生
        </button>
        <button
          className="mc-button"
          onClick={() => {
            respawn()
            setScreen("menu")
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          回到主菜单
        </button>
      </div>
    </div>
  )
}

export default function Page() { return <Game /> }
