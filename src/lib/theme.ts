import { useColorScheme } from 'react-native';

export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  separator: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  tint: string;
  tintSoft: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  orange: string;
  orangeSoft: string;
  gray: string;
  graySoft: string;
  fill: string;
  consoleBg: string;
  consoleText: string;
  backdrop: string;
}

const light: Palette = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardAlt: '#F9F9FB',
  separator: '#E5E5EA',
  text: '#1C1C1E',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  tint: '#007AFF',
  tintSoft: 'rgba(0,122,255,0.10)',
  green: '#248A3D',
  greenSoft: 'rgba(52,199,89,0.14)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.10)',
  orange: '#B25000',
  orangeSoft: 'rgba(255,149,0,0.16)',
  gray: '#8E8E93',
  graySoft: 'rgba(120,120,128,0.14)',
  fill: 'rgba(118,118,128,0.12)',
  consoleBg: '#1C1C1E',
  consoleText: '#7DE38A',
  backdrop: 'rgba(0,0,0,0.40)',
};

const dark: Palette = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  separator: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#E5E5EA',
  textTertiary: '#8E8E93',
  tint: '#0A84FF',
  tintSoft: 'rgba(10,132,255,0.18)',
  green: '#30D158',
  greenSoft: 'rgba(48,209,88,0.16)',
  red: '#FF453A',
  redSoft: 'rgba(255,69,58,0.16)',
  orange: '#FF9F0A',
  orangeSoft: 'rgba(255,159,10,0.16)',
  gray: '#8E8E93',
  graySoft: 'rgba(120,120,128,0.24)',
  fill: 'rgba(118,118,128,0.24)',
  consoleBg: '#0C0C0E',
  consoleText: '#7DE38A',
  backdrop: 'rgba(0,0,0,0.60)',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const monoFont = 'Menlo';

export interface Theme {
  colors: Palette;
  isDark: boolean;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark };
}

export function cardShadow(isDark: boolean) {
  return {
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.32 : 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const;
}
