import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import PersonChip from '../../components/PersonChip';
import { Btn, Card, Container, Field, H3, Loading, Notice, P, Small } from '../../components/ui';
import { LogOut, Pencil, Shield, UserPlus } from '../../components/icons';
import { api, setToken } from '../../lib/api';
import { useAuth, isAdmin } from '../../lib/auth';
import { useLang } from '../../lib/i18n';
import { useApi, useLayout, useTitle } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { C } from '../../lib/theme';

const KIND: Record<string, [string, string]> = {
  'person.update': ['Edit to a profile', 'පැතිකඩ සංස්කරණය'], 'person.create': ['New family member', 'නව සාමාජිකයෙක්'], 'education.add': ['Education', 'අධ්‍යාපනය'],
  'career.add': ['Career', 'වෘත්තිය'], 'marriage.add': ['Marriage', 'විවාහය'], 'photo.add': ['Photo', 'ඡායාරූපය'], claim: ['"This is me"', '"මේ මමයි"'],
  'obituary.create': ['Memorial page', 'සිහිවටන පිටුව'], 'education.delete': ['Remove education', 'අධ්‍යාපනය ඉවත් කිරීම'], 'career.delete': ['Remove career', 'වෘත්තිය ඉවත් කිරීම'],
};

export default function Me() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { user, ready, signOut, refresh } = useAuth();
  const { wide } = useLayout();
  const { data: mine } = useApi<any[]>(user ? '/api/changes/mine' : null);
  const [pw, setPw] = useState({ current: '', new: '' }); const [pwMsg, setPwMsg] = useState<string | null>(null);
  useTitle(T('My family page', 'මගේ පිටුව'));
  if (!ready) return <Screen><Loading /></Screen>;
  if (!user) { router.replace('/login?next=/me' as any); return <Screen><Loading /></Screen>; }
  const pending = user.status !== 'approved';
  const changePw = async () => {
    try { const r = await api('/api/auth/change-password', { body: pw }); setToken(r.token); setPw({ current: '', new: '' }); setPwMsg(T('Password changed.', 'මුරපදය වෙනස් විය.')); }
    catch (e: any) { setPwMsg(e.message); }
  };
  return (
    <Screen>
      <PageHero kicker={T('My family page', 'මගේ පිටුව')} title={T(`Ayubowan, ${user.name.split(' ')[0]}`, `ආයුබෝවන්, ${user.name.split(' ')[0]}`)}
        body={pending ? T('Your account is waiting for a family admin to approve it. You will see members-only details as soon as it is approved.', 'ඔබේ ගිණුම අනුමැතිය සඳහා රැඳී සිටී.')
          : T('Keep your branch of the family up to date: your details, education, career, marriages, photos and new arrivals.', 'ඔබේ පවුලේ ශාඛාව යාවත්කාලීනව තබා ගන්න.')}>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {isAdmin(user) ? <Btn label={T('Admin', 'පරිපාලනය')} href="/admin" icon={<Shield size={16} color={C.ink} />} /> : null}
          <Btn variant="light" label={T('Sign out', 'පිටවන්න')} onPress={() => { signOut(); router.replace('/'); }} icon={<LogOut size={16} color={C.parchment} />} />
        </View>
      </PageHero>
      <Container style={{ paddingVertical: wide ? 56 : 32, gap: 24 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
          <Card style={{ flex: 1, width: wide ? undefined : '100%', gap: 14, padding: 24 }}>
            <H3>{T('You on the tree', 'ගසේ ඔබ')}</H3>
            {user.person ? (
              <>
                <PersonChip p={user.person} />
                {!pending ? (
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <Btn small label={T('Edit my details', 'මගේ විස්තර සංස්කරණය')} href={`/me/edit?id=${user.person.id}`} icon={<Pencil size={15} color={C.ink} />} />
                    <Btn small variant="outline" label={T('Add a family member', 'සාමාජිකයෙක් එක් කරන්න')} href={`/me/edit?add=1&of=${user.person.id}`} icon={<UserPlus size={15} color={C.ink} />} />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <P style={{ fontSize: 15.5 }}>{T('Your account is not linked to a person on the tree yet. Find yourself on the tree and tap "This is me", or add yourself under a parent.', 'ඔබේ ගිණුම තවම ගසේ පුද්ගලයෙකුට සම්බන්ධ කර නැත.')}</P>
                {!pending ? <Btn small variant="outline" label={T('Add myself / a relative', 'මා / ඥාතියෙකු එක් කරන්න')} href="/me/edit?add=1" icon={<UserPlus size={15} color={C.ink} />} /> : null}
              </>
            )}
          </Card>
          <Card style={{ flex: 1, width: wide ? undefined : '100%', gap: 12, padding: 24 }}>
            <H3>{T('Account', 'ගිණුම')}</H3>
            <Small>{[user.email, user.phone].filter(Boolean).join(' · ')}</Small>
            <Small>{T('Role', 'භූමිකාව')}: {user.role.replace('_', ' ')} · {T('Status', 'තත්ත්වය')}: {user.status}</Small>
            <Field label={T('Current password', 'වත්මන් මුරපදය')} value={pw.current} onChangeText={(v: string) => setPw({ ...pw, current: v })} secure autoComplete="current-password" />
            <Field label={T('New password', 'නව මුරපදය')} value={pw.new} onChangeText={(v: string) => setPw({ ...pw, new: v })} secure autoComplete="new-password" />
            {pwMsg ? <Small color={C.lacquer}>{pwMsg}</Small> : null}
            <Btn small variant="dark" label={T('Change password', 'මුරපදය වෙනස් කරන්න')} onPress={changePw} disabled={!pw.current || pw.new.length < 8} />
          </Card>
        </View>
        <View style={{ gap: 12 }}>
          <H3>{T('What I have sent in', 'මා යැවූ යාවත්කාලීන')}</H3>
          {!mine ? <Loading /> : !mine.length ? <Small>{T('Nothing yet. Every edit is checked by a family admin before it goes live, unless it is your own contact details or privacy.', 'තවම කිසිවක් නැත.')}</Small> : mine.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <View style={{ flex: 1 }}>
                <P style={{ fontSize: 15.5 }}>{(KIND[s.kind] || [s.kind, s.kind])[lang === 'si' ? 1 : 0]}{s.payload?.fields?.name_en ? ` · ${s.payload.fields.name_en}` : ''}</P>
                <Small>{fmtDate(s.created_at, lang)}{s.review_note ? ` · ${s.review_note}` : ''}</Small>
              </View>
              <Small color={s.status === 'approved' ? C.paddy : s.status === 'rejected' ? C.lacquer : C.brass} style={{ fontWeight: '700', textTransform: 'uppercase' }}>{s.status}</Small>
            </View>
          ))}
        </View>
        {pending ? <Notice tone="warn">{T('Tip: tell the admin how you are related in your join note. It speeds things up.', 'ඉඟිය: ඔබ සම්බන්ධ වන ආකාරය පරිපාලකයාට කියන්න.')}</Notice> : null}
      </Container>
    </Screen>
  );
}
