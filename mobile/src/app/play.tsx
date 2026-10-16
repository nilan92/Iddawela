import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../components/chrome';
import Pahana from '../components/Pahana';
import { Avatar, Btn, Container, H1, Kicker, Liyawela, P, Small } from '../components/ui';
import { nm, useLang } from '../lib/i18n';
import { useApi, useLayout, useTitle } from '../lib/hooks';
import { C, F, branchColor } from '../lib/theme';

/** Hidden: "Light the thirteen lamps". Reached by tapping the footer lotus seven times, or typing "pahana" anywhere. */
export default function Play() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { wide } = useLayout();
  const { data } = useApi<any>('/api/home');
  const kids = useMemo(() => (data?.thirteen || []).slice().sort((a: any, b: any) => (a.birth_year || 0) - (b.birth_year || 0)), [data]);
  const [deck, setDeck] = useState<any[]>([]);
  const [lit, setLit] = useState(0); const [miss, setMiss] = useState<number | null>(null); const [mistakes, setMistakes] = useState(0);
  const [t0, setT0] = useState<number>(0); const [t1, setT1] = useState<number | null>(null);
  const best = useRef<number | null>(null);
  useTitle(T('The thirteen lamps', 'පහන් දහතුන'));
  const shuffle = () => { setDeck(kids.slice().sort(() => Math.random() - 0.5)); setLit(0); setMistakes(0); setT0(Date.now()); setT1(null); };
  useEffect(() => { if (kids.length) shuffle(); }, [kids.length]);
  useEffect(() => { try { const b = localStorage.getItem('idw_best'); best.current = b ? +b : null; } catch {} }, []);
  const tap = (p: any) => {
    if (t1 || !kids[lit]) return;
    if (p.id === kids[lit].id) {
      const n = lit + 1; setLit(n); setDeck((d) => d.filter((x) => x.id !== p.id));
      if (n === kids.length) { const secs = Math.round((Date.now() - t0) / 1000); setT1(secs); try { if (!best.current || secs < best.current) { best.current = secs; localStorage.setItem('idw_best', String(secs)); } } catch {} }
    } else { setMiss(p.id); setMistakes((m) => m + 1); setTimeout(() => setMiss(null), 450); }
  };
  const done = !!t1;
  return (
    <Screen bg={C.ink}>
      <Container style={{ paddingVertical: wide ? 64 : 32, gap: 22, alignItems: 'center' }}>
        <Kicker color={C.gold}>{T('You found the hidden room', 'ඔබ සැඟවුණු කාමරය සොයා ගත්තා')}</Kicker>
        <H1 color={C.parchment} style={{ textAlign: 'center', fontSize: wide ? 52 : 36, lineHeight: wide ? 58 : 42 }}>{T('Light the thirteen lamps', 'පහන් දහතුන දල්වන්න')}</H1>
        <P color="#D8CCB6" style={{ textAlign: 'center', maxWidth: 620 }}>{T('Ukkubanda and Lokumenike had thirteen children between 1906 and 1932. Tap them from eldest to youngest, and light a lamp for each.',
          'උක්කුබණ්ඩා සහ ලොකුමැණිකේට 1906 සිට 1932 දක්වා දරුවන් දහතුන් දෙනෙක් සිටියහ. වැඩිමලාගේ සිට බාලයා දක්වා තට්ටු කර එක් එක් අය වෙනුවෙන් පහනක් දල්වන්න.')}</P>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: wide ? 10 : 4, maxWidth: 860 }}>
          {kids.map((k: any, i: number) => (
            <View key={k.id} style={{ alignItems: 'center', width: wide ? 50 : 40, gap: 2 }}>
              <Pahana size={wide ? 40 : 32} lit={i < lit} />
              <Text style={{ fontFamily: F.body, fontSize: 10, color: i < lit ? C.goldSoft : 'rgba(230,207,143,.3)' }}>{i < lit ? k.birth_year : i + 1}</Text>
            </View>
          ))}
        </View>
        <Liyawela width={240} />
        {done ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <H1 color={C.gold} style={{ fontSize: 34, textAlign: 'center' }}>{T('All thirteen are lit.', 'පහන් දහතුනම දැල්වුණා.')}</H1>
            <P color={C.parchment} style={{ textAlign: 'center' }}>{T(`${t1}s, ${mistakes} slip${mistakes === 1 ? '' : 's'}.`, `තත්පර ${t1}, වැරදි ${mistakes}.`)}{best.current ? T(` Your best: ${best.current}s.`, ` හොඳම: තත්පර ${best.current}.`) : ''}</P>
            <P color="#B9AC95" style={{ textAlign: 'center', maxWidth: 560, fontStyle: 'italic' }}>{T('“May the lamp of the family never go out.” Bring this score to the next Hamuwa.', '“පවුලේ පහන කිසිදා නිවී නොයේවා.” මෙම ලකුණු ඊළඟ හමුවට ගෙනෙන්න.')}</P>
            <Btn label={T('Play again', 'නැවත')} onPress={shuffle} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 980 }}>
            {deck.map((p) => (
              <Pressable key={p.id} onPress={() => tap(p)} accessibilityRole="button" accessibilityLabel={nm(p, lang)}
                style={({ hovered }: any) => ({ width: wide ? 172 : 150, alignItems: 'center', gap: 8, padding: 14, borderRadius: 18, borderWidth: 1.5,
                  borderColor: miss === p.id ? C.lacquer : hovered ? C.gold : 'rgba(230,207,143,.22)', backgroundColor: miss === p.id ? 'rgba(143,29,29,.35)' : C.ink2,
                  transform: [{ translateY: hovered ? -3 : 0 }] })}>
                <Avatar person={p} size={64} />
                <Text style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: 'center' }} numberOfLines={2}>{p.known_as && p.known_as.length < 22 ? p.known_as : nm(p, lang)}</Text>
                <View style={{ width: 22, height: 3, borderRadius: 2, backgroundColor: branchColor(p.branch_no) }} />
              </Pressable>
            ))}
          </View>
        )}
        <Small color="#8E8270">{T(`Lamps lit: ${lit} / ${kids.length || 13}`, `දැල්වූ පහන්: ${lit} / ${kids.length || 13}`)}</Small>
      </Container>
    </Screen>
  );
}
