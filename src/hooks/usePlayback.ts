import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

export const usePlayback = () => {
  const {
    playbackState,
    currentIndex,
    tempo,
    westernNotes,
    nextNote,
    setPlaybackState,
  } = useAppStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playbackState === 'playing' && currentIndex < westernNotes.length) {
      const currentNote = westernNotes[currentIndex];
      const beatDuration = (60 / tempo) * 1000; // Convert BPM to ms per beat
      const noteDuration = currentNote.duration * beatDuration;

      timeoutRef.current = setTimeout(() => {
        nextNote();
      }, noteDuration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [playbackState, currentIndex, tempo, westernNotes, nextNote]);

  const togglePlayback = () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
    } else {
      if (currentIndex >= westernNotes.length - 1) {
        useAppStore.getState().setCurrentIndex(0);
      }
      setPlaybackState('playing');
    }
  };

  const stopPlayback = () => {
    setPlaybackState('idle');
    useAppStore.getState().setCurrentIndex(0);
  };

  return {
    togglePlayback,
    stopPlayback,
    isPlaying: playbackState === 'playing',
  };
};
