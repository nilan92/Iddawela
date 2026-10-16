import React from 'react';
import { Text, View } from 'react-native';
import { CalendarDays, MapPin, Users } from '../../components/icons';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { Btn, Card, Container, H2, H3, Kicker, Loading, Small, Tap } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';

export default function Events() {
  const { t, lang } = useLang();
  const { wide } = useLayout();
  const { data } = useApi<any[]>('/api/events');
  useTitle(t('events'));
  const upcoming = (data || []).filter((e) => e.upcoming).reverse();
  const past = (data || []).filter((e) => !e.upcoming);
  return (
    <Screen>
      <PageHero kicker={lang === 'si' ? 'ඉද්දවෙල හමුව' : 'Iddawela Hamuwa'} title={lang === 'si' ? 'උත්සව සහ වාර්ෂික හමුවීම්' : 'Every reunion since 1995'}
        body={lang === 'si' ? '1995 කඩුගන්නාවේ සිට, සෑම වසරකම පවුල එක්වේ. ඊළඟ හමුවට ලියාපදිංචි වන්න.' : 'Since 116 relatives first met at Kadugannawa in 1995, the family has gathered almost every year, each time hosted by a different branch.'} />
      <Container style={{ paddingVertical: wide ? 64 : 36, gap: 28 }}>
        {!data ? <Loading /> : null}
        {upcoming.map((e) => (
          <Card key={e.id} dark href={`/events/${e.slug}`} style={{ padding: wide ? 32 : 22, gap: 12 }}>
            <Kicker color={C.gold}>{t('upcoming')}</Kicker>
            <H2 color={C.parchment}>{L(e, 'title', lang)}</H2>
            <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><CalendarDays size={17} color={C.gold} /><Text style={{ color: C.parchment, fontFamily: F.body }}>{fmtDate(e.starts_on, lang)}</Text></View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><MapPin size={17} color={C.gold} /><Text style={{ color: C.parchment, fontFamily: F.body }}>{lang === 'si' && e.venue_si ? e.venue_si : e.venue}</Text></View>
            </View>
            {e.rsvp_open ? <Btn small label={t('rsvp')} href={`/events/${e.slug}`} /> : null}
          </Card>
        ))}
        {past.length ? <H2 style={{ marginTop: 10 }}>{lang === 'si' ? 'පසුගිය හමුවීම්' : 'The reunions so far'}</H2> : null}
        <View style={{ gap: 0 }}>
          {past.map((e) => (
            <Tap key={e.id} href={`/events/${e.slug}`} style={(h) => ({ flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 4, paddingVertical: 16, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: h ? C.paper : 'transparent', borderRadius: 8 })}>
              <Text style={{ fontFamily: F.display, fontSize: 30, color: C.lacquer, width: 90, fontWeight: '600' }}>{e.starts_on ? e.starts_on.slice(0, 4) : '—'}</Text>
              <View style={{ flex: 1, gap: 3 }}>
                <H3 style={{ fontSize: 19 }}>{lang === 'si' ? L(e, 'title', lang) : e.venue || L(e, 'title', lang)}</H3>
                <Small>{[e.edition ? `${e.edition}${['th', 'st', 'nd', 'rd'][(e.edition % 10 > 3 || [11, 12, 13].includes(e.edition % 100)) ? 0 : e.edition % 10]} ${lang === 'si' ? 'හමුව' : 'reunion'}` : null, fmtDate(e.starts_on, lang)].filter(Boolean).join(' · ')}</Small>
              </View>
              <View style={{ width: wide ? 260 : undefined, gap: 3 }}>
                {e.sponsor ? <Small><Text style={{ fontWeight: '700' }}>{t('sponsor')}:</Text> {e.sponsor}</Small> : null}
                {e.attendance ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Users size={14} color={C.stone} /><Small>{e.attendance}</Small></View> : null}
              </View>
            </Tap>
          ))}
        </View>
      </Container>
    </Screen>
  );
}
