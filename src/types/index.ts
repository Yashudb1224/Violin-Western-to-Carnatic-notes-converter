export interface CarnaticPosition {
  string: 'G' | 'D' | 'A' | 'E';
  position: string;
  fingerPosition: number;
  octaveMarker?: '.' | '..';
}

export interface WesternNote {
  pitch: string;
  duration: number;
  octave: number;
}

export interface ParsedScore {
  title?: string;
  composer?: string;
  tempo?: number;
  timeSignature?: { beats: number; beatType: number };
  notes: WesternNote[];
}

export interface NotationMapping {
  western: WesternNote;
  carnatic: CarnaticPosition | null;
}

export type PlaybackState = 'idle' | 'playing' | 'paused';

export interface PlaybackControls {
  state: PlaybackState;
  currentIndex: number;
  tempo: number;
  loop: boolean;
}

export type InputMethod = 'manual' | 'upload' | 'camera';

export type FileFormat = 'musicxml' | 'abc' | 'image' | 'midi';
