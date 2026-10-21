import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { C, F } from '../lib/theme';
import { nm, useLang, years } from '../lib/i18n';
import { Avatar, Small, Tap } from './ui';

export default function PersonChip({ p, note, dark }: { p: any; note?: string; dark?: boolean }) {
  const { lang, t } = useLang();
  if (!p) return null;
  return (
    <Tap href={p.anonymous ? '/login' : `/people/${p.slug}`} style={(hovered) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 14, borderRadius: 999, borderWidth: 1,
        borderColor: hovered ? C.gold : dark ? 'rgba(230,207,143,.25)' : C.line, backgroundColor: dark ? 'rgba(255,255,255,.04)' : C.paper })}>
        <Avatar person={p} size={38} />
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 15.5, color: dark ? C.parchment : C.ink, fontWeight: '600' }}>{nm(p, lang)}</Text>
          <Small numberOfLines={1} color={dark ? '#B9AC95' : C.stone}>{p.anonymous ? t('membersOnly') : [years(p), note].filter(Boolean).join(' · ')}</Small>
        </View>
    </Tap>
  );
}
