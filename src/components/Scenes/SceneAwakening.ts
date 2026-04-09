import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance, lerp, randomInRange, clamp, smoothstep } from '@/utils/math';
import { drawGlow, colorWithAlpha } from '@/utils/drawing';
import {
  PixelPersonState, createPixelPerson, updatePixelPerson, renderPixelPerson,
  PixelSkeletonState, createPixelSkeleton, renderPixelSkeleton,
} from '@/entities/PixelCharacter';
import { ParticleSystem } from '@/systems/ParticleSystem';

// Ambient text that floats before activation
interface FloatingText {
  text: string;
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  startTime: number;
  duration: number;
}

export class SceneAwakening implements Scene {
  id = 'awakening' as const;

  // Crowd
  private crowd: PixelPersonState[] = [];
  private crowdSpeedMult = 1;

  // Skeleton
  private skeleton!: PixelSkeletonState;

  // State
  private complete = false;
  private awoken = false;
  private activationTimer = 0;
  private width = 0;
  private height = 0;
  private time = 0;
  private particles = new ParticleSystem(40);

  // Ambient text
  private floatingTexts: FloatingText[] = [];
  private textPhase = 0;
  private textShown = false;

  // Callbacks
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
    this.complete = false;
    this.awoken = false;
    this.activationTimer = 0;
    this.time = 0;
    this.textPhase = 0;
    this.textShown = false;
    this.crowdSpeedMult = 1;

    // Skeleton — bottom-right, sitting
    const skX = width * 0.78;
    const skY = height * 0.72;
    this.skeleton = createPixelSkeleton(skX, skY);

    // Crowd — spread across screen, avoiding skeleton zone
    const isMobile = width < 640;
    const crowdCount = isMobile ? 18 : 35;
    this.crowd = [];

    const groundY = height * 0.65;
    for (let i = 0; i < crowdCount; i++) {
      const x = randomInRange(-100, width + 100);
      const y = groundY + randomInRange(-height * 0.08, height * 0.2);
      const scale = 0.8 + (y - groundY + height * 0.08) / (height * 0.28) * 0.8; // depth scaling

      // Skip if too close to skeleton zone
      if (x > width * 0.65 && y > height * 0.55) {
        if (Math.random() < 0.7) continue;
      }

      const person = createPixelPerson(x, y, scale);
      this.crowd.push(person);
    }

    // Sort crowd by Y for depth ordering
    this.crowd.sort((a, b) => a.y - b.y);

    // Ambient text schedule
    this.floatingTexts = [
      { text: 'it got… loud.', x: width * 0.15, y: height * 0.35, alpha: 0, targetAlpha: 0, startTime: 3, duration: 3 },
      { text: 'everything kept moving.', x: width * 0.12, y: height * 0.42, alpha: 0, targetAlpha: 0, startTime: 7, duration: 3 },
      { text: 'i stopped.', x: width * 0.18, y: height * 0.38, alpha: 0, targetAlpha: 0, startTime: 11, duration: 3 },
    ];

