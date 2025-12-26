/**
 * CORRECT Carnatic violin mapping for Western standard tuning (G-D-A-E)
 * D string = Middle Sa (tonic reference)
 */

export interface CarnaticPosition {
  string: 'G' | 'D' | 'A' | 'E';
  position: string; // e.g., "Low Ma1", "Ri1", "High Pa."
  fingerPosition: number; // 0=open, 1-4=fingers
  variant?: 'low' | 'high'; // For fingers with low/high positions
}

export interface WesternNote {
  pitch: string;
  octave: number;
  duration?: number;
}

// Western standard tuning MIDI values
const STRING_TUNINGS = {
  E: 64, // E4 = High Ri2.
  A: 57, // A3 = Middle Pa
  D: 50, // D3 = Middle Sa (TONIC)
  G: 43, // G2 = Low Ma1
};

// Note to MIDI conversion
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'E#': 5, 'Fb': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'B#': 0, 'Cb': 11,
};

/**
 * String position mappings based on your description
 * Each position is semitones from open string
 */
const STRING_POSITIONS = {
  // G string (Low Ma1) - 4th string
  G: [
    { semitones: 0, notation: 'Low Ma1', finger: 0 },
    { semitones: 1, notation: 'Low Dha1', finger: 1, variant: 'low' },
    { semitones: 2, notation: 'Low Dha2', finger: 1, variant: 'high' },
    { semitones: 3, notation: 'Low Ni2', finger: 2, variant: 'low' },
    { semitones: 4, notation: 'Low Ni3', finger: 2, variant: 'high' },
    { semitones: 5, notation: 'Low Sa', finger: 3 },
  ],
  
  // D string (Middle Sa - TONIC) - 3rd string
  D: [
    { semitones: 0, notation: 'Sa', finger: 0 },
    { semitones: 1, notation: 'Ri1', finger: 1, variant: 'low' },
    { semitones: 2, notation: 'Ri2', finger: 1, variant: 'high' },
    { semitones: 3, notation: 'Ga2', finger: 2, variant: 'low' },
    { semitones: 4, notation: 'Ga3', finger: 2, variant: 'high' },
    { semitones: 5, notation: 'Ma1', finger: 3 },
    { semitones: 6, notation: 'Ma2', finger: 4 },
  ],
  
  // A string (Middle Pa) - 2nd string
  A: [
    { semitones: 0, notation: 'Pa', finger: 0 },
    { semitones: 1, notation: 'Dha1', finger: 1, variant: 'low' },
    { semitones: 2, notation: 'Dha2', finger: 1, variant: 'high' },
    { semitones: 3, notation: 'Ni2', finger: 2, variant: 'low' },
    { semitones: 4, notation: 'Ni3', finger: 2, variant: 'high' },
    { semitones: 5, notation: 'High Sa.', finger: 3 },
  ],
  
  // E string (High Ri2.) - 1st string
  E: [
    { semitones: 0, notation: 'High Ri2.', finger: 0 },
    { semitones: 1, notation: 'High Ga2.', finger: 1, variant: 'low' },
    { semitones: 2, notation: 'High Ga3.', finger: 1, variant: 'high' },
    { semitones: 3, notation: 'High Ma1.', finger: 2, variant: 'low' },
    { semitones: 4, notation: 'High Ma2.', finger: 2, variant: 'high' },
    { semitones: 5, notation: 'High Pa.', finger: 3 },
  ],
};

export class CarnaticConverter {
  /**
   * Convert Western note to MIDI number
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
   * Find best Carnatic position for a Western note
   */
  static convertNote(westernNote: WesternNote): CarnaticPosition | null {
    const midiNote = this.noteToMidi(westernNote.pitch, westernNote.octave);
    
    // Try each string
    const strings: Array<keyof typeof STRING_TUNINGS> = ['E', 'A', 'D', 'G'];
    let bestMatch: CarnaticPosition | null = null;
    
    for (const string of strings) {
      const openStringMidi = STRING_TUNINGS[string];
      const semitonesFromOpen = midiNote - openStringMidi;
      
      // Check if this position exists on this string
      const positions = STRING_POSITIONS[string];
      const match = positions.find(p => p.semitones === semitonesFromOpen);
      
      if (match) {
        // Prefer positions on lower strings (easier to reach)
        // and prefer positions with lower finger numbers
        if (!bestMatch || 
            strings.indexOf(string) > strings.indexOf(bestMatch.string) ||
            (string === bestMatch.string && match.finger < bestMatch.fingerPosition)) {
          bestMatch = {
            string,
            position: match.notation,
            fingerPosition: match.finger,
            variant: match.variant,
          };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Parse simple note string like "C4" or "D#5"
   */
  static parseNoteString(noteStr: string): WesternNote {
    const match = noteStr.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid note string: ${noteStr}`);
    }

    return {
      pitch: match[1],
      octave: parseInt(match[2]),
      duration: 1,
    };
  }

  /**
   * Parse note without octave - returns all possible positions
   */
  static findAllPositions(noteName: string): CarnaticPosition[] {
    const note = noteName.toUpperCase();
    const baseNoteMidi = NOTE_TO_MIDI[note];
    
    if (baseNoteMidi === undefined) {
      throw new Error(`Invalid note: ${noteName}`);
    }

    const positions: CarnaticPosition[] = [];
    
    // Search across practical octaves (2-6)
    for (let octave = 2; octave <= 6; octave++) {
      const midiNote = (octave + 1) * 12 + baseNoteMidi;
      
      const strings: Array<keyof typeof STRING_TUNINGS> = ['E', 'A', 'D', 'G'];
      for (const string of strings) {
        const openStringMidi = STRING_TUNINGS[string];
        const semitonesFromOpen = midiNote - openStringMidi;
        
        const stringPositions = STRING_POSITIONS[string];
        const match = stringPositions.find(p => p.semitones === semitonesFromOpen);
        
        if (match) {
          positions.push({
            string,
            position: match.notation,
            fingerPosition: match.finger,
            variant: match.variant,
          });
        }
      }
    }
    
    return positions;
  }

  /**
   * Get color for string (for UI)
   */
  static getStringColor(string: string): string {
    const colors: Record<string, string> = {
      G: '#8b5cf6', // Purple (lowest)
      D: '#ef4444', // Red (Sa)
      A: '#3b82f6', // Blue (Pa)
      E: '#f59e0b', // Amber (highest)
    };
    return colors[string] || '#999';
  }
}