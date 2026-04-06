import { useState, useCallback } from 'react';
import {
  Tape,
  Track,
  TrackAddResult,
  NOISE_GAP_MIN,
  NOISE_GAP_MAX,
} from '../types/tape';
import {
  buildTimeline,
  validateTrackAdd,
  getRemainingTime,
  createTape,
} from '../engine/timeline';

// ─── useTape ──────────────────────────────────────────────────────────────────
//
// Manages tape state: tracks, timelines, noiseGap.
// Every mutation rebuilds the affected side's timeline immediately.
//
// Task 7 (Track add validation) is enforced here via validateTrackAdd.

export function useTape(initialTape?: Tape) {
  const [tape, setTape] = useState<Tape>(
    () => initialTape ?? createTape(String(Date.now()), 'My Tape'),
  );

  // ── addTrack ────────────────────────────────────────────────────────────
  //
  // Validates before adding. Returns result so caller can show feedback.
  //
  // fitMode: if true, trim track to remainingTime instead of rejecting.
  //          Caller is responsible for using the trimmed duration in playback.

  const addTrack = useCallback(
    (sideLabel: 'A' | 'B', track: Track, fitMode = false): TrackAddResult => {
      const side = tape[sideLabel];
      const validation = validateTrackAdd(
        sideLabel,
        side.tracks,
        track,
        tape.noiseGap,
        fitMode,
      );

      if (!validation.ok) return validation;

      // Fit mode: clamp track duration to what actually fits
      const remaining = getRemainingTime(sideLabel, side.tracks, tape.noiseGap);
      const trackToAdd: Track = fitMode
        ? { ...track, duration: Math.min(track.duration, remaining) }
        : track;

      const newTracks = [...side.tracks, trackToAdd];
      const newTimeline = buildTimeline(sideLabel, newTracks, tape.noiseGap);

      setTape((prev) => ({
        ...prev,
        [sideLabel]: { ...prev[sideLabel], tracks: newTracks, timeline: newTimeline },
      }));

      return { ok: true };
    },
    [tape],
  );

  // ── removeTrack ──────────────────────────────────────────────────────────

  const removeTrack = useCallback(
    (sideLabel: 'A' | 'B', trackId: string): void => {
      setTape((prev) => {
        const side = prev[sideLabel];
        const newTracks = side.tracks.filter((t) => t.id !== trackId);
        const newTimeline = buildTimeline(sideLabel, newTracks, prev.noiseGap);
        return {
          ...prev,
          [sideLabel]: { ...side, tracks: newTracks, timeline: newTimeline },
        };
      });
    },
    [],
  );

  // ── reorderTracks ────────────────────────────────────────────────────────
  //
  // Accepts the full new-order array (from drag-and-drop in Phase 4).
  // Rebuilds timeline with the new order.

  const reorderTracks = useCallback(
    (sideLabel: 'A' | 'B', newOrder: Track[]): void => {
      setTape((prev) => {
        const side = prev[sideLabel];
        const newTimeline = buildTimeline(sideLabel, newOrder, prev.noiseGap);
        return {
          ...prev,
          [sideLabel]: { ...side, tracks: newOrder, timeline: newTimeline },
        };
      });
    },
    [],
  );

  // ── setNoiseGap ──────────────────────────────────────────────────────────
  //
  // Changing noiseGap invalidates both timelines.

  const setNoiseGap = useCallback((gap: number): void => {
    const clamped = Math.max(NOISE_GAP_MIN, Math.min(NOISE_GAP_MAX, gap));
    setTape((prev) => ({
      ...prev,
      noiseGap: clamped,
      A: {
        ...prev.A,
        timeline: buildTimeline('A', prev.A.tracks, clamped),
      },
      B: {
        ...prev.B,
        timeline: buildTimeline('B', prev.B.tracks, clamped),
      },
    }));
  }, []);

  // ── getRemainingTimeForSide ──────────────────────────────────────────────

  const getRemainingTimeForSide = useCallback(
    (sideLabel: 'A' | 'B'): number =>
      getRemainingTime(sideLabel, tape[sideLabel].tracks, tape.noiseGap),
    [tape],
  );

  return {
    tape,
    addTrack,
    removeTrack,
    reorderTracks,
    setNoiseGap,
    getRemainingTimeForSide,
  };
}
