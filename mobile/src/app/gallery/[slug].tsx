import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { PhotoGrid } from '../../components/gallery';
import { Btn, Container, Loading, Notice } from '../../components/ui';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';

export default function Album() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang, t } = useLang();
  const { wide } = useLayout();
  const { data, error } = useApi<any>(`/api/albums/${slug}`);
  useTitle(data ? L(data, 'title', lang) : t('gallery'));
  return (
    <Screen>
      <PageHero kicker={t('gallery')} title={data ? L(data, 'title', lang) : '…'} body={data ? L(data, 'description', lang) || undefined : undefined} />
      <Container style={{ paddingVertical: wide ? 48 : 24, gap: 20 }}>
        {error ? <Notice tone="err">{error}</Notice> : !data ? <Loading /> : <PhotoGrid photos={data.photos} />}
        <View style={{ flexDirection: 'row' }}><Btn variant="outline" small label={lang === 'si' ? '← සියලු ඇල්බම' : '← All albums'} href="/gallery" /></View>
      </Container>
    </Screen>
  );
}
