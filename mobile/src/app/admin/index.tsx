import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import PersonChip from '../../components/PersonChip';
import PersonPicker from '../../components/PersonPicker';
import { Btn, Card, Chip, Container, Field, H3, Loading, Notice, P, Small } from '../../components/ui';
import { Check, ExternalLink, X } from '../../components/icons';
import { api } from '../../lib/api';
import { isAdmin, useAuth } from '../../lib/auth';
import { nm, useLang } from '../../lib/i18n';
import { useLayout, useTitle } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { C, F } from '../../lib/theme';

type Tab = 'overview' | 'changes' | 'suggestions' | 'users' | 'condolences' | 'opportunities' | 'translations';

function useList<T = any>(path: string | null) {
  const [data, setData] = useState<T[] | null>(null); const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => { if (path) api<T[]>(path).then(setData).catch((e) => setErr(e.message)); }, [path]);
  useEffect(() => { setData(null); reload(); }, [reload]);
  return { data, err, reload, setData };
}

const host = (u?: string) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : ''; } catch { return u || ''; } };
const valText = (v: any) => (v == null ? '' : typeof v === 'string' ? v : v.text || v.title || v.institution || v.url || JSON.stringify(v));

export default function Admin() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { user, ready } = useAuth();
  const { wide } = useLayout();
  const [tab, setTab] = useState<Tab>('overview');
  const [sum, setSum] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  useTitle(T('Admin', 'පරිපාලනය'));
  const loadSum = useCallback(() => api('/api/admin/summary').then(setSum).catch(() => {}), []);
  useEffect(() => { if (isAdmin(user)) loadSum(); }, [user, loadSum]);
  if (!ready) return <Screen><Loading /></Screen>;
  if (!user) { router.replace('/login?next=/admin' as any); return <Screen><Loading /></Screen>; }
  if (!isAdmin(user)) return <Screen><Container style={{ paddingVertical: 60 }}><Notice tone="warn">{T('This page is for family admins.', 'මෙම පිටුව පවුලේ පරිපාලකයින්ට පමණි.')}</Notice></Container></Screen>;
  const TABS: [Tab, string, string, number | undefined][] = [
    ['overview', 'Overview', 'සාරාංශය', undefined], ['changes', 'Approvals', 'අනුමැතිය', sum?.pending_changes],
    ['suggestions', 'Suggested updates', 'යෝජිත යාවත්කාලීන', sum?.suggestions], ['users', 'Members', 'සාමාජිකයින්', sum?.pending_users],
    ['condolences', 'Condolences', 'ශෝක පණිවිඩ', sum?.pending_condolences], ['opportunities', 'Opportunities', 'අවස්ථා', sum?.pending_opps],
    ['translations', 'Sinhala review', 'සිංහල පරීක්ෂාව', sum?.machine_translations],
  ];
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); loadSum(); };
  return (
    <Screen>
      <PageHero kicker={user.role === 'super_admin' ? T('Super admin', 'ප්‍රධාන පරිපාලක') : T('Family admin', 'පවුලේ පරිපාලක')}
        title={T('Keeping the archive true', 'ලේඛනාගාරය නිවැරදිව')}
        body={T('Nothing a member sends, and nothing the research found, goes public until an admin approves it here.', 'සාමාජිකයින් එවන කිසිවක් හෝ පර්යේෂණයෙන් සොයාගත් කිසිවක් මෙහි අනුමත කරන තුරු ප්‍රසිද්ධ නොවේ.')} />
      <View style={{ backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 10, marginHorizontal: 'auto' as any }}>
          {TABS.map(([k, en, si, n]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tab === k ? C.ink : 'transparent', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.body, fontWeight: '700', fontSize: 14, color: tab === k ? C.parchment : C.ink }}>{T(en, si)}</Text>
              {n ? <View style={{ backgroundColor: C.lacquer, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}><Text style={{ color: C.paper, fontSize: 12, fontWeight: '800', fontFamily: F.body }}>{n}</Text></View> : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <Container style={{ paddingVertical: wide ? 40 : 24, gap: 16 }}>
        {toast ? <Notice tone="ok">{toast}</Notice> : null}
        {tab === 'overview' ? <Overview sum={sum} go={setTab} T={T} wide={wide} /> : null}
        {tab === 'changes' ? <Changes T={T} flash={flash} lang={lang} /> : null}
        {tab === 'suggestions' ? <Suggestions T={T} flash={flash} lang={lang} /> : null}
        {tab === 'users' ? <Users T={T} flash={flash} lang={lang} superAdmin={user.role === 'super_admin'} /> : null}
        {tab === 'condolences' ? <Condolences T={T} flash={flash} /> : null}
        {tab === 'opportunities' ? <Opps T={T} flash={flash} /> : null}
        {tab === 'translations' ? <Translations T={T} flash={flash} /> : null}
      </Container>
    </Screen>
  );
}

function Overview({ sum, go, T, wide }: any) {
  if (!sum) return <Loading />;
  const tiles: [Tab, number, string, string][] = [
    ['changes', sum.pending_changes, 'edits & new members waiting', 'සංස්කරණ සහ නව සාමාජිකයින්'], ['suggestions', sum.suggestions, 'research findings to review', 'පරීක්ෂා කළ යුතු පර්යේෂණ සොයාගැනීම්'],
    ['users', sum.pending_users, 'accounts waiting for approval', 'අනුමැතියට රැඳී සිටින ගිණුම්'], ['condolences', sum.pending_condolences, 'condolence messages', 'ශෝක පණිවිඩ'],
    ['opportunities', sum.pending_opps, 'job / mentorship posts', 'රැකියා / උපදේශන'], ['translations', sum.machine_translations, 'Sinhala bios to proofread', 'සෝදුපත් බැලිය යුතු සිංහල චරිතාපදාන'],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {tiles.map(([k, n, en, si]) => (
        <Card key={k} onPress={() => go(k)} style={{ width: wide ? '31.8%' : '100%', gap: 6, padding: 22 }}>
          <Text style={{ fontFamily: F.display, fontSize: 44, color: n ? C.lacquer : C.stone, fontWeight: '600' }}>{n}</Text>
          <P style={{ fontSize: 15.5 }}>{T(en, si)}</P>
        </Card>
      ))}
    </View>
  );
}

function Row({ children }: any) { return <Card style={{ gap: 10, padding: 18 }}>{children}</Card>; }
function Actions({ onApprove, onReject, T, approveLabel }: any) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      <Btn small label={approveLabel || T('Approve', 'අනුමත කරන්න')} onPress={onApprove} icon={<Check size={15} color={C.ink} />} />
      <Btn small variant="outline" label={T('Reject', 'ප්‍රතික්ෂේප')} onPress={onReject} icon={<X size={15} color={C.ink} />} />
    </View>
  );
}

