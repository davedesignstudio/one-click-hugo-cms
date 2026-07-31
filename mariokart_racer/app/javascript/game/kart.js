import { clamp, normalizeAngle, distance, randomWeapon } from "game/constants";
import { isOnTrack, trackProgress, getWaypoint } from "game/track";

let nextKartId = 0;

export class Kart {
  constructor({ x, y, angle, color, name, isPlayer = false }) {
    this.id = nextKartId++;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.maxSpeed = isPlayer ? 7 : 6.2;
    this.acceleration = 0.18;
    this.friction = 0.96;
    this.turnSpeed = 0.06;
    this.color = color;
    this.name = name;
    this.isPlayer = isPlayer;
    this.lap = 1;
    this.finished = false;
    this.finishTime = null;
    this.lastProgress = trackProgress(x, y);
    this.lapProgress = 0;
    this.item = null;
    this.stunTimer = 0;
    this.boostTimer = 0;
    this.starTimer = 0;
    this.shrinkTimer = 0;
    this.spinAngle = 0;
    this.waypointIndex = 0;
    this.aiItemCooldown = 0;
    this.rank = 1;
  }

  get effectiveMaxSpeed() {
    let max = this.maxSpeed;
    if (this.boostTimer > 0) max *= 1.5;
    if (this.starTimer > 0) max *= 1.4;
    if (this.shrinkTimer > 0) max *= 0.6;
    if (!isOnTrack(this.x, this.y)) max *= 0.4;
    return max;
  }

  get isStunned() {
    return this.stunTimer > 0;
  }

  get isInvincible() {
    return this.starTimer > 0;
  }

  get scale() {
    return this.shrinkTimer > 0 ? 0.65 : 1;
  }

  update(input, dt, allKarts) {
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.starTimer = Math.max(0, this.starTimer - dt);
    this.shrinkTimer = Math.max(0, this.shrinkTimer - dt);
    this.aiItemCooldown = Math.max(0, this.aiItemCooldown - dt);

    if (this.finished) return;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.spinAngle += 0.3;
      this.speed *= 0.9;
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.updateLap();
      return;
    }

    if (this.isPlayer) {
      this.handlePlayerInput(input);
    } else {
      return this.handleAI(allKarts);
    }

    this.speed = clamp(this.speed, -2, this.effectiveMaxSpeed);
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Keep on canvas
    this.x = clamp(this.x, 20, 880);
    this.y = clamp(this.y, 20, 580);

    if (!isOnTrack(this.x, this.y)) {
      this.speed *= 0.92;
    }

    this.updateLap();
  }

  handlePlayerInput(input) {
    if (input.up) {
      this.speed += this.acceleration;
    }
    if (input.down) {
      this.speed -= this.acceleration * 0.7;
    }

    const turnMultiplier = Math.abs(this.speed) > 0.5 ? 1 : 0.3;
    if (input.left) {
      this.angle -= this.turnSpeed * turnMultiplier * Math.sign(this.speed || 1);
    }
    if (input.right) {
      this.angle += this.turnSpeed * turnMultiplier * Math.sign(this.speed || 1);
    }

    this.speed *= this.friction;
  }

  handleAI(allKarts) {
    const wp = getWaypoint(this.waypointIndex);
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = normalizeAngle(targetAngle - this.angle + Math.PI) - Math.PI;

    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    this.angle += clamp(angleDiff, -this.turnSpeed * 1.2, this.turnSpeed * 1.2);
    this.speed += this.acceleration * 0.85;
    this.speed *= this.friction;

    if (distance(this.x, this.y, wp.x, wp.y) < 40) {
      this.waypointIndex = (this.waypointIndex + 1) % 16;
    }

    // AI uses items occasionally
    if (this.item && this.aiItemCooldown <= 0 && Math.random() < 0.008) {
      return "use_item";
    }

    return null;
  }

  updateLap() {
    const progress = trackProgress(this.x, this.y);
    const delta = progress - this.lastProgress;

    if (delta < -0.5) {
      // Crossed start line forward
      if (this.lapProgress > 0.7) {
        this.lap++;
        if (this.lap > 3) {
          this.finished = true;
        }
      }
      this.lapProgress = 0;
    } else if (delta > 0.5) {
      // Crossed backwards - ignore
    } else {
      this.lapProgress = Math.max(this.lapProgress, progress);
    }

    this.lastProgress = progress;
  }

  takeHit() {
    if (this.isInvincible) return false;
    this.stunTimer = 90;
    this.speed *= 0.3;
    this.item = null;
    return true;
  }

  giveItem(weapon) {
    this.item = weapon;
  }

  clearItem() {
    this.item = null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isStunned) {
      ctx.rotate(this.spinAngle);
    } else {
      ctx.rotate(this.angle);
    }

    const s = this.scale;

    // Star invincibility glow
    if (this.isInvincible) {
      const hue = (Date.now() / 10) % 360;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 20;
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 6 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Kart body
    ctx.fillStyle = this.color.body;
    ctx.beginPath();
    ctx.roundRect(-14 * s, -10 * s, 28 * s, 20 * s, 4);
    ctx.fill();

    // Accent stripe
    ctx.fillStyle = this.color.accent;
    ctx.fillRect(-14 * s, -2 * s, 28 * s, 4 * s);

    // Wheels
    ctx.fillStyle = "#222";
    const wheelPositions = [
      [-10, -8], [10, -8], [-10, 8], [10, 8],
    ];
    wheelPositions.forEach(([wx, wy]) => {
      ctx.beginPath();
      ctx.arc(wx * s, wy * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
    });

    // Windshield
    ctx.fillStyle = "#87ceeb";
    ctx.beginPath();
    ctx.roundRect(2 * s, -6 * s, 10 * s, 12 * s, 2);
    ctx.fill();

    // Player indicator
    if (this.isPlayer) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20 * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Name tag
    ctx.fillStyle = this.isPlayer ? "#ffd700" : "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x, this.y - 22 * this.scale);

    // Stun stars
    if (this.isStunned) {
      ctx.font = "14px sans-serif";
      ctx.fillText("💫", this.x, this.y - 35);
    }
  }
}

export function createKarts(startPositions, colors, playerName) {
  const karts = [];
  karts.push(
    new Kart({
      ...startPositions[0],
      color: colors[0],
      name: playerName,
      isPlayer: true,
    })
  );

  const aiNames = ["Peach", "Bowser", "Toad"];
  for (let i = 0; i < 3; i++) {
    karts.push(
      new Kart({
        ...startPositions[i + 1],
        color: colors[i + 1],
        name: aiNames[i],
        isPlayer: false,
      })
    );
  }

  return karts;
}

export function calculateRankings(karts) {
  const sorted = [...karts].sort((a, b) => {
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    if (a.finished) return -1;
    if (b.finished) return 1;
    const aScore = a.lap * 1000 + a.lapProgress;
    const bScore = b.lap * 1000 + b.lapProgress;
    return bScore - aScore;
  });

  sorted.forEach((kart, i) => {
    kart.rank = i + 1;
  });

  return sorted;
}
