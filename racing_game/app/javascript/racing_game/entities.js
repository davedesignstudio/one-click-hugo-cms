import { isOnTrack, clampToTrack, getTrackAngle, ITEM_BOX_POSITIONS } from "racing_game/track"

const WEAPONS = ["banana", "shell", "red_shell", "mushroom", "star", "lightning"]
const WEAPON_LABELS = {
  banana: "Banana",
  shell: "Green Shell",
  red_shell: "Red Shell",
  mushroom: "Mushroom Boost",
  star: "Star Power",
  lightning: "Lightning"
}
const WEAPON_COLORS = {
  banana: "#ffd700",
  shell: "#00cc44",
  red_shell: "#ff3333",
  mushroom: "#ff6699",
  star: "#ffee00",
  lightning: "#66ccff"
}

let nextId = 1

export class Car {
  constructor({ x, y, angle, color, name, isPlayer = false, aiSkill = 0.5 }) {
    this.id = nextId++
    this.x = x
    this.y = y
    this.angle = angle
    this.color = color
    this.name = name
    this.isPlayer = isPlayer
    this.aiSkill = aiSkill
    this.speed = 0
    this.maxSpeed = isPlayer ? 5.2 : 4.6 + aiSkill * 0.6
    this.acceleration = 0.18
    this.friction = 0.96
    this.turnSpeed = 0.055
    this.width = 22
    this.height = 36
    this.lap = 0
    this.checkpoint = 0
    this.finished = false
    this.finishTime = null
    this.position = 1
    this.item = null
    this.spinTimer = 0
    this.boostTimer = 0
    this.starTimer = 0
    this.shrinkTimer = 0
    this.lastAngle = angle
    this.totalAngle = 0
    this.aiTargetAngle = angle
    this.aiWeaponTimer = 0
    this.raceProgress = 0
  }

  get effectiveMaxSpeed() {
    let max = this.maxSpeed
    if (this.boostTimer > 0) max *= 1.55
    if (this.starTimer > 0) max *= 1.35
    if (this.shrinkTimer > 0) max *= 0.65
    if (this.spinTimer > 0) max *= 0.3
    return max
  }

  get scale() {
    return this.shrinkTimer > 0 ? 0.6 : 1
  }

  get isInvincible() {
    return this.starTimer > 0
  }

  update(input, cars) {
    if (this.finished) return

    if (this.spinTimer > 0) {
      this.spinTimer--
      this.angle += 0.2
      this.speed *= 0.92
      this.applyMovement()
      return
    }

    if (this.isPlayer) {
      this.handlePlayerInput(input)
    } else {
      this.handleAI(cars)
    }

    this.speed = Math.max(-1.5, Math.min(this.effectiveMaxSpeed, this.speed))
    this.applyMovement()

    if (!isOnTrack(this.x, this.y)) {
      const clamped = clampToTrack(this.x, this.y)
      this.x = clamped.x
      this.y = clamped.y
      this.speed *= 0.7
    }

    this.boostTimer = Math.max(0, this.boostTimer - 1)
    this.starTimer = Math.max(0, this.starTimer - 1)
    this.shrinkTimer = Math.max(0, this.shrinkTimer - 1)
    this.updateProgress()
  }

  handlePlayerInput(input) {
    if (input.up) this.speed += this.acceleration
    if (input.down) this.speed -= this.acceleration * 0.7
    if (Math.abs(this.speed) > 0.3) {
      const turn = this.turnSpeed * (this.speed / this.maxSpeed)
      if (input.left) this.angle -= turn
      if (input.right) this.angle += turn
    }
    if (!input.up && !input.down) this.speed *= this.friction
  }

  handleAI(cars) {
    const targetAngle = getTrackAngle(this.x, this.y) + Math.PI / 2 + (Math.random() - 0.5) * 0.15 * (1 - this.aiSkill)
    let diff = targetAngle - this.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.angle += diff * (0.04 + this.aiSkill * 0.04)

    const leader = cars.find(c => c.position === 1 && c.id !== this.id)
    if (leader && this.position > 2 && Math.random() < 0.002) {
      this.speed += this.acceleration * 0.5
    } else {
      this.speed += this.acceleration * (0.7 + this.aiSkill * 0.3)
    }
    this.speed *= this.friction + 0.02

  }

  applyMovement() {
    this.x += Math.sin(this.angle) * this.speed
    this.y -= Math.cos(this.angle) * this.speed
  }

  updateProgress() {
    const angle = getTrackAngle(this.x, this.y)
    let normalized = angle + Math.PI / 2
    if (normalized < 0) normalized += Math.PI * 2
    this.raceProgress = this.lap * 1000 + normalized * 100
  }

  spinOut() {
    if (this.isInvincible) return false
    this.spinTimer = 90
    this.speed *= 0.2
    return true
  }

  applyBoost(frames = 90) {
    this.boostTimer = Math.max(this.boostTimer, frames)
  }

  applyStar(frames = 300) {
    this.starTimer = frames
    this.applyBoost(frames)
  }

  applyShrink(frames = 180) {
    if (this.isInvincible) return
    this.shrinkTimer = frames
    this.speed *= 0.5
  }

  collectItem(type) {
    this.item = type
  }

