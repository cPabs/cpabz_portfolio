import { Scene, SceneId } from '@/types';
import { Renderer } from './Renderer';

export class SceneManager {
  private scenes: Map<SceneId, Scene> = new Map();
  private renderer: Renderer;
  private onSceneComplete: ((sceneId: SceneId) => void) | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  registerScene(scene: Scene) {
    this.scenes.set(scene.id, scene);
  }

  onComplete(cb: (sceneId: SceneId) => void) {
    this.onSceneComplete = cb;
  }

  async transitionTo(sceneId: SceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    await this.renderer.fadeOut(0.4);
    this.renderer.setScene(scene);
    await this.renderer.fadeIn(0.4);
  }

  loadScene(sceneId: SceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    this.renderer.setScene(scene);
  }

  getScene(sceneId: SceneId): Scene | undefined {
    return this.scenes.get(sceneId);
  }

  notifyComplete(sceneId: SceneId) {
    this.onSceneComplete?.(sceneId);
  }
}
