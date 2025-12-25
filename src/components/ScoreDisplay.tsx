'use client';

import { useAppStore } from '@/lib/store';

const STRING_COLORS: Record<string, string> = {
  G: '#ef4444',
  D: '#06b6d4',
  A: '#3b82f6',
  E: '#f97316',
};

export const ScoreDisplay = () => {
  const {
    westernNotes,
    carnaticPositions,
    currentIndex,
    setCurrentIndex,
    setPlaybackState,
  } = useAppStore();

  if (westernNotes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold mb-6">
        Full Score ({westernNotes.length} notes)
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {westernNotes.map((note, idx) => {
          const position = carnaticPositions[idx];
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;

          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setPlaybackState('paused');
              }}
              className={`
                p-4 rounded-xl border-2 transition-all text-center
                ${isCurrent 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 scale-105 shadow-lg shadow-blue-500/50' 
                  : isPast
                    ? 'bg-white/5 border-white/10 opacity-60 hover:opacity-80'
                    : 'bg-white/5 hover:bg-white/10'}
                ${!isCurrent && position 
                  ? `border-${position.string.toLowerCase()}` 
                  : !isCurrent ? 'border-white/10' : ''}
              `}
              style={!isCurrent && position ? {
                borderColor: `${STRING_COLORS[position.string]}40`
              } : {}}
            >
              <div className={`text-lg font-bold mb-2 ${isCurrent ? 'text-white' : 'text-slate-200'}`}>
                {note.pitch}{note.octave}
              </div>
              {position && (
                <>
                  <div 
                    className={`text-xs font-semibold mb-1 ${isCurrent ? 'text-white/90' : ''}`}
                    style={!isCurrent ? { color: STRING_COLORS[position.string] } : {}}
                  >
                    {position.string}
                  </div>
                  <div className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-slate-200'}`}>
                    {position.position}
                  </div>
                </>
              )}
              {note.duration !== 1 && (
                <div className="text-xs text-slate-400 mt-1">
                  {note.duration}x
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
