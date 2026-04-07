import React, { useCallback, useRef } from 'react';
import { View, Text, SafeAreaView, StyleSheet, Animated, Easing, Pressable, Platform, StatusBar } from 'react-native';
import { Cassette } from '../components/Cassette';
import { PlayerControls } from '../components/PlayerControls';
import { useCassetteEngine } from '../hooks/useCassetteEngine';
import { Tape, SIDE_DURATION } from '../types/tape';
import { isTrackItem } from '../engine/getCurrentItem';
import { playOnce } from '../engine/soundEffects';
import { COLORS, FONT, SPACING } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── PlayerScreen ─────────────────────────────────────────────────────────────

type Props = { tape: Tape };

export function PlayerScreen({ tape }: Props) {
  const {
    side,
    currentTime,
    remainingTime,
    isPlaying,
    isNoise,
    isInteractionBlocked,
    isSideEnded,
    currentItem,
    play,
    pause,
    flip,
    seekToNextTrack,
    seekToPrevTrack,
  } = useCassetteEngine(tape);

  // ── Track-level progress ──────────────────────────────────────────────────
  const trackTitle = currentItem && isTrackItem(currentItem) ? currentItem.track.title : null;
  const trackArtist = currentItem && isTrackItem(currentItem) ? currentItem.track.artist : null;
  const trackElapsed = currentItem && isTrackItem(currentItem)
    ? Math.max(0, currentTime - currentItem.startTime)
    : 0;
  const trackTotal = currentItem && isTrackItem(currentItem) ? currentItem.duration : 0;
  const trackProgress = trackTotal > 0 ? trackElapsed / trackTotal : 0;

  // ── Flip animation ────────────────────────────────────────────────────────
  const flipScaleX = useRef(new Animated.Value(1)).current;
  const isFlippingRef = useRef(false);

  const handleFlip = useCallback(() => {
    if (isFlippingRef.current) return;
    isFlippingRef.current = true;
    Animated.timing(flipScaleX, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) { isFlippingRef.current = false; return; }
      playOnce('flip');
      flip();
      Animated.timing(flipScaleX, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.elastic(1.3)),
        useNativeDriver: true,
      }).start(() => { isFlippingRef.current = false; });
    });
  }, [flip]);

  // ── Status message ────────────────────────────────────────────────────────
  const statusMsg = isNoise
    ? '· · ·'
    : isSideEnded
    ? `End of Side ${side}`
    : null;

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: statusBarHeight }]}>
      <View style={styles.screen}>

        {/* ── Tape header (outside card) ───────────────────────────────── */}
        <View style={styles.tapeHeader}>
          <Text style={styles.tapeSubtitle}>THE WORKSHOP</Text>
          <Text style={styles.tapeTitle}>{tape.title.toUpperCase()}</Text>
        </View>

        {/* ── Main card ────────────────────────────────────────────────── */}
        <View style={styles.card}>

          {/* Cassette */}
          <Animated.View style={{ transform: [{ scaleX: flipScaleX }] }}>
            <Cassette
              currentTime={currentTime}
              isPlaying={isPlaying}
              tapeTitle={tape.title}
              side={side}
            />
          </Animated.View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <PlayerControls
              isPlaying={isPlaying}
              isInteractionBlocked={isInteractionBlocked}
              isSideEnded={isSideEnded}
              onPlay={play}
              onPause={pause}
              onSeekNext={seekToNextTrack}
              onSeekPrev={seekToPrevTrack}
            />
          </View>

          {/* Track info / status */}
          <View style={styles.trackInfo}>
            {statusMsg ? (
              <Text style={styles.statusText}>{statusMsg}</Text>
            ) : (
              <>
                <Text style={styles.trackName} numberOfLines={1}>
                  {trackTitle ?? '—'}
                </Text>
                <Text style={styles.trackTime}>
                  {formatTime(trackElapsed)}
                  <Text style={styles.trackTimeSep}> / </Text>
                  {formatTime(trackTotal)}
                </Text>
              </>
            )}
          </View>

          {/* Progress bar (track progress) */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${trackProgress * 100}%` }]} />
          </View>

          {/* Flip button */}
          <Pressable style={styles.flipBtn} onPress={handleFlip}>
            <Text style={styles.flipBtnText}>↺  Flip to {side === 'A' ? 'B' : 'A'} Side</Text>
          </Pressable>

        </View>

        {/* ── Side time (below card) ────────────────────────────────────── */}
        <View style={styles.sideTimeRow}>
          <Text style={styles.sideTimeCurrent}>{formatTime(currentTime)}</Text>
          <View style={styles.sideProgressTrack}>
            <View style={[styles.sideProgressFill, { width: `${(currentTime / SIDE_DURATION) * 100}%` }]} />
          </View>
          <Text style={styles.sideTimeTotal}>{formatTime(SIDE_DURATION)}</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    justifyContent: 'center',
    gap: SPACING.md,
  },

  // ── Tape header ────────────────────────────────────────────────────────────
  tapeHeader: {
    alignItems: 'center',
    gap: 2,
  },
  tapeSubtitle: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    opacity: 0.45,
    letterSpacing: 2,
  },
  tapeTitle: {
    fontSize: FONT.sizeLg,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 1,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: '#EDE8DF',
    borderRadius: 28,
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
    alignItems: 'center',
    shadowColor: '#4A3A2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },

  // ── Controls row ───────────────────────────────────────────────────────────
  controlsRow: {
    width: '100%',
  },

  // ── Track info ─────────────────────────────────────────────────────────────
  trackInfo: {
    alignItems: 'center',
    gap: 2,
    minHeight: 42,
    justifyContent: 'center',
  },
  trackName: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    textAlign: 'center',
  },
  trackTime: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    opacity: 0.55,
    fontVariant: ['tabular-nums'],
  },
  trackTimeSep: {
    opacity: 0.4,
  },
  statusText: {
    fontSize: FONT.sizeMd,
    color: COLORS.text,
    opacity: 0.4,
    letterSpacing: 3,
  },

  // ── Progress bar ───────────────────────────────────────────────────────────
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(58,46,42,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // ── Flip button ────────────────────────────────────────────────────────────
  flipBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(58,46,42,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  flipBtnText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  // ── Side time row ──────────────────────────────────────────────────────────
  sideTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: SPACING.sm,
  },
  sideTimeCurrent: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    opacity: 0.4,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  sideProgressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(58,46,42,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sideProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(58,46,42,0.3)',
    borderRadius: 2,
  },
  sideTimeTotal: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    opacity: 0.4,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
});
