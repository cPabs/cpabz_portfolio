// Minecraft-style 2D pixel characters — blocky, chunky, 3/4 isometric view
// Characters scale relative to viewport for consistent cross-device sizing

import { colorWithAlpha } from '@/utils/drawing';

// Character types inspired by Minecraft mobs
export type CharacterType = 'steve' | 'villager' | 'zombie' | 'suit' | 'worker';

const CHARACTER_TYPES: Record<CharacterType, {
  headColor: string; headSide: string;
  bodyColor: string; bodySide: string;
  legColor: string; legSide: string;
  armColor: string;
  skinColor: string;
  eyeColor: string;
  hasNose?: boolean;
  armsForward?: boolean;
  hatColor?: string;
}> = {
  steve: {
    headColor: '#c69c6d', headSide: '#a07850',
    bodyColor: '#00a8a8', bodySide: '#008888',
    legColor: '#2a2a7f', legSide: '#1e1e60',
    armColor: '#c69c6d',
    skinColor: '#c69c6d', eyeColor: '#1e293b',
  },
  villager: {
    headColor: '#c69c6d', headSide: '#a07850',
    bodyColor: '#7a5230', bodySide: '#5c3d20',
    legColor: '#7a5230', legSide: '#5c3d20',
    armColor: '#7a5230',
    skinColor: '#c69c6d', eyeColor: '#1e293b',
    hasNose: true,
  },
  zombie: {
    headColor: '#5b8731', headSide: '#4a6e28',
    bodyColor: '#00a8a8', bodySide: '#008888',
    legColor: '#2a2a7f', legSide: '#1e1e60',
    armColor: '#5b8731',
    skinColor: '#5b8731', eyeColor: '#0f0f0f',
    armsForward: true,
  },
  suit: {
    headColor: '#c69c6d', headSide: '#a07850',
    bodyColor: '#1e293b', bodySide: '#0f172a',
    legColor: '#1e293b', legSide: '#0f172a',
    armColor: '#1e293b',
    skinColor: '#c69c6d', eyeColor: '#1e293b',
  },
  worker: {
    headColor: '#c69c6d', headSide: '#a07850',
    bodyColor: '#d97706', bodySide: '#b45309',
    legColor: '#44403c', legSide: '#292524',
    armColor: '#d97706',
    skinColor: '#c69c6d', eyeColor: '#1e293b',
    hatColor: '#eab308',
  },
};

export interface PixelPersonState {
  x: number;
  y: number;
  direction: 1 | -1;
  walkFrame: number;
  walkTimer: number;
  speed: number;
  currentSpeed: number;
  scale: number;
  type: CharacterType;
  prop: 'none' | 'briefcase' | 'laptop' | 'phone' | 'coffee';
  alpha: number;
}

// Base unit: 1u = viewport-relative pixel
function getUnit(viewportHeight: number): number {
  return Math.max(2, Math.floor(viewportHeight * 0.004));
}

export function createPixelPerson(x: number, y: number, scale: number, viewportHeight: number): PixelPersonState {
  const types: CharacterType[] = ['steve', 'steve', 'villager', 'zombie', 'suit', 'worker', 'steve', 'zombie'];
  const props: PixelPersonState['prop'][] = ['none', 'none', 'none', 'briefcase', 'laptop', 'phone', 'coffee'];

  return {
    x, y,
    direction: Math.random() > 0.5 ? 1 : -1,
    walkFrame: Math.floor(Math.random() * 4),
    walkTimer: Math.random() * 0.3,
    speed: 15 + Math.random() * 25,
    currentSpeed: 15 + Math.random() * 25,
    scale,
    type: types[Math.floor(Math.random() * types.length)],
    prop: props[Math.floor(Math.random() * props.length)],
    alpha: 1,
  };
}

export function updatePixelPerson(p: PixelPersonState, dt: number) {
  p.walkTimer += dt;
  const animSpeed = Math.max(p.currentSpeed / 20, 0.05);
  if (p.walkTimer > 0.18 / animSpeed) {
    p.walkTimer = 0;
    p.walkFrame = (p.walkFrame + 1) % 4;
  }
  p.x += p.currentSpeed * p.direction * dt;
}

