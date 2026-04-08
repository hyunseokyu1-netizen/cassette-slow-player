import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SIDE_DURATION } from '../types/tape';

// ─── Dimensions ───────────────────────────────────────────────────────────────

const BODY_W = 310;
const BODY_H = 200;

// Label sits at the top inside the body
const LABEL_MX = 22;
const LABEL_TOP = 14;
const LABEL_W = BODY_W - LABEL_MX * 2;
const LABEL_H = 38;

// Window is the large dark oval cutout
const WIN_MX = 18;
const WIN_TOP = 60;
const WIN_W = BODY_W - WIN_MX * 2;
const WIN_H = 100;

// Reel centers relative to window origin
const L_CX = 74;
const R_CX = WIN_W - 74;
const REEL_CY = WIN_H / 2 - 6;

const MAX_R = 36;
const MIN_R = 14;
const HUB_R = 8;
const SPOKE_W = 2.5;
const SPOKE_L = MAX_R - HUB_R - 4;

const L_RPM_MS = 2600;
const R_RPM_MS = 2000;

// ─── Reel ─────────────────────────────────────────────────────────────────────

type ReelProps = {
  cx: number;
  fillProg: Animated.AnimatedInterpolation<number>;
  rotation: Animated.Value;
};

function Reel({ cx, fillProg, rotation }: ReelProps) {
  const r = fillProg.interpolate({ inputRange: [0, 1], outputRange: [MIN_R, MAX_R] });
  const half = r.interpolate({ inputRange: [MIN_R, MAX_R], outputRange: [MIN_R, MAX_R] });
  const left = r.interpolate({ inputRange: [MIN_R, MAX_R], outputRange: [cx - MIN_R, cx - MAX_R] });
  const top = r.interpolate({
    inputRange: [MIN_R, MAX_R],
    outputRange: [REEL_CY - MIN_R, REEL_CY - MAX_R],
  });
  const size = r.interpolate({ inputRange: [MIN_R, MAX_R], outputRange: [MIN_R * 2, MAX_R * 2] });
  const rotStr = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  return (
    <Animated.View
      style={[
        styles.reelOuter,
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: half,
          transform: [{ rotate: rotStr }],
        },
      ]}
    >
      {/* 6 spokes radiating from center */}
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
  const leftRot = useRef(new Animated.Value(0)).current;
  const rightRot = useRef(new Animated.Value(0)).current;
  const leftRotRef = useRef(0);
  const rightRotRef = useRef(0);

  useEffect(() => {
    const l = leftRot.addListener(({ value }) => { leftRotRef.current = value; });
    const r = rightRot.addListener(({ value }) => { rightRotRef.current = value; });
    return () => { leftRot.removeListener(l); rightRot.removeListener(r); };
  }, []);

  // Progress (reel fill)
  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentTime / SIDE_DURATION,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [currentTime]);

  // Reel rotation
  useEffect(() => {
    if (isPlaying) {
      let active = true;
      const spin = (val: Animated.Value, ref: React.MutableRefObject<number>, ms: number) => {
        if (!active) return;
        Animated.timing(val, {
          toValue: ref.current + 360,
          duration: ms,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(({ finished }) => { if (finished && active) spin(val, ref, ms); });
      };
      spin(leftRot, leftRotRef, L_RPM_MS);
      spin(rightRot, rightRotRef, R_RPM_MS);
      return () => {
        active = false;
        leftRot.stopAnimation();
        rightRot.stopAnimation();
      };
    } else {
      const ls = Math.ceil(leftRotRef.current / 90) * 90;
      const rs = Math.ceil(rightRotRef.current / 90) * 90;
      Animated.timing(leftRot, { toValue: ls, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      Animated.timing(rightRot, { toValue: rs, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  }, [isPlaying]);

  const leftFill = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const rightFill = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const displayTitle = tapeTitle.length > 12 ? tapeTitle.slice(0, 11) + '…' : tapeTitle.toUpperCase();

  return (
    <View style={styles.body}>
      {/* ── Corner screws ─────────────────────────────────────────────────── */}
      {[styles.sTL, styles.sTR, styles.sBL, styles.sBR].map((pos, i) => (
        <View key={i} style={[styles.screw, pos]}>
          <View style={styles.screwSlot} />
        </View>
      ))}

      {/* ── Indicator dots (top center) ──────────────────────────────────── */}
      <View style={styles.dotsRow}>
        <View style={[styles.dot, { backgroundColor: '#F28C28' }]} />
        <View style={[styles.dot, { backgroundColor: '#D4A444' }]} />
        <View style={[styles.dot, { backgroundColor: '#7AAA80' }]} />
      </View>

      {/* ── Label sticker ─────────────────────────────────────────────────── */}
      <View style={styles.label}>
        {/* Ruled paper lines (behind content) */}
        {[8, 16, 24].map((t) => (
          <View key={t} style={[styles.ruledLine, { top: t }]} />
        ))}
        <Text style={styles.labelSide}>{side}</Text>
        <View style={styles.labelCenter}>
          <Text style={styles.labelTitle} numberOfLines={1}>{displayTitle}</Text>
          <View style={styles.labelLine} />
        </View>
        <Text style={styles.labelDuration}>90</Text>
      </View>

      {/* ── Window ────────────────────────────────────────────────────────── */}
      <View style={styles.window}>
        {/* Tape strand (bottom of window) */}
        <View style={styles.tapeStrand} />

        {/* Reels */}
        <Reel cx={L_CX} fillProg={leftFill} rotation={leftRot} />
        <Reel cx={R_CX} fillProg={rightFill} rotation={rightRot} />

        {/* Small text labels */}
        <View style={styles.winFooter}>
          <Text style={styles.winText}>STEREO ●</Text>
          <Text style={styles.winText}>NR4C</Text>
        </View>
      </View>

      {/* ── Bottom center slot (play mechanism notch) ─────────────────────── */}
      <View style={styles.bottomSlot} />

      {/* ── Bottom screw row ──────────────────────────────────────────────── */}
      <View style={styles.bottomScrewRow}>
        {[0,1,2,3,4].map((i) => (
          <View key={i} style={styles.bottomHole} />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BODY_COLOR = '#1A1108';        // very dark chocolate brown
const BODY_ACCENT = '#2A1E10';       // slightly lighter for depth
const LABEL_COLOR = '#EEE4D0';       // warm cream paper
const LABEL_LINE = '#C8B898';
const WIN_COLOR = '#0C0806';         // near-black window
const REEL_COLOR = '#9C9088';        // warm silver-gray
const REEL_RING = '#C4B8A4';         // chrome rim
const HUB_COLOR = '#141008';
const SPOKE_COLOR = 'rgba(220,205,185,0.5)';
const TAPE_COLOR = '#7A5828';        // amber brown magnetic tape

const styles = StyleSheet.create({
  body: {
    width: BODY_W,
    height: BODY_H,
    backgroundColor: BODY_COLOR,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#383028',
  },

  // ── Screws ─────────────────────────────────────────────────────────────────
  screw: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BODY_ACCENT,
    borderWidth: 1,
    borderColor: '#504030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screwSlot: {
    width: 5,
    height: 1,
    backgroundColor: '#706050',
  },
  sTL: { top: 9, left: 11 },
  sTR: { top: 9, right: 11 },
  sBL: { bottom: 18, left: 11 },
  sBR: { bottom: 18, right: 11 },

  // ── Dots ───────────────────────────────────────────────────────────────────
  dotsRow: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Label ──────────────────────────────────────────────────────────────────
  label: {
    position: 'absolute',
    left: LABEL_MX,
    top: LABEL_TOP,
    width: LABEL_W,
    height: LABEL_H,
    backgroundColor: LABEL_COLOR,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  labelSide: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2A2018',
    letterSpacing: -0.5,
  },
  labelCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  labelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2A2018',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  labelLine: {
    width: '85%',
    height: 1,
    backgroundColor: LABEL_LINE,
  },
  ruledLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.8,
    backgroundColor: 'rgba(110,75,40,0.1)',
  },
  labelDuration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A2018',
    opacity: 0.55,
  },

  // ── Window ─────────────────────────────────────────────────────────────────
  window: {
    position: 'absolute',
    left: WIN_MX,
    top: WIN_TOP,
    width: WIN_W,
    height: WIN_H,
    backgroundColor: WIN_COLOR,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#383028',
  },
  tapeStrand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 5,
    backgroundColor: TAPE_COLOR,
  },
  winFooter: {
    position: 'absolute',
    bottom: 5,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  winText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  // ── Reel ───────────────────────────────────────────────────────────────────
  reelOuter: {
    backgroundColor: REEL_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: REEL_RING,
  },
  spoke: {
    position: 'absolute',
    width: SPOKE_W,
    height: SPOKE_L,
    backgroundColor: SPOKE_COLOR,
    borderRadius: 1,
  },
  hub: {
    width: HUB_R * 2,
    height: HUB_R * 2,
    borderRadius: HUB_R,
    backgroundColor: HUB_COLOR,
    borderWidth: 1.5,
    borderColor: '#383028',
  },

  // ── Bottom ─────────────────────────────────────────────────────────────────
  bottomSlot: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 80,
    height: 8,
    backgroundColor: '#161008',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#383028',
  },
  bottomScrewRow: {
    position: 'absolute',
    bottom: 6,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomHole: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0E0A06',
    borderWidth: 1,
    borderColor: '#383028',
  },
});
