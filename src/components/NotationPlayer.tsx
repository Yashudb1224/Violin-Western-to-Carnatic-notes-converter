'use client';

import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { usePlayback } from '@/hooks/usePlayback';
import { useEffect, useRef } from 'react';

const STRING_COLORS: Record<string, string> = {
  G: '#ef4444',
  D: '#06b6d4',
  A: '#3b82f6',
  E: '#f97316',
};

const STRING_ORDER = ['G', 'D', 'A', 'E'] as const;

export const NotationPlayer = () => {
  const {
    westernNotes,
    carnaticPositions,
    currentIndex,
    tempo,
    loop,
    setTempo,
    setLoop,
    previousNote,
    nextNote,
  } = useAppStore();

  const { togglePlayback, stopPlayback, isPlaying } = usePlayback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const scrollOffset = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || westernNotes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Draw string lanes
      const laneWidth = width / 4;
      
      STRING_ORDER.forEach((string, index) => {
        const x = index * laneWidth;
        
        // Lane background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x, 0, laneWidth, height);
        
        // Lane border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + laneWidth, 0);
        ctx.lineTo(x + laneWidth, height);
        ctx.stroke();

        // String label at top
        ctx.fillStyle = STRING_COLORS[string];
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(string, x + laneWidth / 2, 40);
        
        // Draw centerline at bottom (target line)
        ctx.strokeStyle = STRING_COLORS[string];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 10, height - 80);
        ctx.lineTo(x + laneWidth - 10, height - 80);
        ctx.stroke();
      });

      // Draw notes
      const pixelsPerBeat = 150; // Distance notes travel per beat
      const targetY = height - 80; // Where notes should hit
      
      if (isPlaying) {
        scrollOffset.current += (tempo / 60) * 2; // Scroll speed based on tempo
      }

      let accumulatedTime = 0;
      carnaticPositions.forEach((position, index) => {
        if (!position) return;

        const stringIndex = STRING_ORDER.indexOf(position.string);
        if (stringIndex === -1) return;

        const x = stringIndex * laneWidth + laneWidth / 2;
        
        // Calculate Y position based on time
        const noteTime = accumulatedTime;
        const y = targetY - (noteTime * pixelsPerBeat) + scrollOffset.current;
        
        accumulatedTime += westernNotes[index].duration;

        // Only draw if note is visible
        if (y > -100 && y < height + 100) {
          const isActive = index === currentIndex;
          const isPast = y > targetY + 20;

          // Note circle
          ctx.beginPath();
          ctx.arc(x, y, isActive ? 35 : 25, 0, Math.PI * 2);
          
          if (isPast) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
          } else if (isActive) {
            ctx.fillStyle = STRING_COLORS[position.string];
            ctx.shadowColor = STRING_COLORS[position.string];
            ctx.shadowBlur = 20;
          } else {
            ctx.fillStyle = `${STRING_COLORS[position.string]}cc`;
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;

          // Border
          ctx.strokeStyle = isActive ? '#fff' : STRING_COLORS[position.string];
          ctx.lineWidth = isActive ? 4 : 2;
          ctx.stroke();

          // Carnatic notation inside circle
          ctx.fillStyle = isActive ? '#fff' : '#1e293b';
          ctx.font = `bold ${isActive ? 14 : 12}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(position.position, x, y);

          // Western note below
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '10px sans-serif';
          ctx.fillText(
            `${westernNotes[index].pitch}${westernNotes[index].octave}`,
            x,
            y + (isActive ? 50 : 40)
          );

          // Tail line for duration
          if (westernNotes[index].duration > 1) {
            const tailLength = (westernNotes[index].duration - 1) * pixelsPerBeat;
            ctx.strokeStyle = `${STRING_COLORS[position.string]}66`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y + 25);
            ctx.lineTo(x, y + 25 + tailLength);
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [westernNotes, carnaticPositions, currentIndex, isPlaying, tempo]);

  if (westernNotes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Playback Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h3 className="text-xl font-bold">Scrolling Notation View</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="rounded"
              />
              Loop
            </label>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-300">
                Tempo: {tempo} BPM
              </label>
              <input
                type="range"
                min="40"
                max="200"
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3">
          <button
            onClick={stopPlayback}
            className="p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all"
            title="Stop"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={previousNote}
            disabled={currentIndex === 0}
            className="p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all 
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlayback}
            className={`
              px-8 py-4 rounded-xl font-semibold text-lg transition-all
              hover:scale-105 active:scale-95 flex items-center gap-3
              ${isPlaying 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Play
              </>
            )}
          </button>

          <button
            onClick={nextNote}
            disabled={currentIndex >= westernNotes.length - 1}
            className="p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrolling Canvas Display */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: '600px' }}
        />
      </div>

      {/* Legend */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h4 className="text-lg font-bold mb-4">How to Read</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STRING_ORDER.map((string) => (
            <div key={string} className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                style={{
                  backgroundColor: `${STRING_COLORS[string]}20`,
                  border: `3px solid ${STRING_COLORS[string]}`,
                  color: STRING_COLORS[string],
                }}
              >
                {string}
              </div>
              <div>
                <div className="font-semibold">{string} String</div>
                <div className="text-xs text-slate-400">
                  {string === 'G' && 'Higher Sa'}
                  {string === 'D' && 'Higher Pa'}
                  {string === 'A' && 'Lower Sa'}
                  {string === 'E' && 'Lower Pa'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-slate-400">
            Notes scroll down and hit the target line at the bottom. The Carnatic notation is shown inside each note circle.
          </p>
        </div>
      </div>
    </div>
  );
};
