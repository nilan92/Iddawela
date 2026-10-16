import React from 'react';
import { Text, View } from 'react-native';
import { Briefcase, GraduationCap, HeartHandshake, Landmark } from '../../components/icons';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import { Btn, Card, Container, H3, Loading, P, Small } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { L, useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { money } from '../../lib/format';
const ICON: Record<string, any> = { careers: Briefcase, education: GraduationCap, welfare: HeartHandshake, heritage: Landmark };


export default function Causes() {
  const { t, lang } = useLang();
  const { wide, mid } = useLayout();
  const { data } = useApi<any[]>('/api/causes');
  useTitle(t('causes'));
  return (
    <Screen>
      <PageHero kicker={t('causes')} title={lang === 'si' ? 'පවුල පවුලට, සමාජයට' : 'For the family, and beyond it'}
        body={lang === 'si' ? 'පදනම දැනටමත් පවුල් කිහිපයකට සහ පුද්ගලයින්ට රැකියා සොයාගැනීමට උදව් කර ඇත. මෙන්න අප කරන දේ සහ ඔබට එක්විය හැකි ආකාරය.' : 'The foundation has already helped families and individuals into work. Here is what we do together, and how you can join in.'} />
      <Container style={{ paddingVertical: wide ? 64 : 36 }}>
        {!data ? <Loading /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {data.map((c) => {
              const I = ICON[c.category] || HeartHandshake;
              const pct = c.goal_amount && c.raised_amount ? Math.min(100, (c.raised_amount / c.goal_amount) * 100) : null;
              return (
                <Card key={c.id} href={`/causes/${c.slug}`} style={{ width: wide ? '48.8%' : '100%', gap: 14, padding: 26 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><I size={24} color={C.gold} /></View>
                    <Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', color: c.status === 'active' ? C.paddy : C.brass }}>{c.status}</Text>
                  </View>
                  <H3 style={{ fontSize: 24 }}>{L(c, 'title', lang)}</H3>
                  <P color={C.ink2}>{L(c, 'summary', lang)}</P>
                  {c.impact_number ? <Text style={{ fontFamily: F.display, fontSize: 34, color: C.lacquer }}>{c.impact_number} <Text style={{ fontSize: 15, color: C.stone, fontFamily: F.body }}>{L(c, 'impact_label', lang)}</Text></Text> : null}
                  {pct != null ? (
                    <View style={{ gap: 6 }}>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.sand }}><View style={{ width: `${pct}%` as any, height: 8, borderRadius: 4, backgroundColor: C.gold }} /></View>
                      <Small>{money(c.raised_amount, c.currency)} / {money(c.goal_amount, c.currency)}</Small>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
        <Card dark style={{ marginTop: 28, padding: 28, gap: 12, flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ gap: 6, flex: 1 }}>
            <H3 color={C.parchment} style={{ fontSize: 24 }}>{lang === 'si' ? 'රැකියාවක්, පුහුණුවක් හෝ උපදෙසක් ලබා දිය හැකිද?' : 'Know of a job, an internship, or can you mentor someone?'}</H3>
            <Small color="#B9AC95">{lang === 'si' ? 'අවස්ථා පුවරුවේ පළ කරන්න. පවුලේ සාමාජිකයින්ට පමණි.' : 'Post it on the family opportunities board. Visible to family members only.'}</Small>
          </View>
          <Btn label={t('postOpp')} href="/opportunities" />
        </Card>
      </Container>
    </Screen>
  );
}
