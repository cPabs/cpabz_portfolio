export type SceneId = 'prologue' | 'awakening' | 'lab' | 'aicore' | 'hardware' | 'soul' | 'explore';

export const SCENE_ORDER: SceneId[] = ['prologue', 'awakening', 'lab', 'aicore', 'hardware', 'soul', 'explore'];

export interface Vec2 {
  x: number;
  y: number;
}

export interface Scene {
  id: SceneId;
  init(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  update(dt: number, input: InputState): void;
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  cleanup(): void;
  isComplete(): boolean;
  onResize(width: number, height: number): void;
}

export interface InputState {
  mouse: Vec2;
  mouseNormalized: Vec2;
  isDown: boolean;
  isDragging: boolean;
  dragStart: Vec2 | null;
  dragDelta: Vec2;
  clicked: boolean;
  hoverTargets: string[];
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export interface CharacterParts {
  hasHeart: boolean;
  hasBrain: boolean;
  hasBody: boolean;
  hasSoul: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}
