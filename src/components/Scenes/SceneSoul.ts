import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance, lerp, randomInRange } from '@/utils/math';
import { drawGlow, drawVignette, drawCircle, colorWithAlpha } from '@/utils/drawing';
import { createHumanCharacter, updateHumanCharacter, renderHumanCharacter, HumanCharacterState } from '@/entities/Character';
import { ParticleSystem } from '@/systems/ParticleSystem';

export class SceneSoul implements Scene {
  id = 'soul' as const;
  private character!: HumanCharacterState;
  private particles = new ParticleSystem(120);
  private complete = false;
  private soulX = 0;
  private soulY = 0;
  private soulTargetX = 0;
  private soulTargetY = 0;
  private soulApproaching = false;
  private soulMerging = false;
  private soulMerged = false;
  private soulMergeTimer = 0;
  private soulGlow = 0.5;
  private soulPulse = 0;
  private saturation = 0;
  private width = 0;
  private height = 0;
  private time = 0;
  private envElements: { x: number; y: number; emoji: string; size: number; alpha: number }[] = [];
  private onSpeech: ((text: string) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private audioManager: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void } | null = null;
  private completionTimer = 0;
  private soulParticleTimer = 0;

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

    this.character = createHumanCharacter(cx - 80, cy + 40);
    this.character.formProgress = 1;
    this.character.heartPulse = 0.5;
    this.character.brainGlow = 0.5;
    this.character.followSpeed = 0.01;

    this.soulX = cx + 180;
    this.soulY = cy - 30;
    this.soulTargetX = this.soulX;
    this.soulTargetY = this.soulY;
    this.soulApproaching = false;
    this.soulMerging = false;
    this.soulMerged = false;
    this.saturation = 0;
    this.complete = false;
    this.time = 0;

    // Environment elements (stylized icons)
    this.envElements = [
      { x: width * 0.15, y: height * 0.75, emoji: '🍺', size: 24, alpha: 0.3 },
      { x: width * 0.82, y: height * 0.7, emoji: '🐟', size: 22, alpha: 0.3 },
      { x: width * 0.2, y: height * 0.25, emoji: '⛰️', size: 28, alpha: 0.25 },
      { x: width * 0.85, y: height * 0.3, emoji: '🌊', size: 26, alpha: 0.25 },
    ];

    this.audioManager?.startLayer('waves', 0.3);
  }

  update(dt: number, input: InputState) {
    this.time += dt;
    this.soulPulse = (Math.sin(this.time * 2) + 1) / 2;

    // Character stays relatively still, looking toward soul
    this.character.targetX = this.width / 2 - 80;
    this.character.targetY = this.height / 2 + 40;
    this.character = updateHumanCharacter(this.character, dt, null);

    if (!this.soulMerged) {
      // Soul slowly approaches based on cursor proximity
      const soulPos: Vec2 = { x: this.soulX, y: this.soulY };
      const charPos: Vec2 = { x: this.character.x, y: this.character.y - 40 };
      const cursorDist = distance(input.mouse, soulPos);

      // Cursor near soul encourages it
      if (cursorDist < 150) {
        this.soulApproaching = true;
      }

      if (this.soulApproaching && !this.soulMerging) {
        // Slowly move toward character
        const speed = 0.3 + (cursorDist < 100 ? 0.5 : 0);
        this.soulTargetX = lerp(this.soulTargetX, charPos.x, dt * speed);
        this.soulTargetY = lerp(this.soulTargetY, charPos.y, dt * speed);
      }

      this.soulX = lerp(this.soulX, this.soulTargetX, 0.05);
      this.soulY = lerp(this.soulY, this.soulTargetY, 0.05);

      // Soul bob
      this.soulY += Math.sin(this.time * 1.5) * 0.5;

      // Check if soul is close enough to merge
      if (distance(soulPos, charPos) < 40 && this.soulApproaching) {
        this.soulMerging = true;
        this.soulMergeTimer = 0;
        this.audioManager?.playSFX('discovery');
      }

      // Merge animation
      if (this.soulMerging) {
        this.soulMergeTimer += dt;
        this.soulX = lerp(this.soulX, charPos.x, dt * 5);
        this.soulY = lerp(this.soulY, charPos.y, dt * 5);
        this.soulGlow = lerp(this.soulGlow, 2, dt * 3);

        if (this.soulMergeTimer > 0.8) {
          this.soulMerged = true;
          this.character.soulGlow = 1;
          this.particles.emitEnergy(charPos.x, charPos.y, 30, COLORS.soulGlow);
          this.onSpeech?.('thanks… for walking with me.');
          this.completionTimer = 4;
        }
      }

      // Soul particles
      this.soulParticleTimer -= dt;
      if (this.soulParticleTimer <= 0) {
        this.soulParticleTimer = 0.15;
        this.particles.emit(this.soulX, this.soulY, 1, {
          color: COLORS.soulLight,
          speedMin: 5,
          speedMax: 20,
          sizeMin: 1,
          sizeMax: 3,
          lifeMin: 0.5,
          lifeMax: 1.5,
        });
      }
    }

    // Post-merge saturation
    if (this.soulMerged) {
      this.saturation = Math.min(1, this.saturation + dt * 0.5);
      this.character.soulGlow = 0.6 + Math.sin(this.time * 1.5) * 0.2;

      this.completionTimer -= dt;
      if (this.completionTimer <= 0 && !this.complete) {
        this.complete = true;
        this.onComplete?.();
      }
    }

    // Env element animation
    for (const el of this.envElements) {
      el.alpha = 0.3 + this.saturation * 0.4;
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Soft emotional gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const baseSat = this.saturation;
    gradient.addColorStop(0, lerpColor('#151525', '#2a1f3d', baseSat));
    gradient.addColorStop(0.5, lerpColor('#1a1525', '#3d2a1f', baseSat));
    gradient.addColorStop(1, lerpColor('#151520', '#1f2a3d', baseSat));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Warm ambient glow
    drawGlow(ctx, width / 2, height / 2, 350, COLORS.soulWarm, 0.05 + baseSat * 0.1);

    // Environment elements
    for (const el of this.envElements) {
      ctx.save();
      ctx.globalAlpha = el.alpha;
      ctx.font = `${el.size}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(el.emoji, el.x, el.y);
      ctx.restore();
    }

    // Particles
    this.particles.render(ctx);

    // Soul orb (if not merged)
    if (!this.soulMerged) {
      drawGlow(ctx, this.soulX, this.soulY, 40 * this.soulGlow, COLORS.soulGlow, 0.3 + this.soulPulse * 0.2);
      drawGlow(ctx, this.soulX, this.soulY, 20 * this.soulGlow, COLORS.soulLight, 0.5 + this.soulPulse * 0.3);
      drawCircle(ctx, this.soulX, this.soulY, 8, COLORS.soulLight);
    }

    // Character
    renderHumanCharacter(ctx, this.character, this.soulMerged ? null : { x: this.soulX, y: this.soulY });

    drawVignette(ctx, width, height, 0.5 - baseSat * 0.2);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return this.complete; }
  onResize(width: number, height: number) { this.width = width; this.height = height; }
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  const [ar,ag,ab] = parse(a);
  const [br,bg,bb] = parse(b);
  const r = Math.round(ar + (br-ar)*t);
  const g = Math.round(ag + (bg-ag)*t);
  const bl = Math.round(ab + (bb-ab)*t);
  return `rgb(${r},${g},${bl})`;
}
