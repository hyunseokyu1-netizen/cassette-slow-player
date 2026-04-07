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
  StatusBar,
  Alert,
} from 'react-native';
import { NoiseRow, TapeFillRow } from '../components/NoiseRow';
import { TrackRow } from '../components/TrackRow';
import { useTape } from '../hooks/useTape';
import { Tape, Track, SIDE_DURATION } from '../types/tape';
import { getRemainingTime } from '../engine/timeline';
import { isTrackItem } from '../engine/getCurrentItem';
import { COLORS, FONT, SPACING, RADIUS } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMMSS(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')} remaining`;
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
    if (!title.trim()) { Alert.alert('제목을 입력해주세요'); return; }
    if (!duration || duration <= 0) { Alert.alert('재생 시간을 초 단위로 입력해주세요 (예: 214)'); return; }
    if (duration > remainingSeconds) {
      Alert.alert('곡이 너무 깁니다', `이 면에 ${Math.floor(remainingSeconds)}초만 남았습니다.`);
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
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>ADD TRACK</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder="트랙 제목" placeholderTextColor={COLORS.textSecondary + '80'} autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ARTIST</Text>
            <TextInput style={styles.input} value={artist} onChangeText={setArtist}
              placeholder="아티스트" placeholderTextColor={COLORS.textSecondary + '80'} autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DURATION (초)</Text>
            <TextInput style={styles.input} value={durationText} onChangeText={setDurationText}
              placeholder={`최대 ${Math.floor(remainingSeconds)}초`}
              placeholderTextColor={COLORS.textSecondary + '80'} keyboardType="numeric" />
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>추가</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── SideContent ──────────────────────────────────────────────────────────────
//
// Timeline list for one side: noise rows, track rows, tape fill row.

type SideContentProps = {
  sideLabel: 'A' | 'B';
  tape: Tape;
  onDelete: (sideLabel: 'A' | 'B', trackId: string) => void;
  onReorder: (sideLabel: 'A' | 'B', tracks: Track[]) => void;
  onNoiseEdit: (sideLabel: 'A' | 'B', noiseIndex: number, duration: number) => void;
  onAdd: (sideLabel: 'A' | 'B', track: Omit<Track, 'id'>) => void;
};

function SideContent({ sideLabel, tape, onDelete, onReorder, onNoiseEdit, onAdd }: SideContentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const tracks = tape[sideLabel].tracks;
  const timeline = tape[sideLabel].timeline;
  const remaining = getRemainingTime(sideLabel, tracks, tape.noiseGap);
  const usedSeconds = SIDE_DURATION - remaining;
  const usedPercent = Math.min(100, Math.round((usedSeconds / SIDE_DURATION) * 100));

  // Map timeline items to display rows.
  // Track count used to resolve ↑↓ moves.
  let noiseCount = 0;
  let trackCount = 0;
  const lastIdx = timeline.length - 1;

  return (
    <View style={styles.sideContent}>
      {/* ── Side info header ──────────────────────────────────────────────── */}
      <View style={styles.sideInfoRow}>
        <View style={styles.sideBadge}>
          <Text style={styles.sideBadgeText}>SIDE {sideLabel}</Text>
        </View>
        <Text style={styles.sideTime}>
          <Text style={styles.sideTimeUsed}>{formatMMSS(usedSeconds)}</Text>
          <Text style={styles.sideTimeTotal}> / {formatMMSS(SIDE_DURATION)}</Text>
        </Text>
      </View>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${usedPercent}%` }]} />
      </View>
      <Text style={styles.remainingText}>{formatRemaining(remaining)}</Text>

      {/* ── Timeline list ─────────────────────────────────────────────────── */}
      <View style={styles.timeline}>
        {timeline.map((item, idx) => {
          if (item.type === 'noise') {
            const currentNoiseIndex = noiseCount;
            noiseCount++;
            // Last item = tape fill (read-only)
            if (idx === lastIdx) {
              return <TapeFillRow key={`fill-${idx}`} duration={item.duration} />;
            }
            return (
              <NoiseRow
                key={`noise-${idx}`}
                noiseIndex={currentNoiseIndex}
                duration={item.duration}
                onEdit={(ni, dur) => onNoiseEdit(sideLabel, ni, dur)}
              />
            );
          } else {
            const currentTrackIndex = trackCount;
            trackCount++;
            return (
              <TrackRow
                key={item.track.id}
                track={item.track}
                index={currentTrackIndex}
                totalCount={tracks.length}
                onMoveUp={(i) => onReorder(sideLabel, swapItems(tracks, i, i - 1))}
                onMoveDown={(i) => onReorder(sideLabel, swapItems(tracks, i, i + 1))}
                onDelete={(id) => onDelete(sideLabel, id)}
              />
            );
          }
        })}
      </View>

      {/* ── Add button ────────────────────────────────────────────────────── */}
      <Pressable
        style={[styles.addAudioBtn, remaining <= 0 && styles.addAudioBtnDisabled]}
        onPress={() => remaining > 0 && setModalOpen(true)}
      >
        <Text style={[styles.addAudioText, remaining <= 0 && styles.addAudioTextDisabled]}>
          + Add Audio Files
        </Text>
      </Pressable>

      <AddTrackModal
        visible={modalOpen}
        remainingSeconds={remaining}
        onAdd={(t) => onAdd(sideLabel, t)}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

function swapItems<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ─── TapeBuilderScreen ────────────────────────────────────────────────────────

type Props = {
  tape: Tape;
  onTapeChange: (tape: Tape) => void;
  onBack: () => void;
};

export function TapeBuilderScreen({ tape: initialTape, onTapeChange, onBack }: Props) {
  const { tape, addTrack, removeTrack, reorderTracks, updateNoiseDuration } = useTape(initialTape);
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');

  React.useEffect(() => { onTapeChange(tape); }, [tape]);

  const handleAdd = (sideLabel: 'A' | 'B', track: Omit<Track, 'id'>) => {
    const id = `${sideLabel}-${Date.now()}`;
    const result = addTrack(sideLabel, { ...track, id });
    if (!result.ok) {
      Alert.alert('추가 불가', `Side ${sideLabel}에 ${Math.floor(result.remainingTime)}초만 남았습니다.`);
    }
  };

  // Tab percentages
  const pctA = Math.min(100, Math.round(((SIDE_DURATION - getRemainingTime('A', tape.A.tracks, tape.noiseGap)) / SIDE_DURATION) * 100));
  const pctB = Math.min(100, Math.round(((SIDE_DURATION - getRemainingTime('B', tape.B.tracks, tape.noiseGap)) / SIDE_DURATION) * 100));

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: statusBarHeight }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>LIBRARY</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <View style={styles.tabs}>
        {(['A', 'B'] as const).map((side) => {
          const isActive = activeSide === side;
          const pct = side === 'A' ? pctA : pctB;
          return (
            <Pressable key={side} style={styles.tab} onPress={() => setActiveSide(side)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                SIDE {side}{'  '}{pct}%
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SideContent
          key={activeSide}
          sideLabel={activeSide}
          tape={tape}
          onDelete={removeTrack}
          onReorder={reorderTracks}
          onNoiseEdit={updateNoiseDuration}
          onAdd={handleAdd}
        />
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

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backBtn: {},
  backArrow: {
    fontSize: FONT.sizeLg,
    color: COLORS.primary,
    fontWeight: FONT.weightBold,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 2.5,
  },
  headerSpacer: { width: 28 },

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.secondary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    position: 'relative',
  },
  tabText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightMedium,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: FONT.weightBold,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: SPACING.lg,
    right: SPACING.lg,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },

  // ── Side content ───────────────────────────────────────────────────────────
  sideContent: {
    paddingTop: SPACING.md,
  },

  sideInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sideBadge: {
    backgroundColor: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sideBadgeText: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightBold,
    color: COLORS.background,
    letterSpacing: 1.5,
  },
  sideTime: {},
  sideTimeUsed: {
    fontSize: FONT.sizeLg,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
  },
  sideTimeTotal: {
    fontSize: FONT.sizeMd,
    color: COLORS.textSecondary,
  },

  progressTrack: {
    height: 4,
    backgroundColor: COLORS.progressTrack,
    marginHorizontal: SPACING.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  remainingText: {
    fontSize: FONT.sizeXs,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },

  // ── Timeline ───────────────────────────────────────────────────────────────
  timeline: {
    backgroundColor: '#fff',
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.secondary,
    marginBottom: SPACING.md,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Add button ─────────────────────────────────────────────────────────────
  addAudioBtn: {
    marginHorizontal: SPACING.md,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAudioBtnDisabled: {
    borderColor: COLORS.textSecondary,
    opacity: 0.35,
  },
  addAudioText: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightBold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  addAudioTextDisabled: {
    color: COLORS.textSecondary,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(58,46,42,0.35)',
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'stretch',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.secondary,
    alignSelf: 'center',
    marginBottom: SPACING.xs,
  },
  modalTitle: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  field: { gap: 4 },
  fieldLabel: {
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightBold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  input: {
    height: 44,
    backgroundColor: '#fff',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.sizeMd,
    color: COLORS.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
  },
  addBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: '#fff',
  },
});
