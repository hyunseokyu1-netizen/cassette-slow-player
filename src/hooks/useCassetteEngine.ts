import { useState, useEffect, useRef, useCallback } from 'react';
import { Tape, TimelineItem, SIDE_DURATION } from '../types/tape';
import {
  getCurrentItem,
  getNextItem,
  getTimeWithinItem,
  isTrackItem,
} from '../engine/getCurrentItem';
import { cassettePlayer, initAudioMode } from '../engine/player';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOISE_TICK_MS = 100; // noise timer resolution

// ─── Types ────────────────────────────────────────────────────────────────────

export type CassetteEngineReturn = {
  side: 'A' | 'B';
  currentTime: number;       // seconds elapsed on active side [0, SIDE_DURATION]
  isPlaying: boolean;
  remainingTime: number;     // seconds left on active side
  currentItem: TimelineItem | null;
  isNoise: boolean;          // true when current item is noise
  isInteractionBlocked: boolean; // spec: no interaction during noise
  isSideEnded: boolean;      // currentTime >= SIDE_DURATION
  play: () => Promise<void>;
  pause: () => Promise<void>;
  flip: () => Promise<void>;
  // Seek — only via long press (spec: skip requires long press)
  seekToNextTrack: () => Promise<void>;
  seekToPrevTrack: () => Promise<void>;
};

// ─── useCassetteEngine ────────────────────────────────────────────────────────
//
// Orchestrates all playback logic:
//   Task 5 – Time tracking (tracks via Expo AV positionMillis, noise via timer)
//   Task 6 – Noise insertion (no audio during noise items; timer-driven advance)
//   Task 8 – A/B side logic (flip formula: B_time = SIDE_DURATION - A_currentTime)
//
// Design rules from spec:
//   - Only one sound active at a time   → enforced in CassettePlayer.loadItem
//   - Always unload before load         → enforced in CassettePlayer.loadItem
//   - No interaction during noise       → isInteractionBlocked exposed to UI
//   - Flip must be manual               → flip() always pauses; user presses play

