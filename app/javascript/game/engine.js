import {
  drawTrack,
  ITEM_BOX_SPAWNS,
  LAP_COUNT,
  startPose,
  WORLD
} from "game/track"
import { Kart, sortedByRace, aiDrive } from "game/kart"
import {
  Hazard,
  Projectile,
  drawWeapons,
  itemLabel,
  rollItem,
  updateHazards,
  updateProjectiles
} from "game/weapons"

const AI_ROSTER = [
  { name: "Rook", color: "#0077b6", accent: "#90e0ef", skill: 0.78 },
  { name: "Dash", color: "#2d6a4f", accent: "#95d5b2", skill: 0.7 },
  { name: "Viper", color: "#9b2226", accent: "#ee9b00", skill: 0.85 },
  { name: "Echo", color: "#4a4e69", accent: "#c9ada7", skill: 0.62 }
]

function formatTime(ms) {
  const total = Math.max(0, ms) / 1000
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  const cs = Math.floor((total - Math.floor(total)) * 100)
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`
}

export class RaceEngine {
  constructor({
    canvas,
    playerName,
    character,
    characterColor,
    characterAccent,
    onHud,
    onFinish
  }) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.playerName = playerName
    this.character = character
    this.characterColor = characterColor
    this.characterAccent = characterAccent
    this.onHud = onHud
    this.onFinish = onFinish

    this.running = false
    this.finished = false
    this.raf = null
    this.lastTs = 0
    this.raceStart = 0
    this.time = 0
    this.countdown = 0

    this.karts = []
    this.player = null
    this.projectiles = []
    this.hazards = []
    this.itemBoxes = ITEM_BOX_SPAWNS.map((b) => ({ ...b }))
    this.keys = new Set()
    this.touch = { up: false, down: false, left: false, right: false, item: false }

    this._onKeyDown = (e) => this.handleKey(e, true)
    this._onKeyUp = (e) => this.handleKey(e, false)
  }

  bindInput() {
    window.addEventListener("keydown", this._onKeyDown)
    window.addEventListener("keyup", this._onKeyUp)
  }

  unbindInput() {
    window.removeEventListener("keydown", this._onKeyDown)
    window.removeEventListener("keyup", this._onKeyUp)
  }

  handleKey(e, down) {
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
      " ": "item"
    }
    const action = map[e.key]
    if (!action) return
    e.preventDefault()
    if (down) this.keys.add(action)
    else this.keys.delete(action)
  }

  setTouch(action, pressed) {
    if (action in this.touch) this.touch[action] = pressed
  }

  reset() {
    this.projectiles = []
    this.hazards = []
    this.itemBoxes = ITEM_BOX_SPAWNS.map((b) => ({ ...b, active: true, cooldown: 0 }))
    this.finished = false
    this.time = 0

    this.player = new Kart({
      name: this.playerName.slice(0, 12),
      color: this.characterColor,
      accent: this.characterAccent,
      isPlayer: true,
      skill: 1
    })

    const ai = AI_ROSTER.map(
      (r) => new Kart({ name: r.name, color: r.color, accent: r.accent, skill: r.skill })
    )

    this.karts = [this.player, ...ai]
    this.karts.forEach((kart, i) => {
      kart.placeAt(startPose(i))
      kart.lap = 0
      kart.checkpoint = 0
      kart.lapStart = 0
      kart.lapTimes = []
      kart.item = null
      kart.finished = false
      kart.finishTime = null
      kart.finishPlace = null
      kart.itemsUsed = 0
    })
  }

  start() {
    this.reset()
    this.running = true
    this.countdown = 3.2
    this.raceStart = 0
    this.lastTs = 0
    this.bindInput()
    this.loop(performance.now())
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.unbindInput()
  }

  loop = (ts) => {
    if (!this.running) return
    if (!this.lastTs) this.lastTs = ts
    const dt = Math.min(0.033, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.time += dt

    this.update(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  update(dt) {
    if (this.countdown > 0) {
      this.countdown -= dt
      this.draw()
      this.pushHud()
      if (this.countdown <= 0) {
        this.raceStart = performance.now()
        this.karts.forEach((k) => {
          k.lapStart = this.raceStart
        })
      }
      return
    }

    if (this.finished) return

    this.applyPlayerInput()
    this.karts.forEach((kart) => {
      if (!kart.isPlayer) aiDrive(kart, this.karts, dt)
      kart.update(dt)
      this.tryUseItem(kart)
    })

    this.updateItemBoxes(dt)
    const hits = [
      ...updateProjectiles(this.projectiles, this.karts, dt),
      ...updateHazards(this.hazards, this.karts, dt)
    ]
    hits.forEach((ev) => {
      if (ev.type === "hit" || ev.type === "spin") ev.kart.hit(ev.power || 1)
    })

    this.projectiles = this.projectiles.filter((p) => p.alive)
    this.hazards = this.hazards.filter((h) => h.alive)

    this.checkFinishes()
    this.pushHud()
  }

  applyPlayerInput() {
    if (!this.player || this.player.finished) return
    this.player.input = {
      up: this.keys.has("up") || this.touch.up,
      down: this.keys.has("down") || this.touch.down,
      left: this.keys.has("left") || this.touch.left,
      right: this.keys.has("right") || this.touch.right,
      item: this.keys.has("item") || this.touch.item
    }
  }

  tryUseItem(kart) {
    if (!kart.item || !kart.input.item || kart._itemLatched || kart.spinTimer > 0) {
      if (!kart.input.item) kart._itemLatched = false
      return
    }
    kart._itemLatched = true
    const item = kart.item
    kart.item = null
    kart.itemsUsed += 1

    if (item === "mushroom") {
      kart.applyBoost(1.15)
    } else if (item === "star") {
      kart.applyStar(3.4)
    } else if (item === "lightning") {
      this.karts.forEach((other) => {
        if (other.id !== kart.id) other.shrink(3.4)
      })
    } else if (item === "banana") {
      this.hazards.push(
        new Hazard({
          type: "banana",
          x: kart.x - Math.cos(kart.angle) * 34,
          y: kart.y - Math.sin(kart.angle) * 34,
          ownerId: kart.id
        })
      )
    } else if (item === "green_shell") {
      this.projectiles.push(
        new Projectile({
          type: "green_shell",
          x: kart.x + Math.cos(kart.angle) * 28,
          y: kart.y + Math.sin(kart.angle) * 28,
          angle: kart.angle,
          ownerId: kart.id
        })
      )
    } else if (item === "red_shell") {
      const standings = sortedByRace(this.karts)
      const myIndex = standings.findIndex((k) => k.id === kart.id)
      const target = myIndex > 0 ? standings[myIndex - 1] : standings[1]
      this.projectiles.push(
        new Projectile({
          type: "red_shell",
          x: kart.x + Math.cos(kart.angle) * 28,
          y: kart.y + Math.sin(kart.angle) * 28,
          angle: kart.angle,
          ownerId: kart.id,
          targetId: target && target.id !== kart.id ? target.id : null
        })
      )
    }
  }

  updateItemBoxes(dt) {
    const standings = sortedByRace(this.karts)
    for (const box of this.itemBoxes) {
      if (!box.active) {
        box.cooldown -= dt
        if (box.cooldown <= 0) box.active = true
        continue
      }

      for (const kart of this.karts) {
        if (kart.item || kart.finished) continue
        if (Math.hypot(kart.x - box.x, kart.y - box.y) < 28) {
          const place = standings.findIndex((k) => k.id === kart.id)
          kart.item = rollItem(place)
          box.active = false
          box.cooldown = 4.5
          break
        }
      }
    }
  }

  checkFinishes() {
    const unfinished = this.karts.filter((k) => !k.finished)
    unfinished.forEach((kart) => {
      if (kart.lap >= LAP_COUNT) {
        kart.finished = true
        kart.finishTime = performance.now() - this.raceStart
        kart.finishPlace = this.karts.filter((k) => k.finished).length
        if (kart.lapTimes.length < LAP_COUNT && kart.lapStart) {
          kart.lapTimes.push(performance.now() - kart.lapStart)
        }
      }
    })

    if (this.player.finished && !this.finished) {
      // wait briefly so AI can settle places, then finalize
      const allDone = this.karts.every((k) => k.finished)
      const waited = this.player.finishTime != null && performance.now() - this.raceStart - this.player.finishTime > 1800
      if (allDone || waited) {
        this.finalize()
      }
    }
  }

  finalize() {
    this.finished = true
    // assign remaining places by distance
    const pending = sortedByRace(this.karts.filter((k) => !k.finished))
    let place = this.karts.filter((k) => k.finished).length
    pending.forEach((kart) => {
      place += 1
      kart.finished = true
      kart.finishPlace = place
      kart.finishTime = performance.now() - this.raceStart
    })

    const bestLap = Math.min(...this.player.lapTimes.filter(Boolean), this.player.finishTime || 999999)
    this.onFinish?.({
      player_name: this.playerName,
      character: this.character,
      finish_position: this.player.finishPlace,
      total_time_ms: Math.round(this.player.finishTime),
      best_lap_ms: Math.round(bestLap),
      items_used: this.player.itemsUsed
    })
  }

  pushHud() {
    const standings = sortedByRace(this.karts)
    const pos = standings.findIndex((k) => k.id === this.player.id) + 1
    const elapsed = this.raceStart ? performance.now() - this.raceStart : 0
    this.onHud?.({
      position: `${pos}/${this.karts.length}`,
      lap: `${Math.min(this.player.lap + 1, LAP_COUNT)}/${LAP_COUNT}`,
      timer: this.countdown > 0 ? "0:00.00" : formatTime(elapsed),
      item: itemLabel(this.player.item),
      countdown: this.countdown
    })
  }

  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, WORLD.width, WORLD.height)
    drawTrack(ctx)

    // item boxes
    for (const box of this.itemBoxes) {
      if (!box.active) continue
      ctx.save()
      ctx.translate(box.x, box.y)
      ctx.rotate(this.time * 2)
      ctx.fillStyle = "#ffd166"
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-7, -12)
      ctx.arcTo(12, -12, 12, 12, 5)
      ctx.arcTo(12, 12, -12, 12, 5)
      ctx.arcTo(-12, 12, -12, -12, 5)
      ctx.arcTo(-12, -12, 12, -12, 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = "#c22510"
      ctx.font = "bold 14px Teko, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.rotate(-this.time * 2)
      ctx.fillText("?", 0, 1)
      ctx.restore()
    }

    drawWeapons(ctx, this.projectiles, this.hazards, this.time)
    // draw karts back-to-front by y for slight depth
    [...this.karts].sort((a, b) => a.y - b.y).forEach((kart) => kart.draw(ctx, this.time))

    if (this.countdown > 0) {
      const label = this.countdown <= 0.45 ? "GO!" : String(Math.ceil(this.countdown))
      ctx.save()
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillRect(0, 0, WORLD.width, WORLD.height)
      ctx.font = "700 120px Teko, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = this.countdown <= 1 ? "#ffd166" : "#f4f7ff"
      ctx.fillText(label, WORLD.width / 2, WORLD.height / 2)
      ctx.restore()
    }
  }
}

export { formatTime }
