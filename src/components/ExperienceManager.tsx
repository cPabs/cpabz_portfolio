'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Prologue from '@/components/UI/Prologue';
import SpeechBubble from '@/components/UI/SpeechBubble';
import { useGameStore } from '@/store/gameStore';

// Dynamic import to avoid SSR issues with Canvas
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
    // Small delay then advance to awakening scene
    setTimeout(() => advanceScene(), 300);
  }, [enableAudio, advanceScene]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0f]">
      {/* Canvas (always rendered, becomes active after prologue) */}
      <GameCanvas active={prologueComplete} />

      {/* Prologue overlay */}
      {currentScene === 'prologue' && (
        <Prologue onComplete={handlePrologueComplete} />
      )}

      {/* Speech bubble overlay */}
      <SpeechBubble
        text={speechBubble?.text || null}
        visible={speechBubble?.visible || false}
      />

      {/* Mobile touch hint (shows briefly) */}
      {prologueComplete && currentScene === 'awakening' && (
        <MobileTouchHint />
      )}
    </div>
  );
}

function MobileTouchHint() {
  const [visible, setVisible] = useState(true);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window);
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible || !isTouch) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="px-4 py-2 rounded-full bg-slate-900/60 backdrop-blur-sm border border-slate-700/20">
        <p className="text-slate-500 text-xs tracking-wider lowercase">
          touch and explore
        </p>
      </div>
    </div>
  );
}
