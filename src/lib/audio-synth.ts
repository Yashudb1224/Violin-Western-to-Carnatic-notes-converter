/**
 * Enhanced audio synthesis for realistic violin sounds
 */

export class ViolinSynth {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNotes: Map<string, {
    oscillators: OscillatorNode[];
    gains: GainNode[];
    envelope: GainNode;
  }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.4;
    }
  }

  /**
   * Play a note with proper duration (for held notes)
   */
  playNote(midiNote: number, duration: number = 0.5): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const noteKey = `${midiNote}-${now}`;

    // Create multiple oscillators for rich violin timbre
    const fundamental = ctx.createOscillator();
    const harmonic2 = ctx.createOscillator();
    const harmonic3 = ctx.createOscillator();
    const harmonic4 = ctx.createOscillator();
    const subHarmonic = ctx.createOscillator();

    // Violin uses sawtooth with specific harmonics
    fundamental.type = 'sawtooth';
    fundamental.frequency.value = frequency;
    
    harmonic2.type = 'sine';
    harmonic2.frequency.value = frequency * 2;
    
    harmonic3.type = 'sine';
    harmonic3.frequency.value = frequency * 3;
    
    harmonic4.type = 'sine';
    harmonic4.frequency.value = frequency * 4;
    
    subHarmonic.type = 'triangle';
    subHarmonic.frequency.value = frequency * 0.5;

    // Create gain nodes for mixing
    const fundGain = ctx.createGain();
    const harm2Gain = ctx.createGain();
    const harm3Gain = ctx.createGain();
    const harm4Gain = ctx.createGain();
    const subGain = ctx.createGain();

    fundGain.gain.value = 0.6;
    harm2Gain.gain.value = 0.3;
    harm3Gain.gain.value = 0.15;
    harm4Gain.gain.value = 0.08;
    subGain.gain.value = 0.1;

    // ADSR Envelope for realistic violin attack/sustain/release
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, now);
    
    // Attack (bow touching string)
    envelope.gain.linearRampToValueAtTime(0.3, now + 0.02);
    envelope.gain.linearRampToValueAtTime(0.8, now + 0.08);
    
    // Sustain
    envelope.gain.setValueAtTime(0.8, now + 0.08);
    envelope.gain.linearRampToValueAtTime(0.7, now + duration - 0.1);
    
    // Release (bow lifting)
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Add vibrato (violin characteristic)
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5.5; // 5.5 Hz vibrato
    vibratoGain.gain.value = 8; // Depth of vibrato
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(fundamental.frequency);
    vibratoGain.connect(harmonic2.frequency);
    vibratoGain.connect(harmonic3.frequency);

    // Add slight tremolo (amplitude modulation)
    const tremolo = ctx.createOscillator();
    const tremoloGain = ctx.createGain();
    tremolo.frequency.value = 6;
    tremoloGain.gain.value = 0.02;
    
    tremolo.connect(tremoloGain);
    tremoloGain.connect(envelope.gain);

    // Realistic violin formant filter
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 400 + frequency * 0.5;
    filter1.Q.value = 3;

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 3000 + frequency;
    filter2.Q.value = 0.7;

    // Connect audio graph
    fundamental.connect(fundGain);
    harmonic2.connect(harm2Gain);
    harmonic3.connect(harm3Gain);
    harmonic4.connect(harm4Gain);
    subHarmonic.connect(subGain);

    fundGain.connect(envelope);
    harm2Gain.connect(envelope);
    harm3Gain.connect(envelope);
    harm4Gain.connect(envelope);
    subGain.connect(envelope);

    envelope.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(this.masterGain);

    // Start everything
    fundamental.start(now);
    harmonic2.start(now);
    harmonic3.start(now);
    harmonic4.start(now);
    subHarmonic.start(now);
    vibrato.start(now);
    tremolo.start(now);

    // Stop everything at the end
    const stopTime = now + duration;
    fundamental.stop(stopTime);
    harmonic2.stop(stopTime);
    harmonic3.stop(stopTime);
    harmonic4.stop(stopTime);
    subHarmonic.stop(stopTime);
    vibrato.stop(stopTime);
    tremolo.stop(stopTime);

    // Store for potential early stopping
    this.activeNotes.set(noteKey, {
      oscillators: [fundamental, harmonic2, harmonic3, harmonic4, subHarmonic, vibrato, tremolo],
      gains: [fundGain, harm2Gain, harm3Gain, harm4Gain, subGain, vibratoGain, tremoloGain],
      envelope,
    });

    // Clean up after note ends
    setTimeout(() => {
      this.activeNotes.delete(noteKey);
    }, duration * 1000 + 100);
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
   * Stop all playing notes
   */
  stopAll(): void {
    this.activeNotes.forEach(note => {
      note.oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Already stopped
        }
      });
    });
    this.activeNotes.clear();
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.4;
    }
  }

  /**
   * Resume audio context
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

let synthInstance: ViolinSynth | null = null;

export function getViolinSynth(): ViolinSynth {
  if (!synthInstance) {
    synthInstance = new ViolinSynth();
  }
  return synthInstance;
}