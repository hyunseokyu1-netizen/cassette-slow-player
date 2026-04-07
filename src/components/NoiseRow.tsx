import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { COLORS, FONT, SPACING } from '../constants/theme';

// ─── NoiseRow ─────────────────────────────────────────────────────────────────
//
// Displays a single editable TAPE NOISE item in the builder timeline.
// Tapping "edit" opens a +/- stepper modal.

const MIN = 0;
const MAX = 10; // allow up to 10s

type Props = {
  noiseIndex: number;
  duration: number;
  onEdit: (noiseIndex: number, newDuration: number) => void;
};

export function NoiseRow({ noiseIndex, duration, onEdit }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState(duration);

  const openEdit = () => {
    setEditValue(duration);
    setModalVisible(true);
  };

  const adjust = (delta: number) => {
    setEditValue((v) => Math.max(MIN, Math.min(MAX, Math.round((v + delta) * 2) / 2)));
  };

  const confirm = () => {
    onEdit(noiseIndex, editValue);
    setModalVisible(false);
  };

  return (
    <>
      <View style={styles.row}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>≈</Text>
        </View>

        {/* Label */}
        <View style={styles.content}>
          <Text style={styles.label}>TAPE NOISE</Text>
          <Text style={styles.duration}>{duration.toFixed(1)}s</Text>
        </View>

        {/* Edit button */}
        <Pressable onPress={openEdit} style={styles.editBtn} hitSlop={8}>
          <Text style={styles.editText}>edit </Text>
          <View style={styles.infoCircle}>
            <Text style={styles.infoText}>i</Text>
          </View>
        </Pressable>
      </View>

      {/* Edit modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>TAPE NOISE</Text>
            <Text style={styles.modalSubtitle}>노이즈 길이 조절</Text>

            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => adjust(-0.5)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{editValue.toFixed(1)}s</Text>
              <TouchableOpacity onPress={() => adjust(0.5)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmText}>확인</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── TapeFillRow ──────────────────────────────────────────────────────────────
//
// Shows the trailing silence (remaining tape) as a read-only row.

type FillProps = { duration: number };

export function TapeFillRow({ duration }: FillProps) {
  const m = Math.floor(duration / 60);
  const s = Math.floor(duration % 60);
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>≈</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>TAPE FILL</Text>
        <View style={styles.fillDurationRow}>
          <Text style={styles.fillDuration}>{timeStr}</Text>
          <Text style={styles.fillSuffix}> (to end)</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.secondary,
    gap: SPACING.sm,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: FONT.weightBold,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  duration: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightMedium,
    color: COLORS.text,
    marginTop: 1,
  },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.55,
  },
  editText: {
    fontSize: FONT.sizeSm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // TAPE FILL
  fillDurationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 1,
  },
  fillDuration: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightBold,
    color: COLORS.primary,
  },
  fillSuffix: {
    fontSize: FONT.sizeSm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: 260,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: FONT.sizeSm,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  modalSubtitle: {
    fontSize: FONT.sizeSm,
    color: COLORS.textSecondary,
    marginTop: -SPACING.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    color: COLORS.text,
    fontWeight: FONT.weightBold,
    lineHeight: 26,
  },
  stepValue: {
    fontSize: FONT.sizeXl,
    fontWeight: FONT.weightBold,
    color: COLORS.text,
    minWidth: 60,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  confirmBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: FONT.sizeMd,
    fontWeight: FONT.weightBold,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
