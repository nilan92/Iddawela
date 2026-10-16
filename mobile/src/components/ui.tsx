import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, ViewStyle, TextStyle, Image } from 'react-native';
import { Link, router } from 'expo-router';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { C, F, R, shadow, branchColor } from '../lib/theme';
import { useLang, nm } from '../lib/i18n';
import { mediaUrl } from '../lib/api';


/** Pressable that navigates (SPA link on web, crawlable <a>) and exposes hover state without style functions (Link asChild drops them). */
export function Tap({ href, onPress, style, children, label, role }: { href?: string; onPress?: () => void; style: (h: boolean, p: boolean) => any; children: React.ReactNode | ((h: boolean) => React.ReactNode); label?: string; role?: any }) {
  const [h, setH] = useState(false); const [pr, setPr] = useState(false);
  const inner = (
    <Pressable accessibilityRole={role || (href ? 'link' : 'button')} accessibilityLabel={label} onPress={href && Platform.OS !== 'web' ? () => router.push(href as any) : onPress}
      onHoverIn={() => setH(true)} onHoverOut={() => setH(false)} onPressIn={() => setPr(true)} onPressOut={() => setPr(false)} style={StyleSheet.flatten(style(h, pr))}>
      {typeof children === 'function' ? (children as any)(h) : children}
    </Pressable>
  );
  if (href && Platform.OS === 'web') return <Link href={href as any} asChild>{inner}</Link>;
  return inner;
}

const isSi = (s?: string) => !!s && /[\u0D80-\u0DFF]/.test(s);

export function Container({ children, style, narrow }: { children: React.ReactNode; style?: ViewStyle; narrow?: boolean }) {
  return <View style={[{ width: '100%', maxWidth: narrow ? 820 : 1240, alignSelf: 'center', paddingHorizontal: 20 }, style]}>{children}</View>;
}

type TP = { children: React.ReactNode; style?: TextStyle | TextStyle[] | any; numberOfLines?: number; color?: string; selectable?: boolean };
export function H1({ children, style, color }: TP) {
  const si = typeof children === 'string' && isSi(children);
  return <Text accessibilityRole="header" aria-level={1} style={[s.h1, si && { fontFamily: F.sinhalaDisplay, letterSpacing: 0, lineHeight: undefined }, color ? { color } : null, style]}>{children}</Text>;
}
export function H2({ children, style, color }: TP) {
  const si = typeof children === 'string' && isSi(children);
  return <Text accessibilityRole="header" aria-level={2} style={[s.h2, si && { fontFamily: F.sinhalaDisplay, letterSpacing: 0 }, color ? { color } : null, style]}>{children}</Text>;
}
export function H3({ children, style, color, numberOfLines }: TP) {
  return <Text accessibilityRole="header" aria-level={3} numberOfLines={numberOfLines} style={[s.h3, color ? { color } : null, style]}>{children}</Text>;
}
export function Kicker({ children, style, color }: TP) {
  return <Text style={[s.kicker, color ? { color } : null, style]}>{children}</Text>;
}
export function P({ children, style, color, numberOfLines, selectable }: TP) {
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[s.p, color ? { color } : null, style]}>{children}</Text>;
}
export function Small({ children, style, color, numberOfLines }: TP) {
  return <Text numberOfLines={numberOfLines} style={[s.small, color ? { color } : null, style]}>{children}</Text>;
}

/** Long text with paragraphs */
export function Prose({ text, style, color }: { text?: string | null; style?: any; color?: string }) {
  if (!text) return null;
  const paras = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  return (
    <View style={{ gap: 14 }}>
      {paras.map((p, i) => <Text key={i} selectable style={[s.prose, color ? { color } : null, style]}>{p}</Text>)}
    </View>
  );
}

