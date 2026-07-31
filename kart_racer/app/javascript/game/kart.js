import { WEAPONS, distance, normalizeAngle, clamp } from "game/constants"
import { isOnTrack, getTrackAngle, pushToTrack } from "game/track"

let nextId = 1

export class Kart {
  constructor({ x, y, angle, color, isPlayer = false, name = "Racer" }) {
    this.id = nextId++
    this.x = x
    this.y = y
    this.angle = angle
    this.color = color
    this.isPlayer = isPlayer
    this.name = name

    this.speed = 0
    this.maxSpeed = isPlayer ? 6.5 : 5.8
    this.acceleration = 0.18
    this.friction = 0.96
    this.turnSpeed = 0.055
    this.offRoadFriction = 0.88

    this.lap = 0
    this.checkpointProgress = 0
    this.lastCheckpoint = 0
    this.finished = false
    this.finishTime = 0

    this.weapon = null
    this.spinning = false
    this.spinEndTime = 0
    this.boostEndTime = 0
    this.starEndTime = 0
    this.slowEndTime = 0

    this.width = 24
    this.height = 14
  }

  get isInvincible() {
    return Date.now() < this.starEndTime
  }

  get isBoosted() {
    return Date.now() < this.boostEndTime || this.isInvincible
  }

  get isSlowed() {
    return Date.now() < this.slowEndTime && !this.isInvincible
  }

  get effectiveMaxSpeed() {
    let max = this.maxSpeed
    if (this.isBoosted) max *= 1.5
    if (this.isSlowed) max *= 0.5
    if (this.spinning) max = 0
    return max
  }

  update(input, dt = 1) {
    if (this.finished) return

    const now = Date.now()

    if (this.spinning && now >= this.spinEndTime) {
      this.spinning = false
      this.speed = 0
    }

    if (this.spinning) {
      this.angle += 0.2 * dt
      this.speed *= 0.95
      this.x += Math.cos(this.angle) * this.speed * dt
      this.y += Math.sin(this.angle) * this.speed * dt
      this.updateLap()
      return
    }

    if (input) {
      if (input.up) this.speed += this.acceleration * dt
      if (input.down) this.speed -= this.acceleration * 0.6 * dt
      if (input.left && Math.abs(this.speed) > 0.3) {
        this.angle -= this.turnSpeed * dt * Math.sign(this.speed)
      }
      if (input.right && Math.abs(this.speed) > 0.3) {
        this.angle += this.turnSpeed * dt * Math.sign(this.speed)
      }
    }

    const onTrack = isOnTrack(this.x, this.y)
    const friction = onTrack ? this.friction : this.offRoadFriction
    this.speed *= friction

    this.speed = clamp(this.speed, -this.effectiveMaxSpeed * 0.4, this.effectiveMaxSpeed)

    this.x += Math.cos(this.angle) * this.speed * dt
    this.y += Math.sin(this.angle) * this.speed * dt

    if (!onTrack) {
      const pushed = pushToTrack(this.x, this.y)
      this.x = pushed.x
      this.y = pushed.y
      this.speed *= 0.7
    }

    this.updateLap()
  }

  updateLap() {
    const angle = getTrackAngle(this.x, this.y)
    const progress = this.getProgress(angle)

    // Detect lap completion when crossing start line going forward
    if (this.lastCheckpoint > 0.85 && progress < 0.15) {
      this.lap++
    }
    this.lastCheckpoint = progress
    this.checkpointProgress = progress + this.lap
  }

  getProgress(angle) {
    let normalized = angle - (-Math.PI / 2)
    while (normalized < 0) normalized += Math.PI * 2
    return normalized / (Math.PI * 2)
  }

  spinOut(duration = 1200) {
    if (this.isInvincible) return
    this.spinning = true
    this.spinEndTime = Date.now() + duration
    this.speed *= 0.3
  }

  applyBoost(duration = 2000) {
    this.boostEndTime = Date.now() + duration
  }

  applyStar(duration = 5000) {
    this.starEndTime = Date.now() + duration
    this.spinning = false
  }

  applySlow(duration = 3000) {
    if (this.isInvincible) return
    this.slowEndTime = Date.now() + duration
    this.speed *= 0.5
  }

