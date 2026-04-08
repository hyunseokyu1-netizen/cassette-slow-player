import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { TapeBuilderScreen } from './src/screens/TapeBuilderScreen';
import { createTape } from './src/engine/timeline';
import { Tape } from './src/types/tape';
import { COLORS, FONT, SPACING } from './src/constants/theme';

function makeEmptyTape(): Tape {
  return createTape('tape-001', 'My Mixtape');
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Screen = 'player' | 'builder';

export default function App() {
  const [screen, setScreen] = useState<Screen>('player');
  const [tape, setTape] = useState<Tape>(makeEmptyTape);

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
