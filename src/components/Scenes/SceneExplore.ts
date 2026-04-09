import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance, lerp, randomInRange } from '@/utils/math';
import { drawGlow, drawVignette, drawRoundedRect, colorWithAlpha } from '@/utils/drawing';
import { createHumanCharacter, updateHumanCharacter, renderHumanCharacter, HumanCharacterState } from '@/entities/Character';
import { ParticleSystem } from '@/systems/ParticleSystem';

interface ExploreZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  tooltip: string;
  icon: string;
  glow: number;
  hovered: boolean;
}

export class SceneExplore implements Scene {
  id = 'explore' as const;
  private character!: HumanCharacterState;
  private particles = new ParticleSystem(60);
  private zones: ExploreZone[] = [];
  private width = 0;
  private height = 0;
  private time = 0;
  private activeTooltip: string | null = null;
  private tooltipAlpha = 0;
  private tooltipX = 0;
  private tooltipY = 0;
  private promptAlpha = 0;
  private dustTimer = 0;
  private onSpeech: ((text: string) => void) | null = null;

  constructor(onSpeech?: (text: string) => void) {
    this.onSpeech = onSpeech || null;
  }

  init(_ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.width = width;
    this.height = height;
    const cx = width / 2;
    const cy = height / 2;

    this.character = createHumanCharacter(cx, cy + 20);
    this.character.formProgress = 1;
    this.character.heartPulse = 0.5;
    this.character.brainGlow = 0.5;
    this.character.soulGlow = 0.6;
    this.character.followSpeed = 0.04;
    this.time = 0;
    this.promptAlpha = 0;

    this.setupZones(width, height);
  }

  private setupZones(width: number, height: number) {
    const isMobile = width < 640;
    const zoneW = isMobile ? 70 : 90;
    const zoneH = isMobile ? 50 : 60;

    this.zones = [
      {
        x: width * 0.12, y: height * 0.3,
        width: zoneW, height: zoneH,
        label: 'Terminal', tooltip: 'late nights built this',
        icon: '💻', glow: 0, hovered: false,
      },
      {
        x: width * 0.82, y: height * 0.25,
        width: zoneW, height: zoneH,
        label: 'Hardware', tooltip: 'i had to open it',
        icon: '🔧', glow: 0, hovered: false,
      },
      {
        x: width * 0.15, y: height * 0.65,
        width: zoneW, height: zoneH,
        label: 'AI', tooltip: 'this changed everything',
        icon: '🧠', glow: 0, hovered: false,
      },
      {
        x: width * 0.8, y: height * 0.7,
        width: zoneW, height: zoneH,
        label: 'Beach', tooltip: 'this keeps me sane',
        icon: '🌊', glow: 0, hovered: false,
      },
    ];
  }

  update(dt: number, input: InputState) {
    this.time += dt;

    // Character follows cursor
    this.character = updateHumanCharacter(this.character, dt, input.mouse);
    this.character.targetY = Math.min(input.mouse.y + 60, this.height - 60);

    // Prompt fades in after 3s
    if (this.time > 3 && this.promptAlpha < 1) {
      this.promptAlpha = Math.min(1, this.promptAlpha + dt * 0.5);
    }

    // Zone hover detection
    let anyHovered = false;
    for (const zone of this.zones) {
      const zoneCenter: Vec2 = { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
      const dist = distance(input.mouse, zoneCenter);
      const isHovered = dist < 80;
      zone.hovered = isHovered;
      zone.glow = lerp(zone.glow, isHovered ? 1 : 0, dt * 5);

      if (isHovered) {
        anyHovered = true;
        this.activeTooltip = zone.tooltip;
        this.tooltipX = zone.x + zone.width / 2;
        this.tooltipY = zone.y - 20;
      }
    }

    this.tooltipAlpha = lerp(this.tooltipAlpha, anyHovered ? 1 : 0, dt * 8);

    // Ambient particles
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.8 + Math.random();
      this.particles.emitDust(
        randomInRange(0, this.width),
        randomInRange(this.height * 0.2, this.height * 0.8),
        1
      );
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Warm, inviting background
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    gradient.addColorStop(0, '#2a1f2d');
    gradient.addColorStop(0.5, '#1f1a28');
    gradient.addColorStop(1, '#151520');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Warm central glow
    drawGlow(ctx, width / 2, height / 2, 300, COLORS.soulWarm, 0.06);

    // Explore zones
    for (const zone of this.zones) {
      ctx.save();

      // Zone glow
      if (zone.glow > 0) {
        drawGlow(ctx, zone.x + zone.width / 2, zone.y + zone.height / 2, 60, COLORS.soulWarm, zone.glow * 0.3);
      }

      // Zone background
      ctx.fillStyle = colorWithAlpha('#1e293b', 0.3 + zone.glow * 0.3);
      drawRoundedRect(ctx, zone.x, zone.y, zone.width, zone.height, 12);
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(COLORS.textSecondary, 0.2 + zone.glow * 0.4);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Icon
      ctx.font = `${Math.min(zone.width * 0.4, 28)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.icon, zone.x + zone.width / 2, zone.y + zone.height / 2);

      ctx.restore();
    }

    // Tooltip
    if (this.tooltipAlpha > 0.01 && this.activeTooltip) {
      ctx.save();
      ctx.globalAlpha = this.tooltipAlpha;

      const text = this.activeTooltip;
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(text);
      const tw = metrics.width + 20;
      const th = 30;
      const tx = this.tooltipX - tw / 2;
      const ty = this.tooltipY - th;

      ctx.fillStyle = COLORS.bubbleBg;
      drawRoundedRect(ctx, tx, ty, tw, th, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.bubbleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(text, this.tooltipX, ty + th / 2 + 1);

      ctx.restore();
    }

    // Particles
    this.particles.render(ctx);

    // Character
    renderHumanCharacter(ctx, this.character, null);

    // Prompt text
    if (this.promptAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.promptAlpha * 0.6;
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = COLORS.textSecondary;
      ctx.textAlign = 'center';
      ctx.fillText('stay a little longer.', width / 2, height - 40);
      ctx.restore();
    }

    drawVignette(ctx, width, height, 0.4);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return false; } // Never completes - exploration mode
  onResize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.setupZones(width, height);
  }
}
