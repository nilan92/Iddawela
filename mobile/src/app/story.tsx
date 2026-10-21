import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Screen } from '../components/chrome';
import { Btn, Card, Container, H1, H2, H3, Kicker, Liyawela, Loading, P, Small } from '../components/ui';
import { C, F } from '../lib/theme';
import { L, useLang } from '../lib/i18n';
import { useApi, useLayout, useTitle } from '../lib/hooks';
import { useAuth, isMember, webmasterName } from '../lib/auth';
import { Lock } from '../components/icons';

const TIMELINE: [string, string, string][] = [
  ['1861–1939', 'Ukku Banda Weerakoon, Korale of Bulumulla Walawwa, Kiribathkumbura: father of Lokumenike.', 'කිරිබත්කුඹුරේ බුලුමුල්ලේ වලව්වේ කෝරාළ උක්කු බණ්ඩා වීරකෝන්: ලොකුමැණිකේගේ පියා.'],
  ['1880', 'Ukkubanda Iddawela is born, youngest child of Mudalihami Iddawela.', 'මුදලිහාමි ඉද්දවෙලගේ බාලම දරුවා ලෙස උක්කුබණ්ඩා ඉද්දවෙල උපත ලබයි.'],
  ['14 Oct 1887', 'Mudalihami Iddawela is appointed Korale & Police Headman of Yatinuwara Medapalatha (letter ref. 20886).', 'මුදලිහාමි ඉද්දවෙල යටිනුවර මැදපලාතේ කෝරාළ සහ පොලිස් මුලාදෑනි ලෙස පත් කෙරේ (ලිපි අංක 20886).'],
  ['1906–1932', 'Ukkubanda and Lokumenike raise thirteen children at the Mahagedara, Pilimathalawa.', 'උක්කුබණ්ඩා සහ ලොකුමැණිකේ පිළිමතලාවේ මහගෙදර දරුවන් දහතුන් දෙනෙකු හදා වඩා ගනිති.'],
  ['1932', 'Ukkubanda passes away; the eldest, W.K. Iddawela, becomes a father figure to his siblings.', 'උක්කුබණ්ඩා අභාවප්‍රාප්ත වේ; වැඩිමලා වූ ඩබ්ලිව්.කේ. ඉද්දවෙල සහෝදර සහෝදරියන්ට පිය රුවක් බවට පත්වේ.'],
  ['2 Apr 1995', 'The first annual Iddawela get-together at Kadugannawa: 116 relatives.', 'පළමු වාර්ෂික ඉද්දවෙල හමුව කඩුගන්නාවේදී: ඥාතීන් 116 දෙනෙක්.'],
  ['5 Jul 2008', '{webmaster} registers iddawela.com and builds the family’s first website.', '{webmaster} iddawela.com ලියාපදිංචි කර පවුලේ පළමු වෙබ් අඩවිය නිර්මාණය කරයි.'],
  ['2019', 'The 25th Hamuwa at Nugawela Aluth Walauwa: 135 relatives.', '25 වන හමුව නුගවෙල අලුත් වලව්වේදී: ඥාතීන් 135 දෙනෙක්.'],
  ['2026', 'A new iddawela.com: a living family tree every family can keep up to date.', 'නව iddawela.com: සෑම පවුලකටම යාවත්කාලීන කළ හැකි සජීවී පවුල් ගසක්.'],
];

export default function Story() {
  const { t, lang } = useLang();
  const { wide } = useLayout();
  const { data } = useApi<any[]>('/api/pages');
  const { user } = useAuth();
  // the webmaster is a living relative, so the public sees the role and members see the name
  const wm = webmasterName(user, lang) || (lang === 'si' ? 'පවුලේ වෙබ් පරිපාලක' : 'The family’s webmaster');
  useTitle(t('story'));
  return (
    <Screen>
      <View style={{ backgroundColor: C.ink }}>
        <Container style={{ paddingVertical: wide ? 90 : 52, gap: 18, maxWidth: 1000 }}>
          <Kicker color={C.gold}>{t('storyKicker')}</Kicker>
          <H1 color={C.parchment} style={{ fontSize: wide ? 64 : 40, lineHeight: wide ? 68 : 46 }}>{t('storyTitle')}</H1>
          <P color="#D8CCB6" style={{ fontSize: 19, lineHeight: 31, maxWidth: 760 }}>{t('storyBody')}</P>
        </Container>
      </View>
      <Container style={{ paddingVertical: wide ? 80 : 48 }} narrow>
        {TIMELINE.map(([when, en, si], i) => (
          <View key={i} style={{ flexDirection: 'row', gap: wide ? 28 : 16 }}>
            <View style={{ width: wide ? 140 : 88, alignItems: 'flex-end', paddingTop: 2 }}>
              <Text style={{ fontFamily: F.display, fontSize: wide ? 20 : 15, color: C.lacquer, fontWeight: '600', textAlign: 'right' }}>{when}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i === TIMELINE.length - 1 ? C.gold : C.ink, borderWidth: 3, borderColor: C.gold, marginTop: 6 }} />
              {i < TIMELINE.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: C.line }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 34 }}>
              <P style={{ fontSize: 17.5 }}>{(lang === 'si' ? si : en).replace('{webmaster}', wm)}</P>
            </View>
          </View>
        ))}
      </Container>
      <View style={{ backgroundColor: C.sand, paddingVertical: wide ? 72 : 48 }}>
        <Container>
          <Kicker>{lang === 'si' ? 'ලේඛනාගාරය' : 'From the archive'}</Kicker>
          <H2 style={{ marginTop: 8, marginBottom: 24 }}>{lang === 'si' ? 'කතා සහ ලේඛන' : 'Stories & records'}</H2>
          {!data ? <Loading /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {data.map((pg) => (
                <Card key={pg.slug} href={`/heritage/${pg.slug}`} style={{ width: wide ? '32%' : '100%', gap: 8, minHeight: 120 }}>
                  <Small color={pg.section === 'weerakoon' ? C.paddy : C.lacquer}>{pg.section === 'weerakoon' ? (lang === 'si' ? 'මව් පාර්ශ්වය' : 'Maternal line') : (lang === 'si' ? 'උරුමය' : 'Heritage')}</Small>
                  <H3>{L(pg, 'title', lang)}</H3>
                  {pg.members_only && !isMember(user) ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Lock size={13} color={C.stone} /><Small color={C.stone}>{t('membersOnly')}</Small></View> : null}
                </Card>
              ))}
            </View>
          )}
          <Liyawela width={300} style={{ marginTop: 40 }} color={C.brass} />
        </Container>
      </View>
    </Screen>
  );
}
