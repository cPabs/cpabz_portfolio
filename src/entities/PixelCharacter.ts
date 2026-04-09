// Lightweight 2D pixel-art character renderer
// Roblox/Minecraft/retro-game inspired — blocky, cute, minimal

import { colorWithAlpha } from '@/utils/drawing';

export interface PixelPersonState {
  x: number;
  y: number;
  direction: 1 | -1;       // 1 = right, -1 = left
  walkFrame: number;        // 0-3 walk cycle
  walkTimer: number;
  speed: number;
  currentSpeed: number;
  scale: number;
  color: string;            // shirt/body color
  skinColor: string;
  hairColor: string;
  prop: 'none' | 'briefcase' | 'laptop' | 'phone';
  alpha: number;
}

const PIXEL = 2; // base pixel size

export function createPixelPerson(x: number, y: number, scale: number = 1): PixelPersonState {
  const colors = ['#6366f1', '#3b82f6', '#8b5cf6', '#06b6d4', '#64748b', '#475569', '#6b7280', '#4b5563'];
  const skins = ['#fbbf8c', '#f5d0a9', '#d4a574', '#c68c5c', '#e8c4a0'];
  const hairs = ['#1e293b', '#78350f', '#92400e', '#451a03', '#334155', '#57534e'];

  return {
    x, y,
    direction: Math.random() > 0.5 ? 1 : -1,
    walkFrame: Math.floor(Math.random() * 4),
    walkTimer: Math.random() * 0.3,
    speed: 20 + Math.random() * 30,
    currentSpeed: 20 + Math.random() * 30,
    scale,
    color: colors[Math.floor(Math.random() * colors.length)],
    skinColor: skins[Math.floor(Math.random() * skins.length)],
    hairColor: hairs[Math.floor(Math.random() * hairs.length)],
    prop: (['none', 'none', 'briefcase', 'laptop', 'phone'] as const)[Math.floor(Math.random() * 5)],
    alpha: 1,
  };
}

export function updatePixelPerson(p: PixelPersonState, dt: number) {
  // Walk animation
  p.walkTimer += dt;
  if (p.walkTimer > 0.15 / Math.max(p.currentSpeed / 30, 0.1)) {
    p.walkTimer = 0;
    p.walkFrame = (p.walkFrame + 1) % 4;
  }

  // Move
  p.x += p.currentSpeed * p.direction * dt;
}

export function renderPixelPerson(ctx: CanvasRenderingContext2D, p: PixelPersonState) {
  const s = PIXEL * p.scale;
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  const dir = p.direction;

  ctx.save();
  ctx.globalAlpha = p.alpha;

  // Leg animation offsets
  const legOffset = [0, 1, 0, -1][p.walkFrame] * s;
  const armSwing = [1, 0, -1, 0][p.walkFrame] * s;

  // === LEGS ===
  // Left leg
  ctx.fillStyle = '#1e293b'; // dark pants
  ctx.fillRect(x - 2 * s, y - legOffset, 2 * s, 5 * s);
  // Right leg
  ctx.fillRect(x + 0 * s, y + legOffset, 2 * s, 5 * s);
  // Shoes
  ctx.fillStyle = '#374151';
  ctx.fillRect(x - 2 * s, y + 4 * s - legOffset, 2 * s, s);
  ctx.fillRect(x + 0 * s, y + 4 * s + legOffset, 2 * s, s);

  // === BODY ===
  ctx.fillStyle = p.color;
  ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, 6 * s);

  // === ARMS ===
  ctx.fillStyle = p.skinColor;
  // Left arm
  ctx.fillRect(x - 4 * s, y - 5 * s + armSwing, s, 4 * s);
  // Right arm
  ctx.fillRect(x + 3 * s, y - 5 * s - armSwing, s, 4 * s);

  // === PROP ===
  if (p.prop === 'briefcase') {
    ctx.fillStyle = '#92400e';
    const propHand = dir > 0 ? x + 3 * s : x - 4 * s;
    ctx.fillRect(propHand, y - 2 * s - armSwing * dir, 2 * s, 2 * s);
  } else if (p.prop === 'laptop') {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 2 * s, y - 7 * s, 4 * s, s);
  } else if (p.prop === 'phone') {
    const propHand = dir > 0 ? x + 3 * s : x - 5 * s;
    ctx.fillStyle = '#334155';
    ctx.fillRect(propHand + s * 0.5, y - 8 * s, s, 2 * s);
  }

  // === HEAD ===
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 4 * s);

  // Hair
  ctx.fillStyle = p.hairColor;
  ctx.fillRect(x - 2 * s, y - 11 * s, 4 * s, 2 * s);
  if (dir > 0) {
    ctx.fillRect(x - 2 * s, y - 10 * s, s, s);
  } else {
    ctx.fillRect(x + s, y - 10 * s, s, s);
  }

  // Eye
  ctx.fillStyle = '#0f172a';
  if (dir > 0) {
    ctx.fillRect(x + s, y - 9 * s, s, s);
  } else {
    ctx.fillRect(x - 2 * s, y - 9 * s, s, s);
  }

  ctx.restore();
}

