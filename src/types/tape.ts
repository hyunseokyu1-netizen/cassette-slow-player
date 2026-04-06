// ─── Constants ───────────────────────────────────────────────────────────────

export const SIDE_DURATION = 1800; // 30 minutes per side, in seconds
export const INITIAL_NOISE_DURATION = 3; // Side A starts with 3s noise (spec)
export const DEFAULT_NOISE_GAP = 2; // Default noise between tracks, in seconds
export const NOISE_GAP_MIN = 0;
export const NOISE_GAP_MAX = 5;

// ─── Track ───────────────────────────────────────────────────────────────────

export type Track = {
  id: string;
  title: string;
  artist: string;
  uri: string; // local file URI or remote URI (Expo AV compatible)
  duration: number; // seconds
};

// ─── Timeline Items ───────────────────────────────────────────────────────────
//
// The player is timeline-based, not track-based.
// Both noise and tracks are first-class timeline items.
// Timeline: [noise] → [track] → [noise] → [track] → ... → [noise (fill)]

export type NoiseItem = {
  type: 'noise';
  startTime: number; // seconds from side start
  duration: number; // seconds
};

export type TrackItem = {
  type: 'track';
  startTime: number; // seconds from side start
  duration: number; // seconds (mirrors track.duration)
  track: Track;
};

export type TimelineItem = NoiseItem | TrackItem;

// ─── Tape Side ────────────────────────────────────────────────────────────────

export type TapeSide = {
  label: 'A' | 'B';
  tracks: Track[]; // ordered source-of-truth; timeline is derived from this
  timeline: TimelineItem[]; // rebuilt whenever tracks or noiseGap changes
};

// ─── Tape ─────────────────────────────────────────────────────────────────────

export type Tape = {
  id: string;
  title: string;
  noiseGap: number; // 0~5 seconds, shared across both sides
  A: TapeSide;
  B: TapeSide;
};

// ─── Player State ─────────────────────────────────────────────────────────────

export type PlayerState = {
  side: 'A' | 'B';
  currentTime: number; // seconds elapsed on the active side
  isPlaying: boolean;
  noiseGap: number; // mirrors tape.noiseGap; kept here for quick access
};

// ─── Track Add Result ─────────────────────────────────────────────────────────

export type TrackAddResult =
  | { ok: true }
  | { ok: false; reason: 'insufficient_time'; remainingTime: number };