  useWeapon(projectiles, hazards, karts) {
    if (!this.weapon || this.spinning) return false

    const weapon = this.weapon
    this.weapon = null

    switch (weapon) {
      case WEAPONS.GREEN_SHELL:
        projectiles.push(new GreenShell(this))
        break
      case WEAPONS.RED_SHELL:
        projectiles.push(new RedShell(this, karts))
        break
      case WEAPONS.BANANA:
        hazards.push(new Banana(this))
        break
      case WEAPONS.MUSHROOM:
        this.applyBoost()
        break
      case WEAPONS.STAR:
        this.applyStar()
        break
      case WEAPONS.LIGHTNING:
        karts.forEach(k => {
          if (k.id !== this.id) k.applySlow()
        })
        break
      default:
        return false
    }
    return true
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    if (this.isInvincible) {
      const hue = (Date.now() / 5) % 360
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
      ctx.shadowBlur = 20
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)"
    ctx.beginPath()
    ctx.ellipse(2, 4, this.width / 2, this.height / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = this.color.body
    ctx.beginPath()
    ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 4)
    ctx.fill()

    // Accent stripe
    ctx.fillStyle = this.color.accent
    ctx.fillRect(-this.width / 2 + 2, -3, this.width - 4, 6)

    // Windshield
    ctx.fillStyle = "#1d3557"
    ctx.fillRect(2, -5, 8, 10)

    // Wheels
    ctx.fillStyle = "#212529"
    const wheelPositions = [
      [-8, -9], [-8, 9], [8, -9], [8, 9]
    ]
    wheelPositions.forEach(([wx, wy]) => {
      ctx.beginPath()
      ctx.arc(wx, wy, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Driver helmet
    ctx.fillStyle = this.isPlayer ? "#ffd60a" : "#adb5bd"
    ctx.beginPath()
    ctx.arc(-2, 0, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // Name tag for player
    if (this.isPlayer) {
      ctx.fillStyle = "#fff"
      ctx.font = "bold 11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(this.name, this.x, this.y - 22)
    }
  }
}

export class GreenShell {
  constructor(owner) {
    this.id = nextId++
    this.ownerId = owner.id
    this.x = owner.x + Math.cos(owner.angle) * 20
    this.y = owner.y + Math.sin(owner.angle) * 20
    this.angle = owner.angle
    this.speed = 9
    this.radius = 8
    this.alive = true
    this.type = "green_shell"
  }

  update(dt = 1) {
    this.x += Math.cos(this.angle) * this.speed * dt
    this.y += Math.sin(this.angle) * this.speed * dt

    if (this.x < -20 || this.x > 1044 || this.y < -20 || this.y > 788) {
      this.alive = false
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.fillStyle = "#52b788"
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#2d6a4f"
    ctx.lineWidth = 2
    ctx.stroke()
    // Shell pattern
    ctx.strokeStyle = "#95d5b2"
    ctx.beginPath()
    ctx.arc(0, 0, 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

export class RedShell {
  constructor(owner, karts) {
    this.id = nextId++
    this.ownerId = owner.id
    this.x = owner.x + Math.cos(owner.angle) * 20
    this.y = owner.y + Math.sin(owner.angle) * 20
    this.angle = owner.angle
    this.speed = 7
    this.radius = 8
    this.alive = true
    this.type = "red_shell"
    this.homingStrength = 0.08
    this.target = this.findTarget(owner, karts)
  }

  findTarget(owner, karts) {
    let closest = null
    let closestDist = Infinity
    karts.forEach(k => {
      if (k.id === owner.id || k.finished) return
      const d = distance(this.x, this.y, k.x, k.y)
      if (d < closestDist) {
        closestDist = d
        closest = k
      }
    })
    return closest
  }

  update(dt = 1) {
    if (this.target && this.target.alive !== false) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x)
      let diff = normalizeAngle(targetAngle - this.angle)
      this.angle += diff * this.homingStrength * dt
    }

    this.x += Math.cos(this.angle) * this.speed * dt
    this.y += Math.sin(this.angle) * this.speed * dt

    if (this.x < -20 || this.x > 1044 || this.y < -20 || this.y > 788) {
      this.alive = false
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)
    ctx.fillStyle = "#e63946"
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#9d0208"
    ctx.lineWidth = 2
    ctx.stroke()
    // Spikes
    for (let i = 0; i < 4; i++) {
      ctx.save()
      ctx.rotate((i / 4) * Math.PI * 2)
      ctx.fillStyle = "#ff6b6b"
      ctx.beginPath()
      ctx.moveTo(0, -this.radius)
      ctx.lineTo(3, -this.radius - 5)
      ctx.lineTo(-3, -this.radius - 5)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }
}

export class Banana {
  constructor(owner) {
    this.id = nextId++
    this.ownerId = owner.id
    this.x = owner.x - Math.cos(owner.angle) * 25
    this.y = owner.y - Math.sin(owner.angle) * 25
    this.radius = 10
    this.alive = true
    this.type = "banana"
    this.placedAt = Date.now()
    this.lifetime = 15000
  }

  update() {
    if (Date.now() - this.placedAt > this.lifetime) {
      this.alive = false
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.fillStyle = "#ffd60a"
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0.3, Math.PI - 0.3)
    ctx.arc(0, -3, this.radius * 0.7, Math.PI + 0.3, -0.3)
    ctx.fill()
    ctx.fillStyle = "#6c4a00"
    ctx.fillRect(-2, -this.radius - 2, 4, 5)
    ctx.restore()
  }
}

export function checkProjectileHits(projectiles, karts) {
  projectiles.forEach(p => {
    if (!p.alive) return
    karts.forEach(k => {
      if (k.id === p.ownerId || k.finished || k.isInvincible) return
      if (distance(p.x, p.y, k.x, k.y) < p.radius + 12) {
        k.spinOut()
        p.alive = false
      }
    })
  })
}

export function checkHazardHits(hazards, karts) {
  hazards.forEach(h => {
    if (!h.alive) return
    karts.forEach(k => {
      if (k.id === h.ownerId || k.finished || k.isInvincible) return
      if (distance(h.x, h.y, k.x, k.y) < h.radius + 10) {
        k.spinOut()
        h.alive = false
      }
    })
  })
}

export function checkKartCollisions(karts) {
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i]
      const b = karts[j]
      if (a.finished || b.finished) continue

      const d = distance(a.x, a.y, b.x, b.y)
      if (d < 22 && d > 0) {
        const overlap = 22 - d
        const nx = (b.x - a.x) / d
        const ny = (b.y - a.y) / d
        a.x -= nx * overlap * 0.5
        a.y -= ny * overlap * 0.5
        b.x += nx * overlap * 0.5
        b.y += ny * overlap * 0.5
        a.speed *= 0.85
        b.speed *= 0.85
      }
    }
  }
}
