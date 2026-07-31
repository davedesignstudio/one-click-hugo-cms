import { TRACK, normalizeAngle, distance } from "game/constants";

export function isOnTrack(x, y) {
  const dx = x - TRACK.cx;
  const dy = y - TRACK.cy;
  const outer = (dx * dx) / (TRACK.outerRx * TRACK.outerRx) + (dy * dy) / (TRACK.outerRy * TRACK.outerRy);
  const inner = (dx * dx) / (TRACK.innerRx * TRACK.innerRx) + (dy * dy) / (TRACK.innerRy * TRACK.innerRy);
  return outer <= 1 && inner >= 1;
}

export function trackProgress(x, y) {
  const angle = normalizeAngle(Math.atan2(y - TRACK.cy, x - TRACK.cx) + Math.PI / 2);
  return angle / (Math.PI * 2);
}

export function getWaypoint(index, total = 16) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const rx = (TRACK.outerRx + TRACK.innerRx) / 2;
  const ry = (TRACK.outerRy + TRACK.innerRy) / 2;
  return {
    x: TRACK.cx + Math.cos(angle) * rx,
    y: TRACK.cy + Math.sin(angle) * ry,
    angle: angle + Math.PI / 2,
  };
}

export function getItemBoxPositions() {
  const positions = [];
  for (let i = 0; i < 8; i++) {
    const wp = getWaypoint(i * 2, 16);
    positions.push({ x: wp.x, y: wp.y, active: true, respawnTimer: 0 });
  }
  return positions;
}

export function getStartPositions() {
  return [
    { x: TRACK.cx - 30, y: TRACK.cy + TRACK.outerRy - 40, angle: -Math.PI / 2 },
    { x: TRACK.cx + 30, y: TRACK.cy + TRACK.outerRy - 40, angle: -Math.PI / 2 },
    { x: TRACK.cx - 80, y: TRACK.cy + TRACK.outerRy - 20, angle: -Math.PI / 2 },
    { x: TRACK.cx + 80, y: TRACK.cy + TRACK.outerRy - 20, angle: -Math.PI / 2 },
  ];
}

export function drawTrack(ctx) {
  // Grass background
  ctx.fillStyle = "#1a4d1a";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Grass texture
  ctx.fillStyle = "#2d6a2d";
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * ctx.canvas.width;
    const y = Math.random() * ctx.canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }

  // Outer grass ring
  ctx.beginPath();
  ctx.ellipse(TRACK.cx, TRACK.cy, TRACK.outerRx + 30, TRACK.outerRy + 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3d8b3d";
  ctx.fill();

  // Track asphalt
  ctx.beginPath();
  ctx.ellipse(TRACK.cx, TRACK.cy, TRACK.outerRx, TRACK.outerRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3a3a3a";
  ctx.fill();

  // Inner grass
  ctx.beginPath();
  ctx.ellipse(TRACK.cx, TRACK.cy, TRACK.innerRx, TRACK.innerRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2d6a2d";
  ctx.fill();

  // Center decoration
  ctx.beginPath();
  ctx.ellipse(TRACK.cx, TRACK.cy, TRACK.innerRx - 40, TRACK.innerRy - 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3d8b3d";
  ctx.fill();

  // Track edge lines
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.setLineDash([15, 15]);
  ctx.beginPath();
  ctx.ellipse(TRACK.cx, TRACK.cy, (TRACK.outerRx + TRACK.innerRx) / 2, (TRACK.outerRy + TRACK.innerRy) / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Curbs (red/white)
  for (let i = 0; i < 32; i++) {
    const a1 = (i / 32) * Math.PI * 2;
    const a2 = ((i + 1) / 32) * Math.PI * 2;
    const color = i % 2 === 0 ? "#e63946" : "#ffffff";

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(
      TRACK.cx + Math.cos(a1) * TRACK.outerRx,
      TRACK.cy + Math.sin(a1) * TRACK.outerRy
    );
    ctx.lineTo(
      TRACK.cx + Math.cos(a2) * TRACK.outerRx,
      TRACK.cy + Math.sin(a2) * TRACK.outerRy
    );
    ctx.lineTo(
      TRACK.cx + Math.cos(a2) * (TRACK.outerRx - 8),
      TRACK.cy + Math.sin(a2) * (TRACK.outerRy - 8)
    );
    ctx.lineTo(
      TRACK.cx + Math.cos(a1) * (TRACK.outerRx - 8),
      TRACK.cy + Math.sin(a1) * (TRACK.outerRy - 8)
    );
    ctx.closePath();
    ctx.fill();
  }

  // Start/finish line
  const startY = TRACK.cy + TRACK.outerRy - 5;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(TRACK.cx - 50 + i * 10, startY - 15, 5, 30);
    ctx.fillStyle = i % 2 === 0 ? "#111" : "#fff";
  }
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("START", TRACK.cx, startY + 25);
}

export function drawItemBox(ctx, box) {
  if (!box.active) return;

  const pulse = Math.sin(Date.now() / 200) * 3;
  const size = 18 + pulse;

  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.rotate(Date.now() / 1000);

  // Box glow
  ctx.shadowColor = "#ffdd00";
  ctx.shadowBlur = 15;

  // Box body
  ctx.fillStyle = "#ff6b35";
  ctx.fillRect(-size / 2, -size / 2, size, size);

  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  ctx.strokeRect(-size / 2, -size / 2, size, size);

  // Question mark
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 0, 1);

  ctx.restore();
}

export function checkItemBoxCollision(kart, box) {
  if (!box.active) return false;
  return distance(kart.x, kart.y, box.x, box.y) < 28;
}
