'use client';

import { useState } from 'react';

// CORRECT: D = Sa (tonic)
const COLORS = {
  G: '#8b5cf6', // Purple - Low Ma1
  D: '#ef4444', // Red - Sa (tonic)
  A: '#3b82f6', // Blue - Pa
  E: '#f59e0b', // Amber - High Ri2.
};

const NOTES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

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

const STRING_MIDI = {
  E: 64, // E4
  A: 57, // A3
  D: 50, // D3 - Sa
  G: 43, // G2
};

export const SimpleNoteFinder = () => {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<any[]>([]);

  const find = () => {
    const note = search.trim().toUpperCase();
    if (!NOTES[note as keyof typeof NOTES]) {
      setResult([]);
      return;
    }
    
    const found = [];
    for (let oct = 2; oct <= 6; oct++) {
      const midi = (oct + 1) * 12 + NOTES[note as keyof typeof NOTES];
      
      for (const [str, base] of Object.entries(STRING_MIDI)) {
        const offset = midi - base;
        const pos = POSITIONS[str as keyof typeof POSITIONS].find(p => p.s === offset);
        
        if (pos) {
          found.push({
            string: str,
            notation: pos.n,
            finger: pos.f,
            octave: oct,
          });
        }
      }
    }
    setResult(found);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 sticky top-6">
      <h3 className="text-lg font-bold mb-2">Quick Finder</h3>
      <p className="text-xs text-slate-400 mb-4">Find Carnatic positions for any Western note</p>
      
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && find()}
        placeholder="E, F#, Db..."
        className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 font-mono mb-2 text-lg"
      />
      <button
        onClick={find}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
      >
        Find Positions
      </button>

      <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
        {result.length > 0 && (
          <div className="text-xs text-slate-400 mb-2">
            Found {result.length} position{result.length > 1 ? 's' : ''}
          </div>
        )}
        {result.map((r, i) => (
          <div
            key={i}
            className="p-3 rounded-lg border-l-4"
            style={{
              backgroundColor: `${COLORS[r.string as keyof typeof COLORS]}20`,
              borderColor: COLORS[r.string as keyof typeof COLORS],
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-sm" style={{ color: COLORS[r.string as keyof typeof COLORS] }}>
                {r.string} String
              </span>
              <span className="text-xs text-slate-400">Oct {r.octave}</span>
            </div>
            <div className="text-xl font-black" style={{ color: COLORS[r.string as keyof typeof COLORS] }}>
              {r.notation}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Finger: {r.finger === 0 ? 'Open' : r.finger} 
              {r.finger === 1 || r.finger === 2 ? ' (low/high)' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

