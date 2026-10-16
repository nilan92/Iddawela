import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, MapPin, Users } from '../../components/icons';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { PhotoGrid } from '../../components/gallery';
import { Btn, Card, Chip, Container, ErrorBox, Field, H3, Kicker, Loading, Notice, P, Prose, Small } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { api } from '../../lib/api';
import { useAuth, isMember } from '../../lib/auth';
import { fmtDate } from '../../lib/format';

export default function EventPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { wide } = useLayout();
  const { data: e, error, setData } = useApi<any>(`/api/events/${slug}`);
  const [f, setF] = useState<any>({ adults: '1', children: '0', response: 'yes', note: '' });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  useTitle(e ? L(e, 'title', lang) : t('events'));
  if (error) return <Screen><ErrorBox msg={error} /></Screen>;
  if (!e) return <Screen><Loading /></Screen>;
  const body = lang === 'si' ? e.body_si || e.body_en : e.body_en;
  const send = async () => {
    setBusy(true); setMsg(null);
    try { const d = await api(`/api/events/${slug}/rsvp`, { body: { adults: Number(f.adults) || 0, children: Number(f.children) || 0, response: f.response, note: f.note } }); setData(d); setMsg(lang === 'si' ? 'ස්තූතියි! ඔබේ පිළිතුර සටහන් විය.' : 'Thank you, your reply is saved.'); }
    catch (x: any) { setMsg(x.message); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <PageHero kicker={e.edition ? `${lang === 'si' ? 'හමුව' : 'Reunion'} #${e.edition}` : t('events')} title={L(e, 'title', lang)}>
        <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
          {e.starts_on ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><CalendarDays size={18} color={C.gold} /><Text style={{ color: C.parchment, fontFamily: F.body, fontSize: 16 }}>{fmtDate(e.starts_on, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text></View> : null}
          {e.venue ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><MapPin size={18} color={C.gold} /><Text style={{ color: C.parchment, fontFamily: F.body, fontSize: 16 }}>{lang === 'si' && e.venue_si ? e.venue_si : e.venue}</Text></View> : null}
          {e.attendance ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Users size={18} color={C.gold} /><Text style={{ color: C.parchment, fontFamily: F.body, fontSize: 16 }}>{e.attendance}</Text></View> : null}
        </View>
      </PageHero>
      <Container style={{ paddingVertical: wide ? 56 : 32, flexDirection: wide ? 'row' : 'column', gap: 32 }}>
        <View style={{ flex: 1.6, gap: 22 }}>
          {e.sponsor ? <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Kicker>{t('sponsor')}</Kicker><Text style={{ fontFamily: F.display, fontSize: 18 }}>{e.sponsor}</Text></Card> : null}
          {lang === 'si' && e.body_si && e.body_si_machine ? <Notice tone="warn">{t('machine')}</Notice> : null}
          {body ? <Prose text={body} /> : <P color={C.stone}>{lang === 'si' ? 'මෙම හමුව පිළිබඳ විස්තර තවම නැත. ඔබ සතුව ඡායාරූප හෝ මතකයන් තිබේද?' : 'No write-up of this reunion yet. Have photos or memories? Sign in and share them.'}</P>}
          {e.album?.photos?.length ? <View style={{ gap: 12 }}><Kicker>{t('photos')} · {e.album.photos.length}</Kicker><PhotoGrid photos={e.album.photos} /></View> : null}
        </View>
        {e.rsvp_open ? (
          <View style={{ flex: 1 }}>
            <Card style={{ gap: 14 }}>
              <H3>{t('rsvp')}</H3>
              <Small>{lang === 'si' ? `මේ වන විට: වැඩිහිටියන් ${e.rsvp_totals?.adults ?? 0}, ළමුන් ${e.rsvp_totals?.children ?? 0}` : `So far: ${e.rsvp_totals?.adults ?? 0} adults, ${e.rsvp_totals?.children ?? 0} children`}</Small>
              {!isMember(user) ? (
                <View style={{ gap: 10 }}><P>{lang === 'si' ? 'පැමිණීම තහවුරු කිරීමට ඇතුළු වන්න.' : 'Sign in to RSVP for your family.'}</P><Btn small label={t('signin')} href="/login" /></View>
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[['yes', lang === 'si' ? 'එනවා' : 'Coming'], ['maybe', lang === 'si' ? 'සමහරවිට' : 'Maybe'], ['no', lang === 'si' ? 'බැහැ' : "Can't come"]].map(([k, l]) => <Chip key={k} label={l} active={f.response === k} onPress={() => setF({ ...f, response: k })} />)}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Field style={{ flex: 1 }} label={lang === 'si' ? 'වැඩිහිටියන්' : 'Adults'} value={f.adults} onChangeText={(v: string) => setF({ ...f, adults: v })} keyboardType="number-pad" />
                    <Field style={{ flex: 1 }} label={lang === 'si' ? 'ළමුන්' : 'Children'} value={f.children} onChangeText={(v: string) => setF({ ...f, children: v })} keyboardType="number-pad" />
                  </View>
                  <Field label={lang === 'si' ? 'සටහනක් (ආහාර, ප්‍රවාහන…)' : 'Note (food, transport…)'} value={f.note} onChangeText={(v: string) => setF({ ...f, note: v })} />
                  <Btn label={e.my_rsvp ? (lang === 'si' ? 'යාවත්කාලීන කරන්න' : 'Update RSVP') : t('send')} onPress={send} loading={busy} />
                  {msg ? <Notice tone="ok">{msg}</Notice> : null}
                </View>
              )}
            </Card>
          </View>
        ) : null}
      </Container>
    </Screen>
  );
}
