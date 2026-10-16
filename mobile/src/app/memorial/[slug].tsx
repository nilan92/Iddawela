import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/chrome';
import Pahana from '../../components/Pahana';
import { Avatar, Btn, Card, Container, ErrorBox, Field, H1, H3, Kicker, Loading, Notice, P, Prose, Small } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { L, nm, useLang, years } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { api, mediaUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate } from '../../lib/format';

export default function Obituary() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { wide } = useLayout();
  const { data: o, error, reload } = useApi<any>(`/api/obituaries/${slug}`);
  const [name, setName] = useState(''); const [msg, setMsg] = useState(''); const [note, setNote] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useTitle(o ? L(o, 'title', lang) : t('memorial'));
  if (error) return <Screen><ErrorBox msg={error} /></Screen>;
  if (!o) return <Screen><Loading /></Screen>;
  const send = async () => {
    setBusy(true); setNote(null);
    try { const r = await api(`/api/obituaries/${slug}/condolences`, { body: { name, message: msg, lit_lamp: true } }); setMsg(''); setNote(r.status === 'pending' ? (lang === 'si' ? 'ස්තූතියි. පරිපාලකයෙකු අනුමත කළ පසු පෙන්වනු ඇත.' : 'Thank you. It will appear once a family admin approves it.') : (lang === 'si' ? 'ස්තූතියි. ඔබේ පහන දැල්වේ.' : 'Thank you. Your lamp is lit.')); reload(); }
    catch (x: any) { setNote(x.message); } finally { setBusy(false); }
  };
  return (
    <Screen bg={C.ink}>
      <Container narrow style={{ paddingVertical: wide ? 72 : 40, alignItems: 'center', gap: 16 }}>
        {o.photo ? <Image source={{ uri: mediaUrl(o.photo) }} style={{ width: 200, height: 250, borderRadius: 100, borderWidth: 3, borderColor: C.gold }} accessibilityLabel={o.title_en} /> : o.person ? <Avatar person={o.person} size={150} /> : null}
        <Kicker color={C.gold}>{lang === 'si' ? 'ආදරණීය සිහිවටනය' : 'In loving memory'}</Kicker>
        <H1 color={C.parchment} style={{ textAlign: 'center', fontSize: wide ? 48 : 34, lineHeight: wide ? 54 : 40 }}>{o.person ? nm(o.person, lang) : L(o, 'title', lang)}</H1>
        <Text style={{ fontFamily: F.display, fontStyle: 'italic', color: C.goldSoft, fontSize: 22 }}>{years(o.person)}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Pahana size={34} /><Small color="#CDBFA8">{o.lamps} {t('lamps')}</Small></View>
      </Container>
      <View style={{ backgroundColor: C.parchment }}>
        <Container narrow style={{ paddingVertical: wide ? 56 : 32, gap: 22 }}>
          <Prose text={L(o, 'body', lang)} />
          {o.funeral_details ? <Card style={{ gap: 6 }}><Kicker>{lang === 'si' ? 'අවමංගල්‍ය විස්තර' : 'Funeral details'}</Kicker><P>{o.funeral_details}</P></Card> : null}
          <H3 style={{ marginTop: 10 }}>{t('condolences')}</H3>
          <Card style={{ gap: 12 }}>
            {!user ? <Field label={t('yourName')} value={name} onChangeText={setName} /> : null}
            <Field label={t('writeCondolence')} value={msg} onChangeText={setMsg} multiline />
            <Btn label={t('lightLamp')} onPress={send} loading={busy} icon={<Pahana size={22} />} />
            {note ? <Notice tone="ok">{note}</Notice> : null}
          </Card>
          {o.condolences?.map((c: any) => (
            <View key={c.id} style={{ borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 14, gap: 4 }}>
              <P>{c.message}</P>
              <Small>— {c.name} · {fmtDate(c.created_at, lang)}</Small>
            </View>
          ))}
        </Container>
      </View>
    </Screen>
  );
}
