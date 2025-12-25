'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface Position {
  string: 'G' | 'D' | 'A' | 'E';
  carnaticNotation: string;
  fingerPosition: number;
  westernNote: string;
  octave: number;
}

const STRING_COLORS: Record<string, string> = {
  G: '#ef4444',
  D: '#06b6d4',
  A: '#3b82f6',
  E: '#f97316',
};

const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'Fb': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'B#': 0, 'Cb': 11,
};

const STRING_TUNINGS = { G: 55, D: 50, A: 45, E: 40 }; // MIDI numbers

const STRING_POSITIONS: Record<string, string[]> = {
  G: ['SA', 'RE1', 'RE2', 'GA2', 'GA3', 'MA1', 'MA2'],
  D: ['PA', 'DA1', 'DA2', 'NI2', 'NI3', 'SA.'],
  A: ['Sa', 'Re1', 'Re2', 'Ga2', 'Ga3', 'Ma1', 'Ma2'],
  E: ['Pa', 'Da1', 'Da2', 'Ni2', 'Ni3', 'Sa.', 'Re1.', 'Re2.', 'Ga2.', 'Ga3.', 'Ma1.', 'Ma2.', 'Pa.'],
};

export const NoteFinder = () => {
  const [searchNote, setSearchNote] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState('');

  const findAllPositions = () => {
    const noteUpper = searchNote.trim().toUpperCase();
    
    if (!noteUpper) {
      setError('Please enter a note name');
      return;
    }

    // Parse the note
    const baseNoteMidi = NOTE_TO_MIDI[noteUpper];
    
    if (baseNoteMidi === undefined) {
      setError('Invalid note. Examples: E, E#, Eb, F#, Db, etc.');
      setPositions([]);
      return;
    }

    setError('');
    const foundPositions: Position[] = [];

    // Search across multiple octaves (octaves 2-6 cover most violin range)
    for (let octave = 2; octave <= 6; octave++) {
      const midiNote = (octave + 1) * 12 + baseNoteMidi;
      
      // Check each string
      const strings: Array<keyof typeof STRING_TUNINGS> = ['G', 'D', 'A', 'E'];
      
      for (const string of strings) {
        const openStringMidi = STRING_TUNINGS[string];
        const semitonesFromOpen = midiNote - openStringMidi;
        
        // Only include positions within playable range
        if (semitonesFromOpen >= 0 && semitonesFromOpen < STRING_POSITIONS[string].length) {
          foundPositions.push({
            string,
            carnaticNotation: STRING_POSITIONS[string][semitonesFromOpen],
            fingerPosition: semitonesFromOpen,
            westernNote: noteUpper,
            octave,
          });
        }
      }
    }

    if (foundPositions.length === 0) {
      setError('No positions found for this note on the violin');
    }

    setPositions(foundPositions);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      findAllPositions();
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-2xl font-bold mb-4">Note Position Finder</h3>
      <p className="text-slate-400 text-sm mb-6">
        Enter any Western note (like E#, Db, F, etc.) to see all possible Carnatic positions on your violin
      </p>

      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchNote}
            onChange={(e) => setSearchNote(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter note: E, E#, Eb, F#, Db, etc."
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl
                     text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                     text-lg font-mono"
          />
        </div>
        <button
          onClick={findAllPositions}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 
                   hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold 
                   transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Search size={20} />
          Find
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {positions.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-4">
            Found {positions.length} position{positions.length > 1 ? 's' : ''} for {searchNote.toUpperCase()}
          </h4>
          
          <div className="space-y-3">
            {positions.map((pos, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: `${STRING_COLORS[pos.string]}15`,
                  borderColor: STRING_COLORS[pos.string],
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl"
                    style={{
                      backgroundColor: `${STRING_COLORS[pos.string]}30`,
                      border: `3px solid ${STRING_COLORS[pos.string]}`,
                      color: STRING_COLORS[pos.string],
                    }}
                  >
                    {pos.string}
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-1">
                      {pos.string} String • {pos.westernNote}{pos.octave}
                    </div>
                    <div className="text-3xl font-black" style={{ color: STRING_COLORS[pos.string] }}>
                      {pos.carnaticNotation}
                    </div>
                    <div className="text-sm text-slate-300 mt-1">
                      Finger Position: {pos.fingerPosition === 0 ? 'Open String' : `${pos.fingerPosition}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 mb-1">Octave</div>
                  <div className="text-2xl font-bold">{pos.octave}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-slate-300">
              <strong className="text-blue-400">Tip:</strong> Higher octave numbers = higher pitch. 
              Lower finger positions (0-3) are easier to reach than higher ones (4-7).
            </p>
          </div>
        </div>
      )}

      {positions.length === 0 && !error && (
        <div className="text-center py-12 text-slate-400">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p>Enter a note to find all its positions on the violin</p>
        </div>
      )}
    </div>
  );
};
