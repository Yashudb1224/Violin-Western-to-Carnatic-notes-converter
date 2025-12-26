'use client';

import { useState } from 'react';
import { Upload, FileMusic, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadedScore {
  notes: Array<{ note: string; octave: number; duration?: number }>;
  title?: string;
  tempo?: number;
}

export const SheetMusicUpload = ({ onScoreLoaded }: { onScoreLoaded: (notes: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');

  const parseMusicXML = async (xmlContent: string): Promise<UploadedScore> => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const score: UploadedScore = { notes: [] };

    // Extract title
    const title = xmlDoc.querySelector('work-title');
    if (title) score.title = title.textContent || undefined;

    // Extract tempo
    const tempo = xmlDoc.querySelector('sound[tempo]');
    if (tempo) score.tempo = parseFloat(tempo.getAttribute('tempo') || '120');

    // Extract notes from all measures
    const measures = xmlDoc.querySelectorAll('measure');
    measures.forEach(measure => {
      const noteElements = measure.querySelectorAll('note');
      noteElements.forEach(noteElement => {
        // Skip rests
        if (noteElement.querySelector('rest')) return;

        const pitch = noteElement.querySelector('pitch');
        if (pitch) {
          const step = pitch.querySelector('step')?.textContent || 'C';
          const alter = pitch.querySelector('alter')?.textContent;
          const octave = parseInt(pitch.querySelector('octave')?.textContent || '4');
          
          // Handle sharps/flats
          let noteName = step;
          if (alter) {
            const alterValue = parseInt(alter);
            if (alterValue === 1) noteName += '#';
            else if (alterValue === -1) noteName += 'b';
          }

          const type = noteElement.querySelector('type')?.textContent || 'quarter';
          const duration = type === 'whole' ? 4 : type === 'half' ? 2 : type === 'eighth' ? 0.5 : type === 'sixteenth' ? 0.25 : 1;

          score.notes.push({
            note: noteName,
            octave,
            duration,
          });
        }
      });
    });

    return score;
  };

  const extractStaffLinesFromImage = (imageData: ImageData): number[] => {
    const { data, width, height } = imageData;
    const staffLines: number[] = [];
    const threshold = 200; // Brightness threshold for staff lines
    
    // Scan horizontally to find staff lines
    const rowDensity: number[] = [];
    
    for (let y = 0; y < height; y++) {
      let blackPixels = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness < threshold) blackPixels++;
      }
      rowDensity.push(blackPixels / width);
    }
    
    // Find peaks (staff lines have high density)
    const avgDensity = rowDensity.reduce((a, b) => a + b, 0) / rowDensity.length;
    for (let y = 5; y < height - 5; y++) {
      if (rowDensity[y] > avgDensity * 2) {
        // Check if it's a local maximum
        if (rowDensity[y] > rowDensity[y - 1] && rowDensity[y] > rowDensity[y + 1]) {
          staffLines.push(y);
        }
      }
    }
    
    return staffLines;
  };

  const detectNoteheadsFromImage = (imageData: ImageData, staffLines: number[]): Array<{x: number, y: number, filled: boolean}> => {
    const { data, width, height } = imageData;
    const noteheads: Array<{x: number, y: number, filled: boolean}> = [];
    
    if (staffLines.length < 5) return noteheads;
    
    const staffSpacing = (staffLines[4] - staffLines[0]) / 4;
    const noteheadRadius = Math.floor(staffSpacing * 0.6);
    
    // Scan for circular shapes (noteheads)
    for (let y = 0; y < height - noteheadRadius * 2; y += 2) {
      for (let x = 0; x < width - noteheadRadius * 2; x += 2) {
        let blackCount = 0;
        let totalCount = 0;
        
        // Check circular region
        for (let dy = -noteheadRadius; dy <= noteheadRadius; dy++) {
          for (let dx = -noteheadRadius; dx <= noteheadRadius; dx++) {
            if (dx * dx + dy * dy <= noteheadRadius * noteheadRadius) {
              const py = y + dy + noteheadRadius;
              const px = x + dx + noteheadRadius;
              if (py >= 0 && py < height && px >= 0 && px < width) {
                const idx = (py * width + px) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                totalCount++;
                if (brightness < 200) blackCount++;
              }
            }
          }
        }
        
        const fillRatio = blackCount / totalCount;
        if (fillRatio > 0.3 && fillRatio < 0.9) {
          noteheads.push({
            x: x + noteheadRadius,
            y: y + noteheadRadius,
            filled: fillRatio > 0.6
          });
        }
      }
    }
    
    // Remove duplicates (noteheads detected multiple times)
    const filtered: typeof noteheads = [];
    for (const note of noteheads) {
      const isDuplicate = filtered.some(n => 
        Math.abs(n.x - note.x) < noteheadRadius && 
        Math.abs(n.y - note.y) < noteheadRadius
      );
      if (!isDuplicate) filtered.push(note);
    }
    
    return filtered;
  };

  const convertPositionToNote = (y: number, staffLines: number[]): { note: string, octave: number } => {
    if (staffLines.length < 5) return { note: 'C', octave: 4 };
    
    const staffSpacing = (staffLines[4] - staffLines[0]) / 4;
    
    // Calculate position relative to middle line (B4 on treble clef)
    const middleLine = staffLines[2];
    const relativePosition = Math.round((middleLine - y) / (staffSpacing / 2));
    
    // Treble clef mapping (assuming treble clef for violin)
    const noteSequence = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const baseOctave = 4;
    const baseNoteIndex = 6; // B at middle line
    
    const noteIndex = (baseNoteIndex + relativePosition) % 7;
    const octaveOffset = Math.floor((baseNoteIndex + relativePosition) / 7);
    
    return {
      note: noteSequence[noteIndex < 0 ? noteIndex + 7 : noteIndex],
      octave: baseOctave + octaveOffset
    };
  };

  const parsePDFWithOCR = async (file: File): Promise<UploadedScore> => {
    setOcrProgress('Loading PDF...');
    
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const score: UploadedScore = { notes: [] };
    
    setOcrProgress(`Processing ${pdf.numPages} page(s)...`);

    // Process first page (most sheet music has melody on first page)
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    // Create canvas to render PDF
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error('Could not create canvas context');
    
    setOcrProgress('Rendering sheet music...');
    await page.render({ canvasContext: context, viewport }).promise;
    
    // Get image data for OCR
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    setOcrProgress('Detecting staff lines...');
    const staffLines = extractStaffLinesFromImage(imageData);
    
    if (staffLines.length < 5) {
      throw new Error('Could not detect staff lines. PDF might be too low quality or not contain standard notation.');
    }
    
    setOcrProgress('Detecting notes...');
    const noteheads = detectNoteheadsFromImage(imageData, staffLines);
    
    if (noteheads.length === 0) {
      throw new Error('No notes detected. Try using a clearer PDF or MusicXML format.');
    }
    
    setOcrProgress(`Found ${noteheads.length} notes! Converting...`);
    
    // Sort noteheads left to right
    noteheads.sort((a, b) => a.x - b.x);
    
    // Convert to musical notes
    for (const notehead of noteheads) {
      const { note, octave } = convertPositionToNote(notehead.y, staffLines);
      const duration = notehead.filled ? 1 : 2; // Filled = quarter, open = half
      
      score.notes.push({ note, octave, duration });
    }
    
    return score;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setOcrProgress('');

    try {
      let score: UploadedScore;

      if (file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
        const text = await file.text();
        score = await parseMusicXML(text);
        
      } else if (file.name.endsWith('.pdf')) {
        score = await parsePDFWithOCR(file);
        
      } else {
        throw new Error('Please upload .xml, .musicxml, or .pdf files');
      }

      if (score.notes.length === 0) {
        throw new Error('No notes found in the file');
      }

      // Convert to simple format for the main component
      const noteString = score.notes
        .map(n => `${n.note}${n.octave}${n.duration && n.duration !== 1 ? ':' + n.duration : ''}`)
        .join(' ');

      onScoreLoaded(noteString);
      setSuccess(`Loaded ${score.title || 'Score'} with ${score.notes.length} notes!`);
      
    } catch (err: any) {
      setError(err.message || 'Error parsing file');
    } finally {
      setUploading(false);
      setOcrProgress('');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border-2 border-dashed border-slate-600">
      <div className="text-center">
        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-bold mb-2">Upload Sheet Music</h3>
        <p className="text-sm text-slate-400 mb-4">
          Upload MusicXML or PDF files to automatically convert Western notation to Carnatic positions
        </p>

        <input
          type="file"
          accept=".xml,.musicxml,.pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="sheet-music-upload"
        />
        
        <label
          htmlFor="sheet-music-upload"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all ${
            uploading 
              ? 'bg-slate-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
          }`}
        >
          <FileMusic size={20} />
          {uploading ? 'Processing...' : 'Choose File'}
        </label>

        <div className="mt-4 text-xs text-slate-500">
          Supported: .xml, .musicxml, .pdf (with OCR)
        </div>
      </div>

      {ocrProgress && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500 text-blue-400 rounded-lg text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          {ocrProgress}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500 text-green-400 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-semibold mb-3">Tips for best results:</h4>
        <ul className="text-xs text-slate-400 space-y-2">
          <li>• <strong>MusicXML (recommended):</strong> Most accurate, from <a href="https://musescore.com" target="_blank" className="text-blue-400 hover:underline">MuseScore.com</a></li>
          <li>• <strong>PDF with OCR:</strong> Works best with clear, high-resolution sheet music</li>
          <li>• <strong>PDF requirements:</strong> Standard notation on treble clef, not handwritten</li>
          <li>• Create with <a href="https://musescore.org" target="_blank" className="text-blue-400 hover:underline">MuseScore app</a> (free)</li>
        </ul>
      </div>
    </div>
  );
};