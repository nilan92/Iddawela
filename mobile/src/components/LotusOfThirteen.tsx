import React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { BRANCH, C } from '../lib/theme';

/** The 13 children of Ukkubanda & Lokumenike drawn as a 13-petal lotus. Petal length ~ number of descendants. */
export default function LotusOfThirteen({ size = 460, branches }: { size?: number; branches: { branch_no: number; descendants: number; name_en: string }[] }) {
  const cx = 250, cy = 250;
  const max = Math.max(1, ...branches.map((b) => b.descendants));
  const petals = branches.map((b, i) => {
    const a = (i / 13) * Math.PI * 2 - Math.PI / 2;
    const len = 120 + (b.descendants / max) * 95;
    const wdt = 0.2;
    const p1 = [cx + Math.cos(a - wdt) * 52, cy + Math.sin(a - wdt) * 52];
    const p2 = [cx + Math.cos(a + wdt) * 52, cy + Math.sin(a + wdt) * 52];
    const tip = [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
    const c1 = [cx + Math.cos(a - 0.26) * len * 0.72, cy + Math.sin(a - 0.26) * len * 0.72];
    const c2 = [cx + Math.cos(a + 0.26) * len * 0.72, cy + Math.sin(a + 0.26) * len * 0.72];
    const d = `M${p1[0]} ${p1[1]} Q${c1[0]} ${c1[1]} ${tip[0]} ${tip[1]} Q${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]} Z`;
    const dots = Array.from({ length: Math.min(b.descendants, 40) }, (_, k) => {
      const t = 0.42 + (k / Math.max(1, Math.min(b.descendants, 40))) * 0.5;
      const off = ((k % 3) - 1) * 0.07;
      return [cx + Math.cos(a + off) * len * t, cy + Math.sin(a + off) * len * t];
    });
    const lab = [cx + Math.cos(a) * (len + 18), cy + Math.sin(a) * (len + 18)];
    return { d, color: BRANCH[i], dots, lab, n: b.branch_no, tip };
  });
  const spin = Platform.OS === 'web' ? ({ animationName: 'idwfloat', animationDuration: '9s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as any) : null;
  return (
    <View style={[{ width: size, height: size }, spin]}>
      <Svg width={size} height={size} viewBox="0 0 500 500">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.gold} stopOpacity="0.35" />
            <Stop offset="1" stopColor={C.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={240} fill="url(#glow)" />
        {[70, 130, 190, 236].map((r) => <Circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={C.gold} strokeOpacity={0.14} strokeDasharray="2 6" />)}
        {petals.map((p) => (
          <G key={p.n} onPress={() => router.push(`/tree?branch=${p.n}` as any)}>
            <Path d={p.d} fill={p.color} fillOpacity={0.22} stroke={p.color} strokeWidth={1.6} />
            {p.dots.map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={2.1} fill={C.goldSoft} fillOpacity={0.85} />)}
            <SvgText x={p.lab[0]} y={p.lab[1] + 4} fill={C.goldSoft} fontSize={13} fontWeight="700" textAnchor="middle" fontFamily="Fraunces, Georgia, serif">{p.n}</SvgText>
          </G>
        ))}
        <Circle cx={cx} cy={cy} r={46} fill={C.ink} stroke={C.gold} strokeWidth={1.5} />
        <Circle cx={cx - 12} cy={cy} r={9} fill={C.gold} />
        <Circle cx={cx + 12} cy={cy} r={9} fill={C.goldSoft} />
        <SvgText x={cx} y={cy + 30} fill={C.goldSoft} fontSize={9.5} textAnchor="middle" letterSpacing={1.5} fontFamily="Inter, sans-serif">1880 · 1885</SvgText>
      </Svg>
    </View>
  );
}
