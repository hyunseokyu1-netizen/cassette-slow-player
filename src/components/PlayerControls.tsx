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
  const mainDisabled = isInteractionBlocked || isSideEnded;

  return (
    <View style={[styles.bar, mainDisabled && styles.barDisabled]}>
      {/* REW — long press only */}
      <PressableButton onLongPress={onSeekPrev} disabled={mainDisabled} style={styles.sideBtn}>
        <Text style={[styles.sideBtnText, mainDisabled && styles.textDisabled]}>{'|◀◀'}</Text>
      </PressableButton>

      {/* PLAY / PAUSE */}
      <PressableButton
        onPress={isPlaying ? onPause : onPlay}
        disabled={mainDisabled}
        style={[styles.playBtn, mainDisabled && styles.playBtnDisabled]}
      >
        <Text style={[styles.playBtnText, mainDisabled && styles.textDisabled]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </PressableButton>

      {/* FF — long press only */}
      <PressableButton onLongPress={onSeekNext} disabled={mainDisabled} style={styles.sideBtn}>
        <Text style={[styles.sideBtnText, mainDisabled && styles.textDisabled]}>{'▶▶|'}</Text>
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
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    shadowColor: '#5A4A3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    width: '100%',
  },
  barDisabled: {
    opacity: 0.5,
  },

  sideBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  sideBtnText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 1,
  },

  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnDisabled: {
    backgroundColor: '#C8B8A0',
    shadowOpacity: 0,
  },
  playBtnText: {
    fontSize: 22,
    color: '#fff',
    marginLeft: 2,
  },

  textDisabled: { opacity: 0.5 },
});