function Changes({ T, flash, lang }: any) {
  const { data, err, reload } = useList('/api/admin/changes');
  const act = async (id: number, a: string) => { try { await api(`/api/admin/changes/${id}/${a}`, { body: {} }); flash(a === 'approve' ? T('Approved and live.', 'අනුමත විය.') : T('Rejected.', 'ප්‍රතික්ෂේප විය.')); reload(); } catch (e: any) { flash(e.message); } };
  if (err) return <Notice tone="err">{err}</Notice>;
  if (!data) return <Loading />;
  if (!data.length) return <Notice>{T('All caught up. Nothing waiting.', 'සියල්ල අවසන්.')}</Notice>;
  return <>{data.map((s: any) => (
    <Row key={s.id}>
      <Small style={{ textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700', color: C.lacquer }}>{s.kind.replace('.', ' · ')}</Small>
      {s.target ? <PersonChip p={s.target} /> : null}
      <Small>{T('From', 'යැව්වේ')} {s.user?.name} · {fmtDate(s.created_at, lang)}{s.user?.join_note ? ` · “${s.user.join_note}”` : ''}</Small>
      <View style={{ backgroundColor: C.parchment, borderRadius: 10, padding: 12, gap: 4 }}>
        {Object.entries(s.payload?.fields || s.payload || {}).map(([k, v]) => <Small key={k} color={C.ink}><Text style={{ fontWeight: '700' }}>{k}</Text>: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</Small>)}
        {s.payload?.relation ? <Small color={C.ink}><Text style={{ fontWeight: '700' }}>relation</Text>: {s.payload.relation.type} of #{s.payload.relation.of}</Small> : null}
      </View>
      <Actions T={T} onApprove={() => act(s.id, 'approve')} onReject={() => act(s.id, 'reject')} />
    </Row>
  ))}</>;
}

function Suggestions({ T, flash, lang }: any) {
  const [conf, setConf] = useState<string>('all');
  const { data, err, reload, setData } = useList('/api/admin/suggestions');
  const act = async (id: number, a: string) => {
    try { await api(`/api/admin/suggestions/${id}/${a}`, { body: {} }); setData((d) => (d || []).filter((x: any) => x.id !== id)); flash(a === 'approve' ? T('Added to the profile.', 'පැතිකඩට එක් කළා.') : T('Dismissed.', 'ඉවත් කළා.')); } catch (e: any) { flash(e.message); reload(); }
  };
  if (err) return <Notice tone="err">{err}</Notice>;
  if (!data) return <Loading />;
  const rows = data.filter((s: any) => conf === 'all' || s.confidence === conf);
  // group by person
  const groups: Record<string, any[]> = {};
  rows.forEach((s: any) => { const k = s.person ? `p${s.person.id}` : `h${s.person_hint}`; (groups[k] = groups[k] || []).push(s); });
  return (
    <>
      <Notice tone="warn">{T('Found by searching public news, LinkedIn and university pages. Most come from search previews, so open the source before approving. Approving adds the fact to the person’s profile; nothing here is public yet.',
        'පොදු පුවත්, LinkedIn සහ විශ්වවිද්‍යාල පිටු සෙවීමෙන් සොයාගත් දේ. අනුමත කිරීමට පෙර මූලාශ්‍රය විවෘත කරන්න.')}</Notice>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {[['all', 'All', 'සියල්ල'], ['confirmed', 'Confirmed by family', 'පවුල තහවුරු කළ'], ['high', 'High confidence', 'ඉහළ විශ්වාසය'], ['medium', 'Medium', 'මධ්‍යම']].map(([k, en, si]) => (
          <Chip key={k} label={`${T(en, si)} (${k === 'all' ? data.length : data.filter((s: any) => s.confidence === k).length})`} active={conf === k} onPress={() => setConf(k)} />
        ))}
      </View>
      {!rows.length ? <Notice>{T('Nothing left to review here.', 'පරීක්ෂා කිරීමට තවත් නැත.')}</Notice> : null}
      {Object.entries(groups).map(([k, list]) => (
        <Card key={k} style={{ gap: 12, padding: 18 }}>
          {list[0].person ? <PersonChip p={list[0].person} /> : <H3>{list[0].person_hint}</H3>}
          {list.map((s: any) => (
            <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Small style={{ textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '700', color: C.ink }}>{s.field.replace('_', ' ')}</Small>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: s.confidence === 'confirmed' ? C.paddy : s.confidence === 'high' ? C.gold : C.sand }}>
                  <Text style={{ fontFamily: F.body, fontSize: 11.5, fontWeight: '800', color: s.confidence === 'confirmed' ? C.paper : C.ink, textTransform: 'uppercase' }}>{s.confidence === 'confirmed' ? T('confirmed by Nilan', 'නිලාන් තහවුරු කළා') : s.confidence}</Text>
                </View>
              </View>
              <P style={{ fontSize: 16 }}>{valText(s.value)}</P>
              {s.source_url ? (
                <Pressable onPress={() => Linking.openURL(s.source_url)} accessibilityRole="link"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#F1E7D3', borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <ExternalLink size={15} color={C.lacquer} />
                  <Text style={{ fontFamily: F.body, fontSize: 14, fontWeight: '700', color: C.lacquer }}>{T('Source', 'මූලාශ්‍රය')}: {host(s.source_url)}</Text>
                </Pressable>
              ) : <Small color={C.lacquer}>{T('No source link', 'මූලාශ්‍ර සබැඳියක් නැත')}</Small>}
              <Actions T={T} approveLabel={T('Add to profile', 'පැතිකඩට එක් කරන්න')} onApprove={() => act(s.id, 'approve')} onReject={() => act(s.id, 'reject')} />
            </View>
          ))}
        </Card>
      ))}
    </>
  );
}

function Users({ T, flash, lang, superAdmin }: any) {
  const [st, setSt] = useState('pending');
  const { data, err, reload } = useList(`/api/admin/users${st === 'all' ? '' : `?status=${st}`}`);
  const [branchFor, setBranchFor] = useState<number | null>(null);
  const upd = async (id: number, body: any, m: string) => { try { await api(`/api/admin/users/${id}`, { body }); flash(m); reload(); } catch (e: any) { flash(e.message); } };
  const claim = async (u: any) => { try { await api(`/api/admin/changes/${u.claim_id}/approve`, { body: {} }); flash(T('Linked and approved.', 'සම්බන්ධ කර අනුමත කළා.')); reload(); } catch (e: any) { flash(e.message); } };
  const resetLink = async (id: number) => {
    try { const r = await api(`/api/admin/users/${id}/reset-link`, { body: {} }); if (Platform.OS === 'web') { await navigator.clipboard?.writeText(r.link).catch(() => {}); window.prompt(T('Reset link (copied). Share it privately:', 'සබැඳිය:'), r.link); } } catch (e: any) { flash(e.message); }
  };
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {[['pending', 'Waiting', 'රැඳී සිටින'], ['approved', 'Approved', 'අනුමත'], ['all', 'Everyone', 'සියල්ල']].map(([k, en, si]) => <Chip key={k} label={T(en, si)} active={st === k} onPress={() => setSt(k)} />)}
      </View>
      {err ? <Notice tone="err">{err}</Notice> : !data ? <Loading /> : !data.length ? <Notice>{T('No one here.', 'කිසිවෙකු නැත.')}</Notice> : data.map((u: any) => (
        <Row key={u.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <H3>{u.name}</H3>
            <Small style={{ fontWeight: '700', textTransform: 'uppercase' }}>{u.role.replace('_', ' ')} · {u.status}</Small>
          </View>
          <Small>{[u.email, u.phone].filter(Boolean).join(' · ')} · {T('joined', 'එක්වූයේ')} {fmtDate(u.created_at, lang)}</Small>
          {u.join_note ? <P style={{ fontSize: 15, fontStyle: 'italic' }}>“{u.join_note}”</P> : null}
          {u.claim ? <View style={{ gap: 6 }}><Small>{T('Says they are:', 'ඔවුන් කියන්නේ:')}</Small><PersonChip p={u.claim} /></View> : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {u.claim_id ? <Btn small label={T('Approve & link to tree', 'අනුමත කර ගසට සම්බන්ධ කරන්න')} onPress={() => claim(u)} /> : null}
            {u.status !== 'approved' ? <Btn small variant={u.claim_id ? 'outline' : 'gold'} label={T('Approve', 'අනුමත කරන්න')} onPress={() => upd(u.id, { status: 'approved' }, T('Approved.', 'අනුමත විය.'))} /> : null}
            {u.status === 'pending' ? <Btn small variant="outline" label={T('Reject', 'ප්‍රතික්ෂේප')} onPress={() => upd(u.id, { status: 'rejected' }, T('Rejected.', 'ප්‍රතික්ෂේප විය.'))} /> : null}
            {u.status === 'approved' && u.role !== 'super_admin' ? <Btn small variant="ghost" label={T('Disable', 'අක්‍රිය කරන්න')} onPress={() => upd(u.id, { status: 'disabled' }, T('Disabled.', 'අක්‍රිය විය.'))} /> : null}
            {superAdmin && u.role === 'member' && u.status === 'approved' ? <Btn small variant="ghost" label={T('Make family admin', 'පවුලේ පරිපාලක කරන්න')} onPress={() => setBranchFor(u.id)} /> : null}
            {superAdmin && u.role === 'family_admin' ? <Btn small variant="ghost" label={T('Make member', 'සාමාජික කරන්න')} onPress={() => upd(u.id, { role: 'member' }, 'OK')} /> : null}
            <Btn small variant="ghost" label={T('Reset link', 'යළි සැකසීමේ සබැඳිය')} onPress={() => resetLink(u.id)} />
          </View>
          {branchFor === u.id ? (
            <View style={{ gap: 8 }}>
              <PersonPicker label={T('Which branch do they manage? Pick the head of the branch', 'කුමන ශාඛාවද? ශාඛා ප්‍රධානියා තෝරන්න')} onChange={(p) => { if (p) { upd(u.id, { role: 'family_admin', branch_person_id: p.id }, T('Now a family admin.', 'දැන් පවුලේ පරිපාලකයෙක්.')); setBranchFor(null); } }} />
            </View>
          ) : null}
        </Row>
      ))}
    </>
  );
}

function Condolences({ T, flash }: any) {
  const { data, err, reload } = useList('/api/admin/condolences');
  const act = async (id: number, a: string) => { try { await api(`/api/admin/condolences/${id}/${a}`, { body: {} }); flash('OK'); reload(); } catch (e: any) { flash(e.message); } };
  if (err) return <Notice tone="err">{err}</Notice>;
  if (!data) return <Loading />;
  if (!data.length) return <Notice>{T('No condolence messages waiting.', 'ශෝක පණිවිඩ නැත.')}</Notice>;
  return <>{data.map((c: any) => <Row key={c.id}><H3>{c.name}</H3><P style={{ fontSize: 16 }}>{c.message}</P><Actions T={T} onApprove={() => act(c.id, 'approve')} onReject={() => act(c.id, 'reject')} /></Row>)}</>;
}

function Opps({ T, flash }: any) {
  const { data, err, reload } = useList('/api/admin/opportunities');
  const act = async (id: number, a: string) => { try { await api(`/api/admin/opportunities/${id}/${a}`, { body: {} }); flash('OK'); reload(); } catch (e: any) { flash(e.message); } };
  if (err) return <Notice tone="err">{err}</Notice>;
  if (!data) return <Loading />;
  if (!data.length) return <Notice>{T('No posts waiting.', 'පළ කිරීම් නැත.')}</Notice>;
  return <>{data.map((o: any) => <Row key={o.id}><Small style={{ textTransform: 'uppercase', fontWeight: '700' }}>{o.kind}</Small><H3>{o.title}</H3><Small>{[o.organization, o.location, o.posted_by].filter(Boolean).join(' · ')}</Small>{o.description ? <P style={{ fontSize: 15 }}>{o.description}</P> : null}<Actions T={T} onApprove={() => act(o.id, 'approve')} onReject={() => act(o.id, 'reject')} /></Row>)}</>;
}

function Translations({ T, flash }: any) {
  const { data, err, setData } = useList('/api/admin/translations');
  const [edit, setEdit] = useState<Record<string, string>>({});
  const save = async (x: any) => {
    const k = `${x.type}:${x.id}`;
    try { await api('/api/admin/translations', { body: { type: x.type, id: x.id, si: edit[k] ?? x.si ?? '', title_si: x.title_si } }); setData((d) => (d || []).filter((y: any) => `${y.type}:${y.id}` !== k)); flash(T('Marked as checked.', 'පරීක්ෂා කළ ලෙස සලකුණු කළා.')); } catch (e: any) { flash(e.message); }
  };
  if (err) return <Notice tone="err">{err}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      <Notice>{T('These Sinhala texts were machine-translated. Read each against the English, fix anything awkward, and mark it checked.', 'මෙම සිංහල පාඨ යන්ත්‍ර පරිවර්තන වේ. ඉංග්‍රීසියට සසඳා නිවැරදි කරන්න.')}</Notice>
      {data.slice(0, 30).map((x: any) => {
        const k = `${x.type}:${x.id}`;
        return (
          <Row key={k}>
            <Small style={{ textTransform: 'uppercase', fontWeight: '700' }}>{x.type}</Small>
            <H3>{x.title}{x.title_si ? ` · ${x.title_si}` : ''}</H3>
            <Small numberOfLines={4}>{x.en}</Small>
            <Field value={edit[k] ?? x.si ?? ''} onChangeText={(v: string) => setEdit({ ...edit, [k]: v })} multiline />
            <Btn small label={T('Checked, publish', 'පරීක්ෂා කළා')} onPress={() => save(x)} />
          </Row>
        );
      })}
      {data.length > 30 ? <Small>{T(`…and ${data.length - 30} more`, `…තවත් ${data.length - 30}`)}</Small> : null}
    </>
  );
}
