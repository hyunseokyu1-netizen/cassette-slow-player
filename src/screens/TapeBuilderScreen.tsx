import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { NoiseRow, TapeFillRow } from '../components/NoiseRow';
import { TrackRow } from '../components/TrackRow';
import { useTape } from '../hooks/useTape';
import { Tape, Track, SIDE_DURATION } from '../types/tape';
import { getRemainingTime } from '../engine/timeline';
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
  const [picking, setPicking] = useState(false);
  const tracks = tape[sideLabel].tracks;
  const timeline = tape[sideLabel].timeline;
  const remaining = getRemainingTime(sideLabel, tracks, tape.noiseGap);
  const usedSeconds = SIDE_DURATION - remaining;
  const usedPercent = Math.min(100, Math.round((usedSeconds / SIDE_DURATION) * 100));

  // ── File picker ────────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    if (remaining <= 0) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      // Detect duration via expo-av
      let duration = 0;
      try {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: asset.uri },
          { shouldPlay: false },
        );
        if (status.isLoaded && status.durationMillis) {
          duration = status.durationMillis / 1000;
        }
        await sound.unloadAsync();
      } catch {
        // duration stays 0
      }

      const title = (asset.name ?? 'track').replace(/\.[^/.]+$/, '');
      onAdd(sideLabel, { title, artist: '', uri: asset.uri, duration });
    } catch {
      Alert.alert('파일 선택 실패', '오디오 파일을 선택할 수 없었습니다.');
    } finally {
      setPicking(false);
    }
  };

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
        style={[styles.addAudioBtn, (remaining <= 0 || picking) && styles.addAudioBtnDisabled]}
        onPress={handlePickFile}
        disabled={remaining <= 0 || picking}
      >
        {picking ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={[styles.addAudioText, remaining <= 0 && styles.addAudioTextDisabled]}>
            + Add Audio Files
          </Text>
        )}
      </Pressable>

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
  durationBadge: {
    alignSelf: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
  },
  durationBadgeText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 0.5,
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
