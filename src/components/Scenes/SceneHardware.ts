import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance, lerp } from '@/utils/math';
import { drawRoundedRect, drawGlow, drawVignette, drawCircle, colorWithAlpha } from '@/utils/drawing';
import { createSkeleton, updateSkeleton, renderSkeleton, SkeletonState } from '@/entities/Skeleton';
import { createHumanCharacter, updateHumanCharacter, renderHumanCharacter, HumanCharacterState } from '@/entities/Character';
import { ParticleSystem } from '@/systems/ParticleSystem';

interface BodyPart {
  id: string;
  x: number;
  y: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  snapX: number;
  snapY: number;
  attached: boolean;
  dragging: boolean;
  color: string;
  glow: number;
}

export class SceneHardware implements Scene {
  id = 'hardware' as const;
  private skeleton!: SkeletonState;
  private human!: HumanCharacterState;
  private particles = new ParticleSystem(80);
  private parts: BodyPart[] = [];
  private complete = false;
  private allAttached = false;
  private transforming = false;
  private transformProgress = 0;
  private showHuman = false;
  private width = 0;
  private height = 0;
  private time = 0;
  private dragTarget: BodyPart | null = null;
  private dragOffset: Vec2 = { x: 0, y: 0 };
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
    const cx = width / 2;
    const cy = height / 2;

    this.skeleton = createSkeleton(cx, cy + 30);
    this.skeleton.isAwake = true;
    this.skeleton.slump = 0;
    this.skeleton.eyeGlow = 1;
    this.skeleton.followSpeed = 0.01;

    this.human = createHumanCharacter(cx, cy + 30);
    this.human.followSpeed = 0.03;

    this.complete = false;
    this.allAttached = false;
    this.transforming = false;
    this.transformProgress = 0;
    this.showHuman = false;
    this.time = 0;
    this.dragTarget = null;

