/**
 * Audio synthesis for violin notes
 * Uses Web Audio API to generate realistic violin-like tones
 */

export class ViolinSynth {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Master volume
    }
  }

  /**
   * Play a note with violin-like timbre
   */
  playNote(frequency: number, duration: number = 0.5): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Create multiple oscillators for richer sound (violin harmonics)
    const fundamentalOsc = this.audioContext.createOscillator();
    const harmonic2Osc = this.audioContext.createOscillator();
    const harmonic3Osc = this.audioContext.createOscillator();

    const fundamentalGain = this.audioContext.createGain();
    const harmonic2Gain = this.audioContext.createGain();
    const harmonic3Gain = this.audioContext.createGain();

    // Set frequencies (fundamental + harmonics)
    fundamentalOsc.frequency.value = frequency;
    harmonic2Osc.frequency.value = frequency * 2;
    harmonic3Osc.frequency.value = frequency * 3;

    // Use sawtooth for violin-like sound
    fundamentalOsc.type = 'sawtooth';
    harmonic2Osc.type = 'sawtooth';
    harmonic3Osc.type = 'sawtooth';

    // Set harmonic levels
    fundamentalGain.gain.value = 1.0;
    harmonic2Gain.gain.value = 0.3;
    harmonic3Gain.gain.value = 0.15;

    // Connect oscillators to gains
    fundamentalOsc.connect(fundamentalGain);
    harmonic2Osc.connect(harmonic2Gain);
    harmonic3Osc.connect(harmonic3Gain);

    // Create filter for warmth
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    // Connect gains to filter
    fundamentalGain.connect(filter);
    harmonic2Gain.connect(filter);
    harmonic3Gain.connect(filter);

    // Final envelope gain
    const envelope = this.audioContext.createGain();
    filter.connect(envelope);
    envelope.connect(this.masterGain);

    // Envelope (ADSR)
    const attackTime = 0.05;
    const decayTime = 0.1;
    const sustainLevel = 0.7;
    const releaseTime = 0.2;

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + attackTime);
    envelope.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    envelope.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
    envelope.gain.linearRampToValueAtTime(0, now + duration);

    // Start and stop oscillators
    fundamentalOsc.start(now);
    harmonic2Osc.start(now);
    harmonic3Osc.start(now);

    fundamentalOsc.stop(now + duration);
    harmonic2Osc.stop(now + duration);
    harmonic3Osc.stop(now + duration);
  }

  /**
   * Convert MIDI note number to frequency
   */
  midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Play note from MIDI number
   */
  playMidiNote(midiNote: number, duration: number = 0.5): void {
    const frequency = this.midiToFrequency(midiNote);
    this.playNote(frequency, duration);
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Resume audio context (needed for some browsers)
   */
  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Singleton instance
let synthInstance: ViolinSynth | null = null;

export function getViolinSynth(): ViolinSynth {
  if (!synthInstance) {
    synthInstance = new ViolinSynth();
  }
  return synthInstance;
}