export function Btn({ label, href, onPress, variant = 'gold', icon, style, disabled, loading, small }: {
  label: string; href?: string; onPress?: () => void; variant?: 'gold' | 'dark' | 'ghost' | 'light' | 'outline' | 'danger'; icon?: React.ReactNode; style?: any; disabled?: boolean; loading?: boolean; small?: boolean;
}) {
  const v = BTN[variant];
  return (
    <Tap href={href} onPress={onPress} label={label}
      style={(h, pr) => [s.btn, small && { paddingVertical: 8, paddingHorizontal: 14 }, v.box, h && v.hover, pr && { transform: [{ scale: 0.98 }] }, (disabled || loading) && { opacity: 0.5 }, style]}>
      {loading ? <ActivityIndicator size="small" color={v.text.color} /> : icon}
      <Text style={[s.btnText, small && { fontSize: 14 }, v.text]}>{label}</Text>
    </Tap>
  );
}
const BTN: Record<string, { box: any; hover: any; text: any }> = {
  gold: { box: { backgroundColor: C.gold }, hover: { backgroundColor: C.goldSoft }, text: { color: C.ink } },
  dark: { box: { backgroundColor: C.ink }, hover: { backgroundColor: C.ink3 }, text: { color: C.parchment } },
  ghost: { box: { backgroundColor: 'transparent' }, hover: { backgroundColor: 'rgba(201,162,74,.12)' }, text: { color: C.ink } },
  light: { box: { backgroundColor: 'rgba(246,239,226,.1)', borderWidth: 1, borderColor: 'rgba(230,207,143,.45)' }, hover: { backgroundColor: 'rgba(246,239,226,.18)' }, text: { color: C.parchment } },
  outline: { box: { borderWidth: 1.5, borderColor: C.ink }, hover: { backgroundColor: C.ink }, text: { color: C.ink } },
  danger: { box: { backgroundColor: C.lacquer }, hover: { backgroundColor: C.maroon }, text: { color: C.paper } },
};

export function Card({ children, style, href, onPress, dark }: { children: React.ReactNode; style?: any; href?: string; onPress?: () => void; dark?: boolean }) {
  const st = [s.card, dark && { backgroundColor: C.ink2, borderColor: 'rgba(230,207,143,.18)' }, style];
  if (href || onPress) return <Tap href={href} onPress={onPress} style={(h, pr) => [st, h && s.cardHover, pr && { opacity: 0.92 }]}>{children}</Tap>;
  return <View style={st}>{children}</View>;
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.chip, active && { backgroundColor: color || C.ink, borderColor: color || C.ink }, hovered && !active && { borderColor: C.ink }]}>
      {color && !active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <Text style={[s.chipText, active && { color: C.paper }]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ person, size = 56, ring = true }: { person: any; size?: number; ring?: boolean }) {
  const { lang } = useLang();
  const name = nm(person, lang) || '?';
  const initials = (person?.name_en || name).replace(/\(.*?\)/g, '').split(/\s+/).filter((w: string) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || name[0];
  const bc = branchColor(person?.branch_no);
  const src = mediaUrl(person?.photo);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring ? 2 : 0, backgroundColor: ring ? bc : 'transparent' }}>
      {src ? (
        <Image source={{ uri: src }} accessibilityLabel={name} style={{ width: '100%', height: '100%', borderRadius: size, backgroundColor: C.sand }} />
      ) : (
        <View style={{ flex: 1, borderRadius: size, backgroundColor: person?.deceased ? C.ink2 : C.parchment, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,.06)' }}>
          <Text style={{ fontFamily: F.display, fontSize: size * 0.36, color: person?.deceased ? C.goldSoft : bc, fontWeight: '600' }}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

export function Field({ label, value, onChangeText, secure, multiline, placeholder, keyboardType, autoComplete, style, hint }: any) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput value={value ?? ''} onChangeText={onChangeText} secureTextEntry={secure} multiline={multiline} placeholder={placeholder}
        placeholderTextColor={C.mute} keyboardType={keyboardType} autoComplete={autoComplete} autoCapitalize="none"
        style={[s.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]} />
      {hint ? <Small color={C.stone}>{hint}</Small> : null}
    </View>
  );
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'ok' | 'err' }) {
  const bg = { info: '#EFE6D2', warn: '#F6E3C2', ok: '#E1EBD9', err: '#F3D9D3' }[tone];
  const bd = { info: C.line, warn: C.gold, ok: C.moss, err: C.lacquer }[tone];
  return <View style={{ backgroundColor: bg, borderLeftWidth: 3, borderLeftColor: bd, padding: 14, borderRadius: 10 }}>{typeof children === 'string' ? <P style={{ fontSize: 15 }}>{children}</P> : children}</View>;
}

export function Loading() {
  return <View style={{ padding: 60, alignItems: 'center' }}><Lotus size={40} color={C.gold} spin /></View>;
}
export function ErrorBox({ msg }: { msg: string }) { return <Container style={{ paddingVertical: 40 }}><Notice tone="err">{msg}</Notice></Container>; }

