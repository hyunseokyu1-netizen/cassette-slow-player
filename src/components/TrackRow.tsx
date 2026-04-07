import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Track } from '../types/tape';
import { COLORS, FONT, SPACING } from '../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────
//
// Number badge | title | duration | × delete

export const TRACK_ROW_HEIGHT = 60;

type Props = {
  track: Track;
  index: number;
  totalCount: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (id: string) => void;
};

export function TrackRow({ track, index, totalCount, onMoveUp, onMoveDown, onDelete }: Props) {
  const trackNum = String(index + 1).padStart(2, '0');

  return (
    <View style={styles.row}>
      {/* Number badge */}
      <View style={styles.numBadge}>
        <Text style={styles.numText}>{trackNum}</Text>
      </View>

      {/* Track info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        {track.artist ? (
          <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
        ) : null}
      </View>

      {/* Duration */}
      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

      {/* Delete */}
      <Pressable onPress={() => onDelete(track.id)} style={styles.deleteBtn} hitSlop={8}>
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
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.secondary,
    gap: SPACING.sm,
  },

  numBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.textSecondary,
  },

  info: {
    flex: 1,
  },
  title: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
  },
  artist: {
    fontSize: FONT.sizeXs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  duration: {
    fontSize: FONT.sizeSm,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  deleteBtn: {
    paddingHorizontal: SPACING.xs,
  },
  deleteIcon: {
    fontSize: FONT.sizeSm,
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
});
