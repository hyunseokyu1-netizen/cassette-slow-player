import {
  Track,
  TimelineItem,
  TapeSide,
  TrackAddResult,
  SIDE_DURATION,
  INITIAL_NOISE_DURATION,
  DEFAULT_NOISE_GAP,
} from '../types/tape';

// ─── buildTimeline ────────────────────────────────────────────────────────────
//
// Derives a full timeline from a track list and noiseGap setting.
//
// Side A layout:
//   [3s noise] → [track1] → [noiseGap] → [track2] → [noiseGap] → ... → [fill noise]
//
// Side B layout:
//   [track1] → [noiseGap] → [track2] → [noiseGap] → ... → [fill noise]
//
// Rules (spec):
//   - A starts with 3s noise
//   - noiseGap is placed BETWEEN tracks only (not before first, not after last)
//   - Remaining time is always filled with a single trailing noise item
//   - Gaps are clamped so they never push cursor past SIDE_DURATION

export function buildTimeline(
  sideLabel: 'A' | 'B',
  tracks: Track[],
  noiseGap: number,
  noiseDurations?: number[],
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let cursor = 0;

  // Side A: initial noise before anything else
  // noiseDurations[0] overrides INITIAL_NOISE_DURATION for side A
  if (sideLabel === 'A') {
    const initDur = noiseDurations?.[0] ?? INITIAL_NOISE_DURATION;
    items.push({ type: 'noise', startTime: 0, duration: initDur });
    cursor = initDur;
  }

  for (let i = 0; i < tracks.length; i++) {
    // Noise gap between consecutive tracks (not before the very first track)
    if (i > 0) {
      // Side A: noiseDurations[i] (index 0 = initial, so gap after track i-1 = index i)
      // Side B: noiseDurations[i-1] (no initial noise, gap after track i-1 = index i-1)
      const noiseIdx = sideLabel === 'A' ? i : i - 1;
      const gapDur = noiseDurations?.[noiseIdx] ?? noiseGap;
      if (gapDur > 0) {
        const gap = Math.min(gapDur, SIDE_DURATION - cursor);
        if (gap > 0) {
          items.push({ type: 'noise', startTime: cursor, duration: gap });
          cursor += gap;
        }
      }
    }

    if (cursor >= SIDE_DURATION) break; // safety: no space left

    const track = tracks[i];
    const trackDuration = Math.min(track.duration, SIDE_DURATION - cursor);
    items.push({ type: 'track', startTime: cursor, duration: trackDuration, track });
    cursor += trackDuration;
  }

  // Fill remaining time with trailing noise
  if (cursor < SIDE_DURATION) {
    items.push({ type: 'noise', startTime: cursor, duration: SIDE_DURATION - cursor });
  }

  return items;
}

// ─── getRemainingTime ─────────────────────────────────────────────────────────
//
// Returns how many seconds are available for a new track on this side.
//
// Accounts for:
//   - Initial noise (side A only)
//   - Durations of all existing tracks
//   - Noise gaps between existing tracks AND the one gap before the new track
//     (total gaps when adding = existingCount, since each existing track
//      contributes one gap to its right, except the last which gets one gap
//      to the left of the new track)
//
// Gap count derivation:
//   existingCount = 0 → 0 gaps
//   existingCount = 1 → 1 gap (between existing[0] and new)
//   existingCount = n → n gaps  (n-1 between existing + 1 before new)

export function getRemainingTime(
  sideLabel: 'A' | 'B',
  tracks: Track[],
  noiseGap: number,
): number {
  const initialNoise = sideLabel === 'A' ? INITIAL_NOISE_DURATION : 0;
  const existingCount = tracks.length;

  const usedByTracks = tracks.reduce((sum, t) => sum + t.duration, 0);
  const usedByGaps = existingCount * noiseGap;

  const used = initialNoise + usedByTracks + usedByGaps;
  return Math.max(0, SIDE_DURATION - used);
}

// ─── validateTrackAdd ─────────────────────────────────────────────────────────
//
// Checks whether a track can be added to a side.
// Spec: if (remainingTime < trackDuration) reject
//
// Optional Fit Mode (spec): trim track to remainingTime instead of rejecting.

export function validateTrackAdd(
  sideLabel: 'A' | 'B',
  existingTracks: Track[],
  newTrack: Track,
  noiseGap: number,
  fitMode = false,
): TrackAddResult {
  const remaining = getRemainingTime(sideLabel, existingTracks, noiseGap);

  if (remaining >= newTrack.duration) {
    return { ok: true };
  }

  if (fitMode && remaining > 0) {
    // Caller is responsible for trimming newTrack.duration to `remaining`
    return { ok: true };
  }

  return { ok: false, reason: 'insufficient_time', remainingTime: remaining };
}

// ─── createEmptySide ─────────────────────────────────────────────────────────

export function createEmptySide(label: 'A' | 'B', noiseGap: number): TapeSide {
  return {
    label,
    tracks: [],
    timeline: buildTimeline(label, [], noiseGap),
  };
}

// ─── createTape ───────────────────────────────────────────────────────────────

export function createTape(
  id: string,
  title: string,
  noiseGap = DEFAULT_NOISE_GAP,
) {
  return {
    id,
    title,
    noiseGap,
    A: createEmptySide('A', noiseGap),
    B: createEmptySide('B', noiseGap),
  };
}
