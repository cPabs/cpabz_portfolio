import { Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { lerp } from '@/utils/math';
import { drawCircle, drawGlow, drawEye, drawRoundedRect } from '@/utils/drawing';

export interface HumanCharacterState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  bobPhase: number;
  blinkTimer: number;
  blinkProgress: number;
  breathPhase: number;
  followSpeed: number;
  scale: number;
  heartPulse: number;
  brainGlow: number;
  soulGlow: number;
  formProgress: number; // 0 = skeleton, 1 = fully human
}

export function createHumanCharacter(x: number, y: number): HumanCharacterState {
  return {
    x, y,
    targetX: x,
    targetY: y,
    bobPhase: 0,
    blinkTimer: 3,
    blinkProgress: 0,
    breathPhase: 0,
    followSpeed: 0.05,
    scale: 1,
    heartPulse: 0,
    brainGlow: 0,
    soulGlow: 0,
    formProgress: 0,
  };
}

export function updateHumanCharacter(ch: HumanCharacterState, dt: number, mousePos: Vec2 | null): HumanCharacterState {
  if (mousePos) {
    ch.targetX = mousePos.x;
    ch.targetY = mousePos.y;
  }
  ch.x = lerp(ch.x, ch.targetX, ch.followSpeed);
  ch.y = lerp(ch.y, ch.targetY, ch.followSpeed);

  ch.bobPhase += dt * 2;
  ch.breathPhase += dt * 1.5;
  ch.heartPulse = (Math.sin(ch.bobPhase * 3) + 1) / 2;

  // Blink
  ch.blinkTimer -= dt;
  if (ch.blinkTimer <= 0) {
    ch.blinkProgress = 1;
    ch.blinkTimer = 2.5 + Math.random() * 4;
  }
  if (ch.blinkProgress > 0) {
    ch.blinkProgress = Math.max(0, ch.blinkProgress - dt * 8);
  }

  return ch;
}

