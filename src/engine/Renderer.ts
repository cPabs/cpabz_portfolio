import { Scene, InputState } from '@/types';
import { InputManager } from './InputManager';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private currentScene: Scene | null = null;
  private inputManager: InputManager;
  private fadeAlpha: number = 0;
  private fadeTarget: number = 0;
  private fadeSpeed: number = 2;
  private onFadeComplete: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, inputManager: InputManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.inputManager = inputManager;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  resize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
    this.currentScene?.onResize(window.innerWidth, window.innerHeight);
  };

  get width() { return window.innerWidth; }
  get height() { return window.innerHeight; }

  setScene(scene: Scene) {
    this.currentScene?.cleanup();
    this.currentScene = scene;
    scene.init(this.ctx, this.width, this.height);
  }

  fadeOut(duration: number = 0.5): Promise<void> {
    return new Promise((resolve) => {
      this.fadeTarget = 1;
      this.fadeSpeed = 1 / duration;
      this.onFadeComplete = resolve;
    });
  }

  fadeIn(duration: number = 0.5): Promise<void> {
    return new Promise((resolve) => {
      this.fadeTarget = 0;
      this.fadeSpeed = 1 / duration;
      this.onFadeComplete = resolve;
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animId);
  }

  cleanup() {
    this.stop();
    this.currentScene?.cleanup();
    window.removeEventListener('resize', this.resize);
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;

    const input = this.inputManager.getState();

    // Update
    this.currentScene?.update(dt, input);

    // Update fade
    if (this.fadeAlpha !== this.fadeTarget) {
      const dir = this.fadeTarget > this.fadeAlpha ? 1 : -1;
      this.fadeAlpha += dir * this.fadeSpeed * dt;
      if ((dir > 0 && this.fadeAlpha >= this.fadeTarget) ||
          (dir < 0 && this.fadeAlpha <= this.fadeTarget)) {
        this.fadeAlpha = this.fadeTarget;
        this.onFadeComplete?.();
        this.onFadeComplete = null;
      }
    }

    // Render
    this.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.currentScene?.render(this.ctx, this.width, this.height);

    // Fade overlay
    if (this.fadeAlpha > 0) {
      this.ctx.fillStyle = `rgba(10, 10, 15, ${this.fadeAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.ctx.restore();

    this.inputManager.endFrame();

    this.animId = requestAnimationFrame(this.loop);
  };
}
