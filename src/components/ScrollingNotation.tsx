'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { getViolinSynth } from '@/lib/audio-synth';

// CORRECT MAPPING: D string = Middle Sa (tonic)
const STRING_COLORS = {
  G: '#8b5cf6', // Purple - Low Ma1 (4th string)
  D: '#ef4444', // Red - Middle Sa (3rd string - TONIC)
  A: '#3b82f6', // Blue - Middle Pa (2nd string)
  E: '#f59e0b', // Amber - High Ri2. (1st string)
};

const NOTES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'B#': 0, 'Cb': 11,
};

// String tunings in MIDI (D = Middle Sa at D3)
const STRING_MIDI = {
  E: 64, // E4 = High Ri2.
  A: 57, // A3 = Middle Pa
  D: 50, // D3 = Middle Sa (TONIC)
  G: 43, // G2 = Low Ma1
};

// Correct positions with low/high finger variants
const POSITIONS = {
  G: [
    { s: 0, n: 'Low Ma1', f: 0 },
    { s: 1, n: 'Low Dha1', f: 1 },
    { s: 2, n: 'Low Dha2', f: 1 },
    { s: 3, n: 'Low Ni2', f: 2 },
    { s: 4, n: 'Low Ni3', f: 2 },
    { s: 5, n: 'Low Sa', f: 3 },
  ],
  D: [
    { s: 0, n: 'Sa', f: 0 },
    { s: 1, n: 'Ri1', f: 1 },
    { s: 2, n: 'Ri2', f: 1 },
    { s: 3, n: 'Ga2', f: 2 },
    { s: 4, n: 'Ga3', f: 2 },
    { s: 5, n: 'Ma1', f: 3 },
    { s: 6, n: 'Ma2', f: 4 },
  ],
  A: [
    { s: 0, n: 'Pa', f: 0 },
    { s: 1, n: 'Dha1', f: 1 },
    { s: 2, n: 'Dha2', f: 1 },
    { s: 3, n: 'Ni2', f: 2 },
    { s: 4, n: 'Ni3', f: 2 },
    { s: 5, n: 'High Sa.', f: 3 },
  ],
  E: [
    { s: 0, n: 'High Ri2.', f: 0 },
    { s: 1, n: 'High Ga2.', f: 1 },
    { s: 2, n: 'High Ga3.', f: 1 },
    { s: 3, n: 'High Ma1.', f: 2 },
    { s: 4, n: 'High Ma2.', f: 2 },
    { s: 5, n: 'High Pa.', f: 3 },
  ],
};

