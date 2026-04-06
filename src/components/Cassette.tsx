import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';
import { SIDE_DURATION } from '../types/tape';

// ─── Cassette dimensions ──────────────────────────────────────────────────────

const BODY_W = 300;
const BODY_H = 192;

const LABEL_LEFT = 26;
const LABEL_TOP = 18;
const LABEL_W = BODY_W - LABEL_LEFT * 2;   // 248
const LABEL_H = 36;

const WINDOW_W = 218;
const WINDOW_H = 84;
const WINDOW_LEFT = (BODY_W - WINDOW_W) / 2; // 41
const WINDOW_TOP = 60;

const LEFT_REEL_CX = 54;
const RIGHT_REEL_CX = 164;
const REEL_CY = 38;

const MAX_REEL_R = 31;
const MIN_REEL_R = 13;
const HUB_R = 7;
const SPOKE_W = 2;
const SPOKE_L = MAX_REEL_R - HUB_R - 3;

const LEFT_REEL_RPM_MS = 2800;
const RIGHT_REEL_RPM_MS = 2200;

// Indicator dots (top-center of cassette)
const DOT_COLORS = ['#F28C28', '#C8A864', '#7AAA80'];
const DOT_SIZE = 5;

// ─── Reel ─────────────────────────────────────────────────────────────────────

type ReelProps = {
  cx: number;
  fillProg: Animated.Value | Animated.AnimatedInterpolation<number>;
  rotation: Animated.Value;
};

function Reel({ cx, fillProg, rotation }: ReelProps) {
  const r = (fillProg as Animated.Value).interpolate
    ? (fillProg as any).interpolate({ inputRange: [0, 1], outputRange: [MIN_REEL_R, MAX_REEL_R] })
    : fillProg;

  const left = r.interpolate({ inputRange: [MIN_REEL_R, MAX_REEL_R], outputRange: [cx - MIN_REEL_R, cx - MAX_REEL_R] });
  const top = r.interpolate({ inputRange: [MIN_REEL_R, MAX_REEL_R], outputRange: [REEL_CY - MIN_REEL_R, REEL_CY - MAX_REEL_R] });
  const size = r.interpolate({ inputRange: [MIN_REEL_R, MAX_REEL_R], outputRange: [MIN_REEL_R * 2, MAX_REEL_R * 2] });
  const rotStr = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  return (
    <Animated.View
      style={[
        styles.reelOuter,
        { position: 'absolute', left, top, width: size, height: size, borderRadius: r, transform: [{ rotate: rotStr }] },
      ]}
    >
      {/* 6 spokes */}
      {[0, 30, 60, 90, 120, 150].map((deg) => (
        <View key={deg} style={[styles.spoke, { transform: [{ rotate: `${deg}deg` }] }]} />
      ))}
      <View style={styles.hub} />
    </Animated.View>
  );
}

// ─── Cassette ─────────────────────────────────────────────────────────────────

type Props = {
  currentTime: number;
  isPlaying: boolean;
  tapeTitle: string;
  side: 'A' | 'B';
};

