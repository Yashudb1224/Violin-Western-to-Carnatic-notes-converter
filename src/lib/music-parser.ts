/**
 * MusicXML and sheet music parsing utilities
 * Handles import of Western sheet music in various formats
 */

import { WesternNote } from './carnatic-converter';

export interface ParsedScore {
  title?: string;
  composer?: string;
  tempo?: number;
  timeSignature?: { beats: number; beatType: number };
  notes: WesternNote[];
}

export interface MeasureNote {
  pitch: string;
  octave: number;
  duration: number;
  type: string; // whole, half, quarter, eighth, etc.
}

export class MusicXMLParser {
  /**
   * Parse MusicXML content
   */
  static async parseMusicXML(xmlContent: string): Promise<ParsedScore> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const score: ParsedScore = {
      notes: [],
    };

    // Extract metadata
    const workTitle = xmlDoc.querySelector('work-title');
    if (workTitle) {
      score.title = workTitle.textContent || undefined;
    }

    const creator = xmlDoc.querySelector('creator[type="composer"]');
    if (creator) {
      score.composer = creator.textContent || undefined;
    }

    // Extract tempo
    const tempo = xmlDoc.querySelector('sound[tempo]');
    if (tempo) {
      score.tempo = parseFloat(tempo.getAttribute('tempo') || '120');
    }

    // Extract time signature
    const timeBeats = xmlDoc.querySelector('time beats');
    const timeBeatType = xmlDoc.querySelector('time beat-type');
    if (timeBeats && timeBeatType) {
      score.timeSignature = {
        beats: parseInt(timeBeats.textContent || '4'),
        beatType: parseInt(timeBeatType.textContent || '4'),
      };
    }

    // Extract notes from all measures
    const measures = xmlDoc.querySelectorAll('measure');
    measures.forEach(measure => {
      const notes = measure.querySelectorAll('note');
      notes.forEach(noteElement => {
        // Skip rests
        if (noteElement.querySelector('rest')) {
          return;
        }

        const pitch = noteElement.querySelector('pitch');
        if (pitch) {
          const step = pitch.querySelector('step')?.textContent || 'C';
          const alter = pitch.querySelector('alter')?.textContent;
          const octave = parseInt(pitch.querySelector('octave')?.textContent || '4');
          
          const duration = parseInt(noteElement.querySelector('duration')?.textContent || '1');
          const type = noteElement.querySelector('type')?.textContent || 'quarter';

          // Handle alterations (sharps/flats)
          let pitchName = step;
          if (alter) {
            const alterValue = parseInt(alter);
            if (alterValue === 1) pitchName += '#';
            else if (alterValue === -1) pitchName += 'b';
          }

          score.notes.push({
            pitch: pitchName,
            octave,
            duration: this.durationToBeat(type),
          });
        }
      });
    });

    return score;
  }

  /**
   * Convert note type to beat duration
   */
  private static durationToBeat(type: string): number {
    const durations: Record<string, number> = {
      'whole': 4,
      'half': 2,
      'quarter': 1,
      'eighth': 0.5,
      '16th': 0.25,
      '32nd': 0.125,
    };
    return durations[type] || 1;
  }

  /**
   * Parse simple ABC notation (common format for folk music)
   */
  static parseABCNotation(abcContent: string): ParsedScore {
    const score: ParsedScore = {
      notes: [],
    };

    const lines = abcContent.split('\n');
    let currentOctave = 4;

    for (const line of lines) {
      // Skip metadata lines
      if (line.startsWith('X:') || line.startsWith('T:') || 
          line.startsWith('M:') || line.startsWith('L:') ||
          line.startsWith('K:')) {
        
        if (line.startsWith('T:')) {
          score.title = line.substring(2).trim();
        }
        continue;
      }

      // Parse notes
      const notePattern = /([_=\^]?)([A-Ga-g])([',]*)/g;
      let match;

      while ((match = notePattern.exec(line)) !== null) {
        const [, accidental, note, octaveMarker] = match;
        
        let pitchName = note.toUpperCase();
        
        // Handle accidentals
        if (accidental === '^') pitchName += '#';
        else if (accidental === '_') pitchName += 'b';

        // Handle octave markers
        let octave = note === note.toLowerCase() ? 5 : 4;
        octave += (octaveMarker.match(/'/g) || []).length;
        octave -= (octaveMarker.match(/,/g) || []).length;

        score.notes.push({
          pitch: pitchName,
          octave,
          duration: 1, // ABC would need more parsing for duration
        });
      }
    }

    return score;
  }

  /**
   * Parse a simple note sequence (for testing)
   * Format: "C4 D4 E4 F4 G4" or "C4:1 D4:0.5 E4:0.5"
   */
  static parseSimpleSequence(sequence: string): ParsedScore {
    const score: ParsedScore = {
      notes: [],
    };

    const noteStrings = sequence.trim().split(/\s+/);
    
    for (const noteStr of noteStrings) {
      const parts = noteStr.split(':');
      const notePart = parts[0];
      const duration = parts[1] ? parseFloat(parts[1]) : 1;

      const match = notePart.match(/^([A-G][#b]?)(\d+)$/);
      if (match) {
        score.notes.push({
          pitch: match[1],
          octave: parseInt(match[2]),
          duration,
        });
      }
    }

    return score;
  }
}

/**
 * Image-based sheet music recognition (OCR)
 * Uses Optical Music Recognition (OMR) techniques
 */
export class SheetMusicOCR {
  /**
   * Process an uploaded sheet music image
   * In production, this would integrate with an OMR service like Audiveris or cloud APIs
   */
  static async processImage(imageFile: File): Promise<ParsedScore> {
    // Placeholder for actual OMR implementation
    // In production, you would:
    // 1. Send image to OMR service (Audiveris, Google Cloud Vision, AWS Textract)
    // 2. Receive MusicXML or other structured format
    // 3. Parse and return

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const imageData = e.target?.result;
        
        // For now, return empty score
        // TODO: Integrate with actual OMR service
        reject(new Error('OMR integration pending. Please upload MusicXML or use manual input.'));
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };

      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Validate if file is a supported image format
   */
  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    return validTypes.includes(file.type);
  }
}