// === PIXEL SKELETON (the protagonist) ===

export interface PixelSkeletonState {
  x: number;
  y: number;
  eyeGlow: number;       // 0-1
  headTilt: number;       // 0 = down, 1 = up
  slump: number;          // 0 = upright, 1 = slouched
  bobPhase: number;
  scale: number;
  isAwake: boolean;
  breathPhase: number;
}

export function createPixelSkeleton(x: number, y: number): PixelSkeletonState {
  return {
    x, y,
    eyeGlow: 0,
    headTilt: 0,
    slump: 1,
    bobPhase: 0,
    scale: 2.5,
    isAwake: false,
    breathPhase: 0,
  };
}

export function renderPixelSkeleton(ctx: CanvasRenderingContext2D, sk: PixelSkeletonState) {
  const s = PIXEL * sk.scale;
  const x = Math.floor(sk.x);
  const y = Math.floor(sk.y);
  const slumpY = sk.slump * 4 * s;

  ctx.save();

  const boneColor = '#e8e0d4';
  const boneDark = '#c4b8a8';

  // Sitting pose — legs extended forward
  // Left leg
  ctx.fillStyle = boneColor;
  ctx.fillRect(x - 2 * s, y + slumpY, 2 * s, s); // thigh (horizontal)
  ctx.fillRect(x - 2 * s, y + s + slumpY, s, 3 * s); // shin (down)
  // Right leg
  ctx.fillRect(x + 0 * s, y + slumpY, 2 * s, s);
  ctx.fillRect(x + s, y + s + slumpY, s, 3 * s);
  // Joints
  ctx.fillStyle = boneDark;
  ctx.fillRect(x - 2 * s, y + s + slumpY, s, s); // left knee
  ctx.fillRect(x + s, y + s + slumpY, s, s); // right knee

  // Spine
  ctx.fillStyle = boneDark;
  ctx.fillRect(x - s * 0.5, y - 5 * s + slumpY, s, 5 * s);

  // Ribs (3 pairs)
  ctx.fillStyle = boneColor;
  for (let i = 0; i < 3; i++) {
    const ribY = y - 4 * s + i * 1.5 * s + slumpY;
    ctx.fillRect(x - 3 * s, ribY, 2 * s, s * 0.7);
    ctx.fillRect(x + s, ribY, 2 * s, s * 0.7);
  }

  // Arms (hanging when slumped, slightly out when awake)
  const armDrop = sk.slump * 2 * s;
  ctx.fillStyle = boneColor;
  // Left arm
  ctx.fillRect(x - 4 * s, y - 4 * s + slumpY + armDrop, s, 4 * s);
  ctx.fillRect(x - 4 * s, y + slumpY + armDrop, s, s); // hand
  // Right arm
  ctx.fillRect(x + 3 * s, y - 4 * s + slumpY + armDrop, s, 4 * s);
  ctx.fillRect(x + 3 * s, y + slumpY + armDrop, s, s);

  // Head (big, Pixar/retro proportions)
  const headY = y - 10 * s + slumpY + (1 - sk.headTilt) * 2 * s;
  ctx.fillStyle = boneColor;
  ctx.fillRect(x - 3 * s, headY, 6 * s, 5 * s);
  // Skull top (rounded look with extra pixels)
  ctx.fillRect(x - 2 * s, headY - s, 4 * s, s);

  // Jaw
  ctx.fillStyle = boneDark;
  ctx.fillRect(x - 2 * s, headY + 4 * s, 4 * s, s);

  // Eyes
  if (sk.eyeGlow > 0) {
    // Glowing eyes
    const glowAlpha = sk.eyeGlow;
    ctx.fillStyle = colorWithAlpha('#7dd3fc', glowAlpha);
    ctx.fillRect(x - 2 * s, headY + 1.5 * s, 1.5 * s, 1.5 * s);
    ctx.fillRect(x + 0.5 * s, headY + 1.5 * s, 1.5 * s, 1.5 * s);

    // Eye glow aura
    if (glowAlpha > 0.3) {
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur = 8 * glowAlpha * sk.scale;
      ctx.fillRect(x - 2 * s, headY + 1.5 * s, 1.5 * s, 1.5 * s);
      ctx.fillRect(x + 0.5 * s, headY + 1.5 * s, 1.5 * s, 1.5 * s);
      ctx.shadowBlur = 0;
    }
  } else {
    // Dark eye sockets
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 2 * s, headY + 1.5 * s, 1.5 * s, 1.5 * s);
    ctx.fillRect(x + 0.5 * s, headY + 1.5 * s, 1.5 * s, 1.5 * s);
  }

  // Mouth (small, depends on awake state)
  if (sk.isAwake) {
    ctx.fillStyle = boneDark;
    ctx.fillRect(x - s, headY + 3.5 * s, 2 * s, 0.5 * s);
  }

  ctx.restore();
}
