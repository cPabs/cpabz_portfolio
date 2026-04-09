'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  void main() {
    // Vignette centered on bottom-right of screen
    // UV space: (0,0) = bottom-left, (1,1) = top-right
    // Skeleton is at screen bottom-right → UV ~(0.75, 0.28)
    vec2 center = vec2(0.75, 0.28);
    float dist = distance(vUv, center);
    float vignette = smoothstep(0.05, 0.55, dist);
    // Dark AROUND the skeleton (edges), clear AT the skeleton (center)
    float alpha = vignette * 0.55;
    gl_FragColor = vec4(0.03, 0.03, 0.06, alpha);
  }
`;

export default function RadialDarkness() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }), []);

  return (
    <mesh renderOrder={999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
