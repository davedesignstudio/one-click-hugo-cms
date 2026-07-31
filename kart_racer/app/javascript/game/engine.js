import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GAME_CONFIG, KART_COLORS, randomWeapon
} from "game/constants"
import {
  drawTrack, drawItemBox, checkItemBoxCollision,
  generateItemBoxPositions, getStartPositions
} from "game/track"
import {
  Kart, checkProjectileHits, checkHazardHits, checkKartCollisions
} from "game/kart"
import { AIController } from "game/ai"

const WEAPON_ICONS = {
  green_shell: "🟢 Shell",
  red_shell: "🔴 Shell",
  banana: "🍌 Banana",
  mushroom: "🍄 Boost",
  star: "⭐ Star",
  lightning: "⚡ Lightning"
}

export class KartRacerEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.playerName = options.playerName || "Player"
    this.onRaceEnd = options.onRaceEnd || (() => {})
    this.onUpdate = options.onUpdate || (() => {})

    this.state = "countdown" // countdown, racing, finished
    this.countdownValue = 3
    this.countdownStart = 0
    this.raceStartTime = 0
    this.raceEndTime = 0

    this.karts = []
    this.aiControllers = []
    this.projectiles = []
    this.hazards = []
    this.itemBoxes = []

    this.keys = {}
    this.animationId = null
    this.lastFrame = 0

    this.setupInput()
    this.reset()
  }

  reset() {
    this.karts = []
    this.aiControllers = []
    this.projectiles = []
    this.hazards = []
    this.itemBoxes = generateItemBoxPositions(GAME_CONFIG.itemBoxCount)

    const startPositions = getStartPositions(GAME_CONFIG.maxKarts)

    // Player kart
    const playerKart = new Kart({
      ...startPositions[0],
      color: KART_COLORS[0],
      isPlayer: true,
      name: this.playerName
    })
    this.karts.push(playerKart)

    // AI karts
    for (let i = 1; i < GAME_CONFIG.maxKarts; i++) {
      const kart = new Kart({
        ...startPositions[i],
        color: KART_COLORS[i],
        name: KART_COLORS[i].name
      })
      this.karts.push(kart)
      this.aiControllers.push(new AIController(kart, 0.7 + i * 0.08))
    }

    this.state = "countdown"
    this.countdownValue = 3
    this.countdownStart = performance.now()
    this.raceStartTime = 0
    this.raceEndTime = 0
  }

  setupInput() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true
      if (e.code === "Space") {
        e.preventDefault()
        this.useWeapon()
      }
    }
    this._onKeyUp = (e) => {
      this.keys[e.code] = false
    }
    window.addEventListener("keydown", this._onKeyDown)
    window.addEventListener("keyup", this._onKeyUp)
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    window.removeEventListener("keydown", this._onKeyDown)
    window.removeEventListener("keyup", this._onKeyUp)
  }

  getPlayerInput() {
    return {
      up: this.keys["ArrowUp"] || this.keys["KeyW"],
      down: this.keys["ArrowDown"] || this.keys["KeyS"],
      left: this.keys["ArrowLeft"] || this.keys["KeyA"],
      right: this.keys["ArrowRight"] || this.keys["KeyD"]
    }
  }

  useWeapon() {
    if (this.state !== "racing") return
    const player = this.karts[0]
    player.useWeapon(this.projectiles, this.hazards, this.karts)
  }

  start() {
    this.lastFrame = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - this.lastFrame) / 16.67, 3)
      this.lastFrame = now
      this.update(now, dt)
      this.render()
      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  update(now, dt) {
    if (this.state === "countdown") {
      const elapsed = now - this.countdownStart
      this.countdownValue = Math.max(0, 3 - Math.floor(elapsed / 1000))
      if (elapsed >= 4000) {
        this.state = "racing"
        this.raceStartTime = now
      }
      return
    }

    if (this.state === "finished") return

    // Update karts
    const player = this.karts[0]
    player.update(this.getPlayerInput(), dt)

    this.aiControllers.forEach((ai, i) => {
      const kart = this.karts[i + 1]
      const input = ai.getInput(this.karts)
      kart.update(input, dt)
      if (input.useWeapon) {
        kart.useWeapon(this.projectiles, this.hazards, this.karts)
      }
    })

    // Update projectiles and hazards
    this.projectiles.forEach(p => p.update(dt))
    this.hazards.forEach(h => h.update())
    this.projectiles = this.projectiles.filter(p => p.alive)
    this.hazards = this.hazards.filter(h => h.alive)

    // Collisions
    checkProjectileHits(this.projectiles, this.karts)
    checkHazardHits(this.hazards, this.karts)
    checkKartCollisions(this.karts)

    // Item boxes
    this.itemBoxes.forEach(box => {
      if (!box.active && now >= box.respawnAt) {
        box.active = true
      }
      if (box.active) {
        this.karts.forEach(kart => {
          if (!kart.weapon && checkItemBoxCollision(kart, box)) {
            kart.weapon = randomWeapon()
            box.active = false
            box.respawnAt = now + GAME_CONFIG.itemBoxRespawnMs
          }
        })
      }
    })

    // Check race finish
    this.karts.forEach(k => {
      if (!k.finished && k.lap >= GAME_CONFIG.totalLaps) {
        k.finished = true
        k.finishTime = now - this.raceStartTime
      }
    })

    if (player.finished && this.state === "racing") {
      this.state = "finished"
      this.raceEndTime = now
      const position = this.getPosition(player)
      this.onRaceEnd({
        position,
        totalTime: player.finishTime / 1000,
        laps: GAME_CONFIG.totalLaps,
        playerName: this.playerName
      })
    }

    this.onUpdate(this.getHUDData())
  }

  getPosition(kart) {
    const sorted = [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      if (a.finished) return -1
      if (b.finished) return 1
      return b.checkpointProgress - a.checkpointProgress
    })
    return sorted.indexOf(kart) + 1
  }

  getHUDData() {
    const player = this.karts[0]
    return {
      lap: Math.min(player.lap + 1, GAME_CONFIG.totalLaps),
      totalLaps: GAME_CONFIG.totalLaps,
      position: this.getPosition(player),
      totalRacers: this.karts.length,
      weapon: player.weapon ? WEAPON_ICONS[player.weapon] : null,
      speed: Math.abs(player.speed).toFixed(1),
      raceTime: this.raceStartTime ? ((performance.now() - this.raceStartTime) / 1000).toFixed(1) : "0.0",
      state: this.state,
      countdown: this.countdownValue
    }
  }

  render() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    drawTrack(ctx)

    // Item boxes
    this.itemBoxes.forEach(box => drawItemBox(ctx, box))

    // Hazards
    this.hazards.forEach(h => h.draw(ctx))

    // Projectiles
    this.projectiles.forEach(p => p.draw(ctx))

    // Karts (draw non-player first)
    const sorted = [...this.karts].sort((a, b) => a.y - b.y)
    sorted.forEach(k => k.draw(ctx))

    // Countdown overlay
    if (this.state === "countdown") {
      this.drawCountdown()
    }

    if (this.state === "finished") {
      this.drawFinishOverlay()
    }
  }

  drawCountdown() {
    const ctx = this.ctx
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = "#fff"
    ctx.font = "bold 120px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const text = this.countdownValue > 0 ? String(this.countdownValue) : "GO!"
    const scale = this.countdownValue === 0 ? 1.2 : 1
    ctx.save()
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    ctx.scale(scale, scale)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  drawFinishOverlay() {
    const ctx = this.ctx
    const player = this.karts[0]
    const position = this.getPosition(player)

    ctx.fillStyle = "rgba(0,0,0,0.6)"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = "#ffd60a"
    ctx.font = "bold 48px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Race Complete!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60)

    const ordinals = ["1st", "2nd", "3rd", "4th"]
    ctx.fillStyle = "#fff"
    ctx.font = "bold 36px sans-serif"
    ctx.fillText(`You finished ${ordinals[position - 1] || position + "th"}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

    ctx.font = "24px sans-serif"
    ctx.fillText(`Time: ${(player.finishTime / 1000).toFixed(2)}s`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50)
  }
}
