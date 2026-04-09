import { InputState, Vec2 } from '@/types';

export class InputManager {
  private state: InputState = {
    mouse: { x: 0, y: 0 },
    mouseNormalized: { x: 0.5, y: 0.5 },
    isDown: false,
    isDragging: false,
    dragStart: null,
    dragDelta: { x: 0, y: 0 },
    clicked: false,
    hoverTargets: [],
  };

  private canvas: HTMLCanvasElement | null = null;
  private clickConsumed = false;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
  }

  cleanup() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  getState(): InputState {
    return { ...this.state };
  }

  consumeClick() {
    this.clickConsumed = true;
    this.state.clicked = false;
  }

  endFrame() {
    if (this.clickConsumed) {
      this.state.clicked = false;
      this.clickConsumed = false;
    } else {
      this.state.clicked = false;
    }
  }

  private getCanvasPos(clientX: number, clientY: number): Vec2 {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private updateNormalized() {
    if (!this.canvas) return;
    this.state.mouseNormalized = {
      x: this.state.mouse.x / this.canvas.width,
      y: this.state.mouse.y / this.canvas.height,
    };
  }

  private onMouseMove = (e: MouseEvent) => {
    this.state.mouse = this.getCanvasPos(e.clientX, e.clientY);
    this.updateNormalized();
    if (this.state.isDown && this.state.dragStart) {
      this.state.isDragging = true;
      this.state.dragDelta = {
        x: this.state.mouse.x - this.state.dragStart.x,
        y: this.state.mouse.y - this.state.dragStart.y,
      };
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    this.state.isDown = true;
    this.state.dragStart = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouse = this.state.dragStart;
    this.updateNormalized();
  };

  private onMouseUp = () => {
    if (!this.state.isDragging) {
      this.state.clicked = true;
    }
    this.state.isDown = false;
    this.state.isDragging = false;
    this.state.dragStart = null;
    this.state.dragDelta = { x: 0, y: 0 };
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    this.state.mouse = this.getCanvasPos(touch.clientX, touch.clientY);
    this.state.isDown = true;
    this.state.dragStart = { ...this.state.mouse };
    this.updateNormalized();
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    this.state.mouse = this.getCanvasPos(touch.clientX, touch.clientY);
    this.updateNormalized();
    if (this.state.dragStart) {
      this.state.isDragging = true;
      this.state.dragDelta = {
        x: this.state.mouse.x - this.state.dragStart.x,
        y: this.state.mouse.y - this.state.dragStart.y,
      };
    }
  };

  private onTouchEnd = () => {
    if (!this.state.isDragging) {
      this.state.clicked = true;
    }
    this.state.isDown = false;
    this.state.isDragging = false;
    this.state.dragStart = null;
    this.state.dragDelta = { x: 0, y: 0 };
  };
}
