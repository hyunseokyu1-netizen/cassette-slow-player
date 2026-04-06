import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { COLORS, FONT, SPACING } from '../constants/theme';

// ─── NoiseSlider ──────────────────────────────────────────────────────────────
//
// design.md: "Slider (0~5s), Subtle, not dominant"
// spec: noiseGap range 0~5 (NOISE_GAP_MIN / NOISE_GAP_MAX)
//
// Integer steps (0,1,2,3,4,5). Uses PanResponder (no extra dependency).

const MIN = 0;
const MAX = 5;
const THUMB_SIZE = 22;

type Props = {
  value: number;         // current noiseGap (integer 0–5)
  onChange: (v: number) => void;
};

export function NoiseSlider({ value, onChange }: Props) {
  const trackWidthRef = useRef(0);
  const currentValueRef = useRef(value);
  currentValueRef.current = value;

  // Convert between track x-position and noiseGap integer value
  const xToValue = useCallback((x: number): number => {
    if (trackWidthRef.current === 0) return value;
    const ratio = Math.max(0, Math.min(1, x / trackWidthRef.current));
    return Math.round(ratio * MAX);
  }, [value]);

  const valueToRatio = (v: number) => Math.max(0, Math.min(1, v / MAX));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, { moveX, x0 }) => {
      // moveX is relative to the screen — convert to track-local x
      // by offsetting with where the touch started on track
      const localX = moveX - (x0 - currentValueRef.current / MAX * trackWidthRef.current);
      const newValue = xToValue(localX);
      if (newValue !== currentValueRef.current) {
        onChange(newValue);
      }
    },
    onPanResponderGrant: (_, { x0 }) => {
      // Treat tap on track as direct seek
      const newValue = xToValue(x0);
      if (newValue !== currentValueRef.current) {
        onChange(newValue);
      }
    },
  });

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  };

  const thumbLeft = valueToRatio(value) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>NOISE GAP</Text>
        <Text style={styles.valueLabel}>{value}s</Text>
      </View>

      {/* Track */}
      <View
        style={styles.trackWrapper}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          {/* Fill */}
          <View style={[styles.fill, { width: `${thumbLeft}%` }]} />
        </View>

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            { left: `${thumbLeft}%`, marginLeft: -(THUMB_SIZE / 2) },
          ]}
        />

        {/* Step markers */}
        <View style={styles.markers}>
          {Array.from({ length: MAX + 1 }, (_, i) => (
            <View key={i} style={styles.marker} />
          ))}
        </View>
      </View>

      {/* Step labels */}
      <View style={styles.stepLabels}>
        {Array.from({ length: MAX + 1 }, (_, i) => (
          <Text key={i} style={styles.stepLabel}>{i}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const TRACK_HEIGHT = 4;

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  valueLabel: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightBold,
    color: COLORS.primary,
    minWidth: 24,
    textAlign: 'right',
  },

  trackWrapper: {
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
    position: 'relative',
  },

  track: {
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.secondary,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: TRACK_HEIGHT / 2,
  },

  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.primary,
    // Slight shadow for depth (design.md)
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },

  markers: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    top: THUMB_SIZE / 2 + TRACK_HEIGHT / 2 + 2,
  },
  marker: {
    width: 1,
    height: 5,
    backgroundColor: COLORS.text,
    opacity: 0.2,
  },

  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  stepLabel: {
    fontSize: FONT.sizeXs,
    color: COLORS.text,
    opacity: 0.3,
    width: 12,
    textAlign: 'center',
  },
});
