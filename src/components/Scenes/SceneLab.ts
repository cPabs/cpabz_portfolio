import { Scene, InputState, Vec2 } from '@/types';
import { distance, lerp, randomInRange, clamp } from '@/utils/math';
import { drawGlow, drawRoundedRect, drawHeart, colorWithAlpha, drawVignette } from '@/utils/drawing';
import { renderPixelSkeleton, createPixelSkeleton, PixelSkeletonState } from '@/entities/PixelCharacter';
import { ParticleSystem } from '@/systems/ParticleSystem';

// Interactive lab objects
interface LabProp {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  glow: number;
  hovered: boolean;
  dialogue: string;
  dialogueShown: boolean;
}

export class SceneLab implements Scene {
  id = 'lab' as const;
  private skeleton!: PixelSkeletonState;
  private particles = new ParticleSystem(80);
  private props: LabProp[] = [];
  private width = 0;
  private height = 0;
  private time = 0;

  // CPU centerpiece
  private cpuPulse = 0;
  private cpuVibrateX = 0;
  private cpuVibrateY = 0;
  private cpuFocusTimer = 0;
  private heartRevealed = false;
  private heartFloatY = 0;
  private heartAttaching = false;
  private heartAttached = false;
  private heartX = 0;
  private heartY = 0;

  // Scene state
  private complete = false;
  private warmth = 0;
  private entryAnim = 0; // 0-1 fade in
  private dustTimer = 0;

  // Monitor scrolling text
  private cliScrollY = 0;
  private cliLines = [
    '$ npm run build',
    '> compiling...',
    '✓ modules loaded',
    '$ gcc -o main main.c',
    '> linking...',
    '✓ build success',
    '$ ./deploy --prod',
    '> uploading...',
    '✓ deployed v2.4.1',
    '$ ping 192.168.1.1',
    '> 64 bytes: ttl=64',
    '$ cat /proc/cpuinfo',
    '> model: cortex-a72',
    '$ make flash',
    '> flashing firmware...',
    '✓ done',
  ];

  private onSpeech: ((text: string) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private audioManager: { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void } | null = null;
  private completionTimer = 0;
  private openingSpeechShown = false;

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
    this.time = 0;
    this.complete = false;
    this.warmth = 0;
    this.entryAnim = 0;
    this.heartRevealed = false;
    this.heartAttaching = false;
    this.heartAttached = false;
    this.cpuFocusTimer = 0;
    this.openingSpeechShown = false;

    // Skeleton — left side, standing, looking around
    this.skeleton = createPixelSkeleton(width * 0.18, height * 0.62, height);
    this.skeleton.isAwake = true;
    this.skeleton.slump = 0;
    this.skeleton.eyeGlow = 0.6;
    this.skeleton.headTilt = 1;

    const cx = width * 0.52;
    const cy = height * 0.48;

    // Interactive props (positioned relative to viewport)
    this.props = [
      { id: 'rfid', x: width * 0.12, y: height * 0.28, w: width * 0.08, h: height * 0.07, glow: 0, hovered: false, dialogue: 'i tried tracking everything once.', dialogueShown: false },
      { id: 'monitor', x: width * 0.72, y: height * 0.15, w: width * 0.12, h: height * 0.14, glow: 0, hovered: false, dialogue: 'i loved watching things compile.', dialogueShown: false },
      { id: 'scanner', x: width * 0.82, y: height * 0.55, w: width * 0.07, h: height * 0.06, glow: 0, hovered: false, dialogue: 'identity always mattered here.', dialogueShown: false },
    ];

    // CPU position (center)
    this.heartX = cx;
    this.heartY = cy - height * 0.05;

    this.audioManager?.startLayer('ambient', 0.25);
  }

