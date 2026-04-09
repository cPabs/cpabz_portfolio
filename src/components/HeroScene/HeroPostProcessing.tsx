'use client';

import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export default function HeroPostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.7}
        luminanceSmoothing={0.3}
        intensity={0.4}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={0.7}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.025}
      />
    </EffectComposer>
  );
}
