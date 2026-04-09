'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface CrowdSystemProps {
  proximity: number;
}

interface CrowdMember {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  position: THREE.Vector3;
  direction: number;
  speed: number;
  currentSpeed: number;
  pathStart: number;
  pathEnd: number;
  zPos: number;
  scale: number;
}

export default function CrowdSystem({ proximity }: CrowdSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/crowd-character.glb');
  const membersRef = useRef<CrowdMember[]>([]);
  const targetSpeedRef = useRef(1);

  const crowdCount = useMemo(() => {
    if (typeof window === 'undefined') return 25;
    return window.innerWidth < 640 ? 15 : 28;
  }, []);

  // Initialize crowd
  useEffect(() => {
    if (!scene || !animations.length || !groupRef.current) return;

    const members: CrowdMember[] = [];
    const clip = animations[0];

    for (let i = 0; i < crowdCount; i++) {
      // Compute path BEFORE cloning (avoid wasting resources on skipped members)
      const goingRight = Math.random() > 0.5;
      const zPos = -8 + Math.random() * 16;
      const pathStart = goingRight ? -15 : 15;
      const pathEnd = goingRight ? 15 : -15;
      const startProgress = Math.random();
      const x = pathStart + (pathEnd - pathStart) * startProgress;
      const speed = 0.4 + Math.random() * 0.8;
      const scale = 0.7 + Math.random() * 0.4;

      // Skip characters that would overlap skeleton zone
      if (x > 2.5 && zPos > -2 && zPos < 3 && Math.random() < 0.6) {
        continue;
      }

      // Use SkeletonUtils.clone to properly clone SkinnedMesh + skeleton
      const clone = skeletonClone(scene);

      // Desaturate material on cloned meshes
      clone.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const sm = child as THREE.SkinnedMesh;
          const mat = (sm.material as THREE.MeshStandardMaterial).clone();
          const hue = 0.55 + Math.random() * 0.15;
          const sat = 0.05 + Math.random() * 0.1;
          mat.color.setHSL(hue, sat, 0.25 + Math.random() * 0.15);
          mat.roughness = 0.9;
          sm.material = mat;
        }
      });

      const mixer = new THREE.AnimationMixer(clone);
      const action = mixer.clipAction(clip);
      action.play();
      action.time = Math.random() * clip.duration;

      const position = new THREE.Vector3(x, 0, zPos);
      clone.position.copy(position);
      clone.scale.setScalar(scale);
      clone.rotation.y = goingRight ? 0 : Math.PI;

      members.push({
        root: clone,
        mixer,
        action,
        position,
        direction: goingRight ? 1 : -1,
        speed,
        currentSpeed: speed,
        pathStart,
        pathEnd,
        zPos,
        scale,
      });

      groupRef.current.add(clone);
    }

    membersRef.current = members;

    return () => {
      members.forEach((m) => {
        m.mixer.stopAllAction();
        // Dispose cloned materials and geometries
        m.root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              (mesh.material as THREE.Material)?.dispose();
            }
          }
        });
      });
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) {
          groupRef.current.remove(groupRef.current.children[0]);
        }
      }
    };
  }, [scene, animations, crowdCount]);

  // Update speed target based on proximity
  useEffect(() => {
    if (proximity >= 0.9) targetSpeedRef.current = 0.05;
    else if (proximity >= 0.5) targetSpeedRef.current = 0.3;
    else if (proximity > 0.1) targetSpeedRef.current = 0.7;
    else targetSpeedRef.current = 1;
  }, [proximity]);

  // Animate
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = targetSpeedRef.current;

    for (const member of membersRef.current) {
      // Smooth speed transition
      member.currentSpeed += (member.speed * target - member.currentSpeed) * 0.02;

      // Update animation speed
      member.action.timeScale = member.currentSpeed / member.speed;

      // Update mixer
      member.mixer.update(dt);

      // Move along path
      const moveAmount = member.currentSpeed * dt * member.direction;
      member.position.x += moveAmount;

      // Wrap around
      if (member.direction > 0 && member.position.x > member.pathEnd) {
        member.position.x = member.pathStart;
      } else if (member.direction < 0 && member.position.x < member.pathEnd) {
        member.position.x = member.pathStart;
      }

      // Apply position directly to root clone
      member.root.position.x = member.position.x;
    }
  });

  return <group ref={groupRef} />;
}

useGLTF.preload('/models/crowd-character.glb');