  update(dt: number, input: InputState) {
    this.time += dt;
    this.entryAnim = Math.min(1, this.entryAnim + dt * 0.8);

    // Opening dialogue
    if (!this.openingSpeechShown && this.entryAnim > 0.6) {
      this.openingSpeechShown = true;
      this.onSpeech?.('i used to live… tinkering with hardware.');
      setTimeout(() => {
        if (this.onSpeech) {
          // Clear after 3s (handled by GameCanvas speech system)
        }
      }, 3000);
    }

    const cx = this.width * 0.52;
    const cy = this.height * 0.48;

    // CPU vibration (like old phone buzzing)
    this.cpuPulse = (Math.sin(this.time * 4) + 1) / 2;
    this.cpuVibrateX = Math.sin(this.time * 25) * (0.5 + this.cpuPulse * 0.8);
    this.cpuVibrateY = Math.cos(this.time * 30) * (0.3 + this.cpuPulse * 0.5);

    // CLI monitor scroll
    this.cliScrollY += dt * 20;

    // Skeleton looks toward cursor
    const skToMouse = input.mouse.x > this.skeleton.x ? 1 : -1;
    this.skeleton.headTilt = lerp(this.skeleton.headTilt, 0.8, dt);
    this.skeleton.bobPhase += dt;
    this.skeleton.breathPhase += dt;

    // Props hover detection
    for (const prop of this.props) {
      const propCenter: Vec2 = { x: prop.x + prop.w / 2, y: prop.y + prop.h / 2 };
      const dist = distance(input.mouse, propCenter);
      prop.hovered = dist < Math.max(prop.w, prop.h) * 0.8;
      prop.glow = lerp(prop.glow, prop.hovered ? 1 : 0, dt * 6);

      // Trigger dialogue on hover
      if (prop.hovered && !prop.dialogueShown && input.clicked) {
        prop.dialogueShown = true;
        this.onSpeech?.(prop.dialogue);
        this.audioManager?.playSFX('click');
      }
    }

    // CPU focus — hover over center CPU area
    const cpuCenter: Vec2 = { x: cx, y: cy };
    const cpuDist = distance(input.mouse, cpuCenter);
    if (cpuDist < this.width * 0.1 && !this.heartRevealed) {
      this.cpuFocusTimer += dt;
      if (this.cpuFocusTimer > 2.5) {
        this.heartRevealed = true;
        this.audioManager?.playSFX('discovery');
        this.particles.emitEnergy(cx, cy, 12, '#ef4444');
      }
    } else if (!this.heartRevealed) {
      this.cpuFocusTimer = Math.max(0, this.cpuFocusTimer - dt * 0.3);
    }

    // Heart float
    this.heartFloatY = Math.sin(this.time * 2.5) * 4;

    // Heart click to attach
    if (this.heartRevealed && !this.heartAttaching && !this.heartAttached) {
      const heartPos: Vec2 = { x: this.heartX, y: this.heartY + this.heartFloatY };
      if (input.clicked && distance(input.mouse, heartPos) < 50) {
        this.heartAttaching = true;
        this.audioManager?.playSFX('connect');
      }
    }

    // Heart attaching — flies to skeleton
    if (this.heartAttaching && !this.heartAttached) {
      const targetX = this.skeleton.x;
      const targetY = this.skeleton.y - 20;
      this.heartX = lerp(this.heartX, targetX, dt * 4);
      this.heartY = lerp(this.heartY, targetY, dt * 4);

      if (Math.abs(this.heartX - targetX) < 3 && Math.abs(this.heartY - targetY) < 3) {
        this.heartAttached = true;
        this.particles.emitEnergy(targetX, targetY, 20, '#fda4af');
        this.audioManager?.startLayer('heartbeat', 0.3);
        this.onSpeech?.('i build. i break. i learn.');
        this.completionTimer = 3.5;
      }
    }

    // Post-attachment warmth
    if (this.heartAttached) {
      this.warmth = Math.min(1, this.warmth + dt * 0.5);
      this.completionTimer -= dt;
      if (this.completionTimer <= 0 && !this.complete) {
        this.complete = true;
        this.onComplete?.();
      }
    }

    // Dust particles
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.4 + Math.random() * 0.6;
      this.particles.emitDust(randomInRange(this.width * 0.1, this.width * 0.9), randomInRange(this.height * 0.15, this.height * 0.65), 1);
    }

    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const u = Math.max(2, Math.floor(height * 0.004)); // unit for pixel sizing
    const fade = this.entryAnim;

