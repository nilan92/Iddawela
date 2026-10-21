import React from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GitBranch, Pencil, GraduationCap, Briefcase, Flame, Lock } from '../../components/icons';
import { Screen } from '../../components/chrome';
import { Avatar, Btn, Card, Container, ErrorBox, H1, H2, H3, Kicker, Liyawela, Loading, Notice, P, Prose, Small } from '../../components/ui';
import PersonChip from '../../components/PersonChip';
import { PhotoGrid } from '../../components/gallery';
import { C, F, branchColor } from '../../lib/theme';
import { nm, useLang, years } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { mediaUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import MembersOnlyScreen, { isMembersOnly } from '../../components/MembersOnly';

export default function Person() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { wide } = useLayout();
  const { data: p, error } = useApi<any>(`/api/people/${slug}`);
  useTitle(p ? nm(p, lang) : isMembersOnly(error) ? t('membersOnly') : t('tree'));
  if (isMembersOnly(error)) return <MembersOnlyScreen />;
  if (error) return <Screen><ErrorBox msg={error} /></Screen>;
  if (!p) return <Screen><Loading /></Screen>;
  const bc = branchColor(p.branch_no);
  const bio = lang === 'si' ? p.bio_si || p.bio_en : p.bio_en;
  const machine = lang === 'si' && p.bio_si && p.bio_si_machine;
  const other = lang === 'si' ? p.name_en : p.name_si;
  return (
    <Screen>
      <View style={{ backgroundColor: C.ink, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: bc }} />
        <Container style={{ paddingVertical: wide ? 64 : 40, flexDirection: wide ? 'row' : 'column', gap: wide ? 44 : 24, alignItems: wide ? 'center' : 'flex-start' }}>
          <View style={Platform.OS === 'web' ? ({ animationName: 'idwup', animationDuration: '.8s', animationFillMode: 'both' } as any) : null}>
            {p.photo_large ? (
              <View style={{ width: wide ? 240 : 170, height: wide ? 300 : 210, borderRadius: 120, borderWidth: 3, borderColor: bc, padding: 6 }}>
                <Image source={{ uri: mediaUrl(p.photo_large) }} style={{ width: '100%', height: '100%', borderRadius: 120, backgroundColor: C.ink2 }} accessibilityLabel={p.name_en} />
              </View>
            ) : <Avatar person={p} size={wide ? 180 : 130} />}
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            <Kicker color={C.gold}>{p.branch_no ? `${t('branch')} ${p.branch_no} · ` : ''}{t('generation')} {p.generation ?? '–'}{p.deceased ? (lang === 'si' ? ' · සදා සිහිපත් වේවා' : ' · In memoriam') : ''}</Kicker>
            <H1 color={C.parchment} style={{ fontSize: wide ? 54 : 38, lineHeight: wide ? 60 : 44 }}>{nm(p, lang)}</H1>
            {other ? <Text style={{ fontFamily: lang === 'si' ? F.display : F.sinhalaDisplay, fontSize: 22, color: C.goldSoft }}>{other}</Text> : null}
            {p.known_as && p.known_as !== p.name_en ? <Small color="#B9AC95">{lang === 'si' ? 'හඳුන්වන නම' : 'Known as'}: {p.known_as}</Small> : null}
            <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, fontStyle: 'italic' }}>{[years(p), p.profession, p.hometown].filter(Boolean).join('  ·  ')}</Text>
            {p.lineage?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {[...p.lineage].reverse().map((a: any, i: number) => (
                  <Text key={a.id} style={{ fontFamily: F.body, fontSize: 13.5, color: '#B9AC95' }}>{i ? '›  ' : ''}{nm(a, lang).replace(/^(Wijesundara Mudiyanselage|Bulumulle Weerakoon Mudiyanselage) /, '')}</Text>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Btn label={lang === 'si' ? 'ගසේ බලන්න' : 'See on the tree'} href={`/tree?p=${p.slug}`} icon={<GitBranch size={16} color={C.ink} />} small />
              {p.can_edit ? <Btn variant="light" small label={t('edit')} href={`/me/edit?id=${p.id}`} icon={<Pencil size={15} color={C.parchment} />} /> : null}
              {p.obituary_slug ? <Btn variant="light" small label={t('memorial')} href={`/memorial/${p.obituary_slug}`} icon={<Flame size={15} color={C.gold} />} /> : null}
            </View>
          </View>
        </Container>
      </View>

      <Container style={{ paddingVertical: wide ? 64 : 36, flexDirection: wide ? 'row' : 'column', gap: 36 }}>
        <View style={{ flex: 1.6, gap: 28 }}>
          {p.restricted ? (
            <Card style={{ gap: 12, alignItems: 'flex-start' }}>
              <Lock size={22} color={C.lacquer} />
              <H3>{t('membersOnly')}</H3>
              <P color={C.stone}>{lang === 'si' ? 'ජීවත්ව සිටින පවුලේ සාමාජිකයින්ගේ විස්තර, ඡායාරූප සහ ජීවන කතා පෙනෙන්නේ අනුමත සාමාජිකයින්ට පමණි.' : 'To protect living relatives, their photos, stories and details are shared only with approved family members.'}</P>
              {!user ? <Btn small label={t('signin')} href="/login" /> : null}
            </Card>
          ) : null}
          {bio ? (
            <View style={{ gap: 14 }}>
              <Kicker>{t('biography')}</Kicker>
              {machine ? <Notice tone="warn">{t('machine')}</Notice> : null}
              <Prose text={bio} />
            </View>
          ) : null}
          {(p.education?.length || p.careers?.length) ? (
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18 }}>
              {p.education?.length ? (
                <Card style={{ flex: 1, gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><GraduationCap size={20} color={C.lacquer} /><H3>{t('education')}</H3></View>
                  {p.education.map((e: any) => (
                    <View key={e.id} style={{ borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 12 }}>
                      <Text style={{ fontFamily: F.body, fontWeight: '700', fontSize: 15, color: C.ink }}>{e.qualification || e.institution}</Text>
                      <Small>{[e.qualification ? e.institution : null, e.field, e.year_to || e.year_from].filter(Boolean).join(' · ')}</Small>
                    </View>
                  ))}
                </Card>
              ) : null}
              {p.careers?.length ? (
                <Card style={{ flex: 1, gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Briefcase size={20} color={C.lacquer} /><H3>{t('career')}</H3></View>
                  {p.careers.map((c: any) => (
                    <View key={c.id} style={{ borderLeftWidth: 2, borderLeftColor: C.paddy, paddingLeft: 12 }}>
                      <Text style={{ fontFamily: F.body, fontWeight: '700', fontSize: 15, color: C.ink }}>{c.title}</Text>
                      <Small>{[c.organization, c.year_from ? `${c.year_from}${c.current ? '–now' : c.year_to ? '–' + c.year_to : ''}` : null].filter(Boolean).join(' · ')}</Small>
                    </View>
                  ))}
                </Card>
              ) : null}
            </View>
          ) : null}
          {p.photos?.length ? (
            <View style={{ gap: 14 }}>
              <Kicker>{t('photos')} · {p.photos.length}</Kicker>
              <PhotoGrid photos={p.photos} cols={wide ? 4 : 3} />
            </View>
          ) : null}
          {(p.email || p.phone || p.residence) ? (
            <Card style={{ gap: 6 }}>
              <Kicker>{lang === 'si' ? 'සම්බන්ධතා (සාමාජිකයින්ට පමණි)' : 'Contact (members only)'}</Kicker>
              {p.residence ? <P>{p.residence}</P> : null}
              {p.email ? <P selectable>{p.email}</P> : null}
              {p.phone ? <P selectable>{p.phone}</P> : null}
            </Card>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 22 }}>
          {p.spouses?.length ? <View style={{ gap: 10 }}><Kicker>{t('spouse')}</Kicker>{p.spouses.map((s: any) => <PersonChip key={s.marriage_id} p={s.person} note={s.year ? `${lang === 'si' ? 'විවාහය' : 'married'} ${s.year}` : s.place || undefined} />)}</View> : null}
          {p.parents?.length ? <View style={{ gap: 10 }}><Kicker>{t('parents')}</Kicker>{p.parents.map((x: any) => <PersonChip key={x.id} p={x} />)}</View> : null}
          {p.siblings?.length ? <View style={{ gap: 10 }}><Kicker>{t('siblings')} · {p.siblings.length}</Kicker>{p.siblings.map((x: any) => <PersonChip key={x.id} p={x} />)}</View> : null}
          {p.children?.length ? <View style={{ gap: 10 }}><Kicker>{t('children')} · {p.children.length}</Kicker>{p.children.map((x: any) => <PersonChip key={x.id} p={x} />)}</View> : null}
          <Liyawela width={240} color={C.brass} style={{ alignItems: 'flex-start' }} />
          <Small>{lang === 'si' ? 'වැරැද්දක් හෝ එකතු කළ යුතු දෙයක් තිබේද? ඇතුළු වී යෝජනා කරන්න; පරිපාලකයෙකු එය සමාලෝචනය කරයි.' : 'Spotted a mistake or something missing? Sign in and suggest a change; a family admin reviews every edit.'}</Small>
        </View>
      </Container>
    </Screen>
  );
}
