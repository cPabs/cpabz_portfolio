import { Particle } from '@/types';
import { randomInRange } from '@/utils/math';
import { colorWithAlpha } from '@/utils/drawing';

export class ParticleSystem {
  particles: Particle[] = [];
  private maxParticles: number;

  constructor(max: number = 100) {
    this.maxParticles = max;
  }

  emit(x: number, y: number, count: number, config: {
    color?: string;
    speedMin?: number;
    speedMax?: number;
    sizeMin?: number;
    sizeMax?: number;
    lifeMin?: number;
    lifeMax?: number;
    directionMin?: number;
    directionMax?: number;
  } = {}) {
    const {
      color = '#fef3c7',
      speedMin = 10,
      speedMax = 40,
      sizeMin = 1,
      sizeMax = 3,
      lifeMin = 0.5,
      lifeMax = 2,
      directionMin = 0,
      directionMax = Math.PI * 2,
    } = config;

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = randomInRange(directionMin, directionMax);
      const speed = randomInRange(speedMin, speedMax);
      const life = randomInRange(lifeMin, lifeMax);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: randomInRange(sizeMin, sizeMax),
        color,
        alpha: 1,
      });
    }
  }

  emitDust(x: number, y: number, count: number = 3) {
    this.emit(x, y, count, {
      color: '#fef3c7',
      speedMin: 5,
      speedMax: 15,
      sizeMin: 1,
      sizeMax: 2.5,
      lifeMin: 2,
      lifeMax: 5,
      directionMin: -Math.PI * 0.8,
      directionMax: -Math.PI * 0.2,
    });
  }

  emitEnergy(x: number, y: number, count: number = 8, color: string = '#22d3ee') {
    this.emit(x, y, count, {
      color,
      speedMin: 30,
      speedMax: 80,
      sizeMin: 1.5,
      sizeMax: 4,
      lifeMin: 0.3,
      lifeMax: 0.8,
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 5 * dt; // slight float upward
      p.vx *= 0.99;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      if (p.size > 2) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, colorWithAlpha(p.color, p.alpha * 0.3));
        gradient.addColorStop(1, colorWithAlpha(p.color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
