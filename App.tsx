import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { TapeBuilderScreen } from './src/screens/TapeBuilderScreen';
import { createTape, buildTimeline } from './src/engine/timeline';
import { Tape, Track } from './src/types/tape';
import { COLORS, FONT, SPACING } from './src/constants/theme';

// ─── Demo tape ────────────────────────────────────────────────────────────────
//
// Replace uri fields with real audio file paths to enable playback.

const DEMO_TRACKS_A: Track[] = [
  { id: 'a1', title: '봄날', artist: 'BTS', uri: '', duration: 255 },
  { id: 'a2', title: 'Blueming', artist: 'IU', uri: '', duration: 214 },
  { id: 'a3', title: 'Celebrity', artist: 'IU', uri: '', duration: 193 },
];

const DEMO_TRACKS_B: Track[] = [
  { id: 'b1', title: 'Feel Special', artist: 'TWICE', uri: '', duration: 213 },
  { id: 'b2', title: 'Eight', artist: 'IU feat. Suga', uri: '', duration: 200 },
];

function makeDemoTape(): Tape {
  const t = createTape('demo-001', '봄 플레이리스트');
  t.A = { label: 'A', tracks: DEMO_TRACKS_A, timeline: buildTimeline('A', DEMO_TRACKS_A, t.noiseGap) };
  t.B = { label: 'B', tracks: DEMO_TRACKS_B, timeline: buildTimeline('B', DEMO_TRACKS_B, t.noiseGap) };
  return t;
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Screen = 'player' | 'builder';

export default function App() {
  const [screen, setScreen] = useState<Screen>('player');
  const [tape, setTape] = useState<Tape>(makeDemoTape);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {screen === 'player' ? (
        <>
          <PlayerScreen tape={tape} />
          {/* Builder shortcut — top-right corner */}
          <Pressable
            style={styles.builderButton}
            onPress={() => setScreen('builder')}
            hitSlop={8}
          >
            <Text style={styles.builderLabel}>✎</Text>
          </Pressable>
        </>
      ) : (
        <TapeBuilderScreen
          tape={tape}
          onTapeChange={setTape}
          onBack={() => setScreen('player')}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  builderButton: {
    position: 'absolute',
    top: 56,
    right: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderLabel: {
    fontSize: FONT.sizeLg,
    color: COLORS.text,
  },
});
