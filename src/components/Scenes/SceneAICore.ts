import { Scene, InputState, Vec2 } from '@/types';
import { COLORS } from '@/utils/colors';
import { distance, lerp, randomInRange } from '@/utils/math';
import { drawGlow, drawCircle, drawVignette, colorWithAlpha, drawSpeechLine } from '@/utils/drawing';
import { createSkeleton, updateSkeleton, renderSkeleton, SkeletonState } from '@/entities/Skeleton';
import { ParticleSystem } from '@/systems/ParticleSystem';

interface NeuralNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  connected: boolean;
  active: boolean;
  bobPhase: number;
  glow: number;
}

interface Connection {
  from: number;
  to: number;
  progress: number;
  lightPos: number;
}

export class SceneAICore implements Scene {
  id = 'aicore' as const;
  private skeleton!: SkeletonState;
  private particles = new ParticleSystem(80);
  private nodes: NeuralNode[] = [];
  private connections: Connection[] = [];
  private selectedNode: number = -1;
  private complete = false;
  private puzzleComplete = false;
  private brainForming = false;
  private brainFormTimer = 0;
  private brainAttached = false;
  private width = 0;
  private height = 0;
  private time = 0;
  private orbPulse = 0;
  private connectionsNeeded = 0;
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
    this.skeleton = createSkeleton(width / 2, height / 2 + 100);
    this.skeleton.isAwake = true;
    this.skeleton.slump = 0;
    this.skeleton.eyeGlow = 0.8;
    this.skeleton.followSpeed = 0.02;
    this.complete = false;
    this.puzzleComplete = false;
    this.brainForming = false;
    this.brainAttached = false;
    this.time = 0;
    this.selectedNode = -1;
    this.connections = [];

