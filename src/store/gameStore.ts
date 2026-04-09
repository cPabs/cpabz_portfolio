'use client';

import { create } from 'zustand';
import { SceneId, SCENE_ORDER } from '@/types';

interface GameState {
  currentScene: SceneId;
  sceneProgress: Record<SceneId, number>;
  unlockedScenes: SceneId[];
  characterState: {
    hasHeart: boolean;
    hasBrain: boolean;
    hasBody: boolean;
    hasSoul: boolean;
    isFullyFormed: boolean;
  };
  audioEnabled: boolean;
  isTransitioning: boolean;
  speechBubble: { text: string; visible: boolean } | null;

  // Actions
  advanceScene: () => void;
  setProgress: (scene: SceneId, progress: number) => void;
  attachPart: (part: 'heart' | 'brain' | 'body' | 'soul') => void;
  enableAudio: () => void;
  setTransitioning: (v: boolean) => void;
  showSpeechBubble: (text: string) => void;
  hideSpeechBubble: () => void;
  setScene: (scene: SceneId) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentScene: 'prologue',
  sceneProgress: {
    prologue: 0, awakening: 0, lab: 0, aicore: 0, hardware: 0, soul: 0, explore: 0,
  },
  unlockedScenes: ['prologue'],
  characterState: {
    hasHeart: false,
    hasBrain: false,
    hasBody: false,
    hasSoul: false,
    isFullyFormed: false,
  },
  audioEnabled: false,
  isTransitioning: false,
  speechBubble: null,

  advanceScene: () => {
    const { currentScene, unlockedScenes } = get();
    const currentIndex = SCENE_ORDER.indexOf(currentScene);
    if (currentIndex < SCENE_ORDER.length - 1) {
      const nextScene = SCENE_ORDER[currentIndex + 1];
      set({
        currentScene: nextScene,
        unlockedScenes: unlockedScenes.includes(nextScene)
          ? unlockedScenes
          : [...unlockedScenes, nextScene],
      });
    }
  },

  setScene: (scene: SceneId) => set({ currentScene: scene }),

  setProgress: (scene, progress) =>
    set((state) => ({
      sceneProgress: { ...state.sceneProgress, [scene]: progress },
    })),

  attachPart: (part) =>
    set((state) => {
      const newState = { ...state.characterState, [`has${part.charAt(0).toUpperCase() + part.slice(1)}`]: true };
      newState.isFullyFormed = newState.hasHeart && newState.hasBrain && newState.hasBody && newState.hasSoul;
      return { characterState: newState };
    }),

  enableAudio: () => set({ audioEnabled: true }),
  setTransitioning: (v) => set({ isTransitioning: v }),
  showSpeechBubble: (text) => set({ speechBubble: { text, visible: true } }),
  hideSpeechBubble: () => set({ speechBubble: null }),
}));
