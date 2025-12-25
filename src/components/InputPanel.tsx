'use client';

import { useState } from 'react';
import { Upload, FileMusic, Mic } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CarnaticConverter } from '@/lib/carnatic-converter';
import { MusicXMLParser } from '@/lib/music-parser';

type InputMethod = 'manual' | 'upload';

export const InputPanel = () => {
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual');
  const [noteInput, setNoteInput] = useState('');
  const { setScore, setMetadata } = useAppStore();

  const handleManualInput = () => {
    try {
      const notes = MusicXMLParser.parseSimpleSequence(noteInput);
      const positions = CarnaticConverter.convertScore(notes);
      setScore(notes, positions);
    } catch (error) {
      alert('Error parsing notes. Use format: C4 D4 E4 or C4:1 D4:0.5 E4:0.5');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      try {
        let parsedScore;
        
        if (file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
          parsedScore = await MusicXMLParser.parseMusicXML(content);
        } else if (file.name.endsWith('.abc')) {
          parsedScore = MusicXMLParser.parseABCNotation(content);
        } else {
          alert('Please upload .xml, .musicxml, or .abc files');
          return;
        }

        const positions = CarnaticConverter.convertScore(parsedScore.notes);
        setScore(parsedScore.notes, positions);
        
        if (parsedScore.title || parsedScore.composer || parsedScore.tempo) {
          setMetadata({
            title: parsedScore.title,
            composer: parsedScore.composer,
            tempo: parsedScore.tempo,
          });
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <label className={`
          flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all
          ${inputMethod === 'manual' 
            ? 'bg-blue-500/20 border-2 border-blue-500' 
            : 'bg-white/5 border-2 border-transparent hover:bg-white/10'}
        `}>
          <input
            type="radio"
            checked={inputMethod === 'manual'}
            onChange={() => setInputMethod('manual')}
            className="sr-only"
          />
          <FileMusic className="w-5 h-5" />
          <span className="font-semibold">Manual Input</span>
        </label>

        <label className={`
          flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all
          ${inputMethod === 'upload' 
            ? 'bg-blue-500/20 border-2 border-blue-500' 
            : 'bg-white/5 border-2 border-transparent hover:bg-white/10'}
        `}>
          <input
            type="radio"
            checked={inputMethod === 'upload'}
            onChange={() => setInputMethod('upload')}
            className="sr-only"
          />
          <Upload className="w-5 h-5" />
          <span className="font-semibold">Upload File</span>
        </label>
      </div>

      {inputMethod === 'manual' ? (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Enter Western Notes
          </label>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Example: C4 D4 E4 F4 G4 A4 B4 C5&#10;Or with durations: C4:1 D4:0.5 E4:0.5 F4:1"
            className="w-full h-28 px-4 py-3 bg-black/30 border border-white/10 rounded-xl
                     text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                     font-mono text-sm resize-none"
          />
          <button
            onClick={handleManualInput}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 
                     hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold 
                     transition-all hover:scale-105 active:scale-95"
          >
            Convert to Carnatic
          </button>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-xl">
          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-400 mb-4">
            Upload MusicXML, ABC notation, or sheet music image
          </p>
          <input
            type="file"
            accept=".xml,.musicxml,.abc,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 
                     hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold 
                     cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            Choose File
          </label>
        </div>
      )}
    </div>
  );
};
