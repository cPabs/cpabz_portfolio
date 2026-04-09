'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Prologue from '@/components/UI/Prologue';
import SpeechBubble from '@/components/UI/SpeechBubble';
import { useGameStore } from '@/store/gameStore';

// Dynamic imports to avoid SSR issues with Canvas/WebGL
const GameCanvas = dynamic(() => import('@/components/Canvas/GameCanvas'), {
  ssr: false,
});
const HeroScene = dynamic(() => import('@/components/HeroScene/HeroScene'), {
  ssr: false,
});

export default function ExperienceManager() {
  const [prologueComplete, setPrologueComplete] = useState(false);
  const [heroComplete, setHeroComplete] = useState(false);
  const {
    currentScene,
    speechBubble,
    advanceScene,
    enableAudio,
    attachPart,
  } = useGameStore();

  const handlePrologueComplete = useCallback(() => {
    enableAudio();
    setPrologueComplete(true);
    setTimeout(() => advanceScene(), 300);
  }, [enableAudio, advanceScene]);

  const handleHeroComplete = useCallback(() => {
    setHeroComplete(true);
    // Advance from awakening to lab
    setTimeout(() => advanceScene(), 800);
  }, [advanceScene]);

  // Determine which renderer to show
  const showHero = prologueComplete && currentScene === 'awakening' && !heroComplete;
  const showCanvasScenes = heroComplete && currentScene !== 'prologue' && currentScene !== 'awakening';

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#08080f]">
      {/* R3F Hero Scene (Scene 1) */}
      {showHero && (
        <HeroScene onComplete={handleHeroComplete} />
      )}

      {/* Canvas 2D scenes (Scenes 2-6) */}
      {showCanvasScenes && (
        <GameCanvas active={true} />
      )}

      {/* Prologue overlay */}
      {currentScene === 'prologue' && (
        <Prologue onComplete={handlePrologueComplete} />
      )}

      {/* Speech bubble overlay (always available) */}
      <SpeechBubble
        text={speechBubble?.text || null}
        visible={speechBubble?.visible || false}
      />
    </div>
  );
}
