import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { COLORS, FONT, SPACING, ANIM } from '../constants/theme';

// ─── PressableButton ──────────────────────────────────────────────────────────

type PressableButtonProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: object;
};

function PressableButton({ onPress, onLongPress, disabled, children, style }: PressableButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scale, { toValue: ANIM.pressScale, duration: ANIM.pressDurationMs, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 200, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      delayLongPress={ANIM.longPressDelayMs}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── PlayerControls ───────────────────────────────────────────────────────────
//
// Pill-shaped control bar: [|◀◀]  [▶ orange]  [▶▶|]
// REW and FF require long press (spec).

type Props = {
  isPlaying: boolean;
  isInteractionBlocked: boolean;
  isSideEnded: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekNext: () => void;
  onSeekPrev: () => void;
};

export function PlayerControls({ isPlaying, isInteractionBlocked, isSideEnded, onPlay, onPause, onSeekNext, onSeekPrev }: Props) {
  // Play/pause is only disabled when the side has ended — noise doesn't block it.
  const playDisabled = isSideEnded;
  // Seek buttons are blocked during noise segments AND when side ended.
  const seekDisabled = isInteractionBlocked || isSideEnded;

  return (
    <View style={styles.bar}>
      {/* REW — long press only */}
      <PressableButton onLongPress={onSeekPrev} disabled={seekDisabled} style={[styles.sideBtn, seekDisabled && styles.sideBtnDisabled]}>
        <Text style={[styles.sideBtnText, seekDisabled && styles.textDisabled]}>{'⏮'}</Text>
      </PressableButton>

      {/* PLAY / PAUSE — oval pill button */}
      <PressableButton
        onPress={isPlaying ? onPause : onPlay}
        disabled={playDisabled}
        style={[styles.playBtn, playDisabled && styles.playBtnDisabled]}
      >
        <Text style={[styles.playBtnText, playDisabled && styles.textDisabled]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </PressableButton>

      {/* FF — long press only */}
      <PressableButton onLongPress={onSeekNext} disabled={seekDisabled} style={[styles.sideBtn, seekDisabled && styles.sideBtnDisabled]}>
        <Text style={[styles.sideBtnText, seekDisabled && styles.textDisabled]}>{'⏭'}</Text>
      </PressableButton>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDE5D8',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    width: '100%',
  },

  // Side skip buttons
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D8CFBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnDisabled: {
    opacity: 0.4,
  },
  sideBtnText: {
    fontSize: 18,
    color: COLORS.text,
  },

  // Oval / pill play button (wider than tall)
  playBtn: {
    width: 130,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  playBtnDisabled: {
    backgroundColor: '#C8B8A0',
    shadowOpacity: 0,
  },
  playBtnText: {
    fontSize: 26,
    color: '#fff',
    marginLeft: 3,
  },

  textDisabled: { opacity: 0.4 },
});
