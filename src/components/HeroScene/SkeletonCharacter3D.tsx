'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SkeletonCharacter3DProps {
  activated: boolean;
  proximity: number;
  cursorPos: { x: number; y: number };
}

const BONE_COLOR = '#e8e0d4';
const BONE_SHADOW = '#c4b8a8';
const EYE_GLOW = '#7dd3fc';

export default function SkeletonCharacter3D({ activated, proximity, cursorPos }: SkeletonCharacter3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const eyeLightRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);
  const eyeGlowRef = useRef(0);
  const headTiltRef = useRef(-0.35);
  const torsoLeanRef = useRef(0.25);

  // Materials
  const boneMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: BONE_COLOR,
    roughness: 0.7,
    metalness: 0.05,
  }), []);

  const boneShadowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: BONE_SHADOW,
    roughness: 0.8,
    metalness: 0.05,
  }), []);

  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    emissive: EYE_GLOW,
    emissiveIntensity: 0,
    roughness: 0.3,
  }), []);

  // Dispose materials on unmount
  useEffect(() => {
    return () => {
      boneMat.dispose();
      boneShadowMat.dispose();
      eyeMat.dispose();
    };
  }, [boneMat, boneShadowMat, eyeMat]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;

    // Eye glow based on proximity and activation
    const targetGlow = activated ? 1.2 : proximity > 0.3 ? proximity * 0.8 : 0;
    eyeGlowRef.current += (targetGlow - eyeGlowRef.current) * dt * 3;
    eyeMat.emissiveIntensity = eyeGlowRef.current;

    // Update eye light intensity imperatively via ref
    if (eyeLightRef.current) {
      eyeLightRef.current.intensity = eyeGlowRef.current * 0.5;
    }

    // Head tilt — looks up when activated or proximity is high
    const targetTilt = activated ? 0 : proximity > 0.5 ? -0.1 : -0.35;
    headTiltRef.current += (targetTilt - headTiltRef.current) * dt * 2;
    if (headRef.current) {
      headRef.current.rotation.x = headTiltRef.current;
    }

    // Torso lean — straightens when activated
    const targetLean = activated ? 0.05 : 0.25;
    torsoLeanRef.current += (targetLean - torsoLeanRef.current) * dt * 1.5;
    if (torsoRef.current) {
      torsoRef.current.rotation.x = torsoLeanRef.current;
    }

    // Breathing when activated
    if (activated && groupRef.current) {
      const breath = Math.sin(timeRef.current * 1.8) * 0.008;
      groupRef.current.scale.y = 1 + breath;
    }

    // Subtle eye glow pulse
    if (eyeGlowRef.current > 0.1) {
      const pulse = Math.sin(timeRef.current * 3) * 0.1;
      eyeMat.emissiveIntensity = eyeGlowRef.current + pulse;
    }
  });

  return (
    <group ref={groupRef} position={[4, 0, 1]}>
      {/* Torso group (leans back for sitting) */}
      <group ref={torsoRef} position={[0, 0.5, 0]} rotation={[0.25, 0, 0]}>
        {/* Spine */}
        <mesh position={[0, 0.6, 0]} material={boneShadowMat}>
          <capsuleGeometry args={[0.04, 0.5, 4, 8]} />
        </mesh>

        {/* Ribs - 3 pairs */}
        {[0, 1, 2].map((i) => (
          <group key={i} position={[0, 0.9 - i * 0.15, 0]}>
            <mesh position={[-0.12, 0, 0.02]} rotation={[0, 0, 0.3]} material={boneMat}>
              <capsuleGeometry args={[0.02, 0.18 - i * 0.02, 4, 6]} />
            </mesh>
            <mesh position={[0.12, 0, 0.02]} rotation={[0, 0, -0.3]} material={boneMat}>
              <capsuleGeometry args={[0.02, 0.18 - i * 0.02, 4, 6]} />
            </mesh>
          </group>
        ))}

        {/* Shoulders */}
        <mesh position={[0, 0.95, 0]} rotation={[0, 0, Math.PI / 2]} material={boneMat}>
          <capsuleGeometry args={[0.03, 0.35, 4, 8]} />
        </mesh>

        {/* Left arm */}
        <group position={[-0.22, 0.9, 0]}>
          <mesh position={[0, -0.2, 0]} material={boneMat}>
            <capsuleGeometry args={[0.025, 0.25, 4, 6]} />
          </mesh>
          <mesh position={[0, -0.35, 0]} material={boneShadowMat}>
            <sphereGeometry args={[0.03, 8, 8]} />
          </mesh>
          <mesh position={[-0.02, -0.5, 0.05]} rotation={[0.3, 0, 0.1]} material={boneMat}>
            <capsuleGeometry args={[0.02, 0.2, 4, 6]} />
          </mesh>
        </group>

        {/* Right arm */}
        <group position={[0.22, 0.9, 0]}>
          <mesh position={[0, -0.2, 0]} material={boneMat}>
            <capsuleGeometry args={[0.025, 0.25, 4, 6]} />
          </mesh>
          <mesh position={[0, -0.35, 0]} material={boneShadowMat}>
            <sphereGeometry args={[0.03, 8, 8]} />
          </mesh>
          <mesh position={[0.02, -0.5, 0.05]} rotation={[0.3, 0, -0.1]} material={boneMat}>
            <capsuleGeometry args={[0.02, 0.2, 4, 6]} />
          </mesh>
        </group>

        {/* Head group */}
        <group ref={headRef} position={[0, 1.15, 0]} rotation={[-0.35, 0, 0]}>
          <mesh material={boneMat}>
            <sphereGeometry args={[0.22, 16, 16]} />
          </mesh>
          <mesh position={[0, -0.12, 0.08]} material={boneShadowMat}>
            <sphereGeometry args={[0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.08, 0.02, 0.18]} material={eyeMat}>
            <sphereGeometry args={[0.04, 12, 12]} />
          </mesh>
          <mesh position={[0.08, 0.02, 0.18]} material={eyeMat}>
            <sphereGeometry args={[0.04, 12, 12]} />
          </mesh>

          {/* Eye glow light — updated via ref in useFrame */}
          <pointLight
            ref={eyeLightRef}
            position={[0, 0.02, 0.22]}
            intensity={0}
            color={EYE_GLOW}
            distance={1.5}
            decay={2}
          />
        </group>
      </group>

      {/* Pelvis */}
      <mesh position={[0, 0.45, 0.05]} material={boneShadowMat}>
        <sphereGeometry args={[0.08, 8, 8]} />
      </mesh>

      {/* Left leg */}
      <group position={[-0.08, 0.4, 0]}>
        <mesh position={[0, -0.05, 0.18]} rotation={[1.2, 0, 0]} material={boneMat}>
          <capsuleGeometry args={[0.03, 0.3, 4, 6]} />
        </mesh>
        <mesh position={[0, -0.08, 0.38]} material={boneShadowMat}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
        <mesh position={[0, -0.15, 0.52]} rotation={[0.4, 0, 0]} material={boneMat}>
          <capsuleGeometry args={[0.025, 0.25, 4, 6]} />
        </mesh>
      </group>

      {/* Right leg */}
      <group position={[0.08, 0.4, 0]}>
        <mesh position={[0, -0.05, 0.18]} rotation={[1.2, 0, 0]} material={boneMat}>
          <capsuleGeometry args={[0.03, 0.3, 4, 6]} />
        </mesh>
        <mesh position={[0, -0.08, 0.38]} material={boneShadowMat}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
        <mesh position={[0, -0.15, 0.52]} rotation={[0.4, 0, 0]} material={boneMat}>
          <capsuleGeometry args={[0.025, 0.25, 4, 6]} />
        </mesh>
      </group>
    </group>
  );
}
