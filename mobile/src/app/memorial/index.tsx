import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import Pahana from '../../components/Pahana';
import { Avatar, Card, Chip, Container, H2, H3, Kicker, Loading, Small, Tap } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { L, nm, useLang, years } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { mediaUrl } from '../../lib/api';

export default function Memorial() {
  const { t, lang } = useLang();
  const { wide, mid } = useLayout();
  const { data: obits } = useApi<any[]>('/api/obituaries');
  const { data: wall } = useApi<any[]>('/api/memorial-wall');
  const [gen, setGen] = useState<number | null>(null);
  useTitle(t('memorial'));
  const gens = useMemo(() => Array.from(new Set((wall || []).map((p) => p.generation))).filter((g) => g != null).sort(), [wall]);
  const shown = (wall || []).filter((p) => gen == null || p.generation === gen);
  return (
    <Screen bg={C.ink}>
      <PageHero kicker={t('memorial')} title={lang === 'si' ? 'අපෙන් සමුගත් අය' : 'Those who went before us'}
        body={lang === 'si' ? 'ඔවුන්ගේ නම්, ඔවුන්ගේ කතා සහ ඔවුන් අපට දුන් දේ. පහනක් දල්වා ඔබේ මතකයන් බෙදාගන්න.' : 'Their names, their stories, and everything they gave us. Light a lamp and leave a memory.'}>
        <Pahana size={56} />
      </PageHero>
      <Container style={{ paddingVertical: wide ? 56 : 32, gap: 34 }}>
        {obits?.length ? (
          <View style={{ gap: 14 }}>
            <Kicker color={C.gold}>{lang === 'si' ? 'සිහිවටන පිටු' : 'Memorial pages'}</Kicker>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {obits.map((o) => (
                <Card key={o.id} dark href={`/memorial/${o.slug}`} style={{ width: wide ? '32%' : '100%', gap: 10, alignItems: 'center', padding: 24 }}>
                  {o.person ? <Avatar person={o.person} size={92} /> : null}
                  <H3 color={C.parchment} style={{ textAlign: 'center' }}>{L(o, 'title', lang)}</H3>
                  <Small color={C.goldSoft}>{years(o.person)}</Small>
                  <Small color="#B9AC95">🪔 {o.lamps} {t('lamps')}</Small>
                </Card>
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ gap: 16 }}>
          <H2 color={C.parchment}>{t('remembering')}</H2>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip label={t('all')} active={gen == null} onPress={() => setGen(null)} />
            {gens.map((g) => <Chip key={g} label={`${t('generation')} ${g}`} active={gen === g} onPress={() => setGen(g)} />)}
          </View>
          {!wall ? <Loading /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {shown.map((p) => (
                <Tap key={p.id} href={`/people/${p.slug}`} style={(h) => ({ width: wide ? '24%' : mid ? '32.4%' : '48.5%', flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 14,
                  borderWidth: 1, borderColor: h ? C.gold : 'rgba(230,207,143,.16)', backgroundColor: 'rgba(255,255,255,.03)' })}>
                  <Avatar person={p} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 15, color: C.parchment }}>{nm(p, lang)}</Text>
                    <Small color={C.goldSoft}>{years(p)}</Small>
                  </View>
                </Tap>
              ))}
            </View>
          )}
        </View>
      </Container>
    </Screen>
  );
}
