import {
  CANVAS_W,
  CANVAS_H,
  CENTERLINE,
  ITEM_SPAWNS,
  TRACK_WIDTH,
  dist,
  drawTrack,
  nearestWaypointIndex,
  onTrack,
  progressAlongTrack
} from "game/track"

const ITEM_TYPES = [
  { id: "banana", label: "Banana", weight: 3 },
  { id: "green_shell", label: "Green Shell", weight: 3 },
  { id: "red_shell", label: "Red Shell", weight: 2 },
  { id: "mushroom", label: "Mushroom", weight: 3 },
  { id: "oil", label: "Oil Slick", weight: 2 },
  { id: "lightning", label: "Lightning", weight: 1 }
]

const PLACE_LABELS = ["1st", "2nd", "3rd", "4th"]

function weightedItem() {
  const total = ITEM_TYPES.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of ITEM_TYPES) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return ITEM_TYPES[0]
}

function createKart({ id, name, color, x, y, angle, isPlayer = false, aiSkill = 0.85 }) {
  return {
    id,
    name,
    color,
    x,
    y,
    angle,
    speed: 0,
    maxSpeed: isPlayer ? 5.4 : 4.7 + aiSkill * 0.7,
    accel: isPlayer ? 0.12 : 0.1 + aiSkill * 0.02,
    turnRate: 0.055,
    isPlayer,
    aiSkill,
    lap: 0,
    checkpoint: 0,
    waypoint: 0,
    finished: false,
    finishTime: null,
    item: null,
    spinTimer: 0,
    boostTimer: 0,
    shrinkTimer: 0,
    slideTimer: 0,
    invulnTimer: 0,
    width: 28,
    height: 18
  }
}

