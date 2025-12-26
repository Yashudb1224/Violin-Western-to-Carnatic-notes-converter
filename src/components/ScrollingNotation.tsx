'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { getViolinSynth } from '@/lib/audio-synth';

const STRING_COLORS = {
  G: '#8b5cf6',
  D: '#ef4444',
  A: '#3b82f6',
  E: '#f59e0b',
};

const NOTES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'B#': 0, 'Cb': 11,
};

const STRING_MIDI = {
  E: 64,
  A: 57,
  D: 50,
  G: 43,
};

export const ScrollingNotation = ({ uploadedNotes }: { uploadedNotes?: string }) => {
  const [input, setInput] = useState('G3 A3 B3 C4 D4 E4 F#4 G4');
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

  useEffect(() => {
    if (uploadedNotes) {
      setInput(uploadedNotes);
      parseNotesFromInput(uploadedNotes);
    }
  }, [uploadedNotes]);

  const parseNotesFromInput = (inputText: string) => {
    const parts = inputText.trim().split(/\s+/);
    const parsed = [];
    
    for (const part of parts) {
      const match = part.match(/^([A-G][#b]?)(\d*):?(\d*\.?\d*)$/i);
      if (match) {
        const note = match[1].toUpperCase();
        const octave = match[2] ? parseInt(match[2]) : 4;
        const duration = match[3] ? parseFloat(match[3]) : 1;
        const midi = (octave + 1) * 12 + NOTES[note];
        
        let bestString = null;
        let bestFinger = -1;
        let minDistance = 999;
        
        for (const [str, openMidi] of Object.entries(STRING_MIDI)) {
          const distance = midi - openMidi;
          if (distance >= 0 && distance <= 12) {
            if (distance < minDistance) {
              minDistance = distance;
              bestString = str;
              bestFinger = distance;
            }
          }
        }
        
        if (bestString) {
          parsed.push({
            note,
            octave,
            midi,
            duration,
            string: bestString,
            finger: bestFinger,
          });
        }
      }
    }
    
    setNotes(parsed);
    setCurrentIdx(0);
    scrollY.current = 0;
    lastPlayedIdx.current = -1;
  };

  const parseNotes = () => {
    parseNotesFromInput(input);
  };

  useEffect(() => {
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
    const targetY = h - 120;
    const spacing = 200;
    
    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      
      ['G', 'D', 'A', 'E'].forEach((str, i) => {
        const x = i * laneW;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + laneW, 0);
        ctx.lineTo(x + laneW, h);
        ctx.stroke();
        
        ctx.fillStyle = STRING_COLORS[str as keyof typeof STRING_COLORS];
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(str, x + laneW/2, 60);
        
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('STRING', x + laneW/2, 90);
        
        ctx.strokeStyle = STRING_COLORS[str as keyof typeof STRING_COLORS];
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x + 30, targetY);
        ctx.lineTo(x + laneW - 30, targetY);
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('▼ PLAY', x + laneW/2, targetY + 25);
      });
      
      if (playing) {
        scrollY.current += tempo / 30;
      }
      
      notes.forEach((n, idx) => {
        const laneIdx = ['G', 'D', 'A', 'E'].indexOf(n.string);
        if (laneIdx === -1) return;
        
        const x = laneIdx * laneW + laneW / 2;
        const y = targetY - (idx * spacing) + scrollY.current;
        
        const noteHeight = Math.min(spacing * (n.duration || 1) * 0.8, spacing * 3);
        
        if (y < -noteHeight - 50 || y > h + 50) return;
        
        const isActive = Math.abs(y - targetY) < 40;
        
        if (isActive && idx !== lastPlayedIdx.current && soundEnabled && playing) {
          lastPlayedIdx.current = idx;
          synth.current.resume();
          const noteDuration = (n.duration || 1) * (60 / tempo);
          synth.current.playWesternNote(n.note, n.octave, noteDuration);
        }
        
        if (isActive && idx !== currentIdx) {
          setCurrentIdx(idx);
        }
        
        const radius = isActive ? 60 : 45;
        
        if (noteHeight > radius * 2) {
          ctx.fillStyle = y > targetY + 50 ? '#555' : STRING_COLORS[n.string as keyof typeof STRING_COLORS] + '80';
          ctx.fillRect(x - 12, y - noteHeight + radius, 24, noteHeight - radius * 2);
        }
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = y > targetY + 50 ? '#555' : STRING_COLORS[n.string as keyof typeof STRING_COLORS];
        
        if (isActive) {
          ctx.shadowColor = STRING_COLORS[n.string as keyof typeof STRING_COLORS];
          ctx.shadowBlur = 30;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${isActive ? 48 : 36}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.finger.toString(), x, y);
        
        ctx.fillStyle = isActive ? '#fff' : '#ddd';
        ctx.font = `${isActive ? 'bold 16px' : '14px'} sans-serif`;
        ctx.fillText(`${n.note}${n.octave}`, x, y + radius + 20);
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
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="font-bold text-blue-400 mb-2">How to Play:</h3>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• Each column = a violin string (G, D, A, E)</li>
          <li>• Numbers = finger positions (0=open, 1=index, 2=middle, 3=ring, 4=pinky)</li>
          <li>• When number hits the line → play that finger on that string!</li>
        </ul>
      </div>

      <div className="bg-slate-800 rounded-xl p-4">
        <label className="text-sm text-slate-400 mb-2 block">Enter Western Notes:</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="G3 A3 B3 C4 D4 (or with duration: G3:2 A3:1 B3:0.5)"
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

      {notes.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!playing) await synth.current.resume();
                  setPlaying(!playing);
                }}
                className={`px-8 py-3 rounded-lg font-bold text-lg flex items-center gap-2 ${
                  playing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {playing ? <><Pause size={24}/>PAUSE</> : <><Play size={24}/>PLAY</>}
              </button>
              <button
                onClick={() => { 
                  setPlaying(false); 
                  scrollY.current = 0; 
                  setCurrentIdx(0); 
                  lastPlayedIdx.current = -1; 
                }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold"
              >
                <RotateCcw size={24} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Speed:</span>
              <input
                type="range"
                min="40"
                max="200"
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value))}
                className="w-40"
              />
              <span className="text-lg font-bold w-12">{tempo}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-lg ${soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
              <span className="text-sm text-slate-400">
                {soundEnabled ? 'Sound ON' : 'Sound OFF'}
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

      <div className="bg-slate-800 rounded-xl overflow-hidden border-4 border-slate-700">
        <canvas ref={canvasRef} className="w-full" style={{ height: '700px' }} />
      </div>

      {notes[currentIdx] && (
        <div className="bg-slate-800 rounded-xl p-8 text-center border-4" style={{ borderColor: STRING_COLORS[notes[currentIdx].string as keyof typeof STRING_COLORS] }}>
          <div className="text-sm text-slate-400 mb-2">NOW PLAYING:</div>
          <div className="text-8xl font-black mb-4" style={{ color: STRING_COLORS[notes[currentIdx].string as keyof typeof STRING_COLORS] }}>
            {notes[currentIdx].finger}
          </div>
          <div className="text-3xl font-bold mb-2" style={{ color: STRING_COLORS[notes[currentIdx].string as keyof typeof STRING_COLORS] }}>
            {notes[currentIdx].string} STRING
          </div>
          <div className="text-xl text-slate-300">
            {notes[currentIdx].finger === 0 ? 'OPEN STRING' : `FINGER ${notes[currentIdx].finger}`}
          </div>
          <div className="text-lg text-slate-400 mt-2">
            ({notes[currentIdx].note}{notes[currentIdx].octave})
          </div>
        </div>
      )}
    </div>
  );
};