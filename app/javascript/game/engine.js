const WEAPONS = ["green_shell", "red_shell", "banana", "mushroom", "bomb", "lightning"]
const WEAPON_LABELS = {
  green_shell: "GREEN SHELL",
  red_shell: "RED SHELL",
  banana: "BANANA",
  mushroom: "MUSHROOM",
  bomb: "BOMB",
  lightning: "LIGHTNING",
  empty: "EMPTY"
}

const TRACKS = {
  coastal_loop: {
    name: "Coastal Loop",
    color: "#1f6f8b",
    grass: "#2f6b4f",
    cx: 640,
    cy: 360,
    rx: 420,
    ry: 240,
    roadWidth: 92,
    itemCount: 8
  },
  thunder_bowl: {
    name: "Thunder Bowl",
    color: "#5b3d8f",
    grass: "#2a3340",
    cx: 640,
    cy: 360,
    rx: 390,
    ry: 260,
    roadWidth: 100,
    itemCount: 10
  },
  neon_canyon: {
    name: "Neon Canyon",
    color: "#0f766e",
    grass: "#1b2e24",
    cx: 640,
    cy: 360,
    rx: 450,
    ry: 210,
    roadWidth: 88,
    itemCount: 9
  }
}

const KART_COLORS = ["#ff5a1f", "#3aa0ff", "#f0c24b", "#ff3b5c", "#a78bfa", "#34d399"]
const TOTAL_LAPS = 3

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function dist(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function angleDiff(a, b) {
  let d = (b - a + Math.PI * 3) % (Math.PI * 2) - Math.PI
  return d
}

function formatTime(ms) {
  const totalCs = Math.floor(ms / 10)
  const minutes = Math.floor(totalCs / 6000)
  const seconds = Math.floor((totalCs % 6000) / 100)
  const centis = totalCs % 100
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`
}

function pointOnEllipse(track, t) {
  return {
    x: track.cx + Math.cos(t) * track.rx,
    y: track.cy + Math.sin(t) * track.ry
  }
}

function nearestTrackParam(track, x, y) {
  // Approximate theta for ellipse point
  return Math.atan2((y - track.cy) / track.ry, (x - track.cx) / track.rx)
}

function offRoadFactor(track, x, y) {
  const dx = (x - track.cx) / track.rx
  const dy = (y - track.cy) / track.ry
  const r = Math.hypot(dx, dy)
  const half = track.roadWidth / ((track.rx + track.ry) / 2) / 2
  const inner = 1 - half
  const outer = 1 + half
  if (r >= inner && r <= outer) return 0
  return Math.min(Math.abs(r - 1) / half, 2)
}

export class BlastkartEngine {
  constructor({ canvas, playerName, trackId, onHud, onFinish }) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.playerName = playerName
    this.trackId = TRACKS[trackId] ? trackId : "coastal_loop"
    this.track = { ...TRACKS[this.trackId] }
    this.onHud = onHud
    this.onFinish = onFinish

    this.keys = {}
    this.touch = { left: false, right: false, accel: false }
    this.running = false
    this.finished = false
    this.raf = null
    this.lastTs = 0
    this.raceTime = 0
    this.countdown = 0
    this.shake = 0
    this.weaponsUsed = 0
    this.flash = 0

    this.karts = []
    this.projectiles = []
    this.hazards = []
    this.items = []
    this.particles = []

    this._onKeyDown = (e) => this.handleKey(e, true)
    this._onKeyUp = (e) => this.handleKey(e, false)
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
      " ": "fire",
      Shift: "drift"
    }
    const key = map[e.key]
    if (!key) return
    e.preventDefault()
    if (key === "fire" && down && !this.keys.fire) this.fireWeapon(this.player)
    this.keys[key] = down
  }

  bindInput() {
    window.addEventListener("keydown", this._onKeyDown)
    window.addEventListener("keyup", this._onKeyUp)
  }

  unbindInput() {
    window.removeEventListener("keydown", this._onKeyDown)
    window.removeEventListener("keyup", this._onKeyUp)
  }

  setTouch(control, value) {
    this.touch[control] = value
  }

  fireFromTouch() {
    if (this.player) this.fireWeapon(this.player)
  }

  reset() {
    this.running = false
    this.finished = false
    this.raceTime = 0
    this.countdown = 3.2
    this.shake = 0
    this.weaponsUsed = 0
    this.flash = 0
    this.projectiles = []
    this.hazards = []
    this.particles = []
    this.spawnKarts()
    this.spawnItems()
    this.updateHud()
  }

  spawnKarts() {
    const start = -Math.PI / 2
    const names = [this.playerName, "NITRO", "PIP", "BOLT", "ZIP", "ECHO"]
    this.karts = names.map((name, i) => {
      const t = start - i * 0.08
      const pos = pointOnEllipse(this.track, t)
      const outward = 1 + ((i % 2 === 0 ? -1 : 1) * 0.035)
      return {
        id: i,
        name,
        isPlayer: i === 0,
        x: this.track.cx + Math.cos(t) * this.track.rx * outward,
        y: this.track.cy + Math.sin(t) * this.track.ry * outward,
        angle: t + Math.PI / 2,
        speed: 0,
        maxSpeed: 4.2 + (i === 0 ? 0.15 : Math.random() * 0.25),
        accel: 0.075 + (i === 0 ? 0.01 : 0),
        turn: 0.045,
        color: KART_COLORS[i % KART_COLORS.length],
        lap: 0,
        progress: t,
        totalProgress: 0,
        lastProgress: t,
        item: null,
        stun: 0,
        boost: 0,
        shrink: 0,
        aiSkill: 0.55 + Math.random() * 0.35,
        finished: false,
        finishTime: null,
        place: null
      }
    })
    this.player = this.karts[0]
  }

  spawnItems() {
    this.items = []
    for (let i = 0; i < this.track.itemCount; i++) {
      const t = (i / this.track.itemCount) * Math.PI * 2 + 0.4
      const side = i % 2 === 0 ? 0.96 : 1.04
      this.items.push({
        x: this.track.cx + Math.cos(t) * this.track.rx * side,
        y: this.track.cy + Math.sin(t) * this.track.ry * side,
        alive: true,
        respawn: 0,
        spin: Math.random() * Math.PI
      })
    }
  }

  start() {
    this.reset()
    this.bindInput()
    this.running = true
    this.lastTs = performance.now()
    const loop = (ts) => {
      if (!this.running) return
      const dt = Math.min(0.033, (ts - this.lastTs) / 1000)
      this.lastTs = ts
      this.update(dt)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.unbindInput()
  }

  update(dt) {
    if (this.countdown > 0) {
      this.countdown -= dt
      this.updateHud()
      this.draw()
      return
    }

    if (!this.finished) this.raceTime += dt * 1000
    this.shake = Math.max(0, this.shake - dt * 8)
    this.flash = Math.max(0, this.flash - dt)

    for (const kart of this.karts) this.updateKart(kart, dt)
    this.updateProjectiles(dt)
    this.updateHazards(dt)
    this.updateItems(dt)
    this.updateParticles(dt)
    this.resolvePlaces()
    this.updateHud()
    this.checkRaceOver()
  }

  updateKart(kart, dt) {
    if (kart.finished) return

    if (kart.stun > 0) {
      kart.stun -= dt
      kart.speed *= 0.9
    } else if (kart.isPlayer) {
      this.controlPlayer(kart, dt)
    } else {
      this.controlAi(kart, dt)
    }

    if (kart.boost > 0) {
      kart.boost -= dt
      kart.speed = Math.max(kart.speed, kart.maxSpeed * 1.55)
    }
    if (kart.shrink > 0) kart.shrink -= dt

    const off = offRoadFactor(this.track, kart.x, kart.y)
    const friction = off > 0 ? 0.92 - off * 0.06 : 0.985
    const max = kart.maxSpeed * (off > 0 ? 0.45 : 1) * (kart.shrink > 0 ? 0.55 : 1)
    kart.speed = clamp(kart.speed, -max * 0.35, max) * friction

    kart.x += Math.cos(kart.angle) * kart.speed
    kart.y += Math.sin(kart.angle) * kart.speed

    // Soft push back onto track corridor
    if (off > 1.2) {
      const t = nearestTrackParam(this.track, kart.x, kart.y)
      const on = pointOnEllipse(this.track, t)
      kart.x += (on.x - kart.x) * 0.08
      kart.y += (on.y - kart.y) * 0.08
      kart.speed *= 0.85
    }

    this.updateProgress(kart)
    this.collectItems(kart)

    // Kart-kart bump
    for (const other of this.karts) {
      if (other === kart || other.finished) continue
      const d = dist(kart, other)
      if (d < 26) {
        const nx = (kart.x - other.x) / (d || 1)
        const ny = (kart.y - other.y) / (d || 1)
        kart.x += nx * 2
        kart.y += ny * 2
        other.x -= nx * 2
        other.y -= ny * 2
        kart.speed *= 0.92
      }
    }
  }

  controlPlayer(kart, dt) {
    const left = this.keys.left || this.touch.left
    const right = this.keys.right || this.touch.right
    const up = this.keys.up || this.touch.accel
    const down = this.keys.down
    const drift = this.keys.drift

    if (up) kart.speed += kart.accel * 60 * dt
    if (down) kart.speed -= kart.accel * 50 * dt

    const steer = kart.turn * (drift ? 1.55 : 1) * (0.45 + Math.min(Math.abs(kart.speed) / kart.maxSpeed, 1))
    if (left) kart.angle -= steer * 60 * dt
    if (right) kart.angle += steer * 60 * dt
    if (drift && Math.abs(kart.speed) > 2) {
      this.spawnParticle(kart.x, kart.y, "drift")
      kart.speed *= 0.995
    }
  }

  controlAi(kart, dt) {
    const look = kart.progress + 0.35 * kart.aiSkill
    const target = pointOnEllipse(this.track, look)
    const desired = Math.atan2(target.y - kart.y, target.x - kart.x)
    const ad = angleDiff(kart.angle, desired)
    kart.angle += clamp(ad, -kart.turn * 1.3, kart.turn * 1.3) * 60 * dt
    kart.speed += kart.accel * 50 * dt * kart.aiSkill

    // Use items opportunistically
    if (kart.item && Math.random() < 0.01 * kart.aiSkill) this.fireWeapon(kart)

    // Avoid bananas roughly
    for (const h of this.hazards) {
      if (h.type !== "banana" || !h.alive) continue
      if (dist(kart, h) < 50) {
        kart.angle += (Math.random() > 0.5 ? 1 : -1) * 0.04
      }
    }
  }

  updateProgress(kart) {
    const t = nearestTrackParam(this.track, kart.x, kart.y)
    let delta = angleDiff(kart.lastProgress, t)

    // Count forward motion along the ellipse; ignore tiny/backward jitter
    if (delta > 0.0005 && delta < 1.5) {
      kart.totalProgress += delta
      kart.progress = t
      kart.lastProgress = t
    } else if (delta < -1.5) {
      // large negative usually means wrap noise; ignore
      kart.lastProgress = t
    }

    const lapsCompleted = Math.floor(kart.totalProgress / (Math.PI * 2))
    if (lapsCompleted > kart.lap) {
      kart.lap = lapsCompleted
      if (kart.lap >= TOTAL_LAPS && !kart.finished) {
        kart.finished = true
        kart.finishTime = this.raceTime
        kart.speed *= 0.3
        if (kart.isPlayer) this.shake = 1
      }
    }
  }

  collectItems(kart) {
    if (kart.item) return
    for (const item of this.items) {
      if (!item.alive) continue
      if (dist(kart, item) < 22) {
        item.alive = false
        item.respawn = 4.5
        kart.item = this.rollWeapon(kart)
        this.spawnParticle(item.x, item.y, "item")
      }
    }
  }

  rollWeapon(kart) {
    // Behind pack gets better items
    const place = this.currentPlace(kart)
    if (place >= 4) {
      return ["red_shell", "lightning", "mushroom", "bomb"][Math.floor(Math.random() * 4)]
    }
    if (place === 1) {
      return ["banana", "green_shell", "mushroom", "banana"][Math.floor(Math.random() * 4)]
    }
    return WEAPONS[Math.floor(Math.random() * WEAPONS.length)]
  }

  fireWeapon(kart) {
    if (!kart || !kart.item || kart.stun > 0 || kart.finished) return
    const weapon = kart.item
    kart.item = null
    if (kart.isPlayer) this.weaponsUsed += 1

    switch (weapon) {
      case "green_shell":
        this.projectiles.push(this.makeShell(kart, false))
        break
      case "red_shell":
        this.projectiles.push(this.makeShell(kart, true))
        break
      case "banana":
        this.hazards.push({
          type: "banana",
          x: kart.x - Math.cos(kart.angle) * 34,
          y: kart.y - Math.sin(kart.angle) * 34,
          alive: true,
          life: 20,
          owner: kart.id
        })
        break
      case "mushroom":
        kart.boost = 1.1
        this.spawnParticle(kart.x, kart.y, "boost")
        break
      case "bomb":
        this.projectiles.push({
          type: "bomb",
          x: kart.x + Math.cos(kart.angle) * 20,
          y: kart.y + Math.sin(kart.angle) * 20,
          vx: Math.cos(kart.angle) * 5.5,
          vy: Math.sin(kart.angle) * 5.5,
          owner: kart.id,
          life: 1.6,
          alive: true
        })
        break
      case "lightning":
        this.castLightning(kart)
        break
    }
  }

  makeShell(kart, homing) {
    return {
      type: homing ? "red_shell" : "green_shell",
      x: kart.x + Math.cos(kart.angle) * 28,
      y: kart.y + Math.sin(kart.angle) * 28,
      vx: Math.cos(kart.angle) * 7.5,
      vy: Math.sin(kart.angle) * 7.5,
      owner: kart.id,
      homing,
      life: 4.5,
      alive: true,
      bounces: 3
    }
  }

  castLightning(caster) {
    this.flash = 0.45
    this.shake = 1.2
    for (const kart of this.karts) {
      if (kart === caster || kart.finished) continue
      kart.stun = 1.4
      kart.shrink = 3.5
      kart.speed *= 0.2
      this.spawnParticle(kart.x, kart.y, "zap")
    }
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (!p.alive) continue
      p.life -= dt

      if (p.homing) {
        const target = this.karts
          .filter((k) => k.id !== p.owner && !k.finished)
          .sort((a, b) => this.raceScore(b) - this.raceScore(a))[0]
        if (target) {
          const desired = Math.atan2(target.y - p.y, target.x - p.x)
          const cur = Math.atan2(p.vy, p.vx)
          const next = cur + clamp(angleDiff(cur, desired), -0.08, 0.08)
          const spd = 7.2
          p.vx = Math.cos(next) * spd
          p.vy = Math.sin(next) * spd
        }
      }

      p.x += p.vx
      p.y += p.vy

      // Bounce green shells on off-road edges
      if (p.type === "green_shell") {
        const off = offRoadFactor(this.track, p.x, p.y)
        if (off > 1.05) {
          p.vx *= -1
          p.vy *= -1
          p.bounces -= 1
          if (p.bounces <= 0) p.alive = false
        }
      }

      if (p.life <= 0) {
        if (p.type === "bomb") this.explode(p.x, p.y, 70)
        p.alive = false
        continue
      }

      for (const kart of this.karts) {
        if (!p.alive || kart.id === p.owner || kart.finished) continue
        if (dist(p, kart) < 22) {
          if (p.type === "bomb") this.explode(p.x, p.y, 80)
          else this.hitKart(kart, 1.2)
          p.alive = false
          break
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive)
  }

  explode(x, y, radius) {
    this.shake = 1.4
    this.spawnParticle(x, y, "boom")
    for (const kart of this.karts) {
      if (kart.finished) continue
      if (dist(kart, { x, y }) < radius) {
        this.hitKart(kart, 1.6)
        const a = Math.atan2(kart.y - y, kart.x - x)
        kart.x += Math.cos(a) * 18
        kart.y += Math.sin(a) * 18
      }
    }
  }

  updateHazards(dt) {
    for (const h of this.hazards) {
      if (!h.alive) continue
      h.life -= dt
      if (h.life <= 0) {
        h.alive = false
        continue
      }
      for (const kart of this.karts) {
        if (kart.finished) continue
        if (dist(h, kart) < 18) {
          this.hitKart(kart, 1.0)
          h.alive = false
          break
        }
      }
    }
    this.hazards = this.hazards.filter((h) => h.alive)
  }

  hitKart(kart, duration) {
    kart.stun = duration
    kart.speed *= 0.15
    this.spawnParticle(kart.x, kart.y, "hit")
    if (kart.isPlayer) this.shake = 0.8
  }

  updateItems(dt) {
    for (const item of this.items) {
      item.spin += dt * 3
      if (!item.alive) {
        item.respawn -= dt
        if (item.respawn <= 0) item.alive = true
      }
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.96
      p.vy *= 0.96
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  spawnParticle(x, y, kind) {
    const count = kind === "boom" ? 18 : kind === "zap" ? 10 : 6
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 40 + Math.random() * 80
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.4,
        kind,
        color: kind === "boost" ? "#f0c24b" : kind === "zap" ? "#aef" : kind === "item" ? "#00c2a8" : "#ff5a1f"
      })
    }
  }

  raceScore(kart) {
    return kart.totalProgress + (kart.finished ? 1000 : 0)
  }

  currentPlace(kart) {
    const sorted = [...this.karts].sort((a, b) => this.raceScore(b) - this.raceScore(a))
    return sorted.indexOf(kart) + 1
  }

  resolvePlaces() {
    const sorted = [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      if (a.finished) return -1
      if (b.finished) return 1
      return this.raceScore(b) - this.raceScore(a)
    })
    sorted.forEach((k, i) => {
      if (k.finished && k.place == null) k.place = i + 1
    })
    this.standings = sorted
  }

  checkRaceOver() {
    if (this.finished) return
    if (this.player.finished) {
      // Assign places to remaining after short delay via finish callback once all or timeout
      this.finished = true
      const place = this.currentPlace(this.player)
      this.player.place = place
      this.onFinish?.({
        playerName: this.playerName,
        timeMs: Math.round(this.player.finishTime),
        laps: TOTAL_LAPS,
        weaponsUsed: this.weaponsUsed,
        place,
        track: this.trackId
      })
    }
  }

  updateHud() {
    const place = this.currentPlace(this.player)
    const lap = Math.min(this.player.lap + 1, TOTAL_LAPS)
    this.onHud?.({
      place: `P${place}`,
      lap: `LAP ${lap}/${TOTAL_LAPS}`,
      timer: formatTime(this.raceTime),
      item: WEAPON_LABELS[this.player.item || "empty"],
      countdown: this.countdown
    })
  }

  draw() {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height
    ctx.save()
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10)
    }

    // Grass / ground
    const grd = ctx.createRadialGradient(this.track.cx, this.track.cy, 80, this.track.cx, this.track.cy, 560)
    grd.addColorStop(0, this.track.grass)
    grd.addColorStop(1, "#0d1411")
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)

    // Decorative hills
    ctx.fillStyle = "rgba(0,0,0,0.18)"
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.ellipse(120 + i * 220, 80 + (i % 2) * 40, 120, 40, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    this.drawTrack(ctx)

    for (const item of this.items) {
      if (!item.alive) continue
      this.drawItemBox(ctx, item)
    }
    for (const h of this.hazards) this.drawBanana(ctx, h)
    for (const p of this.projectiles) this.drawProjectile(ctx, p)
    for (const kart of this.karts) this.drawKart(ctx, kart)
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      ctx.globalAlpha = 1
    }

    // Minimap standings strip
    ctx.fillStyle = "rgba(8,12,10,0.55)"
    ctx.fillRect(16, h - 120, 168, 100)
    ctx.fillStyle = "#f3efe4"
    ctx.font = "700 12px DM Sans, sans-serif"
    ctx.fillText("FIELD", 28, h - 98)
    ;(this.standings || this.karts).slice(0, 6).forEach((k, i) => {
      ctx.fillStyle = k.color
      ctx.fillRect(28, h - 88 + i * 14, 10, 10)
      ctx.fillStyle = k.isPlayer ? "#f0c24b" : "#f3efe4"
      ctx.fillText(`${i + 1}. ${k.name}`, 46, h - 79 + i * 14)
    })

    if (this.countdown > 0) {
      const n = Math.ceil(this.countdown)
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = n <= 0 ? "#00c2a8" : "#ff5a1f"
      ctx.font = "400 140px Bebas Neue, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(n > 0 ? String(n) : "GO", w / 2, h / 2 + 40)
      ctx.textAlign = "start"
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(200,230,255,${this.flash})`
      ctx.fillRect(0, 0, w, h)
    }

    ctx.restore()
  }

  drawTrack(ctx) {
    const { cx, cy, rx, ry, roadWidth, color } = this.track

    // Outer runoff ring
    ctx.strokeStyle = "#3a3228"
    ctx.lineWidth = roadWidth + 36
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Asphalt ring
    ctx.strokeStyle = "#2a3330"
    ctx.lineWidth = roadWidth
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Infield
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx - roadWidth / 2, ry - roadWidth / 2, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // Lane dashes
    ctx.strokeStyle = "rgba(243,239,228,0.35)"
    ctx.lineWidth = 3
    ctx.setLineDash([18, 16])
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Start/finish
    const t = -Math.PI / 2
    const x1 = cx + Math.cos(t) * (rx - roadWidth / 2 + 4)
    const y1 = cy + Math.sin(t) * (ry - roadWidth / 2 + 4)
    const x2 = cx + Math.cos(t) * (rx + roadWidth / 2 - 4)
    const y2 = cy + Math.sin(t) * (ry + roadWidth / 2 - 4)
    ctx.strokeStyle = "#f3efe4"
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    for (let i = 0; i < 8; i++) {
      const u = i / 8
      const px = x1 + (x2 - x1) * u
      const py = y1 + (y2 - y1) * u
      ctx.fillStyle = i % 2 === 0 ? "#111" : "#f3efe4"
      ctx.fillRect(px - 3, py - 8, 6, 16)
    }
  }

  drawItemBox(ctx, item) {
    ctx.save()
    ctx.translate(item.x, item.y)
    ctx.rotate(item.spin)
    ctx.fillStyle = "#7c5cff"
    ctx.strokeStyle = "#f0e9ff"
    ctx.lineWidth = 2
    ctx.fillRect(-12, -12, 24, 24)
    ctx.strokeRect(-12, -12, 24, 24)
    ctx.fillStyle = "#fff"
    ctx.font = "700 16px DM Sans, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("?", 0, 6)
    ctx.restore()
  }

  drawBanana(ctx, h) {
    ctx.save()
    ctx.translate(h.x, h.y)
    ctx.fillStyle = "#f0c24b"
    ctx.beginPath()
    ctx.ellipse(0, 0, 10, 6, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#7a5a10"
    ctx.stroke()
    ctx.restore()
  }

  drawProjectile(ctx, p) {
    ctx.save()
    ctx.translate(p.x, p.y)
    if (p.type === "bomb") {
      ctx.fillStyle = "#222"
      ctx.beginPath()
      ctx.arc(0, 0, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#ff5a1f"
      ctx.fillRect(4, -12, 3, 8)
    } else {
      ctx.fillStyle = p.type === "red_shell" ? "#ff3b5c" : "#34d399"
      ctx.beginPath()
      ctx.arc(0, 0, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.5)"
      ctx.stroke()
    }
    ctx.restore()
  }

  drawKart(ctx, kart) {
    ctx.save()
    ctx.translate(kart.x, kart.y)
    ctx.rotate(kart.angle)
    const scale = kart.shrink > 0 ? 0.65 : 1
    ctx.scale(scale, scale)

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)"
    ctx.beginPath()
    ctx.ellipse(2, 6, 16, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = kart.color
    ctx.fillRect(-14, -10, 28, 20)
    ctx.fillStyle = "rgba(255,255,255,0.25)"
    ctx.fillRect(2, -7, 10, 14)

    // Wheels
    ctx.fillStyle = "#111"
    ctx.fillRect(-12, -13, 8, 4)
    ctx.fillRect(-12, 9, 8, 4)
    ctx.fillRect(4, -13, 8, 4)
    ctx.fillRect(4, 9, 8, 4)

    if (kart.boost > 0) {
      ctx.fillStyle = "#f0c24b"
      ctx.beginPath()
      ctx.moveTo(-16, 0)
      ctx.lineTo(-28, -5)
      ctx.lineTo(-28, 5)
      ctx.fill()
    }

    if (kart.isPlayer) {
      ctx.strokeStyle = "#f3efe4"
      ctx.lineWidth = 2
      ctx.strokeRect(-15, -11, 30, 22)
    }

    ctx.restore()

    // Nameplate
    ctx.fillStyle = "rgba(0,0,0,0.45)"
    ctx.font = "700 11px DM Sans, sans-serif"
    const label = kart.name
    const tw = ctx.measureText(label).width
    ctx.fillRect(kart.x - tw / 2 - 4, kart.y - 28, tw + 8, 14)
    ctx.fillStyle = kart.isPlayer ? "#f0c24b" : "#f3efe4"
    ctx.textAlign = "center"
    ctx.fillText(label, kart.x, kart.y - 18)
    ctx.textAlign = "start"
  }
}

export { WEAPON_LABELS, TOTAL_LAPS, formatTime }
