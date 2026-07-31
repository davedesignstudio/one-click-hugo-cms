import {
  TOTAL_LAPS,
  KART_COUNT,
  KART_COLORS,
  KART_NAMES,
  WORLD,
  placeLabel
} from "game/constants"
import { Kart } from "game/kart"
import {
  drawTrack,
  startGrid,
  itemBoxSpawns
} from "game/track"
import { ItemBox, useItem, itemLabel } from "game/items"

export class RaceGame {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.hooks = hooks
    this.keys = {}
    this.touch = { left: false, right: false, up: false, down: false, item: false }
    this.running = false
    this.raf = null
    this._bindInput()
    this.reset()
  }

  reset() {
    const grid = startGrid(KART_COUNT)
    this.karts = grid.map((spot, i) =>
      new Kart({
        id: i,
        name: KART_NAMES[i],
        color: KART_COLORS[i],
        x: spot.x,
        y: spot.y,
        angle: spot.angle,
        isPlayer: i === 0
      })
    )
    this.player = this.karts[0]
    this.boxes = itemBoxSpawns().map((s) => new ItemBox(s))
    this.hazards = []
    this.projectiles = []
    this.particles = []
    this.time = 0
    this.flashTimer = 0
    this.countdown = 0
    this.state = "ready"
    this.camera = { x: this.player.x, y: this.player.y }
    this.lastResult = null
    this._syncHud()
    this._draw()
  }

  start() {
    if (this.state === "racing") return
    this.reset()
    this.state = "countdown"
    this.countdown = 180
    this.running = true
    this._loop()
  }

  destroy() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    window.removeEventListener("keydown", this._onKeyDown)
    window.removeEventListener("keyup", this._onKeyUp)
  }

  _bindInput() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault()
      }
      if (e.code === "Space" && this.state === "racing") {
        useItem(this.player, this)
      }
    }
    this._onKeyUp = (e) => {
      this.keys[e.code] = false
    }
    window.addEventListener("keydown", this._onKeyDown)
    window.addEventListener("keyup", this._onKeyUp)
  }

  setTouch(action, pressed) {
    if (action === "left") this.touch.left = pressed
    if (action === "right") this.touch.right = pressed
    if (action === "accel") this.touch.up = pressed
    if (action === "brake") this.touch.down = pressed
    if (action === "item" && pressed && this.state === "racing") useItem(this.player, this)
  }

  _playerInput() {
    return {
      up: !!(this.keys.ArrowUp || this.keys.KeyW || this.touch.up),
      down: !!(this.keys.ArrowDown || this.keys.KeyS || this.touch.down),
      left: !!(this.keys.ArrowLeft || this.keys.KeyA || this.touch.left),
      right: !!(this.keys.ArrowRight || this.keys.KeyD || this.touch.right)
    }
  }

  _loop() {
    if (!this.running) return
    this._update()
    this._draw()
    this.raf = requestAnimationFrame(() => this._loop())
  }

  _update() {
    if (this.state === "countdown") {
      this.countdown -= 1
      this.camera.x += (this.player.x - this.camera.x) * 0.08
      this.camera.y += (this.player.y - this.camera.y) * 0.08
      if (this.countdown <= 0) this.state = "racing"
      this._syncHud()
      return
    }

    if (this.state !== "racing" && this.state !== "finished") return

    if (this.state === "racing") this.time += 1 / 60
    if (this.flashTimer > 0) this.flashTimer -= 1

    const lead = Math.max(...this.karts.map((k) => k.raceDistance))

    for (const kart of this.karts) {
      if (kart.finished) {
        kart.update({ up: false, down: false, left: false, right: false }, 1)
        continue
      }

      let input
      if (kart.isPlayer) {
        input = this._playerInput()
      } else {
        input = kart.aiInput(lead)
        if (input.useItem) useItem(kart, this)
      }
      kart.update(input, 1)

      if (kart.lap >= TOTAL_LAPS) {
        kart.finished = true
        kart.finishTime = this.time
        kart.lap = TOTAL_LAPS
        kart.progress = 0
      }
    }

    for (const box of this.boxes) {
      box.update()
      if (!box.active) continue
      for (const kart of this.karts) {
        if (kart.finished || kart.item) continue
        if (Math.hypot(kart.x - box.x, kart.y - box.y) < 30) {
          kart.giveItem(box.collect())
          this._burst(box.x, box.y, "#ffb020")
        }
      }
    }

    for (const hazard of this.hazards) {
      hazard.update()
      for (const kart of this.karts) {
        if (kart.id === hazard.ownerId && hazard.life > 1140) continue
        if (kart.finished) continue
        if (Math.hypot(kart.x - hazard.x, kart.y - hazard.y) < hazard.radius + 14) {
          if (hazard.type === "oil") {
            kart.angle += (Math.random() - 0.5) * 0.35
            kart.speed *= 0.7
          } else if (kart.hit("spin")) {
            hazard.life = 0
            this._burst(kart.x, kart.y, "#e6b400")
          }
        }
      }
    }
    this.hazards = this.hazards.filter((h) => !h.dead)

    for (const shot of this.projectiles) {
      shot.update(this.karts)
      for (const kart of this.karts) {
        if (kart.id === shot.ownerId || kart.finished) continue
        if (Math.hypot(kart.x - shot.x, kart.y - shot.y) < shot.radius + 16) {
          if (kart.hit("spin")) {
            shot.life = 0
            this._burst(kart.x, kart.y, shot.type === "red_shell" ? "#e23b3b" : "#2db84c")
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead)

    // Soft kart bump
    for (let i = 0; i < this.karts.length; i++) {
      for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i]
        const b = this.karts[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        if (dist < 28 && dist > 0.01) {
          const push = ((28 - dist) / 28) * 1.4
          const nx = dx / dist
          const ny = dy / dist
          a.x -= nx * push
          a.y -= ny * push
          b.x += nx * push
          b.y += ny * push
          a.speed *= 0.96
          b.speed *= 0.96
        }
      }
    }

    this.particles = this.particles.filter((p) => {
      p.life -= 1
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      return p.life > 0
    })

    this.camera.x += (this.player.x - this.camera.x) * 0.12
    this.camera.y += (this.player.y - this.camera.y) * 0.12

    if (this.state === "racing" && this.player.finished) {
      this.state = "finished"
      const order = [...this.karts].sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime
        if (a.finished) return -1
        if (b.finished) return 1
        return b.raceDistance - a.raceDistance
      })
      const position = order.findIndex((k) => k.id === this.player.id) + 1
      this.lastResult = {
        finish_time: Number(this.player.finishTime.toFixed(2)),
        position,
        laps: TOTAL_LAPS,
        weapon_hits: this.player.weaponHits
      }
      this.hooks.onFinish?.(this.lastResult, order)
    }

    this._syncHud()
  }

  _burst(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 1 + Math.random() * 3
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 20 + Math.random() * 16,
        color
      })
    }
  }

  standings() {
    return [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      if (a.finished) return -1
      if (b.finished) return 1
      return b.raceDistance - a.raceDistance
    })
  }

  _syncHud() {
    const order = this.standings()
    const place = order.findIndex((k) => k.id === this.player.id) + 1
    this.hooks.onHud?.({
      lap: Math.min(this.player.lap + 1, TOTAL_LAPS),
      totalLaps: TOTAL_LAPS,
      place,
      placeLabel: placeLabel(place),
      time: this.time,
      item: itemLabel(this.player.item),
      state: this.state,
      countdown: this.countdown,
      standings: order.map((k, idx) => ({
        name: k.name,
        place: idx + 1,
        you: k.isPlayer,
        lap: Math.min(k.lap + (k.finished ? 0 : 1), TOTAL_LAPS),
        finished: k.finished
      }))
    })
  }

  _draw() {
    const ctx = this.ctx
    const { width, height } = this.canvas
    ctx.clearRect(0, 0, width, height)

    // Sky backdrop outside world transform
    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, "#6eb6ff")
    sky.addColorStop(0.45, "#b8dfff")
    sky.addColorStop(1, "#dfe9c8")
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(0.85, 0.85)
    ctx.translate(-this.camera.x, -this.camera.y)

    drawTrack(ctx)

    // Soft world edge vignette markers
    ctx.strokeStyle = "rgba(16,21,28,0.15)"
    ctx.strokeRect(20, 20, WORLD.width - 40, WORLD.height - 40)

    for (const hazard of this.hazards) hazard.draw(ctx)
    for (const box of this.boxes) box.draw(ctx)
    for (const shot of this.projectiles) shot.draw(ctx)
    for (const kart of this.karts) kart.draw(ctx)

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 30)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, 4, 4)
      ctx.globalAlpha = 1
    }

    // Name tags
    ctx.font = "700 16px Outfit, sans-serif"
    ctx.textAlign = "center"
    for (const kart of this.karts) {
      ctx.fillStyle = kart.isPlayer ? "#c8f542" : "rgba(242,245,240,0.85)"
      ctx.fillText(kart.name, kart.x, kart.y - 28 * kart.scale)
    }

    ctx.restore()

    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 240, 120, ${this.flashTimer / 24})`
      ctx.fillRect(0, 0, width, height)
    }

    if (this.state === "countdown") {
      const n = Math.ceil(this.countdown / 60)
      ctx.fillStyle = "rgba(8,11,16,0.35)"
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = n <= 1 ? "#c8f542" : "#f2f5f0"
      ctx.font = "700 120px Teko, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(n <= 0 ? "GO" : String(n), width / 2, height / 2)
    }
  }
}

export function formatRaceTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(2).padStart(5, "0")}`
}
