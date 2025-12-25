import { create } from 'zustand';
import { WesternNote, CarnaticPosition, PlaybackState } from '@/types';

interface AppState {
  // Score data
  westernNotes: WesternNote[];
  carnaticPositions: (CarnaticPosition | null)[];
  scoreMetadata: {
    title?: string;
    composer?: string;
    tempo?: number;
  };

  // Playback state
  playbackState: PlaybackState;
  currentIndex: number;
  tempo: number;
  loop: boolean;

  // Actions
  setScore: (notes: WesternNote[], positions: (CarnaticPosition | null)[]) => void;
  setMetadata: (metadata: { title?: string; composer?: string; tempo?: number }) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentIndex: (index: number) => void;
  setTempo: (tempo: number) => void;
  setLoop: (loop: boolean) => void;
  reset: () => void;
  nextNote: () => void;
  previousNote: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  westernNotes: [],
  carnaticPositions: [],
  scoreMetadata: {},
  
  playbackState: 'idle',
  currentIndex: 0,
  tempo: 120,
  loop: false,

  setScore: (notes, positions) => 
    set({ 
      westernNotes: notes, 
      carnaticPositions: positions,
      currentIndex: 0,
      playbackState: 'idle',
    }),

  setMetadata: (metadata) =>
    set({ scoreMetadata: metadata }),

  setPlaybackState: (state) => 
    set({ playbackState: state }),

  setCurrentIndex: (index) => 
    set({ currentIndex: index }),

  setTempo: (tempo) => 
    set({ tempo }),

  setLoop: (loop) => 
    set({ loop }),

  reset: () => 
    set({ 
      westernNotes: [], 
      carnaticPositions: [],
      scoreMetadata: {},
      playbackState: 'idle',
      currentIndex: 0,
    }),

  nextNote: () => {
    const { currentIndex, westernNotes, loop } = get();
    if (currentIndex < westernNotes.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    } else if (loop) {
      set({ currentIndex: 0 });
    } else {
      set({ playbackState: 'idle' });
    }
  },

  previousNote: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },
}));