  useItem(game) {
    if (!this.item) return null
    const item = this.item
    this.item = null

    switch (item) {
      case "banana":
        game.projectiles.push(new Banana(this.x - Math.sin(this.angle) * 30, this.y + Math.cos(this.angle) * 30, this.id))
        break
      case "shell":
        game.projectiles.push(new Shell(this.x, this.y, this.angle, this.id, false))
        break
      case "red_shell":
        game.projectiles.push(new Shell(this.x, this.y, this.angle, this.id, true))
        break
      case "mushroom":
        this.applyBoost(120)
        break
      case "star":
        this.applyStar(300)
        break
      case "lightning":
        game.cars.forEach(c => {
          if (c.id !== this.id) c.applyShrink(180)
        })
        break
    }
    return item
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)
    ctx.scale(this.scale, this.scale)

    if (this.starTimer > 0 && Math.floor(this.starTimer / 4) % 2 === 0) {
      ctx.shadowColor = "#ffee00"
      ctx.shadowBlur = 20
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)"
    ctx.fillRect(-10, -16, 24, 34)

    // Body
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.roundRect(-11, -18, 22, 36, 4)
    ctx.fill()

    // Windshield
    ctx.fillStyle = "#88ccff"
    ctx.fillRect(-7, -14, 14, 10)

    // Racing stripes
    ctx.fillStyle = "rgba(255,255,255,0.5)"
    ctx.fillRect(-2, -18, 4, 36)

    // Wheels
    ctx.fillStyle = "#222"
    ;[[-12, -10], [8, -10], [-12, 10], [8, 10]].forEach(([wx, wy]) => {
      ctx.fillRect(wx, wy, 6, 10)
    })

    ctx.restore()

    // Name tag
    ctx.fillStyle = "#fff"
    ctx.font = "bold 11px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(this.name, this.x, this.y - 28 * this.scale)
  }
}

export class ItemBox {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.active = true
    this.respawnTimer = 0
    this.spin = 0
    this.size = 28
  }

  update() {
    this.spin += 0.05
    if (!this.active) {
      this.respawnTimer--
      if (this.respawnTimer <= 0) this.active = true
    }
  }

  collect() {
    if (!this.active) return null
    this.active = false
    this.respawnTimer = 180
    return WEAPONS[Math.floor(Math.random() * WEAPONS.length)]
  }

  draw(ctx) {
    if (!this.active) return
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.spin)

    ctx.fillStyle = "rgba(255, 200, 0, 0.25)"
    ctx.beginPath()
    ctx.arc(0, 0, this.size, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#ffcc00"
    ctx.lineWidth = 3
    ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size)

    ctx.fillStyle = "#fff"
    ctx.font = "bold 18px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("?", 0, 1)

    ctx.restore()
  }
}

export class Banana {
  constructor(x, y, ownerId) {
    this.x = x
    this.y = y
    this.ownerId = ownerId
    this.life = 600
    this.radius = 14
  }

  update() {
    this.life--
    return this.life > 0
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.fillStyle = "#ffd700"
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0.3, Math.PI * 1.7)
    ctx.lineWidth = 6
    ctx.strokeStyle = "#ffd700"
    ctx.stroke()
    ctx.restore()
  }
}

export class Shell {
  constructor(x, y, angle, ownerId, homing) {
    this.x = x
    this.y = y
    this.angle = angle
    this.ownerId = ownerId
    this.homing = homing
    this.speed = homing ? 6 : 8
    this.life = 300
    this.radius = 10
  }

  update(game) {
    this.life--
    if (this.life <= 0) return false

    if (this.homing) {
      const targets = game.cars.filter(c => c.id !== this.ownerId && !c.finished)
      if (targets.length > 0) {
        let nearest = targets[0]
        let minDist = Infinity
        targets.forEach(t => {
          const d = Math.hypot(t.x - this.x, t.y - this.y)
          if (d < minDist) { minDist = d; nearest = t }
        })
        const targetAngle = Math.atan2(nearest.x - this.x, -(nearest.y - this.y))
        let diff = targetAngle - this.angle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        this.angle += diff * 0.12
      }
    }

    this.x += Math.sin(this.angle) * this.speed
    this.y -= Math.cos(this.angle) * this.speed
    return true
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.fillStyle = this.homing ? "#ff3333" : "#00cc44"
    ctx.beginPath()
    ctx.arc(0, 0, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(3, -3, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function createItemBoxes() {
  return ITEM_BOX_POSITIONS.map(pos => new ItemBox(pos.x, pos.y))
}

export function createRacers() {
  const colors = ["#ff4444", "#4488ff", "#44cc44", "#ffcc00"]
  const names = ["You", "Bluigi", "Koopa", "Peach"]
  const startY = 580
  const starts = [
    { x: 490, y: startY, angle: 0 },
    { x: 520, y: startY - 30, angle: 0 },
    { x: 490, y: startY - 60, angle: 0 },
    { x: 520, y: startY - 90, angle: 0 }
  ]
  return starts.map((s, i) => new Car({
    ...s,
    color: colors[i],
    name: names[i],
    isPlayer: i === 0,
    aiSkill: [0, 0.7, 0.5, 0.85][i]
  }))
}

export { WEAPON_LABELS, WEAPON_COLORS }
