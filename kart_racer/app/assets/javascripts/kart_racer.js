// Kart Blitz — top-down Mario Kart-style racer
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const TOTAL_LAPS = 3;
  const WORLD_SCALE = 1;

  const WEAPONS = {
    shell: { name: "Green Shell", icon: "🟢", color: "#2ecc40" },
    red_shell: { name: "Red Shell", icon: "🔴", color: "#e63946" },
    banana: { name: "Banana", icon: "🍌", color: "#ffd23f" },
    mushroom: { name: "Mushroom", icon: "🍄", color: "#e63946" },
    star: { name: "Star", icon: "⭐", color: "#ffd23f" },
    lightning: { name: "Lightning", icon: "⚡", color: "#a8dadc" },
  };

  const WEAPON_POOL = ["shell", "red_shell", "banana", "mushroom", "star", "lightning"];

  const RACER_COLORS = ["#3498db", "#e74c3c", "#2ecc71", "#9b59b6"];

  // Track: oval with a chicane bump
  const TRACK = {
    cx: 0,
    cy: 0,
    outerRx: 900,
    outerRy: 600,
    innerRx: 500,
    innerRy: 280,
    width: 400,
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function normalizeAngle(a) {
    while (a < -Math.PI) a += TAU;
    while (a > Math.PI) a -= TAU;
    return a;
  }

  function angleDiff(from, to) {
    return normalizeAngle(to - from);
  }

  function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function isOnTrack(x, y) {
    const dx = (x - TRACK.cx) / TRACK.outerRx;
    const dy = (y - TRACK.cy) / TRACK.outerRy;
    const outerDist = dx * dx + dy * dy;

    const idx = (x - TRACK.cx) / TRACK.innerRx;
    const idy = (y - TRACK.cy) / TRACK.innerRy;
    const innerDist = idx * idx + idy * idy;

    // Chicane: narrow section on right side
    const angle = Math.atan2(y - TRACK.cy, x - TRACK.cx);
    let chicaneNarrow = 0;
    if (angle > -0.5 && angle < 0.8) {
      chicaneNarrow = 60 * Math.sin((angle + 0.5) * 2);
    }

    const effectiveInnerRx = TRACK.innerRx + chicaneNarrow;
    const effectiveInnerRy = TRACK.innerRy + chicaneNarrow * 0.5;
    const eidx = (x - TRACK.cx) / effectiveInnerRx;
    const eidy = (y - TRACK.cy) / effectiveInnerRy;
    const effectiveInner = eidx * eidx + eidy * eidy;

    return outerDist <= 1 && effectiveInner >= 1;
  }

  function getTrackAngle(x, y) {
    return Math.atan2(y - TRACK.cy, x - TRACK.cx) + Math.PI / 2;
  }

  function getIdealPosition(t) {
    const angle = t * TAU - Math.PI / 2;
    const rx = (TRACK.outerRx + TRACK.innerRx) / 2;
    const ry = (TRACK.outerRy + TRACK.innerRy) / 2;
    return {
      x: TRACK.cx + Math.cos(angle) * rx,
      y: TRACK.cy + Math.sin(angle) * ry,
      angle: angle + Math.PI / 2,
    };
  }

  // --- Game State ---
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const minimap = document.getElementById("minimap");
  const mmCtx = minimap.getContext("2d");

  let width, height;
  let gameState = "menu"; // menu, countdown, racing, finished
  let countdownValue = 3;
  let countdownTimer = 0;
  let raceTime = 0;
  let camera = { x: 0, y: 0 };

  const keys = {};
  const particles = [];
  const projectiles = [];
  const hazards = [];
  let itemBoxes = [];

  class Kart {
    constructor(id, name, color, isPlayer, startT) {
      this.id = id;
      this.name = name;
      this.color = color;
      this.isPlayer = isPlayer;
      this.width = 28;
      this.height = 16;

      const start = getIdealPosition(startT);
      this.x = start.x;
      this.y = start.y;
      this.angle = start.angle;
      this.speed = 0;
      this.maxSpeed = isPlayer ? 9 : 7.5 + Math.random() * 1.5;
      this.acceleration = 0.18;
      this.brakePower = 0.25;
      this.friction = 0.04;
      this.turnSpeed = 0.055;
      this.driftFactor = 0;

      this.lap = 0;
      this.progress = startT;
      this.lastProgressAngle = Math.atan2(this.y - TRACK.cy, this.x - TRACK.cx);
      this.finished = false;
      this.finishTime = 0;
      this.position = 1;

      this.item = null;
      this.itemCooldown = 0;
      this.stunned = 0;
      this.spinning = 0;
      this.boostTimer = 0;
      this.starTimer = 0;
      this.shrunk = 0;
      this.driftBoost = 0;
      this.isDrifting = false;
      this.driftCharge = 0;

      // AI
      this.aiSkill = 0.7 + Math.random() * 0.25;
      this.aiTargetT = startT;
      this.aiWander = 0;
    }

    get displaySpeed() {
      return Math.round(Math.abs(this.speed) * 18);
    }

    get isInvincible() {
      return this.starTimer > 0;
    }

  get scale() {
      return this.shrunk > 0 ? 0.65 : 1;
    }

    updateProgress() {
      const angle = Math.atan2(this.y - TRACK.cy, this.x - TRACK.cx);
      let diff = normalizeAngle(angle - this.lastProgressAngle);

      if (diff > Math.PI) diff -= TAU;
      if (diff < -Math.PI) diff += TAU;

      if (diff > 0.01) {
        this.progress += diff / TAU;
        if (this.progress >= 1) {
          this.progress -= 1;
          this.lap++;
          if (this.lap >= TOTAL_LAPS && !this.finished) {
            this.finished = true;
            this.finishTime = raceTime;
          }
        }
      } else if (diff < -0.5) {
        // wrong way penalty (small)
        this.progress = Math.max(0, this.progress - 0.001);
      }

      this.lastProgressAngle = angle;
    }

    updateAI(dt) {
      if (this.finished || this.stunned > 0) return;

      this.aiWander += (Math.random() - 0.5) * 0.02;
      this.aiTargetT += (0.003 + this.aiSkill * 0.004) * (1 + this.boostTimer > 0 ? 0.3 : 0);
      if (this.aiTargetT > 1) this.aiTargetT -= 1;

      const target = getIdealPosition(this.aiTargetT + this.aiWander * 0.02);
      const desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
      const diff = angleDiff(this.angle, desiredAngle);

      const steer = clamp(diff * 2.5, -1, 1);
      this.speed = clamp(this.speed + this.acceleration * 0.85, 0, this.maxSpeed * (this.boostTimer > 0 ? 1.4 : 1));

      if (Math.abs(steer) > 0.3 && this.speed > 3) {
        this.angle += steer * this.turnSpeed * (this.speed / this.maxSpeed);
      } else {
        this.angle += steer * this.turnSpeed;
      }

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      // AI uses items
      if (this.item && Math.random() < 0.008) {
        this.useItem();
      }

      // AI collects items
      for (let i = itemBoxes.length - 1; i >= 0; i--) {
        const box = itemBoxes[i];
        if (box.active && dist(this.x, this.y, box.x, box.y) < 35) {
          box.active = false;
          box.respawn = 300;
          this.item = randChoice(WEAPON_POOL);
          spawnParticles(box.x, box.y, "#ffd23f", 8);
        }
      }
    }

    updatePlayer(dt) {
      if (this.finished) return;

      if (this.stunned > 0) {
        this.stunned -= 1 / 60;
        this.speed *= 0.92;
        this.angle += 0.15;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        return;
      }

      let accel = 0;
      let steer = 0;

      if (keys["ArrowUp"] || keys["w"]) accel = 1;
      if (keys["ArrowDown"] || keys["s"]) accel = -0.6;
      if (keys["ArrowLeft"] || keys["a"]) steer = -1;
      if (keys["ArrowRight"] || keys["d"]) steer = 1;

      const maxSpd = this.maxSpeed * (this.boostTimer > 0 ? 1.5 : 1) * (this.driftBoost > 0 ? 1.2 : 1);

      if (accel > 0) {
        this.speed = clamp(this.speed + this.acceleration, 0, maxSpd);
      } else if (accel < 0) {
        this.speed = clamp(this.speed - this.brakePower, -2, maxSpd);
      } else {
        this.speed *= 1 - this.friction;
        if (Math.abs(this.speed) < 0.05) this.speed = 0;
      }

      const driftKey = keys["Shift"];
      this.isDrifting = driftKey && Math.abs(steer) > 0 && this.speed > 4;

      if (this.isDrifting) {
        this.driftCharge = clamp(this.driftCharge + dt * 0.02, 0, 1);
        this.angle += steer * this.turnSpeed * 1.4 * (this.speed / this.maxSpeed);
        this.driftFactor = lerp(this.driftFactor, steer * 0.4, 0.1);
      } else {
        if (this.driftCharge > 0.5) {
          this.boostTimer = 1.5;
          this.driftBoost = 60;
          spawnParticles(this.x, this.y, "#ffd23f", 12);
        }
        this.driftCharge = 0;
        this.driftFactor = lerp(this.driftFactor, 0, 0.15);
        if (Math.abs(this.speed) > 0.5) {
          this.angle += steer * this.turnSpeed * (this.speed / this.maxSpeed);
        }
      }

      const moveAngle = this.angle + this.driftFactor;
      this.x += Math.cos(moveAngle) * this.speed;
      this.y += Math.sin(moveAngle) * this.speed;

      if (keys[" "] && this.item) {
        this.useItem();
      }
    }

    useItem() {
      if (!this.item || this.itemCooldown > 0) return;

      const weapon = this.item;
      this.item = null;
      this.itemCooldown = 30;
      updateItemHUD();

      switch (weapon) {
        case "shell":
          projectiles.push(new Projectile(this.x, this.y, this.angle, "shell", this.id));
          break;
        case "red_shell": {
          const target = findNearestRival(this);
          projectiles.push(new Projectile(this.x, this.y, this.angle, "red_shell", this.id, target));
          break;
        }
        case "banana":
          hazards.push(new Hazard(this.x - Math.cos(this.angle) * 30, this.y - Math.sin(this.angle) * 30, "banana", this.id));
          break;
        case "mushroom":
          this.boostTimer = 2;
          this.driftBoost = 90;
          spawnParticles(this.x, this.y, "#e63946", 15);
          break;
        case "star":
          this.starTimer = 5;
          this.boostTimer = 5;
          spawnParticles(this.x, this.y, "#ffd23f", 20);
          break;
        case "lightning":
          karts.forEach((k) => {
            if (k.id !== this.id) {
              k.shrunk = 4;
              k.speed *= 0.3;
              k.stunned = 1.5;
            }
          });
          spawnLightningEffect();
          break;
      }
    }

    resolveCollision() {
      if (!isOnTrack(this.x, this.y)) {
        // Push back toward track center
        const angle = Math.atan2(this.y - TRACK.cy, this.x - TRACK.cx);
        const rx = (TRACK.outerRx + TRACK.innerRx) / 2;
        const ry = (TRACK.outerRy + TRACK.innerRy) / 2;
        this.x = TRACK.cx + Math.cos(angle) * rx;
        this.y = TRACK.cy + Math.sin(angle) * ry;
        this.speed *= 0.5;
        spawnParticles(this.x, this.y, "#888", 5);
      }
    }

    update(dt) {
      if (this.itemCooldown > 0) this.itemCooldown--;
      if (this.boostTimer > 0) this.boostTimer -= 1 / 60;
      if (this.starTimer > 0) this.starTimer -= 1 / 60;
      if (this.shrunk > 0) this.shrunk -= 1 / 60;
      if (this.driftBoost > 0) this.driftBoost--;

      if (this.isPlayer) {
        this.updatePlayer(dt);
      } else {
        this.updateAI(dt);
      }

      this.resolveCollision();
      this.updateProgress();
    }
  }

  class Projectile {
    constructor(x, y, angle, type, ownerId, target = null) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.type = type;
      this.ownerId = ownerId;
      this.target = target;
      this.speed = type === "red_shell" ? 7 : 8;
      this.alive = true;
      this.life = 300;
    }

    update() {
      this.life--;
      if (this.life <= 0) { this.alive = false; return; }

      if (this.type === "red_shell" && this.target && !this.target.finished) {
        const desired = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.angle = lerp(this.angle, desired, 0.08);
      }

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      if (!isOnTrack(this.x, this.y)) {
        this.alive = false;
        spawnParticles(this.x, this.y, "#2ecc40", 6);
        return;
      }

      for (const kart of karts) {
        if (kart.id === this.ownerId || kart.finished) continue;
        if (kart.isInvincible) continue;
        if (dist(this.x, this.y, kart.x, kart.y) < 22) {
          hitKart(kart);
          this.alive = false;
          spawnParticles(this.x, this.y, "#ff6b35", 10);
          return;
        }
      }
    }
  }

  class Hazard {
    constructor(x, y, type, ownerId) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.ownerId = ownerId;
      this.alive = true;
      this.life = 600;
    }

    update() {
      this.life--;
      if (this.life <= 0) this.alive = false;

      for (const kart of karts) {
        if (kart.finished || kart.isInvincible) continue;
        if (dist(this.x, this.y, kart.x, kart.y) < 20) {
          hitKart(kart);
          this.alive = false;
          spawnParticles(this.x, this.y, "#ffd23f", 8);
          return;
        }
      }
    }
  }

  function hitKart(kart) {
    kart.stunned = 1.2;
    kart.speed *= -0.3;
    kart.spinning = 30;
  }

  function findNearestRival(kart) {
    let nearest = null;
    let minDist = Infinity;
    for (const k of karts) {
      if (k.id === kart.id || k.finished) continue;
      const d = dist(kart.x, kart.y, k.x, k.y);
      if (d < minDist) {
        minDist = d;
        nearest = k;
      }
    }
    return nearest;
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  function spawnLightningEffect() {
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: TRACK.cx + (Math.random() - 0.5) * TRACK.outerRx * 2,
        y: TRACK.cy + (Math.random() - 0.5) * TRACK.outerRy * 2,
        vx: 0,
        vy: -2 - Math.random() * 4,
        life: 15 + Math.random() * 15,
        color: "#a8dadc",
        size: 3 + Math.random() * 5,
      });
    }
  }

  let karts = [];

  function initItemBoxes() {
    itemBoxes = [];
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const pos = getIdealPosition(t);
      itemBoxes.push({ x: pos.x, y: pos.y, active: true, respawn: 0, bob: Math.random() * TAU });
    }
  }

  function initRace() {
    karts = [
      new Kart(0, "You", RACER_COLORS[0], true, 0),
      new Kart(1, "Toad", RACER_COLORS[1], false, 0.02),
      new Kart(2, "Yoshi", RACER_COLORS[2], false, 0.04),
      new Kart(3, "Bowser", RACER_COLORS[3], false, 0.06),
    ];
    projectiles.length = 0;
    hazards.length = 0;
    particles.length = 0;
    raceTime = 0;
    initItemBoxes();
    updateItemHUD();
  }

  function updatePositions() {
    const sorted = [...karts].sort((a, b) => {
      const aScore = a.lap * 1000 + a.progress + (a.finished ? 10000 : 0);
      const bScore = b.lap * 1000 + b.progress + (b.finished ? 10000 : 0);
      return bScore - aScore;
    });
    sorted.forEach((k, i) => { k.position = i + 1; });
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${min}:${sec.toString().padStart(2, "0")}.${ms}`;
  }

  function updateHUD() {
    const player = karts[0];
    if (!player) return;

    document.getElementById("hud-lap").textContent = `${Math.min(player.lap + 1, TOTAL_LAPS)} / ${TOTAL_LAPS}`;
    document.getElementById("hud-position").textContent = `${player.position}${["st", "nd", "rd"][player.position - 1] || "th"}`;
    document.getElementById("hud-time").textContent = formatTime(raceTime);
    document.getElementById("hud-speed").textContent = player.displaySpeed;
  }

  function updateItemHUD() {
    const player = karts[0];
    const slot = document.getElementById("item-slot");
    const icon = document.getElementById("item-icon");

    if (player && player.item) {
      slot.classList.remove("empty");
      icon.textContent = WEAPONS[player.item].icon;
      icon.title = WEAPONS[player.item].name;
    } else {
      slot.classList.add("empty");
      icon.textContent = "";
    }
  }

  // --- Rendering ---
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function drawTrack() {
    // Grass
    ctx.fillStyle = "#1a5c2a";
    ctx.fillRect(-5000, -5000, 10000, 10000);

    // Track surface
    ctx.save();
    ctx.translate(TRACK.cx, TRACK.cy);
    ctx.beginPath();
    ctx.ellipse(0, 0, TRACK.outerRx, TRACK.outerRy, 0, 0, TAU);
    ctx.ellipse(0, 0, TRACK.innerRx, TRACK.innerRy, 0, 0, TAU, true);
    ctx.closePath();
    const grad = ctx.createRadialGradient(0, 0, TRACK.innerRx, 0, 0, TRACK.outerRx);
    grad.addColorStop(0, "#555");
    grad.addColorStop(0.5, "#444");
    grad.addColorStop(1, "#3a3a3a");
    ctx.fillStyle = grad;
    ctx.fill();

    // Curbs
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#e63946";
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.ellipse(0, 0, TRACK.outerRx - 15, TRACK.outerRy - 10, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineDashOffset = 20;
    ctx.beginPath();
    ctx.ellipse(0, 0, TRACK.outerRx - 15, TRACK.outerRy - 10, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

  ctx.lineWidth = 6;
    ctx.strokeStyle = "#3498db";
    ctx.beginPath();
    ctx.ellipse(0, 0, TRACK.innerRx + 15, TRACK.innerRy + 8, 0, 0, TAU);
    ctx.stroke();

    // Start line
    const slx = (TRACK.outerRx + TRACK.innerRx) / 2;
    ctx.save();
    ctx.translate(slx, 0);
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#fff" : "#111";
      ctx.fillRect(-4, -TRACK.width / 2 + i * (TRACK.width / 8), 8, TRACK.width / 8);
    }
    ctx.restore();

    // Center line dashes
    const midRx = (TRACK.outerRx + TRACK.innerRx) / 2;
    const midRy = (TRACK.outerRy + TRACK.innerRy) / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([30, 30]);
    ctx.beginPath();
    ctx.ellipse(0, 0, midRx, midRy, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawItemBoxes() {
    const time = raceTime;
    for (const box of itemBoxes) {
      if (!box.active) continue;
      const bob = Math.sin(time * 0.08 + box.bob) * 4;
      ctx.save();
      ctx.translate(box.x, box.y + bob);

      // Box
      ctx.fillStyle = "#ffd23f";
      ctx.strokeStyle = "#e6a800";
      ctx.lineWidth = 3;
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeRect(-14, -14, 28, 28);

      // Question mark
      ctx.fillStyle = "#e63946";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", 0, 1);

      // Glow
      ctx.shadowColor = "#ffd23f";
      ctx.shadowBlur = 15;
      ctx.strokeRect(-14, -14, 28, 28);
      ctx.restore();
    }
  }

  function drawKart(kart) {
    ctx.save();
    ctx.translate(kart.x, kart.y);
    ctx.rotate(kart.angle);
    ctx.scale(kart.scale, kart.scale);

    if (kart.isInvincible) {
      ctx.globalAlpha = 0.7 + Math.sin(raceTime * 0.3) * 0.3;
      ctx.shadowColor = "#ffd23f";
      ctx.shadowBlur = 20;
    }

    if (kart.stunned > 0) {
      ctx.rotate(kart.spinning * 0.05);
    }

    const w = kart.width;
    const h = kart.height;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);

    // Body
    ctx.fillStyle = kart.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();

    // Windshield
    ctx.fillStyle = "rgba(100,180,255,0.7)";
    ctx.fillRect(w * 0.1, -h * 0.35, w * 0.3, h * 0.7);

    // Wheels
    ctx.fillStyle = "#222";
    const wheelPositions = [
      [-w * 0.3, -h * 0.55], [w * 0.3, -h * 0.55],
      [-w * 0.3, h * 0.55], [w * 0.3, h * 0.55],
    ];
    for (const [wx, wy] of wheelPositions) {
      ctx.beginPath();
      ctx.ellipse(wx, wy, 5, 3, 0, 0, TAU);
      ctx.fill();
    }

    // Exhaust particles when boosting
    if (kart.boostTimer > 0 || kart.driftBoost > 0) {
      spawnParticles(
        kart.x - Math.cos(kart.angle) * 20,
        kart.y - Math.sin(kart.angle) * 20,
        kart.isInvincible ? "#ffd23f" : "#ff6b35",
        1
      );
    }

    // Drift sparks
    if (kart.isDrifting && kart.driftCharge > 0.3) {
      const colors = ["#3498db", "#ffd23f", "#e63946"];
      const ci = Math.floor(kart.driftCharge * 3);
      spawnParticles(
        kart.x + (Math.random() - 0.5) * 10,
        kart.y + (Math.random() - 0.5) * 10,
        colors[Math.min(ci, 2)],
        1
      );
    }

    // Name tag
    ctx.rotate(-kart.angle);
    ctx.fillStyle = kart.isPlayer ? "#ffd23f" : "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(kart.name, 0, -22);

    ctx.restore();
  }

  function drawProjectiles() {
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.type === "shell" || p.type === "red_shell") {
        ctx.fillStyle = p.type === "red_shell" ? "#e63946" : "#2ecc40";
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(3, 0, 3, 2, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawHazards() {
    for (const h of hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      if (h.type === "banana") {
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🍌", 0, 0);
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life / 40;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMinimap() {
    const mw = minimap.width;
    const mh = minimap.height;
    mmCtx.clearRect(0, 0, mw, mh);
    mmCtx.fillStyle = "#1a5c2a";
    mmCtx.fillRect(0, 0, mw, mh);

    const scaleX = mw / (TRACK.outerRx * 2.2);
    const scaleY = mh / (TRACK.outerRy * 2.2);
    const s = Math.min(scaleX, scaleY);
    const ox = mw / 2;
    const oy = mh / 2;

    mmCtx.strokeStyle = "#666";
    mmCtx.lineWidth = 8 * s;
    mmCtx.beginPath();
    mmCtx.ellipse(ox, oy, TRACK.outerRx * s, TRACK.outerRy * s, 0, 0, TAU);
    mmCtx.stroke();

    for (const kart of karts) {
      mmCtx.fillStyle = kart.isPlayer ? "#ffd23f" : kart.color;
      mmCtx.beginPath();
      mmCtx.arc(ox + kart.x * s, oy + kart.y * s, kart.isPlayer ? 4 : 3, 0, TAU);
      mmCtx.fill();
    }
  }

  function render() {
    const player = karts[0];
    if (player) {
      camera.x = lerp(camera.x, player.x, 0.1);
      camera.y = lerp(camera.y, player.y, 0.1);
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2 - camera.x, height / 2 - camera.y);

    drawTrack();
    drawItemBoxes();
    drawHazards();
    drawProjectiles();

    const sorted = [...karts].sort((a, b) => a.y - b.y);
    for (const kart of sorted) drawKart(kart);

    drawParticles();
    ctx.restore();

    drawMinimap();
  }

  function update(dt) {
    if (gameState === "countdown") {
      countdownTimer += dt;
      if (countdownTimer >= 60) {
        countdownTimer = 0;
        countdownValue--;
        const el = document.getElementById("countdown-text");
        if (countdownValue > 0) {
          el.textContent = countdownValue;
        } else if (countdownValue === 0) {
          el.textContent = "GO!";
        } else {
          document.getElementById("countdown").classList.add("hidden");
          gameState = "racing";
        }
      }
      return;
    }

    if (gameState !== "racing") return;

    raceTime += 1 / 60;

    for (const kart of karts) kart.update(dt);

    for (let i = projectiles.length - 1; i >= 0; i--) {
      projectiles[i].update();
      if (!projectiles[i].alive) projectiles.splice(i, 1);
    }

    for (let i = hazards.length - 1; i >= 0; i--) {
      hazards[i].update();
      if (!hazards[i].alive) hazards.splice(i, 1);
    }

    for (const box of itemBoxes) {
      if (!box.active) {
        box.respawn -= dt;
        if (box.respawn <= 0) box.active = true;
      }
    }

    // Player item pickup
    const player = karts[0];
    if (player && !player.item) {
      for (const box of itemBoxes) {
        if (box.active && dist(player.x, player.y, box.x, box.y) < 35) {
          box.active = false;
          box.respawn = 300;
          player.item = randChoice(WEAPON_POOL);
          updateItemHUD();
          spawnParticles(box.x, box.y, "#ffd23f", 8);
          break;
        }
      }
    }

    updatePositions();
    updateHUD();

    // Check race end
    if (player && player.finished && gameState === "racing") {
      gameState = "finished";
      showFinishScreen();
    }
  }

  function showFinishScreen() {
    const player = karts[0];
    const suffix = ["st", "nd", "rd"][player.position - 1] || "th";
    document.getElementById("finish-title").textContent =
      player.position === 1 ? "🏆 You Win!" : "Race Complete!";
    document.getElementById("finish-position").textContent =
      `You finished ${player.position}${suffix} place`;
    document.getElementById("finish-time").textContent =
      `Time: ${formatTime(player.finishTime)}`;
    document.getElementById("finish-screen").classList.remove("hidden");
  }

  function gameLoop() {
    update(1);
    render();
    requestAnimationFrame(gameLoop);
  }

  function startRace() {
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("finish-screen").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("countdown").classList.remove("hidden");
    document.getElementById("countdown-text").textContent = "3";

    initRace();
    gameState = "countdown";
    countdownValue = 3;
    countdownTimer = 0;
  }

  // --- Input ---
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  document.getElementById("start-btn").addEventListener("click", startRace);
  document.getElementById("restart-btn").addEventListener("click", startRace);

  window.addEventListener("resize", resize);
  resize();
  initRace();
  gameLoop();
})();