export function renderPixelPerson(ctx: CanvasRenderingContext2D, p: PixelPersonState, viewportHeight: number) {
  const u = getUnit(viewportHeight) * p.scale;
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  const t = CHARACTER_TYPES[p.type];
  const dir = p.direction; // 1 = walking right, -1 = walking left

  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.imageSmoothingEnabled = false;

  // Walk animation
  const legSwing = [0, 1, 0, -1][p.walkFrame];
  const armSwing = [1, 0, -1, 0][p.walkFrame];

  // Character is drawn as SIDE PROFILE facing their walk direction
  // Body depth (thin from side view)
  const bodyDepth = u * 3;  // side-view body width (narrower than front)
  const headSize = u * 5;
  const legW = u * 1.8;
  const legH = u * 5;
  const bodyH = u * 5;
  const armW = u * 1.5;
  const armH = u * 5;

  // Flip everything based on direction
  const cx = x; // center x

  // === SHADOW ===
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, y + u * 0.5, u * 3, u * 1, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyY = y - legH - bodyH;
  const armY = bodyY + u * 0.5;

  // === BACK ARM (behind body, swings opposite to front) ===
  if (!t.armsForward) {
    ctx.fillStyle = t.bodySide; // darker to show depth
    const backArmX = dir > 0 ? cx - bodyDepth * 0.3 : cx + bodyDepth * 0.3 - armW;
    ctx.fillRect(backArmX, armY - armSwing * u * 1.5, armW, armH);
  }

  // === BACK LEG ===
  ctx.fillStyle = t.legSide;
  const backLegX = dir > 0 ? cx - bodyDepth * 0.2 : cx + bodyDepth * 0.2 - legW;
  ctx.fillRect(backLegX, y - legH + legSwing * u * 1.5, legW, legH);

  // === BODY (side profile — narrower) ===
  ctx.fillStyle = t.bodyColor;
  ctx.fillRect(cx - bodyDepth * 0.5, bodyY, bodyDepth, bodyH);
  // Depth shading on trailing side
  ctx.fillStyle = t.bodySide;
  if (dir > 0) {
    ctx.fillRect(cx - bodyDepth * 0.5, bodyY, u * 0.8, bodyH);
  } else {
    ctx.fillRect(cx + bodyDepth * 0.5 - u * 0.8, bodyY, u * 0.8, bodyH);
  }

  // === FRONT LEG ===
  ctx.fillStyle = t.legColor;
  const frontLegX = dir > 0 ? cx : cx - legW;
  ctx.fillRect(frontLegX, y - legH - legSwing * u * 1.5, legW, legH);
  // Shoe
  ctx.fillStyle = '#374151';
  ctx.fillRect(frontLegX + (dir > 0 ? 0 : -u * 0.5), y - u * 0.5 - legSwing * u * 1.5, legW + u * 0.5, u * 1);
  ctx.fillRect(backLegX + (dir > 0 ? 0 : -u * 0.5), y - u * 0.5 + legSwing * u * 1.5, legW + u * 0.5, u * 1);

  // === FRONT ARM + PROP ===
  if (t.armsForward) {
    // Zombie: arms extended forward in walk direction
    ctx.fillStyle = t.armColor;
    const zombieArmX = dir > 0 ? cx + bodyDepth * 0.3 : cx - bodyDepth * 0.3 - u * 4;
    ctx.fillRect(zombieArmX, armY, u * 4, u * 1.5);
    ctx.fillRect(zombieArmX, armY + u * 1.5, u * 1.2, u * 1.5); // upper arm
  } else {
    ctx.fillStyle = t.armColor;
    const frontArmX = dir > 0 ? cx + bodyDepth * 0.1 : cx - bodyDepth * 0.1 - armW;
    ctx.fillRect(frontArmX, armY + armSwing * u * 1.5, armW, armH);

    // Prop in front hand
    if (p.prop === 'briefcase') {
      ctx.fillStyle = '#78350f';
      const px = dir > 0 ? cx + bodyDepth * 0.3 : cx - bodyDepth * 0.3 - u * 2.5;
      const py = armY + armH * 0.5 + armSwing * u * 1.5;
      ctx.fillRect(px, py, u * 2.5, u * 2);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(px + u * 0.3, py + u * 0.3, u * 1.9, u * 1.4);
    } else if (p.prop === 'phone') {
      const px = dir > 0 ? cx + bodyDepth * 0.2 : cx - bodyDepth * 0.2 - u * 1.2;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px, armY - u * 1, u * 1.2, u * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px + u * 0.15, armY - u * 0.7, u * 0.9, u * 1.2);
    } else if (p.prop === 'laptop') {
      ctx.fillStyle = '#475569';
      const px = dir > 0 ? cx - u : cx - u * 2;
      ctx.fillRect(px, bodyY - u * 0.5, u * 3, u * 0.7);
    } else if (p.prop === 'coffee') {
      const px = dir > 0 ? cx + bodyDepth * 0.2 : cx - bodyDepth * 0.2 - u * 1.5;
      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(px, armY + u * 0.5 + armSwing * u, u * 1.5, u * 2);
    }
  }

  // === HEAD (side profile — shows face direction) ===
  const headY = bodyY - headSize - u * 0.5;

  // Back of head (hair/dark side)
  ctx.fillStyle = t.headSide;
  ctx.fillRect(cx - headSize * 0.4, headY, headSize * 0.8, headSize);

  // Face side (skin, facing walk direction)
  ctx.fillStyle = t.headColor;
  if (dir > 0) {
    ctx.fillRect(cx - headSize * 0.1, headY, headSize * 0.5, headSize);
  } else {
    ctx.fillRect(cx - headSize * 0.4, headY, headSize * 0.5, headSize);
  }

  // Hat (worker)
  if (t.hatColor) {
    ctx.fillStyle = t.hatColor;
    const brimExtra = dir > 0 ? u * 1 : -u * 1;
    ctx.fillRect(cx - headSize * 0.45, headY - u * 1.5, headSize * 0.9 + Math.abs(brimExtra), u * 2);
    ctx.fillRect(cx - headSize * 0.35, headY - u * 2.3, headSize * 0.7, u * 1);
  }

  // Eye (single eye visible from side profile, on the face side)
  ctx.fillStyle = t.eyeColor;
  const eyeY = headY + headSize * 0.35;
  const eyeSize = u * 1;
  if (dir > 0) {
    ctx.fillRect(cx + headSize * 0.15, eyeY, eyeSize, eyeSize);
    // White highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + headSize * 0.15 + u * 0.2, eyeY, u * 0.3, u * 0.3);
  } else {
    ctx.fillRect(cx - headSize * 0.15 - eyeSize, eyeY, eyeSize, eyeSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - headSize * 0.15 - eyeSize + u * 0.2, eyeY, u * 0.3, u * 0.3);
  }

  // Nose (villager — sticks out in front)
  if (t.hasNose) {
    ctx.fillStyle = t.skinColor;
    const noseX = dir > 0 ? cx + headSize * 0.35 : cx - headSize * 0.35 - u * 0.8;
    ctx.fillRect(noseX, eyeY + u * 0.8, u * 0.8, u * 1.5);
  }

  // Hair (top of head + back)
  if (!t.hatColor && p.type !== 'zombie') {
    ctx.fillStyle = '#3b2507';
    ctx.fillRect(cx - headSize * 0.4, headY, headSize * 0.8, u * 1.5);
    // Hair on back of head
    if (dir > 0) {
      ctx.fillRect(cx - headSize * 0.4, headY, u * 1.2, headSize * 0.7);
    } else {
      ctx.fillRect(cx + headSize * 0.4 - u * 1.2, headY, u * 1.2, headSize * 0.7);
    }
  }

  ctx.restore();
}

