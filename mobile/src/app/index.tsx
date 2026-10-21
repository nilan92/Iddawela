import React, { useState } from 'react';
import { Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { ArrowRight, CalendarDays, Sparkles, Briefcase, GraduationCap, HeartHandshake, Landmark, Search } from '../components/icons';
import { Screen } from '../components/chrome';
import { Tap, Avatar, Btn, Card, Container, H1, H2, H3, Kicker, Liyawela, Loading, Lotus, P, SectionHead, Small } from '../components/ui';
import LotusOfThirteen from '../components/LotusOfThirteen';
import { C, F, branchColor } from '../lib/theme';
import { L, nm, useLang, years } from '../lib/i18n';
import { useApi, useLayout, useTitle } from '../lib/hooks';
import { mediaUrl } from '../lib/api';
import { useAuth } from '../lib/auth';

const CAUSE_ICON: Record<string, any> = { careers: Briefcase, education: GraduationCap, welfare: HeartHandshake, heritage: Landmark };

function fmtDate(d?: string, lang = 'en') {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString(lang === 'si' ? 'si-LK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Home() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { wide, mid, width } = useLayout();
  const { data } = useApi<any>('/api/home');
  const [q, setQ] = useState('');
  useTitle(t('org'));
  const stats = data?.stats;
  const heroSize = wide ? Math.min(520, width * 0.4) : Math.min(380, width - 40);
  const up = Platform.OS === 'web' ? ({ animationName: 'idwup', animationDuration: '1s', animationFillMode: 'both' } as any) : null;
  return (
    <Screen>
      {/* HERO */}
      <View style={{ backgroundColor: C.ink, overflow: 'hidden' }}>
        <Text aria-hidden style={{ position: 'absolute', right: -40, bottom: -70, fontFamily: F.sinhalaDisplay, fontSize: wide ? 300 : 150, color: 'transparent', opacity: 0.09,
          ...(Platform.OS === 'web' ? ({ WebkitTextStroke: `1.5px ${C.gold}` } as any) : { color: 'rgba(201,162,74,.08)' }) }} selectable={false}>ඉද්දවෙල</Text>
        <Container style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 40 : 10, paddingTop: wide ? 72 : 40, paddingBottom: wide ? 88 : 56 }}>
          <View style={[{ flex: wide ? 1.15 : undefined, gap: 22 }, up]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 28, height: 1.5, backgroundColor: C.gold }} />
              <Kicker color={C.gold}>{t('heroKicker')}</Kicker>
            </View>
            <H1 color={C.parchment} style={{ fontSize: wide ? 72 : mid ? 54 : 42, lineHeight: wide ? 76 : mid ? 58 : 47, letterSpacing: wide ? -2 : -1 }}>{t('heroTitle')}</H1>
            <P color="#D8CCB6" style={{ fontSize: wide ? 19 : 17, lineHeight: wide ? 31 : 27, maxWidth: 560 }}>{t('heroBody')}</P>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              <Btn label={t('exploreTree')} href="/tree" icon={<ArrowRight size={18} color={C.ink} />} />
              {user ? <Btn variant="light" label={t('me')} href="/me" /> : <Btn variant="light" label={t('join')} href="/join" />}
            </View>
          </View>
          <View style={{ flex: wide ? 1 : undefined, alignItems: 'center' }}>
            {data ? <LotusOfThirteen size={heroSize} branches={data.thirteen} /> : <View style={{ width: heroSize, height: heroSize }} />}
            <Small color="#9C8F7B" style={{ marginTop: -6, textAlign: 'center' }}>{lang === 'si' ? 'ශාඛා දහතුන: පෙත්තක දිග = පරම්පරාවේ ප්‍රමාණය' : 'Thirteen branches · each petal grows with its descendants'}</Small>
          </View>
        </Container>
        {/* stats */}
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(201,162,74,.2)', backgroundColor: 'rgba(0,0,0,.18)' }}>
          <Container style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 26, rowGap: 22 }}>
            {[[stats?.since ?? 1887, 'statSince'], [13, 'statBranches'], [stats?.generations ?? 6, 'statGenerations'], [stats?.people ?? '370+', 'statPeople'],
              [stats?.reunions ? stats.reunions - 1 : 26, 'statReunions'], [stats?.photos ?? 955, 'statPhotos']].map(([n, k]) => (
              <View key={k as string} style={{ width: wide ? undefined : '33%', minWidth: 96, gap: 2 }}>
                <Text style={{ fontFamily: F.display, fontSize: wide ? 40 : 30, color: C.gold, fontWeight: '600' }}>{String(n)}</Text>
                <Small color="#B9AC95">{t(k as string)}</Small>
              </View>
            ))}
          </Container>
        </View>
      </View>

      {/* STORY TEASER */}
      <Container style={{ paddingVertical: wide ? 96 : 60 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 64 : 32, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 18 }}>
            <Kicker>{t('storyKicker')}</Kicker>
            <H2 style={{ fontSize: wide ? 44 : 32, lineHeight: wide ? 50 : 38 }}>{t('storyTitle')}</H2>
            <P color={C.ink2} style={{ fontSize: 18, lineHeight: 30 }}>{t('storyBody')}</P>
            <Liyawela width={220} style={{ alignItems: 'flex-start', marginVertical: 4 }} color={C.brass} />
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <Btn variant="dark" label={t('readStory')} href="/story" />
              <Btn variant="ghost" label={t('thirteen')} href="/heritage/the-13-iddawelas" />
            </View>
          </View>
          <View style={{ flex: 1, width: '100%' }}>
            {data?.heritage_photos?.length ? (
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Link href="/heritage/mahagedara-and-the-korale-of-1887" asChild>
                  <Pressable style={{ flex: 1.1, transform: [{ rotate: '-2deg' }] }}>
                    <View style={{ backgroundColor: C.paper, padding: 10, paddingBottom: 34, borderRadius: 6, borderWidth: 1, borderColor: C.line, ...(Platform.OS === 'web' ? ({ boxShadow: '0 20px 50px -20px rgba(0,0,0,.45)' } as any) : {}) }}>
                      <Image source={{ uri: mediaUrl(data.heritage_photos[0].src) }} accessibilityLabel="Appointment letter of Mudalihami Iddawela as Korale, 1887" style={{ width: '100%', aspectRatio: 0.75, borderRadius: 2, backgroundColor: C.sand }} resizeMode="cover" />
                      <Text style={{ position: 'absolute', bottom: 9, left: 12, fontFamily: F.display, fontStyle: 'italic', color: C.stone, fontSize: 14 }}>14 October 1887</Text>
                    </View>
                  </Pressable>
                </Link>
                <View style={{ flex: 1, gap: 14, paddingTop: 40 }}>
                  {data.heritage_photos.slice(1, 3).map((ph: any, i: number) => (
                    <View key={ph.id} style={{ backgroundColor: C.paper, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: C.line, transform: [{ rotate: i ? '1.5deg' : '2.5deg' }] }}>
                      <Image source={{ uri: mediaUrl(ph.thumb) }} accessibilityLabel={ph.caption || 'Heritage photograph'} style={{ width: '100%', aspectRatio: 1.3, backgroundColor: C.sand }} />
                    </View>
                  ))}
                </View>
              </View>
            ) : <Loading />}
          </View>
        </View>
      </Container>

      {/* THE 13 */}
      <View style={{ backgroundColor: C.sand, paddingVertical: wide ? 88 : 56 }}>
        <Container>
          <SectionHead kicker="1906 – 2015" title={t('thirteen')} body={t('thirteenBody')} right={<Btn variant="outline" label={t('tree')} href="/tree" small />} />
          {!data ? <Loading /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {data.thirteen.map((p: any) => {
                const bc = branchColor(p.branch_no);
                return (
                  <Card key={p.id} href={p.anonymous ? '/login' : `/people/${p.slug}`} style={{ width: wide ? '23.6%' : mid ? '48.5%' : '100%', padding: 16, borderTopWidth: 4, borderTopColor: bc }}>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <Avatar person={p} size={58} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: F.display, color: bc, fontSize: 13, fontWeight: '700' }}>{p.branch_no < 10 ? '0' : ''}{p.branch_no}</Text>
                        <H3 numberOfLines={1} style={{ fontSize: 19 }}>{nm(p, lang)}</H3>
                        <Small numberOfLines={1}>{p.anonymous ? t('membersOnly') : `${years(p)}${p.spouse?.[0] && !p.spouse[0].anonymous ? ` · m. ${nm(p.spouse[0], lang)}` : ''}`}</Small>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                      <Small color={C.stone}>{p.descendants} {lang === 'si' ? 'පරම්පරාවේ' : 'descendants'}</Small>
                      <ArrowRight size={16} color={bc} />
                    </View>
                  </Card>
                );
              })}
              <Card href="/tree" dark style={{ width: wide ? '23.6%' : mid ? '48.5%' : '100%', padding: 16, justifyContent: 'center', gap: 6 }}>
                <Lotus size={30} />
                <H3 color={C.parchment}>{t('findYourself')}</H3>
                <Small color="#B9AC95">{lang === 'si' ? 'නමක් ටයිප් කර ඥාතිත්වය සොයන්න' : 'Search any name and trace how you are related'}</Small>
              </Card>
            </View>
          )}
        </Container>
      </View>

      {/* EVENTS + REMEMBERING */}
      <Container style={{ paddingVertical: wide ? 88 : 56 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 28 }}>
          <View style={{ flex: 1.2, gap: 16 }}>
            <Kicker>{t('upcoming')}</Kicker>
            {data?.upcoming?.map((e: any) => (
              <Card key={e.id} href={`/events/${e.slug}`} dark style={{ padding: 26, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <CalendarDays size={20} color={C.gold} />
                  <Text style={{ fontFamily: F.body, color: C.gold, fontWeight: '700', letterSpacing: 1 }}>{fmtDate(e.starts_on, lang)}</Text>
                </View>
                <H2 color={C.parchment} style={{ fontSize: 32 }}>{L(e, 'title', lang)}</H2>
                <P color="#CDBFA8">{lang === 'si' ? 'වසරේ අවසන් සෙනසුරාදා: ඉද්දවෙල දහතුන් දෙනාගේ පරම්පරාව එක්වන දිනය.' : 'The last Saturday of the year, when the descendants of the 13 Iddawelas come home to each other.'} {e.venue}</P>
                {e.rsvp_open ? <Btn label={t('rsvp')} href={`/events/${e.slug}`} small /> : null}
              </Card>
            ))}
            {data?.recent_events?.length ? (
              <View style={{ gap: 10, marginTop: 6 }}>
                {data.recent_events.map((e: any) => (
                  <Link key={e.id} href={`/events/${e.slug}` as any} asChild>
                    <Pressable style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10, gap: 12 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink, flex: 1 }} numberOfLines={1}>{L(e, 'title', lang)}</Text>
                      <Small numberOfLines={1} style={{ maxWidth: '45%' }}>{e.venue}</Small>
                    </Pressable>
                  </Link>
                ))}
                <Btn variant="ghost" small label={t('viewAll')} href="/events" />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, gap: 16 }}>
            <Kicker>{t('onThisDay')}</Kicker>
            <Card style={{ gap: 4, padding: 8 }}>
              {(data?.onthisday?.today || []).concat(data?.onthisday?.this_year || []).slice(0, 7).map((x: any, i: number) => (
                <Tap key={i} href={x.person.anonymous ? '/login' : `/people/${x.person.slug}`} style={(hovered) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: hovered ? C.parchment : 'transparent' })}>
                    <Avatar person={x.person} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 17, color: C.ink }} numberOfLines={1}>{nm(x.person, lang)}</Text>
                      <Small>{x.kind.startsWith('birth') || x.kind === 'born'
                        ? (lang === 'si' ? `උපතින් වසර ${x.years}` : `${x.years} years since birth (${x.person.birth_year})`)
                        : (lang === 'si' ? `අභාවයෙන් වසර ${x.years}` : `${x.years} years since passing (${x.person.death_year})`)}</Small>
                    </View>
                    <Sparkles size={16} color={C.gold} />
                </Tap>
              ))}
            </Card>
          </View>
        </View>
      </Container>

      {/* CAUSES */}
      <View style={{ backgroundColor: C.ink, paddingVertical: wide ? 88 : 56 }}>
        <Container>
          <SectionHead dark kicker={t('causes')} title={lang === 'si' ? 'අපි එකිනෙකා ඔසවා තබමු' : 'We lift each other up'}
            body={lang === 'si' ? 'පදනම පවුල් කිහිපයකට සහ පුද්ගලයින්ට රැකියා සොයා ගැනීමට උදව් කර ඇත. ඊළඟ පියවර: විධිමත් උපදේශනය, අධ්‍යාපන සහාය සහ සුබසාධනය.'
              : 'The foundation has already helped families and individuals find work. Next: open mentoring, education support and welfare, all run by the family, for the family.'}
            right={<Btn variant="light" small label={t('viewAll')} href="/causes" />} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {(data?.causes || []).map((c: any) => {
              const Icon = CAUSE_ICON[c.category] || HeartHandshake;
              return (
                <Card key={c.id} dark href={`/causes/${c.slug}`} style={{ width: wide ? '23.8%' : mid ? '48.5%' : '100%', gap: 12, minHeight: 210 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(201,162,74,.14)', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color={C.gold} /></View>
                  <H3 color={C.parchment}>{L(c, 'title', lang)}</H3>
                  <Small color="#B9AC95" numberOfLines={4}>{L(c, 'summary', lang)}</Small>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: c.status === 'active' ? C.leaf : C.goldSoft, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 'auto' as any }}>{c.status}</Text>
                </Card>
              );
            })}
          </View>
        </Container>
      </View>

      {/* ASK */}
      <Container style={{ paddingVertical: wide ? 88 : 56 }} narrow>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Sparkles size={26} color={C.lacquer} />
          <H2 style={{ textAlign: 'center' }}>{t('askTitle')}</H2>
          <P color={C.stone} style={{ textAlign: 'center' }}>{t('askBody')}</P>
          <View style={{ flexDirection: 'row', width: '100%', maxWidth: 620, backgroundColor: C.white, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingLeft: 20, paddingRight: 6, paddingVertical: 6, alignItems: 'center', marginTop: 8 }}>
            <Search size={18} color={C.stone} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('askPlaceholder')} placeholderTextColor={C.mute} onSubmitEditing={() => router.push(`/ask?q=${encodeURIComponent(q)}` as any)}
              style={{ flex: 1, fontFamily: F.body, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10, color: C.ink, outlineStyle: 'none' } as any} accessibilityLabel={t('ask')} />
            <Btn small label={t('ask')} onPress={() => router.push(`/ask?q=${encodeURIComponent(q)}` as any)} />
          </View>
        </View>
      </Container>

      {/* JOIN */}
      {!user ? (
        <View style={{ backgroundColor: C.gold, paddingVertical: wide ? 72 : 48 }}>
          <Container style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <View style={{ gap: 10, maxWidth: 680 }}>
              <H2 style={{ fontSize: wide ? 42 : 30 }}>{t('joinTitle')}</H2>
              <P color={C.ink2}>{t('joinBody')}</P>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <Btn variant="dark" label={t('join')} href="/join" />
              <Btn variant="outline" label={t('signin')} href="/login" />
            </View>
          </Container>
        </View>
      ) : null}
    </Screen>
  );
}
