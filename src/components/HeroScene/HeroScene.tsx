'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import HeroEnvironment from './HeroEnvironment';
import CrowdSystem from './CrowdSystem';
import SkeletonCharacter3D from './SkeletonCharacter3D';
import RadialDarkness from './RadialDarkness';
import AmbientText from './AmbientText';
import { useGameStore } from '@/store/gameStore';

interface HeroSceneProps {
  onComplete: () => void;
}

export default function HeroScene({ onComplete }: HeroSceneProps) {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [proximity, setProximity] = useState(0);
  const [activated, setActivated] = useState(false);
  const [textPhase, setTextPhase] = useState(0);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activationTimerRef = useRef(0);
  const { showSpeechBubble, hideSpeechBubble } = useGameStore();
  const completedRef = useRef(false);

  // Only render Canvas after mount (prevents SSR/hydration issues)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track skeleton screen position (bottom-right)
  const getSkeletonScreenPos = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: w * 0.75, y: h * 0.72 };
  }, []);

  // Mouse/touch tracking
  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    setCursorPos({ x, y });

    const skeleton = getSkeletonScreenPos();
    const dx = x - skeleton.x;
    const dy = y - skeleton.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Scale zones for mobile
    const zoneFactor = Math.min(window.innerWidth, window.innerHeight) / 900;
    const scaledDist = dist / Math.max(zoneFactor, 0.5);

    let prox = 0;
    if (scaledDist < 100) prox = 1;
    else if (scaledDist < 200) prox = 1 - (scaledDist - 100) / 100;
    else if (scaledDist < 400) prox = 0.3 * (1 - (scaledDist - 200) / 200);
    setProximity(prox);
  }, [getSkeletonScreenPos]);

  // Activation timer
  useEffect(() => {
    if (activated) return;
    const interval = setInterval(() => {
      if (proximity >= 0.9) {
        activationTimerRef.current += 0.05;
        if (activationTimerRef.current >= 2) {
          setActivated(true);
          showSpeechBubble('oh… you found me.');
          setTimeout(() => {
            hideSpeechBubble();
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete();
            }
          }, 3500);
        }
      } else {
        activationTimerRef.current = Math.max(0, activationTimerRef.current - 0.1);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [proximity, activated, onComplete, showSpeechBubble, hideSpeechBubble]);

  // Ambient text phases
  useEffect(() => {
    if (activated) return;
    const timers = [
      setTimeout(() => setTextPhase(1), 3000),
      setTimeout(() => setTextPhase(0), 6000),
      setTimeout(() => setTextPhase(2), 7000),
      setTimeout(() => setTextPhase(0), 10000),
      setTimeout(() => setTextPhase(3), 11000),
      setTimeout(() => setTextPhase(0), 14000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [activated]);

  if (!mounted) {
    return <div className="fixed inset-0 bg-[#08080f]" />;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full"
      onPointerMove={handlePointerMove}
    >
      <Canvas
        camera={{ position: [0, 2.5, 12], fov: 45 }}
        dpr={[1, 1.5]}
        style={{ background: '#08080f' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#08080f');
        }}
      >
        <HeroEnvironment proximity={proximity} />
        <CrowdSystem proximity={proximity} />
        <SkeletonCharacter3D
          activated={activated}
          proximity={proximity}
          cursorPos={cursorPos}
        />
        <RadialDarkness />
        <Preload all />
      </Canvas>

      {/* Ambient text overlay */}
      <AmbientText phase={textPhase} activated={activated} />

      {/* Mobile touch hint */}
      {!activated && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none sm:hidden">
          <p className="text-slate-600 text-[11px] tracking-wider lowercase opacity-40">
            touch near the quiet corner
          </p>
        </div>
      )}
    </div>
  );
}
