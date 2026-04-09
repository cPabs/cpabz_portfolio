'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Prologue from '@/components/UI/Prologue';
import SpeechBubble from '@/components/UI/SpeechBubble';
import { useGameStore } from '@/store/gameStore';

const GameCanvas = dynamic(() => import('@/components/Canvas/GameCanvas'), {
  ssr: false,
});

export default function ExperienceManager() {
  const [prologueComplete, setPrologueComplete] = useState(false);
  const {
    currentScene,
    speechBubble,
    advanceScene,
    enableAudio,
  } = useGameStore();

  const handlePrologueComplete = useCallback(() => {
    enableAudio();
    setPrologueComplete(true);
    setTimeout(() => advanceScene(), 300);
  }, [enableAudio, advanceScene]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0f]">
      <GameCanvas active={prologueComplete} />

      {currentScene === 'prologue' && (
        <Prologue onComplete={handlePrologueComplete} />
      )}

      <SpeechBubble
        text={speechBubble?.text || null}
        visible={speechBubble?.visible || false}
      />
    </div>
  );
}