    // Create 8 nodes in a circle around center orb
    const cx = width / 2;
    const cy = height / 2 - 40;
    const orbRadius = 120;
    this.nodes = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const nx = cx + Math.cos(angle) * orbRadius;
      const ny = cy + Math.sin(angle) * orbRadius;
      this.nodes.push({
        x: nx, y: ny,
        baseX: nx, baseY: ny,
        radius: 14,
        connected: false,
        active: false,
        bobPhase: randomInRange(0, Math.PI * 2),
        glow: 0,
      });
    }

    // Define valid connections (4 pairs = 4 connections needed)
    this.connectionsNeeded = 4;

    this.audioManager?.startLayer('ambient', 0.2);
  }

  update(dt: number, input: InputState) {
    this.time += dt;
    this.orbPulse = (Math.sin(this.time * 1.5) + 1) / 2;

    // Update skeleton
    this.skeleton.targetX = this.width / 2;
    this.skeleton.targetY = this.height / 2 + 100;
    this.skeleton = updateSkeleton(this.skeleton, dt, null);

    if (!this.puzzleComplete) {
      // Update node hover/glow
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        node.bobPhase += dt;
        node.x = node.baseX + Math.sin(node.bobPhase * 0.8) * 3;
        node.y = node.baseY + Math.cos(node.bobPhase * 1.1) * 3;

        const dist = distance(input.mouse, { x: node.x, y: node.y });
        const targetGlow = dist < 50 ? 1 : dist < 100 ? (100 - dist) / 100 : 0;
        node.glow = lerp(node.glow, targetGlow, dt * 8);

        // Click to select/connect
        if (input.clicked && dist < 40 && !node.connected) {
          if (this.selectedNode === -1) {
            this.selectedNode = i;
            node.active = true;
            this.audioManager?.playSFX('click');
          } else if (this.selectedNode !== i) {
            // Create connection
            this.createConnection(this.selectedNode, i);
            this.nodes[this.selectedNode].active = false;
            this.selectedNode = -1;
          }
        }
      }
    }

    // Update connections
    for (const conn of this.connections) {
      if (conn.progress < 1) {
        conn.progress = Math.min(1, conn.progress + dt * 2);
      }
      conn.lightPos = (conn.lightPos + dt * 0.5) % 1;
    }

    // Brain forming animation
    if (this.brainForming) {
      this.brainFormTimer += dt;

      // Nodes collapse toward center
      const cx = this.width / 2;
      const cy = this.height / 2 - 40;
      for (const node of this.nodes) {
        node.baseX = lerp(node.baseX, cx, dt * 2);
        node.baseY = lerp(node.baseY, cy, dt * 2);
        node.x = node.baseX;
        node.y = node.baseY;
      }

      if (this.brainFormTimer > 2 && !this.brainAttached) {
        this.brainAttached = true;
        this.particles.emitEnergy(cx, cy, 20, COLORS.brainPurple);
        this.audioManager?.startLayer('synth', 0.25);
        this.onSpeech?.('curiosity made me who i am.');
        this.completionTimer = 3.5;
      }
    }

    if (this.brainAttached) {
      this.completionTimer -= dt;
      if (this.completionTimer <= 0 && !this.complete) {
        this.complete = true;
        this.onComplete?.();
      }
    }

    this.particles.update(dt);
  }

  private createConnection(from: number, to: number) {
    this.connections.push({ from, to, progress: 0, lightPos: 0 });
    this.nodes[from].connected = true;
    this.nodes[to].connected = true;
    this.audioManager?.playSFX('connect');
    this.particles.emitEnergy(
      (this.nodes[from].x + this.nodes[to].x) / 2,
      (this.nodes[from].y + this.nodes[to].y) / 2,
      6, COLORS.neuralLine
    );

    // Check puzzle complete
    if (this.connections.length >= this.connectionsNeeded) {
      this.puzzleComplete = true;
      this.brainForming = true;
      this.brainFormTimer = 0;
      this.audioManager?.playSFX('discovery');
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Dark chamber background
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    gradient.addColorStop(0, '#1a1030');
    gradient.addColorStop(1, '#0a0a15');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 - 40;

    // Central neural orb
    if (!this.brainForming || this.brainFormTimer < 1.5) {
      drawGlow(ctx, cx, cy, 60 + this.orbPulse * 15, COLORS.brainPurple, 0.2 + this.orbPulse * 0.1);
      drawCircle(ctx, cx, cy, 25, colorWithAlpha(COLORS.brainBlue, 0.3 + this.orbPulse * 0.2));
    }

    // Connection lines
    for (const conn of this.connections) {
      const from = this.nodes[conn.from];
      const to = this.nodes[conn.to];
      drawSpeechLine(ctx, from.x, from.y, to.x, to.y, conn.progress, COLORS.neuralLine);

      // Traveling light
      if (conn.progress >= 1) {
        const lx = lerp(from.x, to.x, conn.lightPos);
        const ly = lerp(from.y, to.y, conn.lightPos);
        drawGlow(ctx, lx, ly, 8, COLORS.nodeActive, 0.8);
      }
    }

    // Nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const isSelected = this.selectedNode === i;
      const color = node.connected ? COLORS.nodeActive : isSelected ? COLORS.eyeGlowBright : COLORS.nodeInactive;

      if (node.glow > 0 || node.connected) {
        drawGlow(ctx, node.x, node.y, 30, color, (node.glow || 0.3) * 0.5);
      }
      drawCircle(ctx, node.x, node.y, node.radius, color, undefined, 0);

      // Inner glow
      drawCircle(ctx, node.x, node.y, node.radius * 0.6,
        colorWithAlpha(color, 0.6));
    }

    // Particles
    this.particles.render(ctx);

    // Skeleton (with heart, and brain if attached)
    renderSkeleton(ctx, this.skeleton,
      { hasHeart: true, hasBrain: this.brainAttached, hasBody: false },
      this.brainAttached ? null : { x: cx, y: cy }
    );

    drawVignette(ctx, width, height, 0.7);
  }

  cleanup() { this.particles.clear(); }
  isComplete() { return this.complete; }
  onResize(width: number, height: number) { this.width = width; this.height = height; }
}
