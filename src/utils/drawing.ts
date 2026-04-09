export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
  alpha: number = 0.5
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colorWithAlpha(color, alpha));
  gradient.addColorStop(0.5, colorWithAlpha(color, alpha * 0.4));
  gradient.addColorStop(1, colorWithAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth: number = 2
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function drawBone(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  width: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Joint circles at ends
  const jointRadius = width * 0.6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x1, y1, jointRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x2, y2, jointRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  color: string,
  glowColor: string,
  pulse: number = 0
) {
  const s = size * (1 + pulse * 0.1);
  ctx.save();
  ctx.translate(x, y);

  // Glow
  if (pulse > 0) {
    drawGlow(ctx, 0, 0, s * 3, glowColor, 0.3 + pulse * 0.2);
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, -s * 0.1, -s, s * 0.3);
  ctx.bezierCurveTo(-s, s * 0.7, 0, s, 0, s * 1.2);
  ctx.bezierCurveTo(0, s, s, s * 0.7, s, s * 0.3);
  ctx.bezierCurveTo(s, -s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
  ctx.fill();

  // Mechanical detail lines
  ctx.strokeStyle = colorWithAlpha('#94a3b8', 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, s * 0.3);
  ctx.lineTo(s * 0.3, s * 0.3);
  ctx.moveTo(0, s * 0.1);
  ctx.lineTo(0, s * 0.8);
  ctx.stroke();

  ctx.restore();
}

export function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  glowIntensity: number,
  lookAt: { x: number; y: number } | null,
  blinkProgress: number,
  glowColor: string,
  hasPupil: boolean = false
) {
  ctx.save();

  // Glow behind eye
  if (glowIntensity > 0) {
    drawGlow(ctx, x, y, radius * 4, glowColor, glowIntensity * 0.6);
  }

  // Eye white / socket
  const eyeHeight = radius * 2 * (1 - blinkProgress);
  if (eyeHeight > 0.5) {
    ctx.fillStyle = glowIntensity > 0
      ? colorWithAlpha(glowColor, 0.3 + glowIntensity * 0.7)
      : '#1e293b';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, eyeHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    if (hasPupil && lookAt) {
      const maxOffset = radius * 0.4;
      const angle = Math.atan2(lookAt.y - y, lookAt.x - x);
      const dist = Math.min(maxOffset, radius * 0.3);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Pupil highlight
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(px - radius * 0.15, py - radius * 0.15, radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawBrain(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  glowColor: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer glow
  drawGlow(ctx, x, y, size * 2, glowColor, 0.4);

  // Brain blob shape
  ctx.fillStyle = colorWithAlpha(glowColor, 0.6);
  ctx.beginPath();
  // Left hemisphere
  ctx.arc(x - size * 0.2, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Right hemisphere
  ctx.beginPath();
  ctx.arc(x + size * 0.2, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Neural line pattern
  ctx.strokeStyle = colorWithAlpha('#818cf8', 0.5);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const startX = x - size * 0.4 + i * size * 0.2;
    ctx.moveTo(startX, y - size * 0.3);
    ctx.quadraticCurveTo(
      startX + size * 0.1 * (i % 2 === 0 ? 1 : -1),
      y,
      startX,
      y + size * 0.3
    );
    ctx.stroke();
  }

  ctx.restore();
}

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  intensity: number = 0.7
) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.7;
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

export function drawSpeechLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  progress: number,
  color: string
) {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const endX = x1 + (x2 - x1) * progress;
  const endY = y1 + (y2 - y1) * progress;

  ctx.save();
  const gradient = ctx.createLinearGradient(x1, y1, endX, endY);
  gradient.addColorStop(0, colorWithAlpha(color, 0));
  gradient.addColorStop(0.5, colorWithAlpha(color, 0.8));
  gradient.addColorStop(1, colorWithAlpha(color, 1));
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
}
