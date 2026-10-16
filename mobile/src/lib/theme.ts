import { Platform } from 'react-native';

export const C = {
  ink: '#15110E', ink2: '#221A15', ink3: '#2E241D',
  lacquer: '#8F1D1D', maroon: '#5A1016', ember: '#B5452B',
  gold: '#C9A24A', brass: '#A97F2C', goldSoft: '#E6CF8F',
  paddy: '#2E5A3B', moss: '#56734A', leaf: '#8FAE6B',
  parchment: '#F6EFE2', paper: '#FBF7EF', sand: '#EADFCB', line: '#DCCDB2',
  stone: '#6F6458', mute: '#9A8E80', white: '#FFFFFF',
};

// 13 branch colours — earthy, distinct, readable on parchment & ink
export const BRANCH = ['#8F1D1D', '#B5452B', '#C9A24A', '#2E5A3B', '#6B8F3A', '#2F6F73', '#3E5C8A', '#6A4C93', '#9C3D6E', '#A35D2A', '#7A6A2E', '#4E7D5B', '#5B4636'];
export const branchColor = (n?: number | null) => (n ? BRANCH[(n - 1) % 13] : C.stone);

const web = Platform.OS === 'web';
export const F = {
  display: web ? "Fraunces, 'Abhaya Libre', Georgia, serif" : 'serif',
  sinhalaDisplay: web ? "'Abhaya Libre', 'Noto Sans Sinhala', serif" : 'serif',
  body: web ? "Inter, 'Noto Sans Sinhala', system-ui, -apple-system, 'Segoe UI', sans-serif" : undefined,
};
export const R = { s: 10, m: 16, l: 24, xl: 32 };
export const shadow = web ? ({ boxShadow: '0 1px 2px rgba(21,17,14,.06), 0 12px 32px -12px rgba(21,17,14,.22)' } as any) : { elevation: 3 };
