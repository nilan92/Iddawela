import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../lib/api';
import { C, F } from '../lib/theme';
import { nm, useLang, years } from '../lib/i18n';
import { Avatar, Small, s } from './ui';

export default function PersonPicker({ label, value, onChange, placeholder }: { label?: string; value?: any; onChange: (p: any | null) => void; placeholder?: string }) {
  const { lang, t } = useLang();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const h = setTimeout(() => api(`/api/people?q=${encodeURIComponent(q)}&limit=8`).then(setRes).catch(() => {}), 180);
    return () => clearTimeout(h);
  }, [q]);
  if (value) {
    return (
      <View style={{ gap: 6 }}>
        {label ? <Text style={s.label}>{label}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.gold, backgroundColor: C.white }}>
          <Avatar person={value} size={36} />
          <View style={{ flex: 1 }}><Text style={{ fontFamily: F.display, fontSize: 16 }}>{nm(value, lang)}</Text><Small>{years(value)}</Small></View>
          <Pressable onPress={() => onChange(null)}><Small color={C.lacquer}>{lang === 'si' ? 'වෙනස් කරන්න' : 'Change'}</Small></Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput value={q} onChangeText={setQ} placeholder={placeholder || t('search')} placeholderTextColor={C.mute} style={s.input} />
      {res.length ? (
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.white, overflow: 'hidden' }}>
          {res.map((p) => (
            <Pressable key={p.id} onPress={() => { onChange(p); setQ(''); }} style={({ hovered }: any) => ({ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 9, backgroundColor: hovered ? C.parchment : 'transparent' })}>
              <Avatar person={p} size={30} />
              <View style={{ flex: 1 }}><Text style={{ fontFamily: F.body, fontSize: 15 }}>{nm(p, lang)}</Text><Small>{t('generation')} {p.generation} {years(p) ? '· ' + years(p) : ''}</Small></View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
