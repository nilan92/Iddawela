import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/chrome';
import { Btn, Container, ErrorBox, H1, Kicker, Liyawela, Loading, Notice, Prose } from '../../components/ui';
import { C } from '../../lib/theme';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';

export default function Heritage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { wide } = useLayout();
  const { data: p, error } = useApi<any>(`/api/pages/${slug}`);
  useTitle(p ? L(p, 'title', lang) : t('story'));
  if (error) return <Screen><ErrorBox msg={error} /></Screen>;
  if (!p) return <Screen><Loading /></Screen>;
  const body = lang === 'si' ? p.body_si || p.body_en : p.body_en;
  return (
    <Screen>
      <View style={{ backgroundColor: C.ink }}>
        <Container narrow style={{ paddingVertical: wide ? 72 : 44, gap: 14 }}>
          <Kicker color={C.gold}>{p.section === 'weerakoon' ? (lang === 'si' ? 'මව් පාර්ශ්වය' : 'The maternal line') : t('story')}</Kicker>
          <H1 color={C.parchment} style={{ fontSize: wide ? 50 : 34, lineHeight: wide ? 56 : 40 }}>{L(p, 'title', lang)}</H1>
        </Container>
      </View>
      <Container narrow style={{ paddingVertical: wide ? 60 : 36, gap: 18 }}>
        {lang === 'si' && p.body_si && p.body_si_machine ? <Notice tone="warn">{t('machine')}</Notice> : null}
        {lang === 'si' && !p.body_si ? <Notice>{lang === 'si' ? 'මෙම පිටුවේ සිංහල පරිවර්තනය තවම නැත.' : ''}</Notice> : null}
        <Prose text={body} />
        <Liyawela width={260} color={C.brass} style={{ marginTop: 24 }} />
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          <Btn variant="outline" small label={t('story')} href="/story" />
          <Btn small label={t('tree')} href="/tree" />
        </View>
      </Container>
    </Screen>
  );
}
