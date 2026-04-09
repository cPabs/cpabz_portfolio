import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance, lerp, randomInRange } from '@/utils/math';
import { drawRoundedRect, drawGlow, drawVignette, drawHeart, colorWithAlpha } from '@/utils/drawing';
import { createSkeleton, updateSkeleton, renderSkeleton, SkeletonState } from '@/entities/Skeleton';
import { ParticleSystem } from '@/systems/ParticleSystem';

interface LabObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'monitor' | 'terminal' | 'shelf' | 'heart';
  glow: number;
  color: string;
}

export class SceneLab implements Scene {
  id = 'lab' as const;
  private skeleton!: SkeletonState;
  private particles = new ParticleSystem(80);
  private objects: LabObject[] = [];
  private complete = false;
  private heartFound = false;
  private heartAttaching = false;
  private heartAttached = false;
  private heartFloatY = 0;
  private heartPickedUp = false;
  private heartX = 0;
  private heartY = 0;
  private width = 0;
  private height = 0;
  private time = 0;
  private warmth = 0;
  private dustTimer = 0;
  private onSpeech: ((text: string) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private audioManager: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void } | null = null;
  private completionTimer = 0;

  constructor(
    onSpeech?: (text: string) => void,
    onComplete?: () => void,
    audioManager?: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void }
  ) {
    this.onSpeech = onSpeech || null;
    this.onComplete = onComplete || null;
    this.audioManager = audioManager || null;
  }

  init(_ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.skeleton = createSkeleton(width / 2, height / 2 + 50);
    this.skeleton.isAwake = true;
    this.skeleton.slump = 0;
    this.skeleton.eyeGlow = 0.6;
    this.skeleton.followSpeed = 0.03;
    this.complete = false;
    this.heartFound = false;
    this.heartAttaching = false;
    this.heartAttached = false;
    this.heartPickedUp = false;
    this.time = 0;
    this.warmth = 0;

    // Create lab objects
    const cx = width / 2;
    const cy = height / 2;
    this.objects = [
      { x: cx - 200, y: cy - 80, width: 80, height: 60, type: 'monitor', glow: 0, color: COLORS.monitorGlow },
      { x: cx + 150, y: cy - 60, width: 70, height: 50, type: 'monitor', glow: 0, color: COLORS.monitorGlow },
      { x: cx - 300, y: cy + 20, width: 60, height: 80, type: 'terminal', glow: 0, color: COLORS.monitorScreen },
      { x: cx + 250, y: cy - 20, width: 50, height: 70, type: 'shelf', glow: 0, color: COLORS.labWarm },
      { x: cx + 100, y: cy - 120, width: 40, height: 40, type: 'heart', glow: 0, color: COLORS.heartRed },
    ];
    this.heartX = cx + 100;
    this.heartY = cy - 120;

    this.audioManager?.startLayer('ambient', 0.25);
  }

  update(dt: number, input: InputState) {
    this.time += dt;

    // Update skeleton following
    this.skeleton = updateSkeleton(this.skeleton, dt, input.mouse);
    this.skeleton.targetY = Math.min(input.mouse.y + 60, this.height - 80);

    // Update object hover glow
    for (const obj of this.objects) {
      const objCenter: Vec2 = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
      const dist = distance(input.mouse, objCenter);
      const targetGlow = dist < 120 ? (120 - dist) / 120 : 0;
      obj.glow = lerp(obj.glow, targetGlow, dt * 5);

      // Check for heart click
      if (obj.type === 'heart' && !this.heartFound && input.clicked && dist < 80) {
        this.heartFound = true;
        this.heartPickedUp = true;
        this.audioManager?.playSFX('discovery');
      }
    }

    // Heart following cursor when picked up
    if (this.heartPickedUp && !this.heartAttaching) {
      this.heartX = lerp(this.heartX, input.mouse.x, 0.1);
      this.heartY = lerp(this.heartY, input.mouse.y, 0.1);

      // Check if near skeleton chest
      const chestPos: Vec2 = { x: this.skeleton.x, y: this.skeleton.y - 30 };
      const heartPos: Vec2 = { x: this.heartX, y: this.heartY };
      if (distance(heartPos, chestPos) < 60) {
        this.heartAttaching = true;
        this.audioManager?.playSFX('connect');
      }
    }

    // Heart attaching animation
    if (this.heartAttaching && !this.heartAttached) {
      const chestX = this.skeleton.x - 2;
      const chestY = this.skeleton.y - 30;
      this.heartX = lerp(this.heartX, chestX, 0.15);
      this.heartY = lerp(this.heartY, chestY, 0.15);

      if (Math.abs(this.heartX - chestX) < 2 && Math.abs(this.heartY - chestY) < 2) {
        this.heartAttached = true;
        this.warmth = 0;
        this.particles.emitEnergy(chestX, chestY, 15, COLORS.heartGlow);
        this.audioManager?.startLayer('heartbeat', 0.3);
        this.onSpeech?.('i build. i break. i learn.');
        this.completionTimer = 3.5;
      }
    }

    // Warmth increase after heart
    if (this.heartAttached) {
      this.warmth = Math.min(1, this.warmth + dt * 0.5);
      this.completionTimer -= dt;
      if (this.completionTimer <= 0 && !this.complete) {
        this.complete = true;
        this.onComplete?.();
      }
    }

    // Heart float animation
    this.heartFloatY = Math.sin(this.time * 2) * 5;

    // Dust particles
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.3 + Math.random() * 0.5;
      this.particles.emitDust(
        randomInRange(this.width * 0.1, this.width * 0.9),
        randomInRange(this.height * 0.2, this.height * 0.7),
        1
      );
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Background gradient (cozy lab)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1520');
    gradient.addColorStop(0.5, lerpHex('#1a1520', '#2d1f14', this.warmth));
    gradient.addColorStop(1, lerpHex('#0f0f18', '#1f1510', this.warmth));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Warm ambient light
    const lightAlpha = 0.1 + this.warmth * 0.15;
    drawGlow(ctx, width / 2, height * 0.3, 400, COLORS.labAmbient, lightAlpha);

    // Desk surface
    ctx.fillStyle = lerpHex('#1e1528', '#2d1f14', this.warmth * 0.5);
    drawRoundedRect(ctx, width * 0.1, height * 0.6, width * 0.8, height * 0.05, 8);
    ctx.fill();

    // Lab objects
    for (const obj of this.objects) {
      if (obj.type === 'heart' && (this.heartPickedUp)) continue;

      ctx.save();
      if (obj.glow > 0) {
        drawGlow(ctx, obj.x + obj.width / 2, obj.y + obj.height / 2, 60, obj.color, obj.glow * 0.4);
      }

      ctx.fillStyle = colorWithAlpha(obj.color, 0.6 + obj.glow * 0.4);
      drawRoundedRect(ctx, obj.x, obj.y, obj.width, obj.height, 8);
      ctx.fill();

      // Screen glow for monitors
      if (obj.type === 'monitor' || obj.type === 'terminal') {
        ctx.fillStyle = colorWithAlpha(obj.color, 0.2 + obj.glow * 0.3);
        drawRoundedRect(ctx, obj.x + 4, obj.y + 4, obj.width - 8, obj.height - 8, 4);
        ctx.fill();
        // Scan lines
        ctx.strokeStyle = colorWithAlpha(obj.color, 0.1);
        ctx.lineWidth = 0.5;
        for (let ly = obj.y + 6; ly < obj.y + obj.height - 6; ly += 3) {
          ctx.beginPath();
          ctx.moveTo(obj.x + 6, ly);
          ctx.lineTo(obj.x + obj.width - 6, ly);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Floating heart (when not picked up and not attached)
    if (!this.heartPickedUp && !this.heartAttached) {
      const heartObj = this.objects.find(o => o.type === 'heart')!;
      drawHeart(ctx, heartObj.x + heartObj.width / 2, heartObj.y + heartObj.height / 2 + this.heartFloatY, 15, COLORS.heartRed, COLORS.heartGlow, 0.5 + heartObj.glow * 0.5);
    }

    // Heart following cursor
    if (this.heartPickedUp && !this.heartAttached) {
      drawHeart(ctx, this.heartX, this.heartY, 18, COLORS.heartRed, COLORS.heartGlow, 0.8);
    }

    // Particles
    this.particles.render(ctx);

    // Skeleton
    renderSkeleton(ctx, this.skeleton, { hasHeart: this.heartAttached, hasBrain: false, hasBody: false }, null);

    // Vignette
    drawVignette(ctx, width, height, 0.6 - this.warmth * 0.2);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return this.complete; }
  onResize(width: number, height: number) { this.width = width; this.height = height; }
}

function lerpHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  const [ar,ag,ab] = parse(a);
  const [br,bg,bb] = parse(b);
  const r = Math.round(ar + (br-ar)*t);
  const g = Math.round(ag + (bg-ag)*t);
  const bl = Math.round(ab + (bb-ab)*t);
  return `rgb(${r},${g},${bl})`;
}
