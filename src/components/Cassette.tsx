import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';
import { SIDE_DURATION } from '../types/tape';

// ─── Cassette dimensions ──────────────────────────────────────────────────────

const BODY_W = 300;
const BODY_H = 180;

const WINDOW_W = 218;
const WINDOW_H = 88;
const WINDOW_LEFT = (BODY_W - WINDOW_W) / 2; // 41
const WINDOW_TOP = 42;

const LEFT_REEL_CX = 54;
const RIGHT_REEL_CX = 164;
const REEL_CY = WINDOW_H / 2; // 44

const MAX_REEL_R = 33;
const MIN_REEL_R = 14;
const HUB_R = 6;
const SPOKE_W = 2;
const SPOKE_L = MAX_REEL_R - HUB_R - 4;

const LEFT_REEL_RPM_MS = 2800;
const RIGHT_REEL_RPM_MS = 2200;

// ─── Reel ─────────────────────────────────────────────────────────────────────
//
// cx       — centre-x within the window viewport
// fillProg — 0 = empty (small), 1 = full (large)
// rotation — Animated.Value tracking accumulated degrees

type ReelProps = {
  cx: number;
  fillProg: Animated.Value;
  rotation: Animated.Value;
};

function Reel({ cx, fillProg, rotation }: ReelProps) {
  const r = fillProg.interpolate({ inputRange: [0, 1], outputRange: [MIN_REEL_R, MAX_REEL_R] });
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
      {[0, 60, 120].map((deg) => (
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
};

export function Cassette({ currentTime, isPlaying }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const leftRotation = useRef(new Animated.Value(0)).current;
  const rightRotation = useRef(new Animated.Value(0)).current;

  // Track latest rotation values for deceleration target
  const leftRotRef = useRef(0);
  const rightRotRef = useRef(0);

  // Register listeners once to continuously track rotation
  useEffect(() => {
    const lid = leftRotation.addListener(({ value }) => { leftRotRef.current = value; });
    const rid = rightRotation.addListener(({ value }) => { rightRotRef.current = value; });
    return () => {
      leftRotation.removeListener(lid);
      rightRotation.removeListener(rid);
    };
  }, []);

  // ── Size animation: reel radii track progress ────────────────────────────
  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentTime / SIDE_DURATION,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [currentTime]);

  // ── Rotation animation ────────────────────────────────────────────────────
  //
  // Play: spin both reels continuously (slightly different speeds).
  // Stop: cancel and decelerate to nearest 90° checkpoint.
  useEffect(() => {
    if (isPlaying) {
      let active = true;

      const spinOne = (val: Animated.Value, valRef: React.MutableRefObject<number>, rpm: number) => {
        if (!active) return;
        Animated.timing(val, {
          toValue: valRef.current + 360,
          duration: rpm,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished && active) spinOne(val, valRef, rpm);
        });
      };

      spinOne(leftRotation, leftRotRef, LEFT_REEL_RPM_MS);
      spinOne(rightRotation, rightRotRef, RIGHT_REEL_RPM_MS);

      return () => {
        active = false;
        leftRotation.stopAnimation();
        rightRotation.stopAnimation();
      };
    } else {
      // Decelerate to nearest 90°
      const leftStop = Math.ceil(leftRotRef.current / 90) * 90;
      const rightStop = Math.ceil(rightRotRef.current / 90) * 90;

      Animated.timing(leftRotation, {
        toValue: leftStop,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      Animated.timing(rightRotation, {
        toValue: rightStop,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [isPlaying]);

  // Left reel: supply, starts full → shrinks. fillProg = 1 - progress
  const leftFill = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) as Animated.Value;
  // Right reel: take-up, starts empty → grows. fillProg = progress
  const rightFill = progress as Animated.Value;

  return (
    <View style={styles.body}>
      <View style={[styles.screw, styles.screwTL]} />
      <View style={[styles.screw, styles.screwTR]} />
      <View style={[styles.screw, styles.screwBL]} />
      <View style={[styles.screw, styles.screwBR]} />

      <View style={styles.window}>
        <View style={styles.tapeUpper} />
        <View style={styles.tapeLower} />
        <Reel cx={LEFT_REEL_CX} fillProg={leftFill} rotation={leftRotation} />
        <Reel cx={RIGHT_REEL_CX} fillProg={rightFill} rotation={rightRotation} />
      </View>

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
    borderRadius: 10,
    ...SHADOW.cassette,
  },
  window: {
    position: 'absolute',
    left: WINDOW_LEFT,
    top: WINDOW_TOP,
    width: WINDOW_W,
    height: WINDOW_H,
    backgroundColor: COLORS.cassetteWindow,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tapeUpper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WINDOW_H - 20,
    height: 3,
    backgroundColor: COLORS.cassetteTape,
  },
  tapeLower: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WINDOW_H - 12,
    height: 3,
    backgroundColor: COLORS.cassetteTape,
  },
  reelOuter: {
    backgroundColor: COLORS.cassetteReel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spoke: {
    position: 'absolute',
    width: SPOKE_W,
    height: SPOKE_L,
    backgroundColor: COLORS.cassetteWindow,
    borderRadius: 1,
  },
  hub: {
    width: HUB_R * 2,
    height: HUB_R * 2,
    borderRadius: HUB_R,
    backgroundColor: COLORS.cassetteHub,
  },
  screw: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#574A44',
  },
  screwTL: { top: 12, left: 14 },
  screwTR: { top: 12, right: 14 },
  screwBL: { bottom: 12, left: 14 },
  screwBR: { bottom: 12, right: 14 },
  bottomSlot: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    width: 80,
    height: 8,
    backgroundColor: '#574A44',
    borderRadius: 4,
  },
});