export function Cassette({ currentTime, isPlaying, tapeTitle, side }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const leftRotation = useRef(new Animated.Value(0)).current;
  const rightRotation = useRef(new Animated.Value(0)).current;

  const leftRotRef = useRef(0);
  const rightRotRef = useRef(0);

  // Track rotation values continuously
  useEffect(() => {
    const lid = leftRotation.addListener(({ value }) => { leftRotRef.current = value; });
    const rid = rightRotation.addListener(({ value }) => { rightRotRef.current = value; });
    return () => {
      leftRotation.removeListener(lid);
      rightRotation.removeListener(rid);
    };
  }, []);

  // Size animation
  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentTime / SIDE_DURATION,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [currentTime]);

  // Rotation animation
  useEffect(() => {
    if (isPlaying) {
      let active = true;
      const spinOne = (val: Animated.Value, ref: React.MutableRefObject<number>, rpm: number) => {
        if (!active) return;
        Animated.timing(val, {
          toValue: ref.current + 360,
          duration: rpm,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(({ finished }) => { if (finished && active) spinOne(val, ref, rpm); });
      };
      spinOne(leftRotation, leftRotRef, LEFT_REEL_RPM_MS);
      spinOne(rightRotation, rightRotRef, RIGHT_REEL_RPM_MS);
      return () => {
        active = false;
        leftRotation.stopAnimation();
        rightRotation.stopAnimation();
      };
    } else {
      const leftStop = Math.ceil(leftRotRef.current / 90) * 90;
      const rightStop = Math.ceil(rightRotRef.current / 90) * 90;
      Animated.timing(leftRotation, { toValue: leftStop, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      Animated.timing(rightRotation, { toValue: rightStop, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  }, [isPlaying]);

  // Left reel: supply (starts full, shrinks)
  const leftFill = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  // Right reel: take-up (starts empty, grows)
  const rightFill = progress;

  // Truncate long title for label
  const displayTitle = tapeTitle.length > 14 ? tapeTitle.slice(0, 13) + '…' : tapeTitle.toUpperCase();

  return (
    <View style={styles.body}>
      {/* ── Corner screws ──────────────────────────────────────────────── */}
      <View style={[styles.screw, styles.screwTL]} />
      <View style={[styles.screw, styles.screwTR]} />
      <View style={[styles.screw, styles.screwBL]} />
      <View style={[styles.screw, styles.screwBR]} />

      {/* ── Top indicator dots ────────────────────────────────────────── */}
      <View style={styles.dotsRow}>
        {DOT_COLORS.map((color, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: color }]} />
        ))}
      </View>

      {/* ── Label sticker ─────────────────────────────────────────────── */}
      <View style={styles.label}>
        <Text style={styles.labelSide}>{side}</Text>
        <View style={styles.labelCenter}>
          <Text style={styles.labelTitle} numberOfLines={1}>{displayTitle}</Text>
          <View style={styles.labelDivider} />
        </View>
        <Text style={styles.labelDuration}>90</Text>
      </View>

      {/* ── Window (dark) ─────────────────────────────────────────────── */}
      <View style={styles.window}>
        {/* Tape path */}
        <View style={styles.tapePath} />

        {/* Reels */}
        <Reel cx={LEFT_REEL_CX} fillProg={leftFill} rotation={leftRotation} />
        <Reel cx={RIGHT_REEL_CX} fillProg={rightFill} rotation={rightRotation} />

        {/* STEREO / NR label */}
        <View style={styles.windowLabels}>
          <Text style={styles.windowLabelText}>STEREO ●</Text>
          <Text style={styles.windowLabelText}>NR4C</Text>
        </View>
      </View>

      {/* ── Bottom slot ───────────────────────────────────────────────── */}
      <View style={styles.bottomSlot} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  body: {
    width: BODY_W,
    height: BODY_H,
    backgroundColor: COLORS.cassetteBody,
    borderRadius: 12,
    ...SHADOW.cassette,
  },

  // ── Screws ─────────────────────────────────────────────────────────────────
  screw: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#443830',
    borderWidth: 1,
    borderColor: '#5A4A40',
  },
  screwTL: { top: 8, left: 10 },
  screwTR: { top: 8, right: 10 },
  screwBL: { bottom: 8, left: 10 },
  screwBR: { bottom: 8, right: 10 },

  // ── Dots ───────────────────────────────────────────────────────────────────
  dotsRow: {
    position: 'absolute',
    top: 9,
    left: BODY_W / 2 - (DOT_COLORS.length * (DOT_SIZE + 5) - 5) / 2,
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },

  // ── Label sticker ──────────────────────────────────────────────────────────
  label: {
    position: 'absolute',
    left: LABEL_LEFT,
    top: LABEL_TOP,
    width: LABEL_W,
    height: LABEL_H,
    backgroundColor: COLORS.cassetteLabel,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  labelSide: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3A2E2A',
    letterSpacing: -0.5,
  },
  labelCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  labelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3A2E2A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  labelDivider: {
    width: '80%',
    height: 1,
    backgroundColor: COLORS.cassetteLabelLine,
  },
  labelDuration: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2E2A',
    opacity: 0.6,
  },

  // ── Window ─────────────────────────────────────────────────────────────────
  window: {
    position: 'absolute',
    left: WINDOW_LEFT,
    top: WINDOW_TOP,
    width: WINDOW_W,
    height: WINDOW_H,
    backgroundColor: COLORS.cassetteWindow,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3A3028',
  },
  tapePath: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    height: 4,
    backgroundColor: COLORS.cassetteTape,
  },
  windowLabels: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  windowLabelText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  // ── Reel ───────────────────────────────────────────────────────────────────
  reelOuter: {
    backgroundColor: COLORS.cassetteReel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cassetteReelRing,
  },
  spoke: {
    position: 'absolute',
    width: SPOKE_W,
    height: SPOKE_L,
    backgroundColor: 'rgba(220,210,200,0.35)',
    borderRadius: 1,
  },
  hub: {
    width: HUB_R * 2,
    height: HUB_R * 2,
    borderRadius: HUB_R,
    backgroundColor: COLORS.cassetteHub,
    borderWidth: 1,
    borderColor: '#3A3028',
  },

  // ── Bottom slot ────────────────────────────────────────────────────────────
  bottomSlot: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    width: 76,
    height: 7,
    backgroundColor: '#443830',
    borderRadius: 3,
  },
});