export function renderHumanCharacter(
  ctx: CanvasRenderingContext2D,
  ch: HumanCharacterState,
  lookAt: Vec2 | null
) {
  ctx.save();
  const bob = Math.sin(ch.bobPhase) * 2;
  const breathScale = 1 + Math.sin(ch.breathPhase) * 0.01;
  const baseX = ch.x;
  const baseY = ch.y + bob;
  const sc = ch.scale;
  const fp = ch.formProgress;

  // Body proportions (Pixar: big head, rounded body)
  const headRadius = 30 * sc;
  const headY = baseY - 75 * sc;
  const bodyTop = headY + headRadius + 2 * sc;
  const bodyWidth = 32 * sc * breathScale;
  const bodyHeight = 42 * sc;
  const hipY = bodyTop + bodyHeight;

  // Soul aura
  if (ch.soulGlow > 0) {
    drawGlow(ctx, baseX, baseY - 40 * sc, 90 * sc, COLORS.soulLight, ch.soulGlow * 0.15);
  }

  // Legs
  const legWidth = 12 * sc;
  const legHeight = 32 * sc;
  const legGap = 4 * sc;

  // Left leg
  ctx.fillStyle = lerpColor(COLORS.bone, '#5b7a9e', fp);
  drawRoundedRect(ctx, baseX - legGap - legWidth, hipY, legWidth, legHeight, 6 * sc);
  ctx.fill();
  // Right leg
  drawRoundedRect(ctx, baseX + legGap, hipY, legWidth, legHeight, 6 * sc);
  ctx.fill();

  // Shoes
  ctx.fillStyle = lerpColor(COLORS.boneShadow, '#374151', fp);
  drawRoundedRect(ctx, baseX - legGap - legWidth - 2 * sc, hipY + legHeight - 4 * sc, legWidth + 6 * sc, 8 * sc, 4 * sc);
  ctx.fill();
  drawRoundedRect(ctx, baseX + legGap - 4 * sc, hipY + legHeight - 4 * sc, legWidth + 6 * sc, 8 * sc, 4 * sc);
  ctx.fill();

  // Body
  const skinColor = lerpColor(COLORS.bone, COLORS.skinTone, fp);
  const shirtColor = lerpColor(COLORS.boneShadow, '#6366f1', fp);
  ctx.fillStyle = shirtColor;
  drawRoundedRect(ctx, baseX - bodyWidth, bodyTop, bodyWidth * 2, bodyHeight, 12 * sc);
  ctx.fill();

  // Heart glow through body
  if (ch.heartPulse > 0) {
    const hx = baseX - 4 * sc;
    const hy = bodyTop + 15 * sc;
    drawGlow(ctx, hx, hy, 20 * sc, COLORS.heartGlow, 0.15 + ch.heartPulse * 0.1);
  }

  // Arms
  const armWidth = 10 * sc;
  const armHeight = 34 * sc;
  ctx.fillStyle = skinColor;
  // Left arm
  drawRoundedRect(ctx, baseX - bodyWidth - armWidth - 2 * sc, bodyTop + 4 * sc, armWidth, armHeight, 5 * sc);
  ctx.fill();
  // Right arm
  drawRoundedRect(ctx, baseX + bodyWidth + 2 * sc, bodyTop + 4 * sc, armWidth, armHeight, 5 * sc);
  ctx.fill();

  // Hands
  const handRadius = 5 * sc;
  drawCircle(ctx, baseX - bodyWidth - armWidth / 2 - 2 * sc, bodyTop + 4 * sc + armHeight, handRadius, skinColor);
  drawCircle(ctx, baseX + bodyWidth + armWidth / 2 + 2 * sc, bodyTop + 4 * sc + armHeight, handRadius, skinColor);

  // Head
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(baseX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = lerpColor(COLORS.boneShadow, '#1e293b', fp);
  ctx.beginPath();
  ctx.arc(baseX, headY - 4 * sc, headRadius + 2 * sc, Math.PI * 1.1, Math.PI * 1.9);
  ctx.quadraticCurveTo(baseX + headRadius + 5 * sc, headY - 15 * sc, baseX + headRadius - 2 * sc, headY);
  ctx.fill();

  // Brain glow (subtle through hair)
  if (ch.brainGlow > 0) {
    drawGlow(ctx, baseX, headY - 8 * sc, headRadius * 0.5, COLORS.brainPurple, ch.brainGlow * 0.2);
  }

  // Eyes
  const eyeSpacing = 10 * sc;
  const eyeY = headY + 2 * sc;
  const eyeRadius = 5.5 * sc;

  // Eye whites
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(baseX - eyeSpacing, eyeY, eyeRadius, eyeRadius * (1 - ch.blinkProgress), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(baseX + eyeSpacing, eyeY, eyeRadius, eyeRadius * (1 - ch.blinkProgress), 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  if (ch.blinkProgress < 0.8 && lookAt) {
    const maxOffset = eyeRadius * 0.3;
    const angle = Math.atan2(lookAt.y - eyeY, lookAt.x - baseX);
    const dist = Math.min(maxOffset, eyeRadius * 0.25);
    const pupilSize = 3 * sc;

    for (const side of [-1, 1]) {
      const ex = baseX + side * eyeSpacing;
      const px = ex + Math.cos(angle) * dist;
      const py = eyeY + Math.sin(angle) * dist;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(px, py, pupilSize, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(px - 1 * sc, py - 1 * sc, 1.2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Nose (tiny)
  ctx.fillStyle = lerpColor(COLORS.bone, COLORS.skinToneShadow, fp);
  ctx.beginPath();
  ctx.arc(baseX, headY + 8 * sc, 2.5 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (gentle smile)
  ctx.strokeStyle = lerpColor(COLORS.boneShadow, '#92400e', fp);
  ctx.lineWidth = 1.8 * sc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseX - 7 * sc, headY + 14 * sc);
  ctx.quadraticCurveTo(baseX, headY + 18 * sc, baseX + 7 * sc, headY + 14 * sc);
  ctx.stroke();

  // Cheek blush (when soul is present)
  if (ch.soulGlow > 0) {
    ctx.fillStyle = `rgba(251, 113, 133, ${ch.soulGlow * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(baseX - 16 * sc, headY + 8 * sc, 5 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(baseX + 16 * sc, headY + 8 * sc, 5 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function lerpColor(a: string, b: string, t: number): string {
  const parseHex = (hex: string) => {
    const c = hex.replace('#', '');
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const blue = Math.round(lerp(ab, bb, t));
  return `rgb(${r},${g},${blue})`;
}
