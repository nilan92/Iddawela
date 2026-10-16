import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { Btn, Card, Container, ErrorBox, H3, Kicker, Loading, P, Prose, Small } from '../../components/ui';
import { C } from '../../lib/theme';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { fmtDate, money } from '../../lib/format';

export default function Cause() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { wide } = useLayout();
  const { data: c, error } = useApi<any>(`/api/causes/${slug}`);
  useTitle(c ? L(c, 'title', lang) : t('causes'));
  if (error) return <Screen><ErrorBox msg={error} /></Screen>;
  if (!c) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <PageHero kicker={`${t('causes')} · ${c.status}`} title={L(c, 'title', lang)} body={L(c, 'summary', lang)} />
      <Container style={{ paddingVertical: wide ? 56 : 32, flexDirection: wide ? 'row' : 'column', gap: 32 }}>
        <View style={{ flex: 1.6, gap: 20 }}>
          <Prose text={L(c, 'body', lang)} />
          {c.updates?.length ? (
            <View style={{ gap: 12 }}>
              <Kicker>{t('updates')}</Kicker>
              {c.updates.map((u: any) => <Card key={u.id} style={{ gap: 6 }}><Small>{fmtDate(u.created_at, lang)}</Small><P>{L(u, 'body', lang)}</P></Card>)}
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 16 }}>
          <Card style={{ gap: 10 }}>
            <H3>{t('helpOut')}</H3>
            <P>{L(c, 'how_to_help', lang) || (lang === 'si' ? 'කමිටුව සම්බන්ධ කර ගන්න.' : 'Get in touch with the committee.')}</P>
            {c.goal_amount ? <Small>{money(c.raised_amount || 0, c.currency)} / {money(c.goal_amount, c.currency)}</Small> : null}
            <Btn small label={t('opportunities')} href="/opportunities" />
          </Card>
        </View>
      </Container>
    </Screen>
  );
}