    this.audioManager?.startLayer('ambient', 0.2);
  }

  update(dt: number, input: InputState) {
    this.time += dt;

    // === PROXIMITY CALCULATION ===
    const skPos: Vec2 = { x: this.skeleton.x, y: this.skeleton.y - 20 };
    const dist = distance(input.mouse, skPos);
    const zoneFactor = Math.min(this.width, this.height) / 900;
    const scaledDist = dist / Math.max(zoneFactor, 0.5);

    // 4 proximity zones → crowd speed multiplier
    let targetMult = 1;
    if (scaledDist < 100) targetMult = 0.03;
    else if (scaledDist < 200) targetMult = 0.25;
    else if (scaledDist < 350) targetMult = 0.65;
    this.crowdSpeedMult = lerp(this.crowdSpeedMult, targetMult, dt * 2);

    // Proximity factor for skeleton (0-1, 1 = very close)
    const proximity = scaledDist < 100 ? 1 : scaledDist < 200 ? (200 - scaledDist) / 100 : 0;

    // === SKELETON ===
    if (!this.awoken) {
      // Eye glow ramps with proximity
      this.skeleton.eyeGlow = lerp(this.skeleton.eyeGlow, proximity > 0.2 ? proximity : 0, dt * 4);

      // Head tilt follows proximity
      this.skeleton.headTilt = lerp(this.skeleton.headTilt, proximity > 0.3 ? proximity * 0.8 : 0, dt * 2);

      // Activation: stay very close for 2 seconds
      if (proximity >= 0.9) {
        this.activationTimer += dt;
        if (this.activationTimer >= 2) {
          this.awoken = true;
          this.skeleton.isAwake = true;
          this.skeleton.eyeGlow = 1;
          this.skeleton.headTilt = 1;
          this.skeleton.slump = 0;
          this.audioManager?.playSFX('discovery');
          this.onSpeech?.('oh… you found me.');
          this.completionTimer = 3.5;
        }
      } else {
        this.activationTimer = Math.max(0, this.activationTimer - dt * 0.5);
      }
    } else {
      // Post-activation
      this.skeleton.slump = lerp(this.skeleton.slump, 0, dt * 2);
      this.skeleton.breathPhase += dt;
      this.completionTimer -= dt;
      if (this.completionTimer <= 0 && !this.complete) {
        this.complete = true;
        this.onComplete?.();
      }
    }
    this.skeleton.bobPhase += dt;

    // === CROWD ===
    for (const person of this.crowd) {
      person.currentSpeed = lerp(person.currentSpeed, person.speed * this.crowdSpeedMult, dt * 3);
      updatePixelPerson(person, dt);

      // Wrap around screen edges
      if (person.direction > 0 && person.x > this.width + 80) {
        person.x = -60;
      } else if (person.direction < 0 && person.x < -80) {
        person.x = this.width + 60;
      }

      // Fade out near edges
      if (person.x < 30) person.alpha = person.x / 30;
      else if (person.x > this.width - 30) person.alpha = (this.width - person.x) / 30;
      else person.alpha = 1;
    }

    // === AMBIENT TEXT ===
    if (!this.awoken) {
      for (const ft of this.floatingTexts) {
        if (this.time >= ft.startTime && this.time < ft.startTime + ft.duration) {
          const localT = this.time - ft.startTime;
          if (localT < 0.8) ft.targetAlpha = localT / 0.8;
          else if (localT > ft.duration - 0.8) ft.targetAlpha = (ft.duration - localT) / 0.8;
          else ft.targetAlpha = 1;
        } else {
          ft.targetAlpha = 0;
        }
        ft.alpha = lerp(ft.alpha, ft.targetAlpha * 0.45, dt * 4);
      }
    } else {
      for (const ft of this.floatingTexts) {
        ft.alpha = lerp(ft.alpha, 0, dt * 5);
      }
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // === BACKGROUND ===
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0c0c18');
    bg.addColorStop(0.6, '#10101e');
    bg.addColorStop(1, '#0a0a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle ground line
    const groundY = height * 0.85;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // === RADIAL DARKNESS (bottom-right) ===
    const vigCx = width * 0.78;
    const vigCy = height * 0.72;
    const vigRadius = Math.max(width, height) * 0.45;
    const vigGrad = ctx.createRadialGradient(vigCx, vigCy, 0, vigCx, vigCy, vigRadius);
    vigGrad.addColorStop(0, 'rgba(5, 5, 12, 0.7)');
    vigGrad.addColorStop(0.3, 'rgba(5, 5, 12, 0.3)');
    vigGrad.addColorStop(1, 'rgba(5, 5, 12, 0)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);

    // === AMBIENT TEXT ===
    for (const ft of this.floatingTexts) {
      if (ft.alpha < 0.01) continue;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `${Math.max(12, Math.min(15, width * 0.012))}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.letterSpacing = '3px';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // === CROWD (sorted by Y for depth) ===
    for (const person of this.crowd) {
      renderPixelPerson(ctx, person);
    }

    // === SKELETON ===
    // Subtle rim light behind skeleton
    if (this.skeleton.eyeGlow > 0.05) {
      drawGlow(ctx, this.skeleton.x, this.skeleton.y - 20, 60, '#7dd3fc', this.skeleton.eyeGlow * 0.08);
    }
    renderPixelSkeleton(ctx, this.skeleton);

    // === OVERALL VIGNETTE ===
    const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return this.complete; }
  onResize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