/** Lotus (pethi) mark */
export function Lotus({ size = 28, color = C.gold, spin }: { size?: number; color?: string; spin?: boolean }) {
  return (
    <View style={spin && Platform.OS === 'web' ? ({ animationName: 'idwspin', animationDuration: '2.4s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as any) : undefined}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <G fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
          <Path d="M32 10c6 8 8 16 0 30-8-14-6-22 0-30z" />
          <Path d="M32 40c-4-12-12-18-22-18 2 10 9 18 22 18z" />
          <Path d="M32 40c4-12 12-18 22-18-2 10-9 18-22 18z" />
          <Path d="M32 40c-8-6-18-6-26 0 8 6 18 6 26 0zM32 40c8-6 18-6 26 0-8 6-18 6-26 0z" opacity={0.55} />
          <Path d="M14 50h36" />
        </G>
      </Svg>
    </View>
  );
}

/** Liyawela (Kandyan vine scroll) divider */
export function Liyawela({ width = 240, color = C.gold, style }: { width?: number; color?: string; style?: any }) {
  const h = 24;
  const seg = 48; const n = Math.max(2, Math.round(width / seg));
  let d = `M0 ${h / 2}`;
  for (let i = 0; i < n; i++) {
    const x = i * seg; const up = i % 2 === 0;
    d += ` C ${x + 12} ${up ? 2 : h - 2}, ${x + 36} ${up ? 2 : h - 2}, ${x + seg} ${h / 2}`;
  }
  const curls = Array.from({ length: n }, (_, i) => {
    const x = i * seg + 24; const up = i % 2 === 0; const y = up ? 5 : h - 5;
    return <Path key={i} d={`M${x} ${y} q 6 ${up ? 8 : -8} 0 ${up ? 12 : -12} q -5 ${up ? -3 : 3} -3 ${up ? -7 : 7}`} />;
  });
  return (
    <View style={[{ alignItems: 'center' }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={n * seg} height={h} viewBox={`0 0 ${n * seg} ${h}`}>
        <G fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round">
          <Path d={d} />
          {curls}
          {Array.from({ length: n + 1 }, (_, i) => <Circle key={'c' + i} cx={i * seg} cy={h / 2} r={2} fill={color} />)}
        </G>
      </Svg>
    </View>
  );
}

export function SectionHead({ kicker, title, body, dark, center, right }: { kicker?: string; title: string; body?: string; dark?: boolean; center?: boolean; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      <View style={{ gap: 10, flexShrink: 1, maxWidth: 720, alignItems: center ? 'center' : 'flex-start', alignSelf: center ? 'center' : 'auto' }}>
        {kicker ? <Kicker color={dark ? C.gold : C.lacquer}>{kicker}</Kicker> : null}
        <H2 color={dark ? C.parchment : C.ink} style={center ? { textAlign: 'center' } : null}>{title}</H2>
        {body ? <P color={dark ? '#CDBFA8' : C.stone} style={center ? { textAlign: 'center' } : null}>{body}</P> : null}
      </View>
      {right}
    </View>
  );
}

export const s = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 52, lineHeight: 56, color: C.ink, fontWeight: '600', letterSpacing: -1.2 },
  h2: { fontFamily: F.display, fontSize: 36, lineHeight: 42, color: C.ink, fontWeight: '600', letterSpacing: -0.6 },
  h3: { fontFamily: F.display, fontSize: 21, lineHeight: 27, color: C.ink, fontWeight: '600' },
  kicker: { fontFamily: F.body, fontSize: 12.5, letterSpacing: 2.2, textTransform: 'uppercase', color: C.lacquer, fontWeight: '700' },
  p: { fontFamily: F.body, fontSize: 17, lineHeight: 27, color: C.ink },
  prose: { fontFamily: F.body, fontSize: 17.5, lineHeight: 30, color: C.ink2 },
  small: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: C.stone },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 999, alignSelf: 'flex-start' },
  btnText: { fontFamily: F.body, fontWeight: '700', fontSize: 15.5, letterSpacing: 0.2 },
  card: { backgroundColor: C.paper, borderRadius: R.l, borderWidth: 1, borderColor: C.line, padding: 20, ...shadow },
  cardHover: { transform: [{ translateY: -3 }], borderColor: C.gold },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  chipText: { fontFamily: F.body, fontSize: 13.5, fontWeight: '600', color: C.ink },
  label: { fontFamily: F.body, fontSize: 13, fontWeight: '700', color: C.stone, letterSpacing: 0.4 },
  input: { fontFamily: F.body, fontSize: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.ink },
});
