'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HeroEnvironmentProps {
  proximity: number;
}

export default function HeroEnvironment({ proximity }: HeroEnvironmentProps) {
  const fogRef = useRef<THREE.FogExp2>(null);

  useFrame(() => {
    if (fogRef.current) {
      // Fog gets slightly denser as proximity increases
      fogRef.current.density = 0.04 + proximity * 0.01;
    }
  });

  return (
    <>
      {/* Fog */}
      <fogExp2 ref={fogRef} attach="fog" args={['#08080f', 0.04]} />

      {/* Ambient light — warm-neutral, low */}
      <ambientLight intensity={0.25} color="#e8dcc8" />

      {/* Main directional light — soft from above-left */}
      <directionalLight
        position={[-5, 8, 5]}
        intensity={0.4}
        color="#f0e8d8"
        castShadow={false}
      />

      {/* Rim light on skeleton area (bottom-right) */}
      <pointLight
        position={[4, 1.5, 2]}
        intensity={0.15}
        color="#7dd3fc"
        distance={8}
        decay={2}
      />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#0c0c14"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* Subtle ground grid lines */}
      <gridHelper
        args={[60, 60, '#151520', '#151520']}
        position={[0, 0.01, 0]}
      />
    </>
  );
}
