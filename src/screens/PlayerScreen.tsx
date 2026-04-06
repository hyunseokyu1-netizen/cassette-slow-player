import React, { useCallback, useRef } from 'react';
import { View, Text, SafeAreaView, StyleSheet, Animated, Easing } from 'react-native';
import { Cassette } from '../components/Cassette';
import { PlayerControls } from '../components/PlayerControls';
import { useCassetteEngine } from '../hooks/useCassetteEngine';
import { Tape, SIDE_DURATION } from '../types/tape';
import { isTrackItem } from '../engine/getCurrentItem';
import { playOnce } from '../engine/soundEffects';
import { COLORS, FONT, SPACING } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const clamped = Math.max(0, Math.min(SIDE_DURATION, seconds));
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── PlayerScreen ─────────────────────────────────────────────────────────────

type Props = {
  tape: Tape;
};

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

  // ── Flip animation ────────────────────────────────────────────────────────
  //
  // Sequence:
  //   1. Scale cassette from 1 → 0 on X axis (180ms, ease-in)
  //   2. At midpoint: play click sound + commit state change
  //   3. Scale 0 → 1 (220ms, elastic out)

  const flipScaleX = useRef(new Animated.Value(1)).current;
  const isFlippingRef = useRef(false);

  const handleFlipWithAnimation = useCallback(() => {
    if (isFlippingRef.current) return;
    isFlippingRef.current = true;

    // First half: squish to edge
    Animated.timing(flipScaleX, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isFlippingRef.current = false;
        return;
      }
      // Midpoint — swap sides
      playOnce('flip');
      flip();
      // Second half: expand back
      Animated.timing(flipScaleX, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.elastic(1.3)),
        useNativeDriver: true,
      }).start(() => {
        isFlippingRef.current = false;
      });
    });
  }, [flip]);

  // ── Track info ────────────────────────────────────────────────────────────

  const trackTitle = currentItem && isTrackItem(currentItem) ? currentItem.track.title : null;
  const trackArtist = currentItem && isTrackItem(currentItem) ? currentItem.track.artist : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.sideBadge}>
            <Text style={styles.sideLabel}>SIDE {side}</Text>
          </View>
          <Text style={styles.timeText}>{formatTime(remainingTime)}</Text>
        </View>

        {/* ── Cassette (with flip animation wrapper) ────────────────────────── */}
        <Animated.View style={[styles.cassetteWrapper, { transform: [{ scaleX: flipScaleX }] }]}>
          <Cassette currentTime={currentTime} isPlaying={isPlaying} />
        </Animated.View>

        {/* ── Track info ───────────────────────────────────────────────────── */}
        <View style={styles.trackInfo}>
          {trackTitle ? (
            <>
              <Text style={styles.trackTitle} numberOfLines={1}>{trackTitle}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{trackArtist}</Text>
            </>
          ) : (
            <Text style={styles.emptyLabel}>
              {isSideEnded ? `End of Side ${side}` : isNoise ? '' : '—'}
            </Text>
          )}
        </View>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentTime / SIDE_DURATION) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressTime}>{formatTime(currentTime)}</Text>
          <Text style={styles.progressTime}>{formatTime(SIDE_DURATION)}</Text>
        </View>

        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <View style={styles.controlsWrapper}>
          <PlayerControls
            isPlaying={isPlaying}
            isInteractionBlocked={isInteractionBlocked}
            isSideEnded={isSideEnded}
            onPlay={play}
            onPause={pause}
            onFlip={handleFlipWithAnimation}
            onSeekNext={seekToNextTrack}
            onSeekPrev={seekToPrevTrack}
          />
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
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  sideLabel: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  timeText: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    opacity: 0.6,
    fontVariant: ['tabular-nums'],
  },
  cassetteWrapper: {
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: FONT.sizeLg,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: FONT.sizeMd,
    color: COLORS.text,
    opacity: 0.55,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyLabel: {
    fontSize: FONT.sizeMd,
    color: COLORS.text,
    opacity: 0.3,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.xs,
  },
  progressTime: {
    fontSize: FONT.sizeXs,
    color: COLORS.text,
    opacity: 0.4,
    fontVariant: ['tabular-nums'],
  },
  controlsWrapper: {
    width: '100%',
    alignItems: 'center',
  },
});
