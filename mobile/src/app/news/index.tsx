import React from 'react';
import { Image, Text, View } from 'react-native';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { Card, Container, Loading, Notice, P, Small } from '../../components/ui';
import { mediaUrl } from '../../lib/api';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { C, F } from '../../lib/theme';

export default function News() {
  const { lang, t } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { wide } = useLayout();
  const { data } = useApi<any[]>('/api/posts');
  useTitle(t('news'));
  return (
    <Screen>
      <PageHero kicker={t('news')} title={T('From the foundation', 'පදනමෙන්')} body={T('Announcements, achievements, new arrivals and notices from across the family.', 'පවුල පුරා නිවේදන, ජයග්‍රහණ සහ පුවත්.')} />
      <Container narrow style={{ paddingVertical: wide ? 56 : 28, gap: 16 }}>
        {!data ? <Loading /> : !data.length ? <Notice>{T('No news yet.', 'තවම පුවත් නැත.')}</Notice> : data.map((p) => (
          <Card key={p.id} href={`/news/${p.slug}`} style={{ gap: 10, padding: 24 }}>
            {p.cover ? <Image source={{ uri: mediaUrl(p.cover) }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }} /> : null}
            <Small style={{ textTransform: 'uppercase', letterSpacing: 1.6, fontWeight: '700', color: C.lacquer }}>{p.kind} · {fmtDate(p.published_on, lang)}</Small>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.ink, fontWeight: '600' }}>{L(p, 'title', lang)}</Text>
            <P style={{ fontSize: 16 }} numberOfLines={3}>{L(p, 'excerpt', lang)}…</P>
          </Card>
        ))}
      </Container>
    </Screen>
  );
}