    // === BACKGROUND — warm cozy lab ===
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.7);
    bg.addColorStop(0, lerpHex('#2a1f14', '#3d2a1a', this.warmth));
    bg.addColorStop(1, lerpHex('#15100c', '#1f1510', this.warmth));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // === WARM LAMP GLOW (top center) ===
    drawGlow(ctx, width * 0.5, height * 0.08, height * 0.5, '#f59e0b', 0.12 + this.warmth * 0.08);
    // Lantern shape
    ctx.fillStyle = '#f59e0b';
    drawRoundedRect(ctx, width * 0.47, height * 0.02, width * 0.06, height * 0.06, 4);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    drawRoundedRect(ctx, width * 0.475, height * 0.03, width * 0.05, height * 0.04, 3);
    ctx.fill();

    // === BACK WALL — shelves ===
    this.drawShelves(ctx, width, height, u);

    // === WORKBENCH (big desk surface) ===
    const deskY = height * 0.58;
    const deskH = height * 0.06;
    // Desk top
    ctx.fillStyle = '#5c3d1e';
    drawRoundedRect(ctx, width * 0.05, deskY, width * 0.9, deskH, 3);
    ctx.fill();
    // Desk front
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(width * 0.05, deskY + deskH, width * 0.9, height * 0.04);
    // Desk legs
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(width * 0.08, deskY + deskH, width * 0.03, height * 0.3);
    ctx.fillRect(width * 0.89, deskY + deskH, width * 0.03, height * 0.3);

    // === DESK OBJECTS — scattered tools and parts ===
    this.drawDeskClutter(ctx, width, height, u);

    // === CPU CENTERPIECE (vibrating) ===
    this.drawCPU(ctx, width, height, u);

    // === INTERACTIVE PROPS ===
    this.drawRFID(ctx, width, height, u);
    this.drawMonitor(ctx, width, height, u);
    this.drawScanner(ctx, width, height, u);

    // === REVEALED HEART ===
    if (this.heartRevealed && !this.heartAttached) {
      const hx = this.heartAttaching ? this.heartX : this.heartX;
      const hy = this.heartAttaching ? this.heartY : this.heartY + this.heartFloatY;
      // Glow
      drawGlow(ctx, hx, hy, 40, '#ef4444', 0.4 + this.cpuPulse * 0.2);
      drawHeart(ctx, hx, hy, 14, '#ef4444', '#fda4af', 0.5 + this.cpuPulse * 0.3);
    }

    // === PARTICLES ===
    this.particles.render(ctx);

    // === PIXEL SKELETON ===
    if (this.skeleton.eyeGlow > 0) {
      drawGlow(ctx, this.skeleton.x, this.skeleton.y - 30, 50, '#7dd3fc', this.skeleton.eyeGlow * 0.06);
    }
    // Heart glow inside skeleton after attachment
    if (this.heartAttached) {
      drawGlow(ctx, this.skeleton.x, this.skeleton.y - 15, 25, '#ef4444', 0.2 + this.cpuPulse * 0.15);
    }
    renderPixelSkeleton(ctx, this.skeleton, height);

    // === VIGNETTE ===
    drawVignette(ctx, width, height, 0.55 - this.warmth * 0.15);

    // === FADE IN ===
    if (fade < 1) {
      ctx.fillStyle = `rgba(10, 8, 6, ${1 - fade})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // --- Drawing helpers ---

  private drawShelves(ctx: CanvasRenderingContext2D, w: number, h: number, u: number) {
    // Left shelf
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(w * 0.02, h * 0.1, w * 0.1, h * 0.45);
    // Shelf boards
    ctx.fillStyle = '#5c3d1e';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(w * 0.01, h * 0.15 + i * h * 0.14, w * 0.12, h * 0.02);
    }
    // Items on shelves (circuit boards, small boxes)
    ctx.fillStyle = '#2d5a27'; // green PCB
    ctx.fillRect(w * 0.03, h * 0.11, w * 0.04, h * 0.03);
    ctx.fillStyle = '#065f46';
    ctx.fillRect(w * 0.04, h * 0.25, w * 0.05, h * 0.04);
    ctx.fillStyle = '#78350f'; // box
    ctx.fillRect(w * 0.03, h * 0.39, w * 0.06, h * 0.04);

    // Right shelf
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(w * 0.88, h * 0.1, w * 0.1, h * 0.45);
    ctx.fillStyle = '#5c3d1e';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(w * 0.87, h * 0.15 + i * h * 0.14, w * 0.12, h * 0.02);
    }
    // Items
    ctx.fillStyle = '#1e40af'; // blue module
    ctx.fillRect(w * 0.9, h * 0.11, w * 0.04, h * 0.03);
    drawGlow(ctx, w * 0.92, h * 0.125, 15, '#3b82f6', 0.3);
    ctx.fillStyle = '#065f46';
    ctx.fillRect(w * 0.89, h * 0.26, w * 0.06, h * 0.03);
  }

  private drawDeskClutter(ctx: CanvasRenderingContext2D, w: number, h: number, u: number) {
    const deskY = h * 0.55;

    // Screwdriver
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(w * 0.7, deskY, u * 1.5, u * 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(w * 0.7 + u * 0.3, deskY - u * 3, u * 0.9, u * 3);

    // Pliers
    ctx.fillStyle = '#64748b';
    ctx.fillRect(w * 0.35, deskY + u, u * 2, u * 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(w * 0.35, deskY + u * 4, u * 2, u * 2);

    // Loose wires
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.4, deskY + u);
    ctx.quadraticCurveTo(w * 0.45, deskY - u * 2, w * 0.48, deskY + u * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(w * 0.55, deskY + u * 2);
    ctx.quadraticCurveTo(w * 0.58, deskY - u, w * 0.62, deskY + u);
    ctx.stroke();

    // Small PCB
    ctx.fillStyle = '#166534';
    ctx.fillRect(w * 0.25, deskY, u * 8, u * 5);
    ctx.fillStyle = '#22c55e';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(w * 0.25 + u * 1 + i * u * 2.2, deskY + u, u * 1.5, u * 1.5);
    }
    // Traces
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.25 + u * 2, deskY + u * 3);
    ctx.lineTo(w * 0.25 + u * 6, deskY + u * 3);
    ctx.stroke();

    // Magnifying glass
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.76, deskY - u, u * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(147, 197, 253, 0.1)';
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.76 + u * 2, deskY - u + u * 2);
    ctx.lineTo(w * 0.76 + u * 4, deskY - u + u * 5);
    ctx.stroke();
  }

  private drawCPU(ctx: CanvasRenderingContext2D, w: number, h: number, u: number) {
    const cx = w * 0.52 + this.cpuVibrateX;
    const cy = h * 0.44 + this.cpuVibrateY;
    const cpuW = w * 0.16;
    const cpuH = h * 0.14;

    // CPU base / open casing
    ctx.fillStyle = '#374151';
    drawRoundedRect(ctx, cx - cpuW / 2 - u * 2, cy - cpuH / 2 - u * 2, cpuW + u * 4, cpuH + u * 4, 4);
    ctx.fill();

    // CPU board (green PCB)
    ctx.fillStyle = '#166534';
    drawRoundedRect(ctx, cx - cpuW / 2, cy - cpuH / 2, cpuW, cpuH, 2);
    ctx.fill();

    // Internal components
    // Chip (center)
    ctx.fillStyle = '#1f2937';
    const chipSize = Math.min(cpuW, cpuH) * 0.4;
    ctx.fillRect(cx - chipSize / 2, cy - chipSize / 2, chipSize, chipSize);
    // Chip pins
    ctx.fillStyle = '#d4d4d8';
    for (let i = 0; i < 5; i++) {
      // Top pins
      ctx.fillRect(cx - chipSize / 2 + i * chipSize / 5 + 2, cy - chipSize / 2 - u, u * 0.8, u);
      // Bottom pins
      ctx.fillRect(cx - chipSize / 2 + i * chipSize / 5 + 2, cy + chipSize / 2, u * 0.8, u);
    }

    // Capacitors
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(cx + cpuW * 0.25, cy - cpuH * 0.3, u * 2, u * 3);
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(cx - cpuW * 0.35, cy + cpuH * 0.1, u * 2, u * 3);

    // Traces
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - chipSize / 2, cy);
    ctx.lineTo(cx - cpuW * 0.4, cy);
    ctx.moveTo(cx + chipSize / 2, cy);
    ctx.lineTo(cx + cpuW * 0.4, cy);
    ctx.stroke();

    // CPU glow (intensifies as focus timer grows)
    const focusGlow = clamp(this.cpuFocusTimer / 2.5, 0, 1);
    if (focusGlow > 0 || this.cpuPulse > 0.3) {
      drawGlow(ctx, cx, cy, 50 + focusGlow * 30, '#f59e0b', 0.08 + focusGlow * 0.2 + this.cpuPulse * 0.05);
    }

    // "CPU" label
    ctx.fillStyle = '#9ca3af';
    ctx.font = `${Math.max(9, u * 2.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('CPU', cx, cy + cpuH / 2 + u * 4);
  }

  private drawRFID(ctx: CanvasRenderingContext2D, w: number, h: number, u: number) {
    const prop = this.props.find(p => p.id === 'rfid')!;
    const px = prop.x;
    const py = prop.y;

    // RFID device body
    ctx.fillStyle = '#1e293b';
    drawRoundedRect(ctx, px, py, prop.w, prop.h, 4);
    ctx.fill();
    // Glowing panel
    const panelGlow = 0.3 + prop.glow * 0.7;
    ctx.fillStyle = colorWithAlpha('#22d3ee', panelGlow);
    drawRoundedRect(ctx, px + u * 2, py + u * 1.5, prop.w - u * 4, prop.h - u * 3, 2);
    ctx.fill();
    if (prop.glow > 0) {
      drawGlow(ctx, px + prop.w / 2, py + prop.h / 2, 30, '#22d3ee', prop.glow * 0.3);
    }
    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = `${Math.max(8, u * 2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('RFID', px + prop.w / 2, py + prop.h + u * 3);
  }

  private drawMonitor(ctx: CanvasRenderingContext2D, w: number, h: number, u: number) {
    const prop = this.props.find(p => p.id === 'monitor')!;
    const px = prop.x;
    const py = prop.y;

    // Monitor frame
    ctx.fillStyle = '#374151';
    drawRoundedRect(ctx, px - u, py - u, prop.w + u * 2, prop.h + u * 2, 4);
    ctx.fill();
    // Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px, py, prop.w, prop.h);

    // CLI text (scrolling)
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 2, py + 2, prop.w - 4, prop.h - 4);
    ctx.clip();

    const lineH = Math.max(10, u * 2.8);
    const scrollSpeed = prop.hovered ? 1.5 : 0.8;
    ctx.font = `${Math.max(7, u * 1.8)}px monospace`;
    ctx.fillStyle = '#4ade80';

    for (let i = 0; i < this.cliLines.length; i++) {
      const ly = py + 8 + i * lineH - (this.cliScrollY * scrollSpeed % (this.cliLines.length * lineH));
      const wrappedY = ly < py - lineH ? ly + this.cliLines.length * lineH : ly;
      if (wrappedY > py && wrappedY < py + prop.h) {
        ctx.fillText(this.cliLines[i], px + 6, wrappedY);
      }
    }
    ctx.restore();

    // Monitor glow
    if (prop.glow > 0) {
      drawGlow(ctx, px + prop.w / 2, py + prop.h / 2, 40, '#4ade80', prop.glow * 0.15);
    }

    // Monitor stand
    ctx.fillStyle = '#374151';
    ctx.fillRect(px + prop.w * 0.4, py + prop.h + u, prop.w * 0.2, u * 4);
    ctx.fillRect(px + prop.w * 0.25, py + prop.h + u * 4, prop.w * 0.5, u * 1.5);
  }

  private drawScanner(ctx: CanvasRenderingContext2D, w: number, h: number, u: number) {
    const prop = this.props.find(p => p.id === 'scanner')!;
    const px = prop.x;
    const py = prop.y;

    // Scanner body
    ctx.fillStyle = '#1e293b';
    drawRoundedRect(ctx, px, py, prop.w, prop.h, 4);
    ctx.fill();

    // Scan surface (fingerprint area)
    const scanGlow = 0.2 + prop.glow * 0.8;
    ctx.fillStyle = colorWithAlpha('#8b5cf6', scanGlow);
    drawRoundedRect(ctx, px + u * 1.5, py + u, prop.w - u * 3, prop.h - u * 2, 3);
    ctx.fill();

    // Fingerprint lines
    ctx.strokeStyle = colorWithAlpha('#a78bfa', scanGlow * 0.5);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(px + prop.w / 2, py + prop.h / 2, u * 1 + i * u * 0.8, Math.PI * 0.3, Math.PI * 1.7);
      ctx.stroke();
    }

    if (prop.glow > 0) {
      drawGlow(ctx, px + prop.w / 2, py + prop.h / 2, 25, '#8b5cf6', prop.glow * 0.3);
    }
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
