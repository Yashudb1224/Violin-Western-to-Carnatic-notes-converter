/**
 * Core conversion logic for Western to Carnatic violin positions
 * Maps Western note names to Carnatic positions on a standard-tuned violin
 */

export interface CarnaticPosition {
  string: 'G' | 'D' | 'A' | 'E';
  position: string;
  fingerPosition: number; // 0 = open, 1-7 = finger positions
  octaveMarker?: '.' | '..'; // . for higher octave, .. for lower
}

export interface WesternNote {
  pitch: string; // e.g., "C4", "D#5"
  duration: number; // in beats
  octave: number;
}

// Western standard tuning: E (lowest) - A - D - G (highest)
// But we number from highest to lowest for display: G=1, D=2, A=3, E=4
const STRING_TUNINGS = {
  G: 55, // G4 (higher octave Sa)
  D: 50, // D4 (higher octave Pa) 
  A: 45, // A3 (lower octave Sa)
  E: 40, // E3 (lower octave Pa)
};

// MIDI note number mapping
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};

// Carnatic position mapping based on user's notation
// Each position represents a semitone offset from the open string
const CARNATIC_POSITIONS = [
  'SA', 'RE1', 'RE2', 'GA2', 'GA3', 'MA1', 'MA2', 'PA',
  'DA1', 'DA2', 'NI2', 'NI3', 'SA.'
];

const STRING_POSITIONS: Record<string, string[]> = {
  G: ['SA', 'RE1', 'RE2', 'GA2', 'GA3', 'MA1', 'MA2'],
  D: ['PA', 'DA1', 'DA2', 'NI2', 'NI3', 'SA.'],
  A: ['Sa', 'Re1', 'Re2', 'Ga2', 'Ga3', 'Ma1', 'Ma2'],
  E: ['Pa', 'Da1', 'Da2', 'Ni2', 'Ni3', 'Sa.', 'Re1.', 'Re2.', 'Ga2.', 'Ga3.', 'Ma1.', 'Ma2.', 'Pa.'],
};

export class CarnaticConverter {
  /**
   * Convert a Western note to MIDI number
   */
  private static noteToMidi(pitch: string, octave: number): number {
    const noteName = pitch.replace(/[0-9]/g, '');
    const baseNote = NOTE_TO_MIDI[noteName];
    if (baseNote === undefined) {
      throw new Error(`Invalid note: ${pitch}`);
    }
    return (octave + 1) * 12 + baseNote;
  }

  /**
   * Find the best string and position for a given MIDI note
   */
  private static findBestPosition(midiNote: number): CarnaticPosition | null {
    const strings: Array<keyof typeof STRING_TUNINGS> = ['G', 'D', 'A', 'E'];
    let bestMatch: CarnaticPosition | null = null;
    let minStretch = Infinity;

    for (const string of strings) {
      const openStringMidi = STRING_TUNINGS[string];
      const semitonesFromOpen = midiNote - openStringMidi;

      // Only consider positions within reasonable reach (0-12 semitones)
      if (semitonesFromOpen >= 0 && semitonesFromOpen <= 12) {
        const positions = STRING_POSITIONS[string];
        
        if (semitonesFromOpen < positions.length) {
          const position = positions[semitonesFromOpen];
          
          // Prefer positions on higher strings (less stretching)
          // and prefer positions closer to open string
          const stretch = strings.indexOf(string) * 0.5 + semitonesFromOpen * 0.1;
          
          if (stretch < minStretch) {
            minStretch = stretch;
            bestMatch = {
              string,
              position,
              fingerPosition: semitonesFromOpen,
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Convert a Western note to Carnatic position
   */
  static convertNote(westernNote: WesternNote): CarnaticPosition | null {
    const midiNote = this.noteToMidi(westernNote.pitch, westernNote.octave);
    return this.findBestPosition(midiNote);
  }

  /**
   * Convert an array of Western notes to Carnatic positions
   */
  static convertScore(notes: WesternNote[]): (CarnaticPosition | null)[] {
    return notes.map(note => this.convertNote(note));
  }

  /**
   * Parse a simple note string like "C4" or "D#5"
   */
  static parseNoteString(noteStr: string): WesternNote {
    const match = noteStr.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid note string: ${noteStr}`);
    }

    return {
      pitch: match[1],
      octave: parseInt(match[2]),
      duration: 1, // Default duration
    };
  }

  /**
   * Format Carnatic position for display
   */
  static formatPosition(position: CarnaticPosition): string {
    return `${position.string} string: ${position.position}`;
  }

  /**
   * Get color coding for string (for UI display)
   */
  static getStringColor(string: string): string {
    const colors: Record<string, string> = {
      G: '#FF6B6B', // Red
      D: '#4ECDC4', // Teal
      A: '#45B7D1', // Blue
      E: '#FFA07A', // Orange
    };
    return colors[string] || '#999';
  }
}
