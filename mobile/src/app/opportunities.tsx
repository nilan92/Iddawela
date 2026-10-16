import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Screen } from '../components/chrome';
import PageHero from '../components/PageHero';
import PersonChip from '../components/PersonChip';
import { Btn, Card, Chip, Container, Field, H3, Loading, Notice, P, Small } from '../components/ui';
import { Briefcase, GraduationCap, Lock, Search } from '../components/icons';
import { api } from '../lib/api';
import { isMember, useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import { useApi, useLayout, useTitle } from '../lib/hooks';
import { fmtDate } from '../lib/format';
import { C, F } from '../lib/theme';

const KINDS: [string, string, string][] = [['job', 'Job', 'රැකියාව'], ['internship', 'Internship', 'පුහුණුව'], ['mentorship', 'Mentorship', 'උපදේශනය'], ['scholarship', 'Scholarship', 'ශිෂ්‍යත්වය'], ['help', 'Help wanted', 'උදව් අවශ්‍යයි']];

export default function Opportunities() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { user } = useAuth();
  const { wide } = useLayout();
  const member = isMember(user);
  const [tab, setTab] = useState<'board' | 'directory'>('board');
  const [q, setQ] = useState('');
  const { data: count } = useApi<any>('/api/opportunities/count');
  const { data, reload } = useApi<any[]>(member ? '/api/opportunities' : null);
  const { data: dir } = useApi<any[]>(member && tab === 'directory' ? '/api/directory' : null);
  const [f, setF] = useState<any>({ kind: 'job' }); const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<any>(null);
  useTitle(T('Opportunities', 'අවස්ථා'));
  const post = async () => {
    try { const r = await api('/api/opportunities', { body: f }); setMsg({ tone: 'ok', text: r.status === 'open' ? T('Posted.', 'පළ කළා.') : T('Thanks! An admin will publish it shortly.', 'ස්තූතියි! පරිපාලකයෙකු ඉක්මනින් පළ කරනු ඇත.') }); setF({ kind: 'job' }); setOpen(false); reload(); }
    catch (e: any) { setMsg({ tone: 'err', text: e.message }); }
  };
  const ql = q.trim().toLowerCase();
  return (
    <Screen>
      <PageHero kicker={T('Opportunities', 'අවස්ථා')} title={T('Family helping family', 'පවුල පවුලට උදව්')}
        body={T('The foundation has helped relatives into jobs for years. Post openings, offer to mentor, or find the cousin who already works where you want to.', 'පදනම වසර ගණනාවක් ඥාතීන්ට රැකියා සොයාගැනීමට උදව් කර ඇත. රැකියා පළ කරන්න, උපදේශනය පිරිනමන්න.')}>
        <Small color={C.goldSoft} style={{ marginTop: 6 }}>{count ? T(`${count.open} open right now`, `දැනට විවෘත ${count.open}`) : ' '}</Small>
      </PageHero>
      <Container style={{ paddingVertical: wide ? 48 : 28, gap: 18 }}>
        {!member ? (
          <Card style={{ alignItems: 'center', gap: 12, padding: 32 }}>
            <Lock size={28} color={C.brass} />
            <H3 style={{ textAlign: 'center' }}>{T('For signed-in family members', 'පවුලේ සාමාජිකයින්ට පමණි')}</H3>
            <P style={{ textAlign: 'center', fontSize: 15.5, maxWidth: 520 }}>{T('Job posts and the skills directory include contact details, so they stay inside the family.', 'රැකියා සහ කුසලතා නාමාවලියේ සම්බන්ධතා විස්තර ඇති බැවින් ඒවා පවුල තුළ පමණි.')}</P>
            <View style={{ flexDirection: 'row', gap: 10 }}><Btn label={T('Sign in', 'ඇතුළු වන්න')} href="/login?next=/opportunities" /><Btn variant="outline" label={T('Join', 'එක්වන්න')} href="/join" /></View>
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={T('Board', 'පුවරුව')} active={tab === 'board'} onPress={() => setTab('board')} />
              <Chip label={T('Who does what (directory)', 'කවුද මොනවද කරන්නේ')} active={tab === 'directory'} onPress={() => setTab('directory')} />
              <View style={{ flex: 1 }} />
              {tab === 'board' ? <Btn small label={T('Post an opportunity', 'අවස්ථාවක් පළ කරන්න')} onPress={() => setOpen(!open)} icon={<Briefcase size={15} color={C.ink} />} /> : null}
            </View>
            {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
            {open ? (
              <Card style={{ gap: 12, padding: 22 }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{KINDS.map(([k, en, si]) => <Chip key={k} label={T(en, si)} active={f.kind === k} onPress={() => setF({ ...f, kind: k })} />)}</View>
                <Field label={T('Title', 'මාතෘකාව')} value={f.title} onChangeText={(v: string) => setF({ ...f, title: v })} />
                <Field label={T('Organisation', 'ආයතනය')} value={f.organization} onChangeText={(v: string) => setF({ ...f, organization: v })} />
                <Field label={T('Location', 'ස්ථානය')} value={f.location} onChangeText={(v: string) => setF({ ...f, location: v })} />
                <Field label={T('Details', 'විස්තර')} value={f.description} onChangeText={(v: string) => setF({ ...f, description: v })} multiline />
                <Field label={T('How to apply / contact', 'අයදුම් කරන ආකාරය')} value={f.contact} onChangeText={(v: string) => setF({ ...f, contact: v })} />
                <Field label={T('Link (optional)', 'සබැඳිය')} value={f.link} onChangeText={(v: string) => setF({ ...f, link: v })} />
                <Btn label={T('Post', 'පළ කරන්න')} onPress={post} disabled={!f.title} />
              </Card>
            ) : null}
            {tab === 'board' ? (!data ? <Loading /> : !data.length ? (
              <Notice>{T('No openings yet. Be the first: a role at your company, an internship, or an hour of mentoring.', 'තවම නැත. පළමුවැන්නා වන්න.')}</Notice>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {data.map((o) => (
                  <Card key={o.id} style={{ width: wide ? '48.9%' : '100%', gap: 8, padding: 22 }}>
                    <Small style={{ textTransform: 'uppercase', letterSpacing: 1.6, fontWeight: '700', color: C.lacquer }}>{(KINDS.find((k) => k[0] === o.kind) || KINDS[0])[lang === 'si' ? 2 : 1]}{o.status !== 'open' ? ` · ${o.status}` : ''}</Small>
                    <H3>{o.title}</H3>
                    <Small>{[o.organization, o.location].filter(Boolean).join(' · ')}</Small>
                    {o.description ? <P style={{ fontSize: 15.5 }} numberOfLines={6}>{o.description}</P> : null}
                    {o.contact ? <Small color={C.ink}>{T('Contact', 'සම්බන්ධ වන්න')}: {o.contact}</Small> : null}
                    {o.link ? <Pressable onPress={() => Linking.openURL(o.link)}><Small color={C.lacquer}>{o.link}</Small></Pressable> : null}
                    <Small>{T('Posted by', 'පළ කළේ')} {o.posted_by} · {fmtDate(o.created_at, lang)}</Small>
                  </Card>
                ))}
              </View>
            )) : (
              <>
                <Field value={q} onChangeText={setQ} placeholder={T('Search: engineer, banking, Peradeniya, Melbourne…', 'සොයන්න: ඉංජිනේරු, බැංකු…')} />
                {!dir ? <Loading /> : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                    {dir.filter((x) => !ql || JSON.stringify(x).toLowerCase().includes(ql)).slice(0, 120).map((x) => (
                      <Card key={x.person.id} style={{ width: wide ? '32%' : '100%', gap: 8, padding: 18 }}>
                        <PersonChip p={x.person} />
                        {x.profession ? <P style={{ fontSize: 15 }}>{x.profession}</P> : null}
                        {x.careers.slice(0, 3).map((c: any, i: number) => <Small key={i}><Briefcase size={12} color={C.stone} /> {[c.title, c.organization].filter(Boolean).join(', ')}{c.open_to_mentor ? T(' · mentors', ' · උපදේශක') : ''}</Small>)}
                        {x.education.slice(0, 2).map((e: any, i: number) => <Small key={'e' + i}><GraduationCap size={12} color={C.stone} /> {[e.qualification, e.institution].filter(Boolean).join(', ')}</Small>)}
                      </Card>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </Screen>
  );
}
