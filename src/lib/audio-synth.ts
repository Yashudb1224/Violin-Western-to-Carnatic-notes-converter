/**
 * Audio synthesis for playing violin notes
 * Uses Web Audio API to generate realistic violin-like sounds
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
   * Play a note given MIDI number
   */
  playNote(midiNote: number, duration: number = 0.5): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Convert MIDI to frequency
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

    // Create oscillators for a richer violin-like sound
    const fundamental = ctx.createOscillator();
    const harmonic1 = ctx.createOscillator();
    const harmonic2 = ctx.createOscillator();

    // Fundamental frequency (sawtooth for violin-like timbre)
    fundamental.type = 'sawtooth';
    fundamental.frequency.value = frequency;

    // Harmonics for richness
    harmonic1.type = 'sine';
    harmonic1.frequency.value = frequency * 2;
    
    harmonic2.type = 'sine';
    harmonic2.frequency.value = frequency * 3;

    // Create gain nodes for each oscillator
    const fundGain = ctx.createGain();
    const harm1Gain = ctx.createGain();
    const harm2Gain = ctx.createGain();

    // Mix levels
    fundGain.gain.value = 0.6;
    harm1Gain.gain.value = 0.2;
    harm2Gain.gain.value = 0.1;

    // Create envelope for natural attack/decay
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.8, now + 0.05); // Attack
    envelope.gain.linearRampToValueAtTime(0.6, now + 0.1); // Sustain
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

    // Add vibrato for realism
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5; // 5 Hz vibrato
    vibratoGain.gain.value = 3; // Subtle pitch modulation
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(fundamental.frequency);
    vibratoGain.connect(harmonic1.frequency);
    vibratoGain.connect(harmonic2.frequency);

    // Add a lowpass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000 + frequency; // Brightness varies with pitch
    filter.Q.value = 1;

    // Connect the audio graph
    fundamental.connect(fundGain);
    harmonic1.connect(harm1Gain);
    harmonic2.connect(harm2Gain);

    fundGain.connect(envelope);
    harm1Gain.connect(envelope);
    harm2Gain.connect(envelope);

    envelope.connect(filter);
    filter.connect(this.masterGain);

    // Start and stop
    fundamental.start(now);
    harmonic1.start(now);
    harmonic2.start(now);
    vibrato.start(now);

    fundamental.stop(now + duration);
    harmonic1.stop(now + duration);
    harmonic2.stop(now + duration);
    vibrato.stop(now + duration);
  }

  /**
   * Play note from Western notation
   */
  playWesternNote(pitch: string, octave: number, duration: number = 0.5): void {
    const NOTE_TO_MIDI: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
    };

    const baseNote = NOTE_TO_MIDI[pitch];
    if (baseNote !== undefined) {
      const midiNote = (octave + 1) * 12 + baseNote;
      this.playNote(midiNote, duration);
    }
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Resume audio context (needed for browser autoplay policies)
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
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
