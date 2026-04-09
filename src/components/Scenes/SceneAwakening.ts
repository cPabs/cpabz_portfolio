import { Scene, InputState, Vec2 } from '@/types';
import { distance, lerp, randomInRange } from '@/utils/math';
import { drawGlow, colorWithAlpha } from '@/utils/drawing';
import {
  PixelPersonState, createPixelPerson, updatePixelPerson, renderPixelPerson,
  PixelSkeletonState, createPixelSkeleton, renderPixelSkeleton,
} from '@/entities/PixelCharacter';
import { ParticleSystem } from '@/systems/ParticleSystem';

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

  private crowd: PixelPersonState[] = [];
  private crowdSpeedMult = 1;
  private skeleton!: PixelSkeletonState;

  private complete = false;
  private awoken = false;
  private activationTimer = 0;
  private width = 0;
  private height = 0;
  private time = 0;
  private particles = new ParticleSystem(40);

  private floatingTexts: FloatingText[] = [];
  private onSpeech: ((text: string) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private audioManager: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void } | null = null;
  private completionTimer = 0;

  // Background image
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded = false;

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
    this.crowdSpeedMult = 1;

    // Skeleton — bottom-right, sitting
    this.skeleton = createPixelSkeleton(width * 0.80, height * 0.78, height);

    // === DENSE CROWD ===
    // Multiple lanes/rows from top to bottom, filling ~70% of screen
    const isMobile = width < 640;
    const laneCount = isMobile ? 6 : 8;
    const peoplePerLane = isMobile ? 6 : 9;
    this.crowd = [];

    for (let lane = 0; lane < laneCount; lane++) {
      // Each lane is a horizontal row at a different Y depth
      const laneProgress = lane / (laneCount - 1); // 0 = top, 1 = bottom
      const laneY = height * 0.18 + laneProgress * height * 0.65;
      const depthScale = 0.5 + laneProgress * 0.7; // smaller at top, bigger at bottom

      for (let i = 0; i < peoplePerLane; i++) {
        const x = randomInRange(-80, width + 80);
        const yJitter = randomInRange(-height * 0.02, height * 0.02);

        // Skip characters that overlap skeleton dark zone
        if (x > width * 0.62 && laneY + yJitter > height * 0.55) {
          if (Math.random() < 0.75) continue;
        }

        const person = createPixelPerson(x, laneY + yJitter, depthScale, height);
        this.crowd.push(person);
      }
    }

    // Sort by Y for depth ordering
    this.crowd.sort((a, b) => a.y - b.y);

    // Ambient text
    this.floatingTexts = [
      { text: 'it got… loud.', x: width * 0.52, y: height * 0.28, alpha: 0, targetAlpha: 0, startTime: 3, duration: 3 },
      { text: 'everything kept moving.', x: width * 0.48, y: height * 0.45, alpha: 0, targetAlpha: 0, startTime: 7, duration: 3 },
      { text: 'i stopped.', x: width * 0.65, y: height * 0.62, alpha: 0, targetAlpha: 0, startTime: 11, duration: 3 },
    ];

    // Load background image
    if (!this.bgImage) {
      this.bgImage = new Image();
      this.bgImage.onload = () => { this.bgLoaded = true; };
      this.bgImage.src = '/images/hero-bg.png';
    }

    this.audioManager?.startLayer('ambient', 0.2);
  }

  update(dt: number, input: InputState) {
    this.time += dt;

    // === PROXIMITY ===
    const skPos: Vec2 = { x: this.skeleton.x, y: this.skeleton.y - 30 };
    const dist = distance(input.mouse, skPos);
    const zoneFactor = Math.min(this.width, this.height) / 900;
    const scaledDist = dist / Math.max(zoneFactor, 0.5);

    let targetMult = 1;
    if (scaledDist < 100) targetMult = 0.03;
    else if (scaledDist < 200) targetMult = 0.2;
    else if (scaledDist < 350) targetMult = 0.6;
    this.crowdSpeedMult = lerp(this.crowdSpeedMult, targetMult, dt * 2.5);

    const proximity = scaledDist < 100 ? 1 : scaledDist < 200 ? (200 - scaledDist) / 100 : 0;

    // === SKELETON ===
    if (!this.awoken) {
      this.skeleton.eyeGlow = lerp(this.skeleton.eyeGlow, proximity > 0.2 ? proximity : 0, dt * 4);
      this.skeleton.headTilt = lerp(this.skeleton.headTilt, proximity > 0.3 ? proximity * 0.8 : 0, dt * 2);

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

      // Wrap around
      if (person.direction > 0 && person.x > this.width + 100) {
        person.x = -80;
      } else if (person.direction < 0 && person.x < -100) {
        person.x = this.width + 80;
      }

      // Fade at edges
      if (person.x < 40) person.alpha = Math.max(0, person.x / 40);
      else if (person.x > this.width - 40) person.alpha = Math.max(0, (this.width - person.x) / 40);
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
        ft.alpha = lerp(ft.alpha, ft.targetAlpha * 0.55, dt * 4);
      }
    } else {
      for (const ft of this.floatingTexts) {
        ft.alpha = lerp(ft.alpha, 0, dt * 5);
      }
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // === BACKGROUND IMAGE (cover the viewport) ===
    if (this.bgLoaded && this.bgImage) {
      // Cover: fill viewport while maintaining aspect ratio
      const imgW = this.bgImage.naturalWidth;
      const imgH = this.bgImage.naturalHeight;
      const imgAspect = imgW / imgH;
      const vpAspect = width / height;

      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (vpAspect > imgAspect) {
        // Viewport wider than image — fit width, crop height
        drawW = width;
        drawH = width / imgAspect;
        drawX = 0;
        drawY = (height - drawH) / 2;
      } else {
        // Viewport taller than image — fit height, crop width
        drawH = height;
        drawW = height * imgAspect;
        drawX = (width - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(this.bgImage, drawX, drawY, drawW, drawH);
    } else {
      // Fallback while image loads: simple Minecraft-style ground
      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.35);
      sky.addColorStop(0, '#87CEEB');
      sky.addColorStop(1, '#b8d9e8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height * 0.35);

      const ground = ctx.createLinearGradient(0, height * 0.12, 0, height);
      ground.addColorStop(0, '#7dad5a');
      ground.addColorStop(0.15, '#6b9b4a');
      ground.addColorStop(0.5, '#8b9a5c');
      ground.addColorStop(1, '#7a8850');
      ctx.fillStyle = ground;
      ctx.fillRect(0, height * 0.12, width, height * 0.88);
    }

    // === RADIAL DARKNESS (bottom-right skeleton zone) ===
    const vigCx = width * 0.82;
    const vigCy = height * 0.78;
    const vigRadius = Math.max(width, height) * 0.38;
    const vigGrad = ctx.createRadialGradient(vigCx, vigCy, vigRadius * 0.05, vigCx, vigCy, vigRadius);
    vigGrad.addColorStop(0, 'rgba(5, 5, 15, 0.85)');
    vigGrad.addColorStop(0.4, 'rgba(5, 5, 15, 0.6)');
    vigGrad.addColorStop(0.7, 'rgba(5, 5, 15, 0.2)');
    vigGrad.addColorStop(1, 'rgba(5, 5, 15, 0)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);

    // === CROWD ===
    for (const person of this.crowd) {
      renderPixelPerson(ctx, person, height);
    }

    // === AMBIENT TEXT ===
    for (const ft of this.floatingTexts) {
      if (ft.alpha < 0.01) continue;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `${Math.max(13, Math.min(16, width * 0.013))}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // === SKELETON ===
    if (this.skeleton.eyeGlow > 0.05) {
      drawGlow(ctx, this.skeleton.x, this.skeleton.y - 35, 70, '#7dd3fc', this.skeleton.eyeGlow * 0.1);
    }
    renderPixelSkeleton(ctx, this.skeleton, height);

    // === EDGE VIGNETTE ===
    const edgeVig = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.85);
    edgeVig.addColorStop(0, 'rgba(0,0,0,0)');
    edgeVig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = edgeVig;
    ctx.fillRect(0, 0, width, height);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return this.complete; }
  onResize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
