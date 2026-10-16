import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { Btn, Container, Loading, Notice, Prose, Small } from '../../components/ui';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { C } from '../../lib/theme';

export default function Post() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang, t } = useLang();
  const { wide } = useLayout();
  const { data, error } = useApi<any>(`/api/posts/${slug}`);
  useTitle(data ? L(data, 'title', lang) : t('news'));
  return (
    <Screen>
      <PageHero kicker={data ? `${t('news')} · ${fmtDate(data.published_on, lang)}` : t('news')} title={data ? L(data, 'title', lang) : '…'} />
      <Container narrow style={{ paddingVertical: wide ? 48 : 24, gap: 18 }}>
        {error ? <Notice tone="err">{error}</Notice> : !data ? <Loading /> : (
          <>
            {lang === 'si' && data.body_si_machine ? <Small color={C.brass}>{lang === 'si' ? 'යන්ත්‍ර පරිවර්තනය · සමාලෝචනය වෙමින්' : ''}</Small> : null}
            <Prose text={L(data, 'body', lang)} />
          </>
        )}
        <View style={{ flexDirection: 'row' }}><Btn variant="outline" small label={lang === 'si' ? '← සියලු පුවත්' : '← All news'} href="/news" /></View>
      </Container>
    </Screen>
  );
}
