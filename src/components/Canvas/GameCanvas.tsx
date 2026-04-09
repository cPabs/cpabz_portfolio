'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Renderer } from '@/engine/Renderer';
import { InputManager } from '@/engine/InputManager';
import { SceneManager } from '@/engine/SceneManager';
import { AudioManager } from '@/systems/AudioManager';
import { SceneAwakening } from '@/components/Scenes/SceneAwakening';
import { SceneLab } from '@/components/Scenes/SceneLab';
import { SceneAICore } from '@/components/Scenes/SceneAICore';
import { SceneHardware } from '@/components/Scenes/SceneHardware';
import { SceneSoul } from '@/components/Scenes/SceneSoul';
import { SceneExplore } from '@/components/Scenes/SceneExplore';
import { useGameStore } from '@/store/gameStore';
import { SceneId } from '@/types';

interface GameCanvasProps {
  active: boolean;
}

export default function GameCanvas({ active }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const initializedRef = useRef(false);

  const {
    currentScene,
    advanceScene,
    attachPart,
    showSpeechBubble,
    hideSpeechBubble,
    enableAudio,
    audioEnabled,
  } = useGameStore();

  const handleSpeech = useCallback((text: string) => {
    showSpeechBubble(text);
    setTimeout(() => hideSpeechBubble(), 3500);
  }, [showSpeechBubble, hideSpeechBubble]);

  const handleSceneComplete = useCallback((sceneId: SceneId) => {
    // Attach character parts based on scene
    switch (sceneId) {
      case 'lab': attachPart('heart'); break;
      case 'aicore': attachPart('brain'); break;
      case 'hardware': attachPart('body'); break;
      case 'soul': attachPart('soul'); break;
    }
    // Advance to next scene
    setTimeout(() => advanceScene(), 500);
  }, [advanceScene, attachPart]);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current || initializedRef.current || !active) return;
    initializedRef.current = true;

    const canvas = canvasRef.current;
    const inputManager = new InputManager();
    const audioManager = new AudioManager();

    inputManager.init(canvas);
    audioManager.init();

    const renderer = new Renderer(canvas, inputManager);
    const sceneManager = new SceneManager(renderer);

    // Create all scenes
    const am = audioManager as unknown as { playSFX: (t: string) => void; startLayer: (id: string, vol?: number) => void };

    const scenes = [
      new SceneAwakening(
        handleSpeech,
        () => handleSceneComplete('awakening'),
        am
      ),
      new SceneLab(
        handleSpeech,
        () => handleSceneComplete('lab'),
        am
      ),
      new SceneAICore(
        handleSpeech,
        () => handleSceneComplete('aicore'),
        am
      ),
      new SceneHardware(
        handleSpeech,
        () => handleSceneComplete('hardware'),
        am
      ),
      new SceneSoul(
        handleSpeech,
        () => handleSceneComplete('soul'),
        am
      ),
      new SceneExplore(handleSpeech),
    ];

    for (const scene of scenes) {
      sceneManager.registerScene(scene);
    }

    rendererRef.current = renderer;
    sceneManagerRef.current = sceneManager;
    inputManagerRef.current = inputManager;
    audioManagerRef.current = audioManager;

    renderer.start();

    return () => {
      renderer.cleanup();
      inputManager.cleanup();
      audioManager.cleanup();
      initializedRef.current = false;
    };
  }, [active, handleSpeech, handleSceneComplete]);

  // Handle scene transitions
  useEffect(() => {
    if (!sceneManagerRef.current || !active) return;
    if (currentScene === 'prologue') return;

    const sm = sceneManagerRef.current;

    if (currentScene === 'awakening') {
      // First scene - load directly
      sm.loadScene('awakening');
    } else {
      sm.transitionTo(currentScene);
    }
  }, [currentScene, active]);

  // Enable audio when store flag changes
  useEffect(() => {
    if (audioEnabled && audioManagerRef.current) {
      audioManagerRef.current.enable();
    }
  }, [audioEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full touch-none"
      style={{ background: '#0a0a0f' }}
    />
  );
}
