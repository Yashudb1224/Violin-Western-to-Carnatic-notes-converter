'use client';

import { useState } from 'react';
import { Upload, FileMusic, CheckCircle } from 'lucide-react';

interface UploadedScore {
  notes: Array<{ note: string; octave: number; duration?: number }>;
  title?: string;
  tempo?: number;
}

export const SheetMusicUpload = ({ onScoreLoaded }: { onScoreLoaded: (notes: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          const duration = type === 'whole' ? 4 : type === 'half' ? 2 : type === 'eighth' ? 0.5 : 1;

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      if (file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
        // Handle MusicXML
        const text = await file.text();
        const score = await parseMusicXML(text);
        
        if (score.notes.length === 0) {
          throw new Error('No notes found in the file');
        }

        // Convert to simple format for the main component
        const noteString = score.notes
          .map(n => `${n.note}${n.octave}`)
          .join(' ');

        onScoreLoaded(noteString);
        setSuccess(`Loaded ${score.title || 'Score'} with ${score.notes.length} notes!`);
        
      } else if (file.name.endsWith('.pdf')) {
        // PDF handling would require OCR service
        throw new Error('PDF support requires OCR integration. Please use MusicXML for now.');
        
      } else {
        throw new Error('Please upload .xml, .musicxml, or .pdf files');
      }

    } catch (err: any) {
      setError(err.message || 'Error parsing file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border-2 border-dashed border-slate-600">
      <div className="text-center">
        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-bold mb-2">Upload Sheet Music</h3>
        <p className="text-sm text-slate-400 mb-4">
          Upload MusicXML files to automatically convert Western notation to Carnatic positions
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
          Supported: .xml, .musicxml (PDF coming soon)
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500 text-green-400 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-semibold mb-3">Need a MusicXML file?</h4>
        <ul className="text-xs text-slate-400 space-y-2">
          <li>• Download from <a href="https://musescore.com" target="_blank" className="text-blue-400 hover:underline">MuseScore.com</a></li>
          <li>• Create with <a href="https://musescore.org" target="_blank" className="text-blue-400 hover:underline">MuseScore app</a> (free)</li>
          <li>• Export from Finale, Sibelius, or other notation software</li>
        </ul>
      </div>
    </div>
  );
};
