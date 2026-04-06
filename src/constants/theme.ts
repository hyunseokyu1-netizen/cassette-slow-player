// ─── Colors (design.md) ──────────────────────────────────────────────────────

export const COLORS = {
  background: '#F5F1EA',
  primary: '#F28C28',
  text: '#3A2E2A',
  secondary: '#E8E1D9',

  // Cassette body colors
  cassetteBody: '#3A2E2A',
  cassetteWindow: '#EDE8E0',
  cassetteReel: '#F28C28',
  cassetteHub: '#3A2E2A',
  cassetteTape: '#8C7B6E',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = {
  sizeXs: 11,
  sizeSm: 13,
  sizeMd: 15,
  sizeLg: 18,
  sizeXl: 22,
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightBold: '700' as const,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

// ─── Borders ──────────────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
} as const;

// ─── Shadows (design.md: soft shadow) ────────────────────────────────────────

export const SHADOW = {
  button: {
    shadowColor: '#3A2E2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cassette: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────

export const ANIM = {
  pressScale: 0.92,     // design.md: press scale
  pressDurationMs: 80,
  releaseDurationMs: 200,
  reelDurationMs: 300,
  longPressDelayMs: 450, // spec: skip requires long press
} as const;
