import {
  CANVAS_WIDTH, CANVAS_HEIGHT, drawTrack, getTrackAngle
} from "racing_game/track"
import {
  Car, ItemBox, createItemBoxes, createRacers, WEAPON_LABELS, WEAPON_COLORS
} from "racing_game/entities"

const TOTAL_LAPS = 3
const COUNTDOWN_FRAMES = 180

export class RacingGame {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.state = "menu" // menu, countdown, racing, finished
    this.countdown = COUNTDOWN_FRAMES
    this.raceTime = 0
    this.cars = []
    this.itemBoxes = []
    this.projectiles = []
    this.input = { up: false, down: false, left: false, right: false, use: false }
    this.usePressed = false
    this.animationId = null
    this.results = []

    this.bindInput()
    this.showMenu()
  }

  bindInput() {
    const keyMap = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
      " ": "use"
    }

    window.addEventListener("keydown", (e) => {
      const key = keyMap[e.key]
      if (key) {
        e.preventDefault()
        if (key === "use" && !this.usePressed) {
          this.usePressed = true
          this.tryUseWeapon()
        } else {
          this.input[key] = true
        }
      }
      if (e.key === "Enter" && this.state === "menu") this.startRace()
      if (e.key === "Enter" && this.state === "finished") this.showMenu()
    })

    window.addEventListener("keyup", (e) => {
      const key = keyMap[e.key]
      if (key) {
        if (key === "use") this.usePressed = false
        else this.input[key] = false
      }
    })

    this.canvas.addEventListener("click", () => {
      if (this.state === "menu") this.startRace()
      if (this.state === "finished") this.showMenu()
    })
  }

  startRace() {
    this.cars = createRacers()
    this.itemBoxes = createItemBoxes()
    this.projectiles = []
    this.state = "countdown"
    this.countdown = COUNTDOWN_FRAMES
    this.raceTime = 0
    this.results = []
  }

  showMenu() {
    this.state = "menu"
    this.cars = []
    this.itemBoxes = createItemBoxes()
    this.projectiles = []
  }

  tryUseWeapon() {
    if (this.state !== "racing") return
    const player = this.cars.find(c => c.isPlayer)
    if (player) player.useItem(this)
  }

  update() {
    if (this.state === "countdown") {
      this.countdown--
      if (this.countdown <= 0) this.state = "racing"
      return
    }

    if (this.state !== "racing") return

    this.raceTime++

    this.cars.forEach(car => car.update(car.isPlayer ? this.input : null, this.cars))
    this.itemBoxes.forEach(box => box.update())

    // Item box collection
    const player = this.cars.find(c => c.isPlayer)
    this.cars.forEach(car => {
      this.itemBoxes.forEach(box => {
        if (!box.active) return
        const dist = Math.hypot(car.x - box.x, car.y - box.y)
        if (dist < 30 && !car.item) {
          const weapon = box.collect()
          if (weapon) car.collectItem(weapon)
        }
      })
    })

    // AI weapon usage
    this.cars.filter(c => !c.isPlayer).forEach(ai => {
      if (ai.item && Math.random() < 0.008) ai.useItem(this)
    })

    // Projectile updates & collisions
    this.projectiles = this.projectiles.filter(p => {
      if (!p.update) return false
      return p.homing ? p.update(this) : p.update()
    })

    this.projectiles.forEach(proj => {
      this.cars.forEach(car => {
        if (car.finished || car.id === proj.ownerId || car.isInvincible) return
        const dist = Math.hypot(car.x - proj.x, car.y - proj.y)
        const hitRadius = (proj.radius || 12) + 14
        if (dist < hitRadius && car.spinOut()) {
          proj.life = 0
        }
      })
    })

    // Star power collision — knock others
    this.cars.forEach(car => {
      if (!car.isInvincible) return
      this.cars.forEach(other => {
        if (other.id === car.id || other.isInvincible) return
        const dist = Math.hypot(car.x - other.x, car.y - other.y)
        if (dist < 30) other.spinOut()
      })
    })

    this.updateLaps()
    this.updatePositions()

    const finishedCount = this.cars.filter(c => c.finished).length
    if (finishedCount === this.cars.length) {
      this.state = "finished"
      this.results = [...this.cars].sort((a, b) => (a.finishTime || Infinity) - (b.finishTime || Infinity))
    }
  }

  updateLaps() {
    this.cars.forEach(car => {
      if (car.finished) return

      const angle = getTrackAngle(car.x, car.y)
      let delta = angle - car.lastAngle
      if (delta > Math.PI) delta -= Math.PI * 2
      if (delta < -Math.PI) delta += Math.PI * 2

      if (Math.abs(car.speed) > 0.5) {
        car.totalAngle += delta
      }
      car.lastAngle = angle

      const completedLaps = Math.floor(car.totalAngle / (Math.PI * 2))
      if (completedLaps > car.lap) {
        car.lap = completedLaps
        if (car.lap >= TOTAL_LAPS) {
          car.finished = true
          car.finishTime = this.raceTime
        }
      }
    })
  }

  updatePositions() {
    const sorted = [...this.cars].sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0)
      if (a.finished) return -1
      if (b.finished) return 1
      return b.raceProgress - a.raceProgress
    })
    sorted.forEach((car, i) => { car.position = i + 1 })
  }

  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    drawTrack(ctx)

    this.itemBoxes.forEach(box => box.draw(ctx))
    this.projectiles.forEach(p => p.draw(ctx))

    const drawOrder = [...this.cars].sort((a, b) => a.y - b.y)
    drawOrder.forEach(car => car.draw(ctx))

    this.drawUI(ctx)

    if (this.state === "menu") this.drawMenu(ctx)
    if (this.state === "countdown") this.drawCountdown(ctx)
    if (this.state === "finished") this.drawResults(ctx)
  }

  drawUI(ctx) {
    if (this.state !== "racing" && this.state !== "countdown") return

    const player = this.cars.find(c => c.isPlayer)
    if (!player) return

    // HUD panel
    ctx.fillStyle = "rgba(0,0,0,0.65)"
    ctx.beginPath()
    ctx.roundRect(16, 16, 220, 110, 10)
    ctx.fill()

    ctx.fillStyle = "#fff"
    ctx.font = "bold 16px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(`Position: ${player.position}/${this.cars.length}`, 30, 44)
    ctx.fillText(`Lap: ${Math.min(player.lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`, 30, 68)

    const mins = Math.floor(this.raceTime / 3600)
    const secs = Math.floor((this.raceTime % 3600) / 60)
    const frames = Math.floor(this.raceTime % 60)
    ctx.fillText(`Time: ${mins}:${String(secs).padStart(2, "0")}.${String(frames).padStart(2, "0")}`, 30, 92)

    // Item slot
    ctx.fillStyle = "rgba(0,0,0,0.65)"
    ctx.beginPath()
    ctx.roundRect(CANVAS_WIDTH - 90, 16, 74, 74, 10)
    ctx.fill()

    if (player.item) {
      ctx.fillStyle = WEAPON_COLORS[player.item]
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH - 53, 53, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#fff"
      ctx.font = "bold 10px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(WEAPON_LABELS[player.item].split(" ")[0], CANVAS_WIDTH - 53, 57)
    } else {
      ctx.strokeStyle = "#666"
      ctx.lineWidth = 2
      ctx.strokeRect(CANVAS_WIDTH - 76, 30, 46, 46)
      ctx.fillStyle = "#888"
      ctx.font = "11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("ITEM", CANVAS_WIDTH - 53, 57)
    }

    // Mini leaderboard
    ctx.fillStyle = "rgba(0,0,0,0.55)"
    ctx.beginPath()
    ctx.roundRect(16, CANVAS_HEIGHT - 130, 180, 114, 10)
    ctx.fill()
    ctx.font = "13px sans-serif"
  ctx.textAlign = "left"
    const sorted = [...this.cars].sort((a, b) => a.position - b.position)
    sorted.forEach((car, i) => {
      ctx.fillStyle = car.isPlayer ? "#ffee88" : "#ddd"
      const status = car.finished ? " ✓" : ""
      ctx.fillText(`${car.position}. ${car.name}${status}`, 28, CANVAS_HEIGHT - 108 + i * 24)
    })

    // Speedometer
    const speedPct = Math.abs(player.speed) / player.maxSpeed
    ctx.fillStyle = "rgba(0,0,0,0.55)"
    ctx.fillRect(CANVAS_WIDTH - 130, CANVAS_HEIGHT - 36, 114, 20)
    ctx.fillStyle = speedPct > 0.8 ? "#ff4444" : "#44ff88"
    ctx.fillRect(CANVAS_WIDTH - 128, CANVAS_HEIGHT - 34, 110 * speedPct, 16)
    ctx.fillStyle = "#fff"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("SPEED", CANVAS_WIDTH - 73, CANVAS_HEIGHT - 40)

    // Controls hint
    ctx.fillStyle = "rgba(255,255,255,0.5)"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Arrow Keys / WASD to drive  •  SPACE to use item", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10)
  }

  drawMenu(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.75)"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.textAlign = "center"
    ctx.fillStyle = "#ff4444"
    ctx.font = "bold 56px sans-serif"
    ctx.fillText("KART RACER", CANVAS_WIDTH / 2, 200)

    ctx.fillStyle = "#ffcc00"
    ctx.font = "bold 28px sans-serif"
    ctx.fillText("Turbo Cup", CANVAS_WIDTH / 2, 250)

    ctx.fillStyle = "#fff"
    ctx.font = "18px sans-serif"
    const features = [
      "Race 3 laps around the circuit",
      "Collect ? boxes for weapons",
      "Banana • Shell • Red Shell • Mushroom • Star • Lightning",
      "Beat 3 AI racers to the finish!"
    ]
    features.forEach((f, i) => ctx.fillText(f, CANVAS_WIDTH / 2, 330 + i * 32))

    ctx.fillStyle = "#44ff88"
    ctx.font = "bold 22px sans-serif"
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7
    ctx.globalAlpha = pulse
    ctx.fillText("Click or press ENTER to Start", CANVAS_WIDTH / 2, 530)
    ctx.globalAlpha = 1
  }

  drawCountdown(ctx) {
    const num = Math.ceil(this.countdown / 60)
    ctx.fillStyle = "rgba(0,0,0,0.5)"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.textAlign = "center"
    ctx.fillStyle = num > 0 ? "#fff" : "#44ff44"
    ctx.font = "bold 120px sans-serif"
    ctx.fillText(num > 0 ? String(num) : "GO!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30)
  }

  drawResults(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.8)"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.textAlign = "center"
    ctx.fillStyle = "#ffcc00"
    ctx.font = "bold 42px sans-serif"
    ctx.fillText("Race Complete!", CANVAS_WIDTH / 2, 120)

    this.results.forEach((car, i) => {
      const medals = ["🥇", "🥈", "🥉", "4th"]
      ctx.fillStyle = car.isPlayer ? "#ffee88" : "#fff"
      ctx.font = car.isPlayer ? "bold 24px sans-serif" : "22px sans-serif"
      const time = car.finishTime
        ? `${Math.floor(time / 3600)}:${String(Math.floor((time % 3600) / 60)).padStart(2, "0")}`
        : "DNF"
      ctx.fillText(`${medals[i]} ${car.name}  —  ${time}`, CANVAS_WIDTH / 2, 220 + i * 50)
    })

    const player = this.results.find(c => c.isPlayer)
    if (player && player.position === 1) {
      ctx.fillStyle = "#44ff88"
      ctx.font = "bold 28px sans-serif"
      ctx.fillText("You Win!", CANVAS_WIDTH / 2, 480)
    }

    ctx.fillStyle = "#aaa"
    ctx.font = "18px sans-serif"
    ctx.fillText("Click or press ENTER to race again", CANVAS_WIDTH / 2, 560)
  }

  loop() {
    this.update()
    this.draw()
    this.animationId = requestAnimationFrame(() => this.loop())
  }

  start() {
    if (!this.animationId) this.loop()
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId)
  }
}