export function useCassetteEngine(tape: Tape): CassetteEngineReturn {
  const [side, setSide] = useState<'A' | 'B'>('A');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Refs (avoid stale closures in async callbacks) ────────────────────────
  const sideRef = useRef<'A' | 'B'>('A');
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tapeRef = useRef(tape);

  // Sync refs on every render
  sideRef.current = side;
  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;
  tapeRef.current = tape;

  // ── Noise timer refs ──────────────────────────────────────────────────────
  const noiseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noiseStartWallRef = useRef(0);   // Date.now() when noise started
  const noiseStartGameRef = useRef(0);   // currentTime when noise started

  // ── Derived state ──────────────────────────────────────────────────────────
  const timeline = tape[side].timeline;
  const currentItem = getCurrentItem(timeline, currentTime);
  const isNoise = currentItem?.type === 'noise';
  const isInteractionBlocked = isNoise;
  const isSideEnded = currentTime >= SIDE_DURATION;
  const remainingTime = Math.max(0, SIDE_DURATION - currentTime);

  // ── Noise timer ────────────────────────────────────────────────────────────

  const stopNoiseTimer = useCallback(() => {
    if (noiseTimerRef.current !== null) {
      clearInterval(noiseTimerRef.current);
      noiseTimerRef.current = null;
    }
  }, []);

  // Uses wall-clock timestamps to avoid drift from setInterval jitter.
  const startNoiseTimer = useCallback(
    (fromTime: number) => {
      stopNoiseTimer();
      noiseStartWallRef.current = Date.now();
      noiseStartGameRef.current = fromTime;

      noiseTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - noiseStartWallRef.current) / 1000;
        const newTime = noiseStartGameRef.current + elapsed;
        currentTimeRef.current = newTime;
        setCurrentTime(newTime);
      }, NOISE_TICK_MS);
    },
    [stopNoiseTimer],
  );

  // ── Item transition ────────────────────────────────────────────────────────
  //
  // Loads and optionally starts the given item.
  // Snaps currentTime to item.startTime to keep side-time accurate.

  const transitionToItem = useCallback(
    async (item: TimelineItem) => {
      const t = item.startTime;
      currentTimeRef.current = t;
      setCurrentTime(t);

      await cassettePlayer.loadItem(item);

      if (isPlayingRef.current) {
        if (isTrackItem(item)) {
          await cassettePlayer.play();
        } else {
          startNoiseTimer(t);
        }
      }
    },
    [startNoiseTimer],
  );

  // Called by Expo AV callback (track ended) or noise tick (noise item elapsed).
  const handleItemFinished = useCallback(async () => {
    stopNoiseTimer();

    const tl = tapeRef.current[sideRef.current].timeline;
    const item = getCurrentItem(tl, currentTimeRef.current);
    if (!item) return;

    const next = getNextItem(tl, item);

    if (!next) {
      // ── Side ended ──────────────────────────────────────────────────────
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentTime(SIDE_DURATION);
      currentTimeRef.current = SIDE_DURATION;
      await cassettePlayer.unload();
      return;
    }

    await transitionToItem(next);
  }, [stopNoiseTimer, transitionToItem]);

  // ── Noise item end detection ───────────────────────────────────────────────
  //
  // Each timer tick lands here via the currentTime state update.
  // When time passes the current noise item's end, trigger transition.

  useEffect(() => {
    if (!isNoise || !isPlaying || !currentItem) return;
    const itemEnd = currentItem.startTime + currentItem.duration;
    if (currentTime >= itemEnd) {
      handleItemFinished();
    }
  }, [currentTime, isNoise, isPlaying, currentItem, handleItemFinished]);

  // ── Expo AV callbacks ──────────────────────────────────────────────────────
  //
  // Track playback: convert item-relative positionMillis → side-relative time.
  // This is the source of truth for currentTime during track playback.

  useEffect(() => {
    cassettePlayer.setCallbacks({
      onStatusUpdate: (status) => {
        if (!status.isPlaying) return;

        const tl = tapeRef.current[sideRef.current].timeline;
        const item = getCurrentItem(tl, currentTimeRef.current);
        if (!item || !isTrackItem(item)) return;

        const newTime = item.startTime + status.positionMillis / 1000;
        currentTimeRef.current = newTime;
        setCurrentTime(newTime);
      },
      onItemFinished: handleItemFinished,
    });
  }, [handleItemFinished]);

  // ── Init & cleanup ─────────────────────────────────────────────────────────

  useEffect(() => {
    initAudioMode();
    return () => {
      stopNoiseTimer();
      cassettePlayer.unload();
    };
  }, [stopNoiseTimer]);

  // ── play ───────────────────────────────────────────────────────────────────

  const play = useCallback(async () => {
    if (isPlayingRef.current) return;
    if (currentTimeRef.current >= SIDE_DURATION) return;

    const tl = tapeRef.current[sideRef.current].timeline;
    const item = getCurrentItem(tl, currentTimeRef.current);
    if (!item) return;

    isPlayingRef.current = true;
    setIsPlaying(true);

    if (isTrackItem(item)) {
      // Load if needed (e.g. first press, or after pause on a different item)
      if (!cassettePlayer.isTrackLoaded) {
        await cassettePlayer.loadItem(item);
      }
      const offsetMs = getTimeWithinItem(item, currentTimeRef.current) * 1000;
      await cassettePlayer.seekTo(offsetMs);
      await cassettePlayer.play();
    } else {
      // Noise: resume timer from exact current position
      startNoiseTimer(currentTimeRef.current);
    }
  }, [startNoiseTimer]);

  // ── pause ──────────────────────────────────────────────────────────────────

  const pause = useCallback(async () => {
    if (!isPlayingRef.current) return;

    isPlayingRef.current = false;
    setIsPlaying(false);
    stopNoiseTimer();
    await cassettePlayer.pause();
  }, [stopNoiseTimer]);

  // ── flip ───────────────────────────────────────────────────────────────────
  //
  // Spec: B_time = SIDE_DURATION - A_played_time
  //
  // Always pauses on flip. User must press play after the flip animation.
  // This matches physical cassette behavior (you stop, flip, then press play).

  // ── seekToNextTrack ────────────────────────────────────────────────────────
  //
  // Jumps to the start of the next TrackItem.
  // Spec: skip requires long press → this function is only called from long press.
  // Blocked during noise (isInteractionBlocked).

  const seekToNextTrack = useCallback(async () => {
    if (isPlayingRef.current && isNoise) return;

    const tl = tapeRef.current[sideRef.current].timeline;
    const ct = currentTimeRef.current;

    // Find the first TrackItem that starts strictly after current position
    const next = tl.find((item) => isTrackItem(item) && item.startTime > ct);
    if (!next) return;

    const wasPlaying = isPlayingRef.current;
    stopNoiseTimer();
    await cassettePlayer.unload();

    currentTimeRef.current = next.startTime;
    setCurrentTime(next.startTime);

    await cassettePlayer.loadItem(next);

    if (wasPlaying && isTrackItem(next)) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      await cassettePlayer.play();
    }
  }, [isNoise, stopNoiseTimer]);

  // ── seekToPrevTrack ────────────────────────────────────────────────────────
  //
  // If more than 3s into the current track: seeks to its start.
  // Otherwise: seeks to the previous TrackItem.
  // Blocked during noise.

  const seekToPrevTrack = useCallback(async () => {
    if (isPlayingRef.current && isNoise) return;

    const tl = tapeRef.current[sideRef.current].timeline;
    const ct = currentTimeRef.current;

    const currentTrackItem = tl.find(
      (item) => isTrackItem(item) && ct >= item.startTime && ct < item.startTime + item.duration,
    );

    let targetTime = 0;

    if (currentTrackItem && isTrackItem(currentTrackItem)) {
      const offsetIntoTrack = ct - currentTrackItem.startTime;
      if (offsetIntoTrack > 3) {
        // Seek to start of current track
        targetTime = currentTrackItem.startTime;
      } else {
        // Seek to previous TrackItem
        const prevTrack = tl
          .filter((item) => isTrackItem(item) && item.startTime < currentTrackItem.startTime)
          .pop();
        targetTime = prevTrack ? prevTrack.startTime : currentTrackItem.startTime;
      }
    } else {
      // On noise: seek to the last TrackItem before current position
      const prevTrack = tl
        .filter((item) => isTrackItem(item) && item.startTime < ct)
        .pop();
      targetTime = prevTrack ? prevTrack.startTime : 0;
    }

    const wasPlaying = isPlayingRef.current;
    stopNoiseTimer();
    await cassettePlayer.unload();

    const targetItem = tl.find(
      (item) => item.startTime === targetTime,
    );
    if (!targetItem) return;

    currentTimeRef.current = targetTime;
    setCurrentTime(targetTime);

    await cassettePlayer.loadItem(targetItem);

    if (wasPlaying && isTrackItem(targetItem)) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      await cassettePlayer.play();
    }
  }, [isNoise, stopNoiseTimer]);

  // ── flip ───────────────────────────────────────────────────────────────────
  //
  // Spec: B_time = SIDE_DURATION - A_played_time
  //
  // Always pauses on flip. User must press play after the flip animation.

  const flip = useCallback(async () => {
    // Stop everything
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopNoiseTimer();
    await cassettePlayer.unload();

    const newSide: 'A' | 'B' = sideRef.current === 'A' ? 'B' : 'A';
    const flippedTime = Math.max(
      0,
      Math.min(SIDE_DURATION, SIDE_DURATION - currentTimeRef.current),
    );

    // Apply new side and mirrored time
    sideRef.current = newSide;
    currentTimeRef.current = flippedTime;
    setSide(newSide);
    setCurrentTime(flippedTime);
  }, [stopNoiseTimer]);

  return {
    side,
    currentTime,
    isPlaying,
    remainingTime,
    currentItem,
    isNoise,
    isInteractionBlocked,
    isSideEnded,
    play,
    pause,
    flip,
    seekToNextTrack,
    seekToPrevTrack,
  };
}