// === PIXEL SKELETON (Minecraft skeleton style, bigger) ===

export interface PixelSkeletonState {
  x: number;
  y: number;
  eyeGlow: number;
  headTilt: number;
  slump: number;
  bobPhase: number;
  scale: number;
  isAwake: boolean;
  breathPhase: number;
}

export function createPixelSkeleton(x: number, y: number, viewportHeight: number): PixelSkeletonState {
  return {
    x, y,
    eyeGlow: 0,
    headTilt: 0,
    slump: 1,
    bobPhase: 0,
    scale: 1.4,
    isAwake: false,
    breathPhase: 0,
  };
}

export function renderPixelSkeleton(ctx: CanvasRenderingContext2D, sk: PixelSkeletonState, viewportHeight: number) {
  const u = getUnit(viewportHeight) * sk.scale;
  const x = Math.floor(sk.x);
  const y = Math.floor(sk.y);
  const slumpPx = sk.slump * u * 4;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const bone = '#ddd8cc';
  const boneDark = '#b8b0a0';
  const boneLight = '#f0ece4';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + u, u * 5, u * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // === LEGS (sitting — extended forward) ===
  ctx.fillStyle = bone;
  // Left thigh (angled forward)
  ctx.fillRect(x - u * 2.5, y - u * 1 + slumpPx, u * 2, u * 1.5);
  ctx.fillRect(x - u * 3.5, y - u * 2 + slumpPx, u * 1.5, u * 1.5); // shin out
  // Right thigh
  ctx.fillRect(x + u * 0.5, y - u * 1 + slumpPx, u * 2, u * 1.5);
  ctx.fillRect(x + u * 2, y - u * 2 + slumpPx, u * 1.5, u * 1.5);
  // Joints
  ctx.fillStyle = boneDark;
  ctx.fillRect(x - u * 2.5, y - u * 0.5 + slumpPx, u * 0.8, u * 0.8);
  ctx.fillRect(x + u * 1.8, y - u * 0.5 + slumpPx, u * 0.8, u * 0.8);

  // === BODY (ribcage — gaps between ribs) ===
  const bodyY = y - u * 7 + slumpPx;

  // Spine
  ctx.fillStyle = boneDark;
  ctx.fillRect(x - u * 0.4, bodyY, u * 0.8, u * 6);

  // Ribs (3 pairs with visible gaps)
  ctx.fillStyle = bone;
  for (let i = 0; i < 3; i++) {
    const ribY = bodyY + u * 0.8 + i * u * 1.8;
    // Left rib
    ctx.fillRect(x - u * 3, ribY, u * 2.6, u * 1);
    // Right rib
    ctx.fillRect(x + u * 0.4, ribY, u * 2.6, u * 1);
  }

  // === ARMS (hanging down beside body) ===
  ctx.fillStyle = bone;
  const armDrop = sk.slump * u * 2;
  // Left arm
  ctx.fillRect(x - u * 4, bodyY + u + armDrop, u * 1.2, u * 5);
  // Left hand
  ctx.fillStyle = boneLight;
  ctx.fillRect(x - u * 4, bodyY + u * 5.5 + armDrop, u * 1.5, u * 1.5);
  // Right arm
  ctx.fillStyle = bone;
  ctx.fillRect(x + u * 2.8, bodyY + u + armDrop, u * 1.2, u * 5);
  ctx.fillStyle = boneLight;
  ctx.fillRect(x + u * 2.5, bodyY + u * 5.5 + armDrop, u * 1.5, u * 1.5);

  // === HEAD (big blocky skull) ===
  const headSize = u * 6;
  const headY = bodyY - headSize - u * 0.5 + (1 - sk.headTilt) * u * 2;

  // Skull back / side
  ctx.fillStyle = boneDark;
  ctx.fillRect(x + headSize * 0.4, headY + u * 0.5, u * 2, headSize - u);

  // Skull front
  ctx.fillStyle = bone;
  ctx.fillRect(x - headSize * 0.45, headY, headSize * 0.9, headSize);

  // Top of skull (slightly wider)
  ctx.fillStyle = boneLight;
  ctx.fillRect(x - headSize * 0.35, headY - u * 0.5, headSize * 0.7, u * 1.5);

  // Eyes
  const eyeY = headY + headSize * 0.3;
  const eyeW = u * 1.3;
  const eyeH = u * 1.3;

  if (sk.eyeGlow > 0) {
    // Glowing cyan eyes
    const gc = colorWithAlpha('#7dd3fc', sk.eyeGlow);
    ctx.fillStyle = gc;
    ctx.fillRect(x - headSize * 0.25, eyeY, eyeW, eyeH);
    ctx.fillRect(x + headSize * 0.08, eyeY, eyeW, eyeH);

    // Glow aura
    if (sk.eyeGlow > 0.3) {
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur = 12 * sk.eyeGlow;
      ctx.fillRect(x - headSize * 0.25, eyeY, eyeW, eyeH);
      ctx.fillRect(x + headSize * 0.08, eyeY, eyeW, eyeH);
      ctx.shadowBlur = 0;
    }
  } else {
    // Dark sockets
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - headSize * 0.25, eyeY, eyeW, eyeH);
    ctx.fillRect(x + headSize * 0.08, eyeY, eyeW, eyeH);
  }

  // Nose hole
  ctx.fillStyle = boneDark;
  ctx.fillRect(x - u * 0.3, eyeY + eyeH + u * 0.5, u * 0.6, u * 0.6);

  // Teeth / jaw
  ctx.fillStyle = bone;
  const jawY = eyeY + eyeH + u * 1.8;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - headSize * 0.25 + i * u * 1.1, jawY, u * 0.8, u * 0.8);
  }

  // Mouth line
  if (sk.isAwake) {
    ctx.fillStyle = boneDark;
    ctx.fillRect(x - headSize * 0.2, jawY - u * 0.3, headSize * 0.4, u * 0.3);
  }

  ctx.restore();
}
