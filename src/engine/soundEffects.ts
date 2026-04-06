import { Audio } from 'expo-av';

// ─── Sound Effects ────────────────────────────────────────────────────────────
//
// Task 18: Sound effects for flip, button click, and tape hiss.
//
// Audio files should be placed in:
//   assets/sounds/flip.mp3   — mechanical cassette flip click (~0.3s)
//   assets/sounds/click.mp3  — button press click (~0.1s)
//   assets/sounds/hiss.mp3   — tape hiss loop (~2s, will be looped)
//
// All functions fail silently if audio files are not present.
// This ensures the app works without audio assets during development.

const SOUNDS = {
  flip: 'assets/sounds/flip.mp3',
  click: 'assets/sounds/click.mp3',
  hiss: 'assets/sounds/hiss.mp3',
} as const;

// Singleton for looping hiss
let hissSound: Audio.Sound | null = null;
let hissLoading = false;

// ── playOnce ──────────────────────────────────────────────────────────────────
//
// Loads, plays, and auto-unloads a short one-shot sound.

export async function playOnce(name: 'flip' | 'click'): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUNDS[name] },
      { shouldPlay: true, volume: name === 'flip' ? 0.7 : 0.4 },
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // Sound file not available — fail silently
  }
}

// ── startHiss ──────────────────────────────────────────────────────────────────
//
// Starts looping the tape hiss sound.
// Called when a noise item begins.

export async function startHiss(): Promise<void> {
  if (hissLoading || hissSound) return;
  hissLoading = true;

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUNDS.hiss },
      { shouldPlay: true, isLooping: true, volume: 0.25 },
    );
    hissSound = sound;
  } catch {
    // Sound file not available — fail silently
  } finally {
    hissLoading = false;
  }
}

// ── stopHiss ──────────────────────────────────────────────────────────────────
//
// Stops and unloads the hiss sound.
// Called when a noise item ends or playback stops.

export async function stopHiss(): Promise<void> {
  if (!hissSound) return;
  const s = hissSound;
  hissSound = null;

  try {
    await s.stopAsync();
    await s.unloadAsync();
  } catch {
    // Ignore errors during cleanup
  }
}
