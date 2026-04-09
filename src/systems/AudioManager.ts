import { Howl } from 'howler';

type LayerId = 'ambient' | 'heartbeat' | 'synth' | 'clicks' | 'waves';

interface AudioLayer {
  howl: Howl | null;
  volume: number;
  targetVolume: number;
  webAudioNode?: OscillatorNode | null;
  gainNode?: GainNode | null;
}

export class AudioManager {
  private layers: Map<LayerId, AudioLayer> = new Map();
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = false;
  private masterVolume: number = 0.5;

  init() {
    this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Create procedural audio layers using Web Audio API
    this.createProceduralLayer('ambient', 'ambient');
    this.createProceduralLayer('heartbeat', 'heartbeat');
    this.createProceduralLayer('synth', 'synth');
    this.createProceduralLayer('waves', 'waves');
  }

  private createProceduralLayer(id: LayerId, type: string) {
    if (!this.audioCtx) return;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(this.audioCtx.destination);

    this.layers.set(id, {
      howl: null,
      volume: 0,
      targetVolume: 0,
      gainNode,
    });
  }

  enable() {
    this.enabled = true;
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  startLayer(id: LayerId, volume: number = 0.3) {
    if (!this.enabled || !this.audioCtx) return;

    const layer = this.layers.get(id);
    if (!layer) return;

    layer.targetVolume = volume * this.masterVolume;

    // Start procedural audio if not already running
    if (!layer.webAudioNode) {
      this.startProceduralAudio(id, layer);
    }
  }

  private startProceduralAudio(id: LayerId, layer: AudioLayer) {
    if (!this.audioCtx || !layer.gainNode) return;

    switch (id) {
      case 'ambient': {
        // Brown noise for ambient hum
        const bufferSize = this.audioCtx.sampleRate * 4;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 0.5;
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        source.connect(filter);
        filter.connect(layer.gainNode);
        source.start();
        break;
      }
      case 'heartbeat': {
        // Pulsing low tone
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 55;
        const lfo = this.audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 1.2; // heartbeat rate
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 0.4;
        lfo.connect(lfoGain);
        lfoGain.connect(layer.gainNode.gain);
        osc.connect(layer.gainNode);
        osc.start();
        lfo.start();
        layer.webAudioNode = osc;
        break;
      }
      case 'synth': {
        // Soft synth pad
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 220;
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 330;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(layer.gainNode);
        osc1.start();
        osc2.start();
        layer.webAudioNode = osc1;
        break;
      }
      case 'waves': {
        // Ocean-like noise
        const bufferSize = this.audioCtx.sampleRate * 6;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const t = i / this.audioCtx.sampleRate;
          const wave = Math.sin(t * 0.3) * 0.5 + 0.5;
          data[i] = (Math.random() * 2 - 1) * wave * 0.3;
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        source.connect(filter);
        filter.connect(layer.gainNode);
        source.start();
        break;
      }
    }
  }

  playSFX(type: 'click' | 'connect' | 'discovery' | 'snap') {
    if (!this.enabled || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    gain.connect(this.audioCtx.destination);
    osc.connect(gain);

    switch (type) {
      case 'click':
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15 * this.masterVolume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
        break;
      case 'connect':
        osc.frequency.value = 440;
        osc.type = 'sine';
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12 * this.masterVolume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
        break;
      case 'discovery':
        osc.frequency.value = 523;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15 * this.masterVolume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
        osc.start();
        // Second tone
        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        gain2.connect(this.audioCtx.destination);
        osc2.connect(gain2);
        osc2.frequency.value = 659;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.12 * this.masterVolume, this.audioCtx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
        osc2.start(this.audioCtx.currentTime + 0.15);
        osc.stop(this.audioCtx.currentTime + 0.8);
        osc2.stop(this.audioCtx.currentTime + 0.8);
        break;
      case 'snap':
        osc.frequency.value = 1200;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.08 * this.masterVolume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
        break;
    }
  }

  update(dt: number) {
    for (const [, layer] of this.layers) {
      if (!layer.gainNode) continue;
      const diff = layer.targetVolume - layer.volume;
      if (Math.abs(diff) > 0.001) {
        layer.volume += diff * dt * 2;
        layer.gainNode.gain.setValueAtTime(
          Math.max(0, layer.volume),
          this.audioCtx?.currentTime || 0
        );
      }
    }
  }

  cleanup() {
    for (const [, layer] of this.layers) {
      layer.webAudioNode?.stop?.();
    }
    this.audioCtx?.close();
  }
}
