import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NoiseSlider } from '../components/NoiseSlider';
import { TrackRow } from '../components/TrackRow';
import { useTape } from '../hooks/useTape';
import { Tape, Track, SIDE_DURATION } from '../types/tape';
import { getRemainingTime } from '../engine/timeline';
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')} left`;
}

function swapItems<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ─── AddTrackModal ────────────────────────────────────────────────────────────

type AddTrackModalProps = {
  visible: boolean;
  remainingSeconds: number;
  onAdd: (track: Omit<Track, 'id'>) => void;
  onClose: () => void;
};

function AddTrackModal({ visible, remainingSeconds, onAdd, onClose }: AddTrackModalProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [durationText, setDurationText] = useState('');

  const reset = () => { setTitle(''); setArtist(''); setDurationText(''); };

  const handleAdd = () => {
    const duration = parseFloat(durationText);
    if (!title.trim()) { Alert.alert('Title required'); return; }
    if (!duration || duration <= 0) { Alert.alert('Enter duration in seconds (e.g. 214)'); return; }
    if (duration > remainingSeconds) {
      Alert.alert('Track too long', `Only ${Math.floor(remainingSeconds)}s remaining on this side.`);
      return;
    }
    onAdd({ title: title.trim(), artist: artist.trim(), uri: '', duration });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>ADD TRACK</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Track title"
              placeholderTextColor={COLORS.text + '50'}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ARTIST</Text>
            <TextInput
              style={styles.input}
              value={artist}
              onChangeText={setArtist}
              placeholder="Artist name"
              placeholderTextColor={COLORS.text + '50'}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DURATION (seconds)</Text>
            <TextInput
              style={styles.input}
              value={durationText}
              onChangeText={setDurationText}
              placeholder={`max ${Math.floor(remainingSeconds)}s`}
              placeholderTextColor={COLORS.text + '50'}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelLabel}>CANCEL</Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addLabel}>ADD</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── SideSection ──────────────────────────────────────────────────────────────

type SideSectionProps = {
  sideLabel: 'A' | 'B';
  tape: Tape;
  onReorder: (sideLabel: 'A' | 'B', tracks: Track[]) => void;
  onDelete: (sideLabel: 'A' | 'B', trackId: string) => void;
  onAdd: (sideLabel: 'A' | 'B', track: Omit<Track, 'id'>) => void;
};

function SideSection({ sideLabel, tape, onReorder, onDelete, onAdd }: SideSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const tracks = tape[sideLabel].tracks;
  const remaining = getRemainingTime(sideLabel, tracks, tape.noiseGap);
  const usedPercent = Math.round(((SIDE_DURATION - remaining) / SIDE_DURATION) * 100);

  return (
    <View style={styles.section}>
      {/* ── Section header ────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sideBadge}>
          <Text style={styles.sideBadgeText}>SIDE {sideLabel}</Text>
        </View>
        <Text style={styles.remainingText}>{formatRemaining(remaining)}</Text>
      </View>

      {/* ── Tape fill bar ─────────────────────────────────────────────────── */}
      <View style={styles.fillTrack}>
        <View style={[styles.fillBar, { width: `${usedPercent}%` }]} />
      </View>

      {/* ── Track list (↑↓ reorder) ────────────────────────────────────────── */}
      <View style={styles.listWrapper}>
        {tracks.length === 0 ? (
          <Text style={styles.emptyHint}>No tracks yet</Text>
        ) : (
          tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              totalCount={tracks.length}
              onMoveUp={(i) => onReorder(sideLabel, swapItems(tracks, i, i - 1))}
              onMoveDown={(i) => onReorder(sideLabel, swapItems(tracks, i, i + 1))}
              onDelete={(id) => onDelete(sideLabel, id)}
            />
          ))
        )}
      </View>

      {/* ── Add track button ──────────────────────────────────────────────── */}
      <Pressable
        style={[styles.addTrackButton, remaining <= 0 && styles.addTrackDisabled]}
        onPress={() => remaining > 0 && setModalOpen(true)}
      >
        <Text style={styles.addTrackLabel}>+ ADD TRACK</Text>
      </Pressable>

      <AddTrackModal
        visible={modalOpen}
        remainingSeconds={remaining}
        onAdd={(track) => onAdd(sideLabel, track)}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

// ─── TapeBuilderScreen ────────────────────────────────────────────────────────

type Props = {
  tape: Tape;
  onTapeChange: (tape: Tape) => void;
  onBack: () => void;
};

export function TapeBuilderScreen({ tape: initialTape, onTapeChange, onBack }: Props) {
  const { tape, addTrack, removeTrack, reorderTracks, setNoiseGap } = useTape(initialTape);

  React.useEffect(() => { onTapeChange(tape); }, [tape]);

  const handleAdd = (sideLabel: 'A' | 'B', track: Omit<Track, 'id'>) => {
    const id = `${sideLabel}-${Date.now()}`;
    const result = addTrack(sideLabel, { ...track, id });
    if (!result.ok) {
      Alert.alert(
        'Cannot add track',
        `Only ${Math.floor(result.remainingTime)}s remaining on Side ${sideLabel}.`,
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
          <Text style={styles.backLabel}>← PLAYER</Text>
        </Pressable>
        <Text style={styles.headerTitle}>TAPE BUILDER</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.tapeTitle}>{tape.title}</Text>

        <View style={styles.card}>
          <NoiseSlider value={tape.noiseGap} onChange={setNoiseGap} />
        </View>

        <SideSection sideLabel="A" tape={tape} onReorder={reorderTracks} onDelete={removeTrack} onAdd={handleAdd} />
        <SideSection sideLabel="B" tape={tape} onReorder={reorderTracks} onDelete={removeTrack} onAdd={handleAdd} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  backButton: {},
  backLabel: {
    fontSize: FONT.sizeSm,
    color: COLORS.primary,
    fontWeight: FONT.weightMedium,
    letterSpacing: 0.5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 2,
  },
  headerSpacer: { width: 60 },

  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  tapeTitle: {
    fontSize: FONT.sizeLg,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOW.button,
  },

  section: { gap: SPACING.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  sideBadge: {
    backgroundColor: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 5,
  },
  sideBadgeText: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightBold,
    color: COLORS.background,
    letterSpacing: 1.5,
  },
  remainingText: {
    fontSize: FONT.sizeSm,
    color: COLORS.text,
    opacity: 0.5,
    fontVariant: ['tabular-nums'],
  },

  fillTrack: {
    height: 3,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  listWrapper: { minHeight: 8 },
  emptyHint: {
    fontSize: FONT.sizeSm,
    color: COLORS.text,
    opacity: 0.3,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },

  addTrackButton: {
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTrackDisabled: {
    borderColor: COLORS.text,
    opacity: 0.2,
  },
  addTrackLabel: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.primary,
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(58,46,42,0.4)',
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  field: { gap: SPACING.xs },
  fieldLabel: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    opacity: 0.5,
    letterSpacing: 1,
  },
  input: {
    height: 44,
    backgroundColor: '#fff',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.sizeMd,
    color: COLORS.text,
    ...SHADOW.button,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 1,
  },
  addButton: {
    flex: 2,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.button,
  },
  addLabel: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: '#fff',
    letterSpacing: 1,
  },
});