export const ScrollingNotation = ({ uploadedNotes }: { uploadedNotes?: string }) => {
  const [input, setInput] = useState('D E F# G A B C# D');
  const [notes, setNotes] = useState<any[]>([]);
  const [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollY = useRef(0);
  const animationRef = useRef<number>();
  const lastPlayedIdx = useRef(-1);
  const synth = useRef(getViolinSynth());

  // Load uploaded notes when they change
  useEffect(() => {
    if (uploadedNotes) {
      setInput(uploadedNotes);
      // Auto-parse uploaded notes
      const parts = uploadedNotes.trim().split(/\s+/);
      const parsed = [];
      
      for (const part of parts) {
        const match = part.match(/^([A-G][#b]?)(\d*)$/i);
        if (match) {
          const note = match[1].toUpperCase();
          const octave = match[2] ? parseInt(match[2]) : 3;
          const midi = (octave + 1) * 12 + NOTES[note];
          
          let position = null;
          for (const [str, base] of Object.entries(STRING_MIDI)) {
            const offset = midi - base;
            const pos = POSITIONS[str as keyof typeof POSITIONS].find(p => p.s === offset);
            if (pos) {
              position = {
                string: str,
                notation: pos.n,
                finger: pos.f,
              };
              break;
            }
          }
          
          if (position) {
            parsed.push({ note, octave, midi, ...position });
          }
        }
      }
      
      setNotes(parsed);
      setCurrentIdx(0);
      scrollY.current = 0;
      lastPlayedIdx.current = -1;
    }
  }, [uploadedNotes]);

  const parseNotes = () => {
    const parts = input.trim().split(/\s+/);
    const parsed = [];
    
    for (const part of parts) {
      const match = part.match(/^([A-G][#b]?)(\d*)$/i);
      if (match) {
        const note = match[1].toUpperCase();
        const octave = match[2] ? parseInt(match[2]) : 3; // Default to octave 3
        const midi = (octave + 1) * 12 + NOTES[note];
        
        // Find position on correct string
        let position = null;
        for (const [str, base] of Object.entries(STRING_MIDI)) {
          const offset = midi - base;
          const pos = POSITIONS[str as keyof typeof POSITIONS].find(p => p.s === offset);
          if (pos) {
            position = {
              string: str,
              notation: pos.n,
              finger: pos.f,
            };
            break;
          }
        }
        
        if (position) {
          parsed.push({ note, octave, midi, ...position });
        }
      }
    }
    
    setNotes(parsed);
    setCurrentIdx(0);
    scrollY.current = 0;
    lastPlayedIdx.current = -1;
  };

  useEffect(() => {
    // Set initial volume
    synth.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!canvasRef.current || notes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const w = rect.width;
    const h = rect.height;
    const laneW = w / 4;
    const targetY = h - 100;
    const spacing = 200;
    
    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      
      // Draw 4 string lanes (G D A E from left to right)
      ['G', 'D', 'A', 'E'].forEach((str, i) => {
        const x = i * laneW;
        
        // Lane divider
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + laneW, 0);
        ctx.lineTo(x + laneW, h);
        ctx.stroke();
        
        // String label with description
        ctx.fillStyle = STRING_COLORS[str as keyof typeof STRING_COLORS];
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(str, x + laneW/2, 40);
        
        // String description
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        const desc = str === 'G' ? 'Low Ma1' : str === 'D' ? 'Sa' : str === 'A' ? 'Pa' : 'High Ri2.';
        ctx.fillText(desc, x + laneW/2, 60);
        
        // Target line
        ctx.strokeStyle = STRING_COLORS[str as keyof typeof STRING_COLORS];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 20, targetY);
        ctx.lineTo(x + laneW - 20, targetY);
        ctx.stroke();
      });
      
      // Draw notes
      if (playing) {
        scrollY.current += tempo / 30;
      }
      
      notes.forEach((n, idx) => {
        const laneIdx = ['G', 'D', 'A', 'E'].indexOf(n.string);
        if (laneIdx === -1) return;
        
        const x = laneIdx * laneW + laneW / 2;
        const y = targetY - (idx * spacing) + scrollY.current;
        
        if (y < -50 || y > h + 50) return;
        
        const isActive = Math.abs(y - targetY) < 30;
        
        // Play sound when note hits target line
        if (isActive && idx !== lastPlayedIdx.current && soundEnabled && playing) {
          lastPlayedIdx.current = idx;
          synth.current.resume(); // Resume audio context if suspended
          synth.current.playWesternNote(n.note, n.octave, 0.5);
        }
        
        if (isActive && idx !== currentIdx) {
          setCurrentIdx(idx);
        }
        
        // Note circle
        ctx.beginPath();
        ctx.arc(x, y, isActive ? 40 : 30, 0, Math.PI * 2);
        ctx.fillStyle = y > targetY + 50 ? '#555' : STRING_COLORS[n.string as keyof typeof STRING_COLORS];
        if (isActive) {
          ctx.shadowColor = STRING_COLORS[n.string as keyof typeof STRING_COLORS];
          ctx.shadowBlur = 20;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Notation text
        ctx.fillStyle = isActive ? '#fff' : '#000';
        ctx.font = `bold ${isActive ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.notation, x, y);
        
        // Western note below
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`${n.note}${n.octave}`, x, y + (isActive ? 55 : 45));
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [notes, playing, tempo, currentIdx, soundEnabled]);

  return (
    <div className="space-y-4">
      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm">
        <strong className="text-blue-400">System:</strong> D string = Middle Sa (tonic). 
        G=Low Ma1, D=Sa, A=Pa, E=High Ri2.
      </div>

      {/* Input */}
      <div className="bg-slate-800 rounded-xl p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter notes: D E F# G A B C# D  (or with octave: D3 E3 F#3)"
          className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 font-mono"
          rows={2}
        />
        <button
          onClick={parseNotes}
          className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
        >
          Load Notes
        </button>
      </div>

      {/* Controls */}
      {notes.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!playing) {
                    await synth.current.resume();
                  }
                  setPlaying(!playing);
                }}
                className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                  playing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {playing ? <><Pause size={16}/>Pause</> : <><Play size={16}/>Play</>}
              </button>
              <button
                onClick={() => { setPlaying(false); scrollY.current = 0; setCurrentIdx(0); lastPlayedIdx.current = -1; }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Tempo: {tempo}</span>
              <input
                type="range"
                min="60"
                max="180"
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
          </div>

          {/* Audio controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg ${soundEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <span className="text-sm text-slate-400">
                {soundEnabled ? 'Sound On' : 'Sound Off'}
              </span>
            </div>
            
            {soundEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-32"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700">
        <canvas ref={canvasRef} className="w-full" style={{ height: '600px' }} />
      </div>

      {/* Current note display */}
      {notes[currentIdx] && (
        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <div className="text-sm text-slate-400 mb-2">Current Note</div>
          <div className="text-4xl font-bold mb-2" style={{ color: STRING_COLORS[notes[currentIdx].string as keyof typeof STRING_COLORS] }}>
            {notes[currentIdx].notation}
          </div>
          <div className="text-slate-300">
            {notes[currentIdx].string} String • 
            Finger {notes[currentIdx].finger === 0 ? 'Open' : notes[currentIdx].finger} • 
            {notes[currentIdx].note}{notes[currentIdx].octave}
          </div>
        </div>
      )}
    </div>
  );
};