export class RaceEngine {
  constructor({ canvas, totalLaps = 3, playerName = "You", onHud, onFinish }) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.totalLaps = totalLaps
    this.playerName = playerName
    this.onHud = onHud
    this.onFinish = onFinish
    this.keys = {}
    this.running = false
    this.raceStarted = false
    this.startAt = 0
    this.elapsed = 0
    this.raf = null
    this.lastTs = 0
    this.projectiles = []
    this.hazards = []
    this.itemBoxes = ITEM_SPAWNS.map((p, i) => ({
      id: i,
      x: p.x,
      y: p.y,
      alive: true,
      respawnAt: 0
    }))
    this.karts = this.buildGrid(playerName)
    this.cameraShake = 0
  }

  buildGrid(playerName) {
    const start = CENTERLINE[0]
    const next = CENTERLINE[1]
    const angle = Math.atan2(next.y - start.y, next.x - start.x)
    const nx = Math.cos(angle + Math.PI / 2)
    const ny = Math.sin(angle + Math.PI / 2)
    const bx = Math.cos(angle + Math.PI)
    const by = Math.sin(angle + Math.PI)

    const slots = [
      { name: playerName, color: "#e85d04", isPlayer: true, lane: -0.35, row: 0 },
      { name: "Nova", color: "#2a9d8f", isPlayer: false, lane: 0.35, row: 0, aiSkill: 0.9 },
      { name: "Blaze", color: "#ef476f", isPlayer: false, lane: -0.35, row: 1, aiSkill: 0.78 },
      { name: "Echo", color: "#4cc9f0", isPlayer: false, lane: 0.35, row: 1, aiSkill: 0.84 }
    ]

    return slots.map((slot, index) =>
      createKart({
        id: index,
        name: slot.name,
        color: slot.color,
        isPlayer: slot.isPlayer,
        aiSkill: slot.aiSkill ?? 0.8,
        angle,
        x: start.x + bx * (55 + slot.row * 42) + nx * slot.lane * TRACK_WIDTH * 0.55,
        y: start.y + by * (55 + slot.row * 42) + ny * slot.lane * TRACK_WIDTH * 0.55
      })
    )
  }

  setKey(code, down) {
    this.keys[code] = down
  }

  start() {
    this.running = true
    this.raceStarted = true
    this.startAt = performance.now()
    this.lastTs = this.startAt
    this.loop(this.startAt)
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
  }

  loop(ts) {
    if (!this.running) return
    const dt = Math.min(32, ts - this.lastTs) / 16.666
    this.lastTs = ts
    this.elapsed = ts - this.startAt
    this.update(dt, ts)
    this.draw()
    this.emitHud()
    this.raf = requestAnimationFrame((t) => this.loop(t))
  }

  update(dt, ts) {
    this.itemBoxes.forEach((box) => {
      if (!box.alive && ts >= box.respawnAt) box.alive = true
    })

    this.karts.forEach((kart) => this.updateKart(kart, dt, ts))
    this.updateProjectiles(dt)
    this.updateHazards(dt)
    this.resolveKartCollisions()
    this.checkRaceOver()

    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 0.4)
  }

  updateKart(kart, dt, ts) {
    if (kart.finished) return

    if (kart.spinTimer > 0) {
      kart.spinTimer -= dt
      kart.angle += 0.25 * dt
      kart.speed *= 0.9
      this.integrate(kart, dt)
      this.updateProgress(kart)
      return
    }

    if (kart.boostTimer > 0) kart.boostTimer -= dt
    if (kart.shrinkTimer > 0) kart.shrinkTimer -= dt
    if (kart.slideTimer > 0) kart.slideTimer -= dt
    if (kart.invulnTimer > 0) kart.invulnTimer -= dt

    let throttle = 0
    let steer = 0
    let brake = false
    let fire = false

    if (kart.isPlayer) {
      if (this.keys.ArrowUp || this.keys.KeyW) throttle = 1
      if (this.keys.ArrowDown || this.keys.KeyS) brake = true
      if (this.keys.ArrowLeft || this.keys.KeyA) steer = -1
      if (this.keys.ArrowRight || this.keys.KeyD) steer = 1
      if (this.keys.Space) {
        fire = true
        this.keys.Space = false
      }
    } else {
      const ai = this.aiControls(kart)
      throttle = ai.throttle
      steer = ai.steer
      brake = ai.brake
      fire = ai.fire
    }

    const grounded = onTrack(kart)
    const maxSpeed =
      (kart.boostTimer > 0 ? kart.maxSpeed * 1.45 : kart.maxSpeed) *
      (kart.shrinkTimer > 0 ? 0.55 : 1) *
      (grounded ? 1 : 0.45)

    if (throttle > 0) kart.speed += kart.accel * throttle * dt
    if (brake) kart.speed -= kart.accel * 1.4 * dt
    if (!grounded) kart.speed *= Math.pow(0.96, dt)

    const friction = grounded ? 0.985 : 0.94
    kart.speed *= Math.pow(friction, dt)
    if (kart.speed > maxSpeed) kart.speed += (maxSpeed - kart.speed) * 0.2 * dt
    if (kart.speed < -maxSpeed * 0.35) kart.speed = -maxSpeed * 0.35

    const speedFactor = Math.min(1.15, 0.35 + Math.abs(kart.speed) / kart.maxSpeed)
    let turn = steer * kart.turnRate * speedFactor * dt
    if (kart.slideTimer > 0) turn += Math.sin(ts / 60) * 0.08 * dt
    kart.angle += turn

    this.integrate(kart, dt)
    this.collectItems(kart, ts)
    if (fire) this.useItem(kart)
    this.updateProgress(kart)
  }

  integrate(kart, dt) {
    kart.x += Math.cos(kart.angle) * kart.speed * dt
    kart.y += Math.sin(kart.angle) * kart.speed * dt
    kart.x = Math.max(20, Math.min(CANVAS_W - 20, kart.x))
    kart.y = Math.max(20, Math.min(CANVAS_H - 20, kart.y))
  }

  aiControls(kart) {
    const targetIndex = (nearestWaypointIndex(kart) + 2) % CENTERLINE.length
    const target = CENTERLINE[targetIndex]
    const desired = Math.atan2(target.y - kart.y, target.x - kart.x)
    let diff = desired - kart.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2

    const steer = Math.max(-1, Math.min(1, diff * 2.2))
    const off = !onTrack(kart)
    let fire = false

    if (kart.item && Math.random() < 0.01 * kart.aiSkill) {
      const usefulOffensive = ["green_shell", "red_shell", "lightning"].includes(kart.item.id)
      const usefulDrop = ["banana", "oil"].includes(kart.item.id)
      const usefulBoost = kart.item.id === "mushroom"
      if (usefulBoost || usefulOffensive || (usefulDrop && kart.speed > 2)) fire = true
    }

    return {
      throttle: off ? 0.55 : 1,
      steer,
      brake: Math.abs(diff) > 1.1 && kart.speed > 3.2,
      fire
    }
  }

  collectItems(kart, ts) {
    if (kart.item) return
    this.itemBoxes.forEach((box) => {
      if (!box.alive) return
      if (dist(kart, box) < 26) {
        box.alive = false
        box.respawnAt = ts + 4500
        kart.item = weightedItem()
      }
    })
  }

  useItem(kart) {
    if (!kart.item) return
    const type = kart.item.id
    kart.item = null

    if (type === "mushroom") {
      kart.boostTimer = 45
      kart.speed = Math.max(kart.speed, kart.maxSpeed * 1.2)
      return
    }

    if (type === "lightning") {
      this.karts.forEach((other) => {
        if (other.id === kart.id || other.finished) return
        other.shrinkTimer = 160
        other.speed *= 0.4
      })
      this.cameraShake = 8
      return
    }

    if (type === "banana" || type === "oil") {
      this.hazards.push({
        type,
        x: kart.x - Math.cos(kart.angle) * 34,
        y: kart.y - Math.sin(kart.angle) * 34,
        life: 1200,
        ownerId: kart.id
      })
      return
    }

    if (type === "green_shell" || type === "red_shell") {
      this.projectiles.push({
        type,
        x: kart.x + Math.cos(kart.angle) * 28,
        y: kart.y + Math.sin(kart.angle) * 28,
        angle: kart.angle,
        speed: type === "red_shell" ? 7.2 : 7.8,
        life: 220,
        ownerId: kart.id,
        targetId: type === "red_shell" ? this.nearestAhead(kart)?.id : null
      })
    }
  }

  nearestAhead(kart) {
    const ordered = this.orderedKarts()
    const idx = ordered.findIndex((k) => k.id === kart.id)
    for (let i = idx - 1; i >= 0; i--) {
      if (!ordered[i].finished) return ordered[i]
    }
    return ordered.find((k) => k.id !== kart.id && !k.finished) || null
  }

  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter((shell) => {
      if (shell.type === "red_shell" && shell.targetId != null) {
        const target = this.karts.find((k) => k.id === shell.targetId && !k.finished)
        if (target) {
          const desired = Math.atan2(target.y - shell.y, target.x - shell.x)
          let diff = desired - shell.angle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          shell.angle += Math.max(-0.12, Math.min(0.12, diff)) * dt
        }
      }

      shell.x += Math.cos(shell.angle) * shell.speed * dt
      shell.y += Math.sin(shell.angle) * shell.speed * dt
      shell.life -= dt

      if (!onTrack(shell) && shell.type === "green_shell") return false
      if (shell.life <= 0) return false
      if (shell.x < 0 || shell.y < 0 || shell.x > CANVAS_W || shell.y > CANVAS_H) return false

      for (const kart of this.karts) {
        if (kart.id === shell.ownerId || kart.finished || kart.invulnTimer > 0) continue
        if (dist(shell, kart) < 20) {
          this.hitKart(kart, 70)
          return false
        }
      }
      return true
    })
  }

  updateHazards(dt) {
    this.hazards = this.hazards.filter((hazard) => {
      hazard.life -= dt
      if (hazard.life <= 0) return false
      for (const kart of this.karts) {
        if (kart.finished || kart.invulnTimer > 0) continue
        if (dist(hazard, kart) < 18) {
          if (hazard.type === "banana") this.hitKart(kart, 55)
          if (hazard.type === "oil") {
            kart.slideTimer = 70
            kart.speed *= 0.7
          }
          return false
        }
      }
      return true
    })
  }

  hitKart(kart, spin) {
    kart.spinTimer = spin
    kart.speed *= 0.2
    kart.invulnTimer = 40
    if (kart.isPlayer) this.cameraShake = 6
  }

  resolveKartCollisions() {
    for (let i = 0; i < this.karts.length; i++) {
      for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i]
        const b = this.karts[j]
        if (a.finished || b.finished) continue
        const d = dist(a, b)
        if (d < 26 && d > 0) {
          const nx = (a.x - b.x) / d
          const ny = (a.y - b.y) / d
          const push = (26 - d) * 0.5
          a.x += nx * push
          a.y += ny * push
          b.x -= nx * push
          b.y -= ny * push
          const swap = (a.speed + b.speed) * 0.5
          a.speed = swap * 0.85
          b.speed = swap * 0.85
        }
      }
    }
  }

  updateProgress(kart) {
    const wp = nearestWaypointIndex(kart)
    const progress = progressAlongTrack(kart, wp)
    const prev = kart.checkpoint

    // Crossing finish: progress wraps from high to low near start
    if (prev > CENTERLINE.length - 3 && progress < 2) {
      kart.lap += 1
      if (kart.lap >= this.totalLaps) {
        kart.finished = true
        kart.finishTime = this.elapsed
        kart.speed = 0
      }
    }
    kart.checkpoint = progress
    kart.waypoint = wp
  }

  orderedKarts() {
    return [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      if (a.finished) return -1
      if (b.finished) return 1
      const scoreA = a.lap * 100 + a.checkpoint
      const scoreB = b.lap * 100 + b.checkpoint
      return scoreB - scoreA
    })
  }

  playerPlace() {
    return this.orderedKarts().findIndex((k) => k.isPlayer) + 1
  }

  checkRaceOver() {
    const player = this.karts.find((k) => k.isPlayer)
    if (!player?.finished) return
    this.running = false
    const place = this.playerPlace()
    this.onFinish?.({
      place,
      timeMs: Math.round(player.finishTime),
      laps: this.totalLaps,
      standings: this.orderedKarts().map((k, i) => ({
        name: k.name,
        place: i + 1,
        timeMs: k.finishTime ? Math.round(k.finishTime) : null,
        finished: k.finished
      }))
    })
  }

  emitHud() {
    const player = this.karts.find((k) => k.isPlayer)
    this.onHud?.({
      lap: Math.min(this.totalLaps, (player?.lap || 0) + 1),
      place: this.playerPlace(),
      placeLabel: PLACE_LABELS[this.playerPlace() - 1] || "—",
      timeMs: Math.round(this.elapsed),
      itemLabel: player?.item?.label || "—",
      standings: this.orderedKarts().map((k, i) => ({
        name: k.name,
        color: k.color,
        place: i + 1,
        lap: Math.min(this.totalLaps, k.lap + (k.finished ? 0 : 1)),
        finished: k.finished
      }))
    })
  }

  draw() {
    const ctx = this.ctx
    ctx.save()
    if (this.cameraShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.cameraShake, (Math.random() - 0.5) * this.cameraShake)
    }

    drawTrack(ctx)
    this.drawItemBoxes(ctx)
    this.hazards.forEach((h) => this.drawHazard(ctx, h))
    this.projectiles.forEach((p) => this.drawProjectile(ctx, p))
    this.orderedKarts()
      .slice()
      .reverse()
      .forEach((kart) => this.drawKart(ctx, kart))

    ctx.restore()
  }

  drawItemBoxes(ctx) {
    this.itemBoxes.forEach((box) => {
      if (!box.alive) return
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.08
      ctx.save()
      ctx.translate(box.x, box.y)
      ctx.rotate(performance.now() / 500)
      ctx.scale(pulse, pulse)
      ctx.fillStyle = "#f2b705"
      ctx.fillRect(-12, -12, 24, 24)
      ctx.strokeStyle = "#142018"
      ctx.lineWidth = 3
      ctx.strokeRect(-12, -12, 24, 24)
      ctx.fillStyle = "#142018"
      ctx.font = "bold 14px Outfit, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("?", 0, 1)
      ctx.restore()
    })
  }

  drawHazard(ctx, hazard) {
    ctx.save()
    ctx.translate(hazard.x, hazard.y)
    if (hazard.type === "banana") {
      ctx.fillStyle = "#f4d35e"
      ctx.beginPath()
      ctx.ellipse(0, 0, 10, 6, -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#9a7200"
      ctx.stroke()
    } else {
      ctx.fillStyle = "rgba(10, 10, 10, 0.85)"
      ctx.beginPath()
      ctx.ellipse(0, 0, 16, 10, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.15)"
      ctx.stroke()
    }
    ctx.restore()
  }

  drawProjectile(ctx, shell) {
    ctx.save()
    ctx.translate(shell.x, shell.y)
    ctx.rotate(shell.angle)
    ctx.fillStyle = shell.type === "red_shell" ? "#e63946" : "#2a9d8f"
    ctx.beginPath()
    ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.35)"
    ctx.beginPath()
    ctx.ellipse(-2, -2, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawKart(ctx, kart) {
    const scale = kart.shrinkTimer > 0 ? 0.65 : 1
    ctx.save()
    ctx.translate(kart.x, kart.y)
    ctx.rotate(kart.angle)
    ctx.scale(scale, scale)

    if (kart.boostTimer > 0) {
      ctx.fillStyle = "rgba(242, 183, 5, 0.45)"
      ctx.beginPath()
      ctx.moveTo(-22, -8)
      ctx.lineTo(-34 - Math.random() * 8, 0)
      ctx.lineTo(-22, 8)
      ctx.fill()
    }

    ctx.fillStyle = "#111"
    ctx.fillRect(-12, -12, 8, 5)
    ctx.fillRect(6, -12, 8, 5)
    ctx.fillRect(-12, 7, 8, 5)
    ctx.fillRect(6, 7, 8, 5)

    ctx.fillStyle = kart.color
    roundRectPath(ctx, -16, -9, 32, 18, 6)
    ctx.fill()

    ctx.fillStyle = "rgba(247, 241, 232, 0.8)"
    roundRectPath(ctx, 2, -6, 10, 12, 3)
    ctx.fill()

    if (kart.isPlayer) {
      ctx.strokeStyle = "#f2b705"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()

    ctx.save()
    ctx.font = "600 12px Outfit, sans-serif"
    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(247, 241, 232, 0.9)"
    ctx.fillText(kart.name, kart.x, kart.y - 22 * scale)
    ctx.restore()
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function formatRaceTime(ms) {
  const total = Math.max(0, ms) / 1000
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`
}
