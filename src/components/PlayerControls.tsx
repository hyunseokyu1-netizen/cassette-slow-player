import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { COLORS, FONT, SPACING, RADIUS, SHADOW, ANIM } from '../constants/theme';

// ─── PressableButton ──────────────────────────────────────────────────────────
//
// Base button with press-scale animation (design.md: 0.92).

type PressableButtonProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: object;
  wide?: boolean;
};

function PressableButton({ onPress, onLongPress, disabled, children, style, wide }: PressableButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scale, {
      toValue: ANIM.pressScale,
      duration: ANIM.pressDurationMs,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      delayLongPress={ANIM.longPressDelayMs}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.button,
          wide && styles.buttonWide,
          disabled && styles.buttonDisabled,
          style,
          { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── PlayerControls ───────────────────────────────────────────────────────────
//
// Layout:
//   [ ◀◀ ]   [ ▶ / ‖ ]   [ ▶▶ ]    ← main controls
//
//          [ FLIP  ↺ ]              ← flip button (separate, below)
//
// Spec rules enforced:
//   - No interaction during noise: all main controls disabled
//   - Skip requires long press: REW and FF only respond to onLongPress
//   - Flip must be manual: always available

type Props = {
  isPlaying: boolean;
  isInteractionBlocked: boolean;
  isSideEnded: boolean;
  onPlay: () => void;
  onPause: () => void;
  onFlip: () => void;
  onSeekNext: () => void;
  onSeekPrev: () => void;
};

export function PlayerControls({
  isPlaying,
  isInteractionBlocked,
  isSideEnded,
  onPlay,
  onPause,
  onFlip,
  onSeekNext,
  onSeekPrev,
}: Props) {
  const mainDisabled = isInteractionBlocked || isSideEnded;

  return (
    <View style={styles.container}>
      {/* ── Noise indicator ─────────────────────────────────────────────── */}
      {isInteractionBlocked && (
        <View style={styles.noiseBar}>
          <Text style={styles.noiseText}>· · ·</Text>
        </View>
      )}

      {/* ── Side ended prompt ────────────────────────────────────────────── */}
      {isSideEnded && !isInteractionBlocked && (
        <View style={styles.noiseBar}>
          <Text style={styles.noiseText}>flip tape to continue</Text>
        </View>
      )}

      {/* ── Main controls: REW / PLAY·PAUSE / FF ─────────────────────────── */}
      <View style={styles.mainRow}>

        {/* REW — long press only */}
        <PressableButton onLongPress={onSeekPrev} disabled={mainDisabled}>
          <Text style={[styles.buttonLabel, mainDisabled && styles.labelDisabled]}>◀◀</Text>
        </PressableButton>

        {/* PLAY / PAUSE */}
        <PressableButton
          onPress={isPlaying ? onPause : onPlay}
          disabled={mainDisabled}
          style={styles.playButton}
        >
          <Text style={[styles.playLabel, mainDisabled && styles.labelDisabled]}>
            {isPlaying ? '‖' : '▶'}
          </Text>
        </PressableButton>

        {/* FF — long press only */}
        <PressableButton onLongPress={onSeekNext} disabled={mainDisabled}>
          <Text style={[styles.buttonLabel, mainDisabled && styles.labelDisabled]}>▶▶</Text>
        </PressableButton>
      </View>

      {/* ── Flip button ──────────────────────────────────────────────────── */}
      <View style={styles.flipRow}>
        <PressableButton onPress={onFlip} wide>
          <Text style={styles.flipLabel}>↺  FLIP</Text>
        </PressableButton>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
  },

  noiseBar: {
    height: 20,
    justifyContent: 'center',
  },
  noiseText: {
    color: COLORS.text,
    fontSize: FONT.sizeSm,
    opacity: 0.45,
    letterSpacing: 2,
  },

  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },

  button: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.button,
  },
  buttonWide: {
    width: 'auto' as const,
    paddingHorizontal: SPACING.xl,
  },
  buttonDisabled: {
    opacity: 0.35,
  },

  playButton: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },

  buttonLabel: {
    fontSize: FONT.sizeMd,
    color: COLORS.text,
    fontWeight: FONT.weightMedium,
  },
  playLabel: {
    fontSize: FONT.sizeLg,
    color: '#fff',
    fontWeight: FONT.weightBold,
  },
  labelDisabled: {
    opacity: 0.4,
  },

  flipRow: {
    marginTop: SPACING.lg,
  },
  flipLabel: {
    fontSize: FONT.sizeSm,
    color: COLORS.text,
    fontWeight: FONT.weightMedium,
    letterSpacing: 1.5,
  },
});
