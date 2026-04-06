# Spec

## State

{
  side: 'A' | 'B',
  currentTime: number,
  isPlaying: boolean,
  noiseGap: number (0~5),
}

## Constants

SIDE_DURATION = 1800

## Rules

- A/B each 1800 seconds
- A starts with 3s noise
- Between tracks: noiseGap (default 2s)
- Remaining time filled with noise

## Track Add

if (remainingTime < trackDuration)
  reject

optional:
Fit Mode → trim track

## Playback

Timeline:
[noise] → [track] → [noise] → ...

## Flip Logic

When flipping:
B_time = SIDE_DURATION - A_played_time

## Restrictions

- No instant skip
- Skip requires long press
- No interaction during noise
- Flip must be manual

## Player Rule

- Only one sound active
- Always unload before load