import { Audio, AVPlaybackStatus } from 'expo-av';
import { TimelineItem, TrackItem } from '../types/tape';
import { isTrackItem } from './getCurrentItem';
import { startHiss, stopHiss } from './soundEffects';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayerItemStatus = {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
};

export type PlayerCallbacks = {
  onStatusUpdate: (status: PlayerItemStatus) => void;
  onItemFinished: () => void;
};

// ─── Audio Mode ───────────────────────────────────────────────────────────────
//
// Must be called once at app startup before any playback.
// Enables background audio on iOS and sets the audio category.

export async function initAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
  });
}

// ─── CassettePlayer ───────────────────────────────────────────────────────────
//
// Manages a single Audio.Sound instance.
//
// Spec rules enforced here:
//   - Only one sound active at a time
//   - Always unload before load
//   - No skip during noise (NoiseItem: load nothing, just wait)

class CassettePlayer {
  private sound: Audio.Sound | null = null;
  private loadedItem: TimelineItem | null = null;
  private callbacks: PlayerCallbacks | null = null;

  setCallbacks(callbacks: PlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  // ── loadItem ──────────────────────────────────────────────────────────────
  //
  // Prepares the player for a timeline item.
  // - TrackItem: unload previous, load track audio, ready to play
  // - NoiseItem: unload previous, no audio loaded (silence/wait)

  async loadItem(item: TimelineItem): Promise<void> {
    await this.unload();

    this.loadedItem = item;

    if (!isTrackItem(item)) {
      // Noise: no audio to load — duration is handled by the timer (Phase 2).
      // Start looping tape hiss (fails silently if assets/sounds/hiss.mp3 is absent).
      startHiss();
      return;
    }

    await this._loadTrack(item);
  }

  private async _loadTrack(item: TrackItem): Promise<void> {
    const { sound } = await Audio.Sound.createAsync(
      { uri: item.track.uri },
      { shouldPlay: false, progressUpdateIntervalMillis: 500 },
      (status: AVPlaybackStatus) => this._handlePlaybackStatus(status, item),
    );

    this.sound = sound;
  }

  private _handlePlaybackStatus(status: AVPlaybackStatus, item: TrackItem): void {
    if (!status.isLoaded) return;

    const update: PlayerItemStatus = {
      isPlaying: status.isPlaying,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis ?? item.duration * 1000,
      didJustFinish: status.didJustFinish,
    };

    this.callbacks?.onStatusUpdate(update);

    if (status.didJustFinish) {
      this.callbacks?.onItemFinished();
    }
  }

  // ── play ──────────────────────────────────────────────────────────────────
  //
  // Starts playback of the loaded track.
  // If the current item is noise, this is a no-op — noise plays via timer.

  async play(): Promise<void> {
    await this.sound?.playAsync();
  }

  // ── pause ─────────────────────────────────────────────────────────────────

  async pause(): Promise<void> {
    await this.sound?.pauseAsync();
  }

  // ── unload ────────────────────────────────────────────────────────────────
  //
  // Releases the current sound resource.
  // Must be called before loading a new item (spec: "Always unload before load").

  async unload(): Promise<void> {
    // Stop hiss whenever we unload (track→track, noise→track, or stop)
    stopHiss();

    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.loadedItem = null;
  }

  // ── seekTo ────────────────────────────────────────────────────────────────
  //
  // Seeks within the current track item.
  // Not available during noise (no sound loaded).

  async seekTo(positionMillis: number): Promise<void> {
    await this.sound?.setPositionAsync(positionMillis);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get isTrackLoaded(): boolean {
    return this.sound !== null;
  }

  get currentItem(): TimelineItem | null {
    return this.loadedItem;
  }

  get isNoise(): boolean {
    return this.loadedItem !== null && !isTrackItem(this.loadedItem);
  }
}

// Singleton — one player for the entire app
export const cassettePlayer = new CassettePlayer();
