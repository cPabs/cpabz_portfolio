import { Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { lerp } from '@/utils/math';
import { drawBone, drawCircle, drawEye, drawGlow } from '@/utils/drawing';

export interface SkeletonState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  headTilt: number;
  slump: number;       // 0 = standing, 1 = fully slumped
  eyeGlow: number;     // 0-1
  bobPhase: number;
  blinkTimer: number;
  blinkProgress: number;
  isAwake: boolean;
  followSpeed: number;
  scale: number;
}

export function createSkeleton(x: number, y: number): SkeletonState {
  return {
    x, y,
    targetX: x,
    targetY: y,
    headTilt: 0,
    slump: 1,
    eyeGlow: 0,
    bobPhase: 0,
    blinkTimer: 3 + Math.random() * 2,
    blinkProgress: 0,
    isAwake: false,
    followSpeed: 0.05,
    scale: 1,
  };
}

export function updateSkeleton(s: SkeletonState, dt: number, mousePos: Vec2 | null): SkeletonState {
  // Follow target
  if (s.isAwake && mousePos) {
    s.targetX = mousePos.x;
    s.targetY = mousePos.y;
  }
  s.x = lerp(s.x, s.targetX, s.followSpeed);
  s.y = lerp(s.y, s.targetY, s.followSpeed);

  // Bob
  s.bobPhase += dt * 2;

  // Blink
  s.blinkTimer -= dt;
  if (s.blinkTimer <= 0) {
    s.blinkProgress = 1;
    s.blinkTimer = 3 + Math.random() * 4;
  }
  if (s.blinkProgress > 0) {
    s.blinkProgress = Math.max(0, s.blinkProgress - dt * 8);
  }

  return s;
}

export function renderSkeleton(
  ctx: CanvasRenderingContext2D,
  s: SkeletonState,
  parts: { hasHeart: boolean; hasBrain: boolean; hasBody: boolean },
  lookAt: Vec2 | null
) {
  ctx.save();
  const bob = Math.sin(s.bobPhase) * 3 * (1 - s.slump * 0.5);
  const baseX = s.x;
  const baseY = s.y + bob;
  const sc = s.scale;
  const slumpOffset = s.slump * 20 * sc;

  // Body proportions (Pixar-style: big head, small body)
  const headRadius = 28 * sc;
  const headY = baseY - 70 * sc + slumpOffset;
  const shoulderY = headY + headRadius + 5 * sc;
  const hipY = shoulderY + 40 * sc;
  const shoulderWidth = 22 * sc;

  // Ribcage
  const ribColor = COLORS.bone;
  const boneWidth = 4 * sc;

  // Spine
  drawBone(ctx, baseX, shoulderY, baseX, hipY, boneWidth, COLORS.boneShadow);

  // Ribs (3 pairs with gaps)
  for (let i = 0; i < 3; i++) {
    const ribY = shoulderY + 8 * sc + i * 12 * sc;
    const ribW = (shoulderWidth - i * 3 * sc);
    drawBone(ctx, baseX - ribW, ribY, baseX + ribW, ribY, boneWidth * 0.7, ribColor);
  }

  // Heart (visible inside ribcage)
  if (parts.hasHeart) {
    const heartX = baseX - 2 * sc;
    const heartY = shoulderY + 18 * sc;
    const pulse = (Math.sin(s.bobPhase * 3) + 1) / 2;
    // Import directly to avoid circular
    const heartSize = 10 * sc * (1 + pulse * 0.08);
    drawGlow(ctx, heartX, heartY, 25 * sc, COLORS.heartGlow, 0.3 + pulse * 0.2);
    ctx.fillStyle = COLORS.heartRed;
    ctx.beginPath();
    ctx.moveTo(heartX, heartY + heartSize * 0.15);
    ctx.bezierCurveTo(
      heartX - heartSize * 0.5, heartY - heartSize * 0.3,
      heartX - heartSize, heartY + heartSize * 0.1,
      heartX, heartY + heartSize * 0.7
    );
    ctx.bezierCurveTo(
      heartX + heartSize, heartY + heartSize * 0.1,
      heartX + heartSize * 0.5, heartY - heartSize * 0.3,
      heartX, heartY + heartSize * 0.15
    );
    ctx.fill();
  }

  // Arms
  const armLen = 30 * sc;
  const armAngle = s.slump > 0.5 ? 0.3 : -0.2;
  // Left arm
  drawBone(ctx, baseX - shoulderWidth, shoulderY, baseX - shoulderWidth - armLen * 0.7, shoulderY + armLen, boneWidth, ribColor);
  // Right arm
  drawBone(ctx, baseX + shoulderWidth, shoulderY, baseX + shoulderWidth + armLen * 0.7, shoulderY + armLen, boneWidth, ribColor);

  // Legs
  const legLen = 35 * sc;
  // Left leg
  drawBone(ctx, baseX - 8 * sc, hipY, baseX - 14 * sc, hipY + legLen, boneWidth, ribColor);
  // Right leg
  drawBone(ctx, baseX + 8 * sc, hipY, baseX + 14 * sc, hipY + legLen, boneWidth, ribColor);

  // Head (oversized)
  // Skull
  ctx.fillStyle = COLORS.bone;
  ctx.beginPath();
  ctx.arc(baseX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  // Slight shadow
  ctx.fillStyle = COLORS.boneShadow;
  ctx.beginPath();
  ctx.arc(baseX, headY + 2 * sc, headRadius - 1, Math.PI * 0.1, Math.PI * 0.9);
  ctx.fill();

  // Brain glow (visible through top of skull)
  if (parts.hasBrain) {
    drawGlow(ctx, baseX, headY - 5 * sc, headRadius * 0.8, COLORS.brainPurple, 0.4);
    ctx.fillStyle = `rgba(167, 139, 250, 0.3)`;
    ctx.beginPath();
    ctx.arc(baseX - 5 * sc, headY - 5 * sc, 8 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(baseX + 5 * sc, headY - 5 * sc, 8 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes
  const eyeSpacing = 10 * sc;
  const eyeY = headY + 2 * sc;
  const eyeRadius = 5 * sc;
  const hasPupil = parts.hasBrain;

  drawEye(ctx, baseX - eyeSpacing, eyeY, eyeRadius, s.eyeGlow, lookAt, s.blinkProgress, COLORS.eyeGlow, hasPupil);
  drawEye(ctx, baseX + eyeSpacing, eyeY, eyeRadius, s.eyeGlow, lookAt, s.blinkProgress, COLORS.eyeGlow, hasPupil);

  // Mouth (small, simple)
  if (s.isAwake) {
    ctx.strokeStyle = COLORS.boneShadow;
    ctx.lineWidth = 1.5 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX - 6 * sc, headY + 12 * sc);
    ctx.quadraticCurveTo(baseX, headY + 14 * sc, baseX + 6 * sc, headY + 12 * sc);
    ctx.stroke();
  }

  ctx.restore();
}