    // Create body parts scattered around
    this.parts = [
      { id: 'torso', x: cx - 250, y: cy - 60, originX: cx - 250, originY: cy - 60, width: 50, height: 60, snapX: cx, snapY: cy - 10, attached: false, dragging: false, color: COLORS.metalLight, glow: 0 },
      { id: 'leftArm', x: cx - 280, y: cy + 60, originX: cx - 280, originY: cy + 60, width: 25, height: 50, snapX: cx - 35, snapY: cy - 5, attached: false, dragging: false, color: COLORS.metalLight, glow: 0 },
      { id: 'rightArm', x: cx + 230, y: cy - 40, originX: cx + 230, originY: cy - 40, width: 25, height: 50, snapX: cx + 35, snapY: cy - 5, attached: false, dragging: false, color: COLORS.metalLight, glow: 0 },
      { id: 'leftLeg', x: cx - 200, y: cy + 120, originX: cx - 200, originY: cy + 120, width: 25, height: 55, snapX: cx - 15, snapY: cy + 50, attached: false, dragging: false, color: COLORS.metalDark, glow: 0 },
      { id: 'rightLeg', x: cx + 200, y: cy + 100, originX: cx + 200, originY: cy + 100, width: 25, height: 55, snapX: cx + 15, snapY: cy + 50, attached: false, dragging: false, color: COLORS.metalDark, glow: 0 },
      { id: 'chest', x: cx + 260, y: cy + 80, originX: cx + 260, originY: cy + 80, width: 45, height: 35, snapX: cx, snapY: cy - 25, attached: false, dragging: false, color: COLORS.metalLight, glow: 0 },
    ];
  }

  update(dt: number, input: InputState) {
    this.time += dt;

    if (!this.showHuman) {
      this.skeleton.targetX = this.width / 2;
      this.skeleton.targetY = this.height / 2 + 30;
      this.skeleton = updateSkeleton(this.skeleton, dt, null);
    } else {
      this.human = updateHumanCharacter(this.human, dt, input.mouse);
      this.human.targetY = Math.min(input.mouse.y + 60, this.height - 60);
    }

    if (!this.allAttached) {
      // Handle drag and drop
      for (const part of this.parts) {
        if (part.attached) continue;

        const partCenter: Vec2 = { x: part.x + part.width / 2, y: part.y + part.height / 2 };
        const dist = distance(input.mouse, partCenter);
        part.glow = lerp(part.glow, dist < 60 ? 1 : 0, dt * 6);

        // Start drag
        if (input.isDown && dist < 60 && !this.dragTarget && !part.attached) {
          this.dragTarget = part;
          part.dragging = true;
          this.dragOffset = { x: part.x - input.mouse.x, y: part.y - input.mouse.y };
        }
      }

      // Update drag
      if (this.dragTarget && input.isDown) {
        this.dragTarget.x = input.mouse.x + this.dragOffset.x;
        this.dragTarget.y = input.mouse.y + this.dragOffset.y;

        // Check snap
        const partCenter: Vec2 = { x: this.dragTarget.x + this.dragTarget.width / 2, y: this.dragTarget.y + this.dragTarget.height / 2 };
        const snapTarget: Vec2 = { x: this.dragTarget.snapX, y: this.dragTarget.snapY };
        if (distance(partCenter, snapTarget) < 60) {
          this.dragTarget.attached = true;
          this.dragTarget.dragging = false;
          this.dragTarget.x = this.dragTarget.snapX - this.dragTarget.width / 2;
          this.dragTarget.y = this.dragTarget.snapY - this.dragTarget.height / 2;
          this.audioManager?.playSFX('snap');
          this.particles.emitEnergy(this.dragTarget.snapX, this.dragTarget.snapY, 10, COLORS.energyPulse);
          this.dragTarget = null;

          // Check if all attached
          if (this.parts.every(p => p.attached)) {
            this.allAttached = true;
            this.transforming = true;
            this.audioManager?.playSFX('discovery');
          }
        }
      }

      // Release without snap
      if (this.dragTarget && !input.isDown) {
        this.dragTarget.dragging = false;
        // Return to origin
        this.dragTarget.x = this.dragTarget.originX;
        this.dragTarget.y = this.dragTarget.originY;
        this.dragTarget = null;
      }
    }

    // Transformation animation
    if (this.transforming) {
      this.transformProgress = Math.min(1, this.transformProgress + dt * 0.5);

      if (this.transformProgress >= 1 && !this.showHuman) {
        this.showHuman = true;
        this.human.x = this.skeleton.x;
        this.human.y = this.skeleton.y;
        this.human.formProgress = 1;
        this.human.heartPulse = 0.5;
        this.human.brainGlow = 0.5;
        this.particles.emitEnergy(this.human.x, this.human.y - 40, 25, COLORS.energyPulse);
        this.onSpeech?.('if it breaks… i open it.');
        this.completionTimer = 3.5;
      }
    }

    if (this.showHuman) {
      this.completionTimer -= dt;
      if (this.completionTimer <= 0 && !this.complete) {
        this.complete = true;
        this.onComplete?.();
      }
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Dark space with floating parts vibe
    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid of dots
    ctx.fillStyle = 'rgba(100, 116, 139, 0.1)';
    for (let x = 0; x < width; x += 40) {
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Floating body parts (unattached)
    for (const part of this.parts) {
      if (part.attached && this.transforming) continue; // hide during transform

      ctx.save();
      if (part.glow > 0 || part.dragging) {
        drawGlow(ctx, part.x + part.width / 2, part.y + part.height / 2, 50, COLORS.energyPulse, (part.glow || 0.5) * 0.3);
      }

      ctx.fillStyle = part.attached ? colorWithAlpha(part.color, 0.3) : part.color;
      drawRoundedRect(ctx, part.x, part.y, part.width, part.height, 6);
      ctx.fill();

      // Rivet details
      ctx.fillStyle = colorWithAlpha(COLORS.metalDark, 0.5);
      drawCircle(ctx, part.x + 5, part.y + 5, 2, COLORS.metalDark);
      drawCircle(ctx, part.x + part.width - 5, part.y + 5, 2, COLORS.metalDark);

      ctx.restore();
    }

    // Particles
    this.particles.render(ctx);

    // Character
    if (this.showHuman) {
      renderHumanCharacter(ctx, this.human, null);
    } else if (this.transforming) {
      // During transformation - show skeleton with glow
      ctx.save();
      ctx.globalAlpha = 1 - this.transformProgress;
      renderSkeleton(ctx, this.skeleton, { hasHeart: true, hasBrain: true, hasBody: false }, null);
      ctx.restore();
      if (this.transformProgress > 0.3) {
        drawGlow(ctx, this.skeleton.x, this.skeleton.y - 30, 100 * this.transformProgress, COLORS.energyPulse, this.transformProgress * 0.5);
      }
    } else {
      renderSkeleton(ctx, this.skeleton, { hasHeart: true, hasBrain: true, hasBody: false }, null);
    }

    drawVignette(ctx, width, height, 0.6);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return this.complete; }
  onResize(width: number, height: number) { this.width = width; this.height = height; }
}
