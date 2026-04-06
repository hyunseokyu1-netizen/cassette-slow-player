import { TimelineItem, TrackItem, NoiseItem } from '../types/tape';

// ─── getCurrentItem ───────────────────────────────────────────────────────────
//
// Returns the TimelineItem active at `currentTime` on a given timeline.
//
// Timeline is a contiguous, non-overlapping sequence covering [0, SIDE_DURATION).
// Binary search is used since items are sorted by startTime.
//
// Returns null when:
//   - timeline is empty
//   - currentTime < 0 or currentTime >= SIDE_DURATION (out of bounds)

export function getCurrentItem(
  timeline: TimelineItem[],
  currentTime: number,
): TimelineItem | null {
  if (timeline.length === 0 || currentTime < 0) return null;

  let lo = 0;
  let hi = timeline.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const item = timeline[mid];
    const itemEnd = item.startTime + item.duration;

    if (currentTime < item.startTime) {
      hi = mid - 1;
    } else if (currentTime >= itemEnd) {
      lo = mid + 1;
    } else {
      return item;
    }
  }

  return null; // currentTime >= SIDE_DURATION or gap in timeline (shouldn't happen)
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isTrackItem(item: TimelineItem): item is TrackItem {
  return item.type === 'track';
}

export function isNoiseItem(item: TimelineItem): item is NoiseItem {
  return item.type === 'noise';
}

// ─── getTimeWithinItem ────────────────────────────────────────────────────────
//
// Returns how many seconds into the current item we are.
// Useful for audio seeking when switching to a new item.

export function getTimeWithinItem(item: TimelineItem, currentTime: number): number {
  return Math.max(0, currentTime - item.startTime);
}

// ─── getNextItem ──────────────────────────────────────────────────────────────
//
// Returns the item immediately following the given item, or null if it's the last.

export function getNextItem(
  timeline: TimelineItem[],
  currentItem: TimelineItem,
): TimelineItem | null {
  const idx = timeline.findIndex(
    (item) => item.startTime === currentItem.startTime && item.type === currentItem.type,
  );
  if (idx === -1 || idx === timeline.length - 1) return null;
  return timeline[idx + 1];
}
