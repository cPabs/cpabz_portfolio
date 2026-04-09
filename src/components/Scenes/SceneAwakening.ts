import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance } from '@/utils/math';
import { drawVignette, drawGlow } from '@/utils/drawing';
import { createSkeleton, updateSkeleton, renderSkeleton, SkeletonState } from '@/entities/Skeleton';
import { ParticleSystem } from '@/systems/ParticleSystem';

export class SceneAwakening implements Scene {
  id = 'awakening' as const;
  private skeleton!: SkeletonState;
  private particles = new ParticleSystem(50);
  private complete = false;
  private awoken = false;
  private awakening = false;
  private awakeTimer = 0;
  private width = 0;
  private height = 0;
  private time = 0;
  private speechShown = false;
  private onSpeech: ((text: string) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private audioManager: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void } | null = null;
  private speechDismissTimer = 0;
  private ambientParticleTimer = 0;
  private jitterAmount = 0;

  constructor(
    onSpeech?: (text: string) => void,
    onComplete?: () => void,
    audioManager?: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void }
  ) {
    this.onSpeech = onSpeech || null;
    this.onComplete = onComplete || null;
    this.audioManager = audioManager || null;
  }

  init(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.skeleton = createSkeleton(width / 2, height / 2 + 40);
    this.skeleton.slump = 1;
    this.skeleton.eyeGlow = 0;
    this.complete = false;
    this.awoken = false;
    this.awakening = false;
    this.speechShown = false;
    this.time = 0;
    this.audioManager?.startLayer('ambient', 0.2);
  }

  update(dt: number, input: InputState) {
    this.time += dt;

    const skeletonPos: Vec2 = { x: this.skeleton.x, y: this.skeleton.y - 50 };
    const dist = distance(input.mouse, skeletonPos);

    // Screen jitter based on proximity
    this.jitterAmount = dist < 200 ? (1 - dist / 200) * 3 : 0;

    if (!this.awoken && !this.awakening) {
      // Proximity-based eye glow
      if (dist < 200) {
        this.skeleton.eyeGlow = Math.min(1, (200 - dist) / 200);
      } else {
        this.skeleton.eyeGlow = Math.max(0, this.skeleton.eyeGlow - dt * 2);
      }

      // Trigger awakening
      if (dist < 50) {
        this.awakening = true;
        this.awakeTimer = 0;
        this.audioManager?.playSFX('discovery');
      }
    }

    if (this.awakening) {
      this.awakeTimer += dt;
      this.skeleton.eyeGlow = 1;

      // Gradual stand up
      if (this.awakeTimer > 0.3) {
        this.skeleton.slump = Math.max(0, this.skeleton.slump - dt * 1.5);
      }

      if (this.skeleton.slump <= 0 && !this.awoken) {
        this.awoken = true;
        this.skeleton.isAwake = true;
        this.skeleton.followSpeed = 0.03;

        if (!this.speechShown) {
          this.speechShown = true;
          this.onSpeech?.('oh… you found me.');
          this.speechDismissTimer = 3;
        }
      }
    }

    if (this.awoken) {
      this.skeleton = updateSkeleton(this.skeleton, dt, input.mouse);
      this.skeleton.targetY = Math.min(input.mouse.y + 60, this.height - 80);

      // After speech shown, wait then complete
      if (this.speechShown) {
        this.speechDismissTimer -= dt;
        if (this.speechDismissTimer <= 0 && !this.complete) {
          this.complete = true;
          this.onComplete?.();
        }
      }
    } else {
      this.skeleton = updateSkeleton(this.skeleton, dt, null);
    }

    // Ambient particles
    this.ambientParticleTimer -= dt;
    if (this.ambientParticleTimer <= 0) {
      this.ambientParticleTimer = 0.5 + Math.random();
      this.particles.emitDust(
        Math.random() * this.width,
        this.height * 0.3 + Math.random() * this.height * 0.5,
        1
      );
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Background
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, width, height);

    // Subtle jitter
    ctx.save();
    if (this.jitterAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.jitterAmount,
        (Math.random() - 0.5) * this.jitterAmount
      );
    }

    // Soft center glow when awake
    if (this.awoken) {
      drawGlow(ctx, this.skeleton.x, this.skeleton.y - 30, 200, COLORS.eyeGlow, 0.05);
    }

    // Particles
    this.particles.render(ctx);

    // Skeleton
    renderSkeleton(ctx, this.skeleton, { hasHeart: false, hasBrain: false, hasBody: false }, null);

    ctx.restore();

    // Vignette
    drawVignette(ctx, width, height, 0.8);
  }

  cleanup() {
    this.particles.clear();
  }

  isComplete() { return this.complete; }

  onResize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
