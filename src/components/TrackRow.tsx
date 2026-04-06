import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Track } from '../types/tape';
import { COLORS, FONT, SPACING, SHADOW } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────
//
// ↑ / ↓ buttons replace drag-to-reorder.
// First item hides ↑; last item hides ↓.

export const TRACK_ROW_HEIGHT = 64;

type Props = {
  track: Track;
  index: number;
  totalCount: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (id: string) => void;
};

export function TrackRow({ track, index, totalCount, onMoveUp, onMoveDown, onDelete }: Props) {
  return (
    <View style={styles.row}>
      {/* ── Reorder buttons ──────────────────────────────────────────────── */}
      <View style={styles.reorderCol}>
        <Pressable
          onPress={() => onMoveUp(index)}
          style={[styles.reorderBtn, index === 0 && styles.hidden]}
          hitSlop={8}
        >
          <Text style={styles.reorderIcon}>▲</Text>
        </Pressable>
        <Pressable
          onPress={() => onMoveDown(index)}
          style={[styles.reorderBtn, index === totalCount - 1 && styles.hidden]}
          hitSlop={8}
        >
          <Text style={styles.reorderIcon}>▼</Text>
        </Pressable>
      </View>

      {/* ── Track info ────────────────────────────────────────────────────── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
      </View>

      {/* ── Duration ──────────────────────────────────────────────────────── */}
      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

      {/* ── Delete ────────────────────────────────────────────────────────── */}
      <Pressable onPress={() => onDelete(track.id)} style={styles.deleteButton} hitSlop={8}>
        <Text style={styles.deleteIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    height: TRACK_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
    ...SHADOW.button,
  },

  reorderCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: SPACING.xs,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderIcon: {
    fontSize: 10,
    color: COLORS.text,
    opacity: 0.4,
  },
  hidden: {
    opacity: 0,
  },

  info: {
    flex: 1,
    paddingLeft: SPACING.xs,
  },
  title: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
  },
  artist: {
    fontSize: FONT.sizeSm,
    color: COLORS.text,
    opacity: 0.5,
    marginTop: 2,
  },

  duration: {
    fontSize: FONT.sizeSm,
    color: COLORS.text,
    opacity: 0.45,
    marginRight: SPACING.sm,
    fontVariant: ['tabular-nums'],
  },

  deleteButton: {
    padding: SPACING.xs,
  },
  deleteIcon: {
    fontSize: FONT.sizeSm,
    color: COLORS.text,
    opacity: 0.35,
  },
});
