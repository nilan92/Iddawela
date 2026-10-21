import React from 'react';
import { Image, Text, View } from 'react-native';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { Card, Container, Loading, Small } from '../../components/ui';
import { mediaUrl } from '../../lib/api';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { useAuth, webmasterName } from '../../lib/auth';
import { C, F } from '../../lib/theme';

export default function Gallery() {
  const { lang, t } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { wide, mid } = useLayout();
  const { data } = useApi<any[]>('/api/albums');
  const wm = webmasterName(useAuth().user, lang);
  useTitle(t('gallery'));
  return (
    <Screen>
      <PageHero kicker={t('gallery')} title={T('A century in photographs', 'ඡායාරූපවලින් සියවසක්')}
        body={wm
          ? T(`Hamuwas, weddings and the old black-and-white portraits, kept since 2008 by webmaster ${wm} and the families who sent them in.`, `හමුව, විවාහ සහ පැරණි කළු-සුදු ඡායාරූප, 2008 සිට වෙබ් පරිපාලක ${wm} සහ පවුල් විසින් සුරැකි ඒවා.`)
          : T('Hamuwas, weddings and the old black-and-white portraits, kept since 2008 by the family’s webmaster and the families who sent them in.', 'හමුව, විවාහ සහ පැරණි කළු-සුදු ඡායාරූප, 2008 සිට පවුලේ වෙබ් පරිපාලක සහ පවුල් විසින් සුරැකි ඒවා.')} />
      <Container style={{ paddingVertical: wide ? 56 : 28 }}>
        {!data ? <Loading /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {data.filter((a) => a.count).map((a) => (
              <Card key={a.id} href={`/gallery/${a.slug}`} style={{ width: wide ? '31.9%' : mid ? '48.5%' : '100%', padding: 0, overflow: 'hidden' }}>
                <View style={{ aspectRatio: 4 / 3, backgroundColor: C.sand }}>
                  {a.cover ? <Image source={{ uri: mediaUrl(a.cover) }} accessibilityLabel={L(a, 'title', lang)} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                </View>
                <View style={{ padding: 16, gap: 4 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 19, color: C.ink, fontWeight: '600' }} numberOfLines={2}>{L(a, 'title', lang)}</Text>
                  <Small>{[a.year, T(`${a.count} photos`, `ඡායාරූප ${a.count}`)].filter(Boolean).join(' · ')}</Small>
                </View>
              </Card>
            ))}
          </View>
        )}
      </Container>
    </Screen>
  );
}
