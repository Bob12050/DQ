import type { GameSettings } from '../app/Settings.ts';

export type Sfx = 'select' | 'confirm' | 'cancel' | 'hit' | 'heal' | 'faint' | 'recruit' | 'victory';

/**
 * Tiny WebAudio synth. No audio files required (so missing assets never break
 * the game). Honors iOS Safari's gesture requirement: the context is created
 * lazily and resumed on the first user interaction.
 */
export class AudioService {
  private ctx?: AudioContext;
  private unlocked = false;

  constructor(private settings: GameSettings) {}

  /** Call from the first user gesture (pointerdown/keydown). Safe to call repeatedly. */
  unlock(): void {
    if (this.unlocked) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      void this.ctx.resume();
      this.unlocked = true;
    } catch {
      /* audio unavailable — game continues silently */
    }
  }

  play(sfx: Sfx): void {
    if (!this.ctx || this.settings.muted || this.settings.sfxVolume <= 0) return;
    const spec: Record<Sfx, { freq: number; dur: number; type: OscillatorType }> = {
      select: { freq: 440, dur: 0.05, type: 'square' },
      confirm: { freq: 660, dur: 0.08, type: 'square' },
      cancel: { freq: 220, dur: 0.08, type: 'sawtooth' },
      hit: { freq: 160, dur: 0.09, type: 'triangle' },
      heal: { freq: 720, dur: 0.12, type: 'sine' },
      faint: { freq: 110, dur: 0.25, type: 'sawtooth' },
      recruit: { freq: 880, dur: 0.2, type: 'sine' },
      victory: { freq: 990, dur: 0.3, type: 'square' },
    };
    const s = spec[sfx];
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = s.type;
      osc.frequency.value = s.freq;
      gain.gain.value = this.settings.sfxVolume * 0.15;
      osc.connect(gain).connect(this.ctx.destination);
      const now = this.ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.0001, now + s.dur);
      osc.start(now);
      osc.stop(now + s.dur);
    } catch {
      /* ignore */
    }
  }

  /** Stop all audio when the app is backgrounded. */
  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended' && this.unlocked) void this.ctx.resume();
  }
}
