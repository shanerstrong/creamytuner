export const palette = {
  ink: '#090D20',
  navy: '#0E1732',
  panel: '#182341',
  panelRaised: '#222E50',
  panelSoft: '#121B35',
  border: 'rgba(151, 170, 224, 0.18)',
  text: '#F8F8FF',
  textMuted: '#AEB8D4',
  textFaint: '#7783A6',
  pink: '#F14E9B',
  magenta: '#C82CC9',
  lavender: '#AE86FF',
  cyan: '#4ED9E8',
  success: '#50D2A0',
  warning: '#F6C56A',
  danger: '#FF6B83',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const gradients = {
  background: ['#090D20', '#111A37', '#090D20'] as const,
  primary: ['#D62CB4', '#F2578A'] as const,
  primaryPressed: ['#B8229C', '#D94176'] as const,
  card: ['rgba(43, 55, 91, 0.96)', 'rgba(22, 31, 59, 0.96)'] as const,
  cardAction: ['rgba(55, 70, 111, 0.98)', 'rgba(30, 42, 76, 0.98)'] as const,
  cardWarm: ['rgba(83, 50, 101, 0.95)', 'rgba(30, 35, 67, 0.96)'] as const,
  cardCool: ['rgba(25, 72, 105, 0.9)', 'rgba(24, 34, 66, 0.96)'] as const,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const shadows = {
  glow: {
    shadowColor: palette.pink,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};
