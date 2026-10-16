import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '../components/chrome';
import PageHero from '../components/PageHero';
import { Btn, Card, Container, Lotus, P, Small } from '../components/ui';
import { Send, Sparkles } from '../components/icons';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { useLayout, useTitle } from '../lib/hooks';
import { C, F } from '../lib/theme';

type Msg = { q: string; a?: string; sources?: { title: string; url: string }[]; mode?: string; err?: string };

export default function Ask() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { wide } = useLayout();
  const [q, setQ] = useState(''); const [log, setLog] = useState<Msg[]>([]); const [busy, setBusy] = useState(false);
  useTitle(T('Ask the archive', 'ලේඛනාගාරයෙන් අසන්න'));
  const SAMPLES = lang === 'si'
    ? ['1887 දී මුදලිහාමි ඉද්දවෙල පත් කළේ කුමන තනතුරටද?', 'ඉද්දවෙල මහගෙදර කොහෙද?', 'දහතුන් දෙනාගෙන් වැඩිමලා කවුද?']
    : ['What was Mudalihami appointed to in 1887?', 'Where is the Iddawela Mahagedara?', 'Who was the eldest of the thirteen?', 'When did the Hamuwa start?'];
  const ask = async (text?: string) => {
    const question = (text ?? q).trim(); if (!question || busy) return;
    setQ(''); setBusy(true); setLog((l) => [...l, { q: question }]);
    try { const r = await api('/api/ask', { body: { question, lang } }); setLog((l) => l.map((m, i) => (i === l.length - 1 ? { ...m, a: r.answer, sources: r.sources, mode: r.mode } : m))); }
    catch (e: any) { setLog((l) => l.map((m, i) => (i === l.length - 1 ? { ...m, err: e.message } : m))); }
    setBusy(false);
  };
  return (
    <Screen>
      <PageHero kicker={T('Ask the archive', 'ලේඛනාගාරයෙන් අසන්න')} title={T('A question for the elders', 'වැඩිහිටියන්ගෙන් ප්‍රශ්නයක්')}
        body={T('Ask anything about the family’s history. Answers come only from the foundation’s own pages, with the sources shown, and members-only stories stay members-only.', 'පවුලේ ඉතිහාසය ගැන ඕනෑම දෙයක් අසන්න. පිළිතුරු ලැබෙන්නේ පදනමේ පිටුවලින් පමණි.')} />
      <Container narrow style={{ paddingVertical: wide ? 48 : 28, gap: 16 }}>
        {!log.length ? (
          <View style={{ gap: 10 }}>
            <Small>{T('Try:', 'උත්සාහ කරන්න:')}</Small>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SAMPLES.map((s) => (
                <Pressable key={s} onPress={() => ask(s)} style={({ hovered }: any) => ({ borderWidth: 1, borderColor: hovered ? C.ink : C.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: C.paper })}>
                  <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.ink }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {log.map((m, i) => (
          <View key={i} style={{ gap: 10 }}>
            <View style={{ alignSelf: 'flex-end', backgroundColor: C.ink, borderRadius: 18, borderBottomRightRadius: 4, paddingVertical: 10, paddingHorizontal: 16, maxWidth: '85%' }}>
              <Text style={{ fontFamily: F.body, color: C.parchment, fontSize: 16 }}>{m.q}</Text>
            </View>
            <Card style={{ gap: 10, padding: 18, maxWidth: '92%' }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Lotus size={20} spin={!m.a && !m.err} /><Small style={{ fontWeight: '700', color: C.brass }}>{T('The archive', 'ලේඛනාගාරය')}</Small></View>
              {m.err ? <P color={C.lacquer}>{m.err}</P> : m.a ? <P style={{ fontSize: 16.5, lineHeight: 27 }} selectable>{m.a}</P> : <Small>{T('Reading the old pages…', 'පැරණි පිටු කියවමින්…')}</Small>}
              {m.sources?.length ? (
                <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
                  <Small style={{ fontWeight: '700' }}>{T('Sources', 'මූලාශ්‍ර')}</Small>
                  {m.sources.map((s, j) => <Link key={j} href={s.url as any} asChild><Pressable><Small color={C.lacquer}>[{j + 1}] {s.title}</Small></Pressable></Link>)}
                </View>
              ) : null}
            </Card>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.paper, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 8, paddingLeft: 16 }}>
          <Sparkles size={18} color={C.brass} />
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => ask()} placeholder={T('Ask about an ancestor, a place, a year…', 'මුතුන්මිත්තෙකු, ස්ථානයක්, වර්ෂයක් ගැන අසන්න…')} placeholderTextColor={C.mute}
            style={{ flex: 1, fontFamily: F.body, fontSize: 16, paddingVertical: 10, color: C.ink, outlineStyle: 'none' } as any} />
          <Btn small label={T('Ask', 'අසන්න')} onPress={() => ask()} loading={busy} disabled={!q.trim()} icon={<Send size={15} color={C.ink} />} />
        </View>
      </Container>
    </Screen>
  );
}
