import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/chrome';
import PageHero from '../../components/PageHero';
import PersonPicker from '../../components/PersonPicker';
import { Btn, Card, Chip, Container, Field, H3, Loading, Notice, Small } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { nm, useLang } from '../../lib/i18n';
import { useLayout, useTitle } from '../../lib/hooks';
import { C, F } from '../../lib/theme';

const CORE = ['name_en', 'name_si', 'known_as', 'gender', 'birth_year', 'birth_date', 'death_year', 'death_date', 'birthplace', 'hometown', 'profession', 'skills', 'bio_en', 'bio_si'];
const CONTACT = ['email', 'phone', 'residence', 'address'];

export default function EditPerson() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { user, ready } = useAuth();
  const { wide, mid } = useLayout();
  const q = useLocalSearchParams<{ id?: string; add?: string; of?: string }>();
  const adding = q.add === '1';
  const [p, setP] = useState<any>(null);
  const [f, setF] = useState<Record<string, any>>({ privacy: 'members' });
  const [rel, setRel] = useState<{ type: string; of: any; other: any; year: string }>({ type: 'child', of: null, other: null, year: '' });
  const [edu, setEdu] = useState<any>({}); const [car, setCar] = useState<any>({});
  const [msg, setMsg] = useState<{ tone: any; text: string } | null>(null); const [busy, setBusy] = useState(false);
  useTitle(adding ? T('Add a family member', 'සාමාජිකයෙක් එක් කරන්න') : T('Edit details', 'විස්තර සංස්කරණය'));

  useEffect(() => {
    if (!adding && q.id) api(`/api/people/${q.id}`).then((d) => { setP(d); const o: any = {}; [...CORE, ...CONTACT, 'privacy'].forEach((k) => (o[k] = d[k] ?? '')); setF(o); }).catch((e) => setMsg({ tone: 'err', text: e.message }));
    if (adding && q.of) api(`/api/people/${q.of}`).then((d) => setRel((r) => ({ ...r, of: d }))).catch(() => {});
  }, [q.id, q.of, adding]);

  if (!ready) return <Screen><Loading /></Screen>;
  if (!user) { router.replace('/login?next=/me' as any); return <Screen><Loading /></Screen>; }
  const set = (k: string) => (v: any) => setF((o) => ({ ...o, [k]: v }));
  const done = (r: any) => setMsg(r.status === 'approved'
    ? { tone: 'ok', text: T('Saved. It is live now.', 'සුරැකිණි. දැන් සජීවීයි.') }
    : { tone: 'info', text: T('Sent to a family admin for approval. You can follow it on your page.', 'අනුමැතිය සඳහා පරිපාලකයෙකුට යවන ලදී.') });

  const changed = () => {
    const out: any = {};
    Object.entries(f).forEach(([k, v]) => { if (!p || String(p[k] ?? '') !== String(v ?? '')) out[k] = v === '' ? null : v; });
    return out;
  };
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      if (adding) {
        if (!rel.of) throw new Error(T('Choose who this person is related to', 'මෙම පුද්ගලයා සම්බන්ධ වන්නේ කාටදැයි තෝරන්න'));
        const fields = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));
        const r = await api('/api/changes', { body: { kind: 'person.create', payload: { fields, relation: { type: rel.type, of: rel.of.id, other_parent_id: rel.other?.id, year: rel.year } } } });
        done(r);
      } else {
        const fields = changed();
        if (!Object.keys(fields).length) { setMsg({ tone: 'info', text: T('Nothing changed yet.', 'කිසිවක් වෙනස් කර නැත.') }); setBusy(false); return; }
        done(await api('/api/changes', { body: { kind: 'person.update', target_id: p.id, payload: { fields } } }));
      }
    } catch (e: any) { setMsg({ tone: 'err', text: e.message }); }
    setBusy(false);
  };
  const addRow = async (kind: 'education.add' | 'career.add', payload: any, reset: () => void) => {
    try { done(await api('/api/changes', { body: { kind, target_id: p.id, payload } })); reset(); } catch (e: any) { setMsg({ tone: 'err', text: e.message }); }
  };
  const upload = () => {
    if (Platform.OS !== 'web') return;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const file = inp.files?.[0]; if (!file) return;
      const fd = new FormData(); fd.append('file', file); fd.append('person_id', String(p.id)); fd.append('set_profile', 'true');
      try { const r = await api('/api/media', { form: fd }); done({ status: r.status === 'approved' ? 'approved' : 'pending' }); } catch (e: any) { setMsg({ tone: 'err', text: e.message }); }
    };
    inp.click();
  };
  const half = { flex: 1, minWidth: mid ? 220 : '100%' } as any;
  const fld = (k: string, en: string, si: string, extra: any = {}) => <Field key={k} style={half} label={T(en, si)} value={f[k] ?? ''} onChangeText={set(k)} {...extra} />;

  return (
    <Screen>
      <PageHero kicker={adding ? T('New family member', 'නව සාමාජිකයෙක්') : T('Edit details', 'විස්තර සංස්කරණය')}
        title={adding ? T('Add someone to the tree', 'ගසට කෙනෙකු එක් කරන්න') : p ? nm(p, lang) : '…'}
        body={T('Births, marriages, degrees, new jobs: send them in. A family admin checks each change so the archive stays trustworthy.', 'උපත්, විවාහ, උපාධි, නව රැකියා: එවන්න. සෑම වෙනසක්ම පවුලේ පරිපාලකයෙකු පරීක්ෂා කරයි.')} />
      <Container narrow style={{ paddingVertical: wide ? 48 : 28, gap: 20 }}>
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        {adding ? (
          <Card style={{ gap: 14, padding: 22 }}>
            <H3>{T('How are they related?', 'ඔවුන් සම්බන්ධ වන්නේ කෙසේද?')}</H3>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[['child', 'Child of', 'දරුවා'], ['spouse', 'Spouse of', 'කලත්‍රයා'], ['parent', 'Parent of', 'මව/පියා']].map(([k, en, si]) => (
                <Chip key={k} label={T(en, si)} active={rel.type === k} onPress={() => setRel({ ...rel, type: k })} />
              ))}
            </View>
            <PersonPicker label={T('…of this person', '…මෙම පුද්ගලයාගේ')} value={rel.of} onChange={(v) => setRel({ ...rel, of: v })} />
            {rel.type === 'child' ? <PersonPicker label={T('Other parent (optional)', 'අනෙක් මව/පියා (අත්‍යවශ්‍ය නැත)')} value={rel.other} onChange={(v) => setRel({ ...rel, other: v })} /> : null}
            {rel.type === 'spouse' ? <Field label={T('Year of marriage', 'විවාහ වූ වර්ෂය')} value={rel.year} onChangeText={(v: string) => setRel({ ...rel, year: v })} keyboardType="number-pad" /> : null}
          </Card>
        ) : null}
        {!adding && !p ? <Loading /> : (
          <Card style={{ gap: 14, padding: 22 }}>
            <H3>{T('Details', 'විස්තර')}</H3>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {fld('name_en', 'Name (English)', 'නම (ඉංග්‍රීසි)')}
              {fld('name_si', 'Name (Sinhala)', 'නම (සිංහල)')}
              {fld('known_as', 'Known as', 'හඳුන්වන නම')}
              <View style={[half, { gap: 6 }]}>
                <Small style={{ fontWeight: '700', color: C.ink }}>{T('Gender', 'ස්ත්‍රී/පුරුෂ')}</Small>
                <View style={{ flexDirection: 'row', gap: 8 }}>{[['M', 'Male', 'පුරුෂ'], ['F', 'Female', 'ස්ත්‍රී']].map(([k, en, si]) => <Chip key={k} label={T(en, si)} active={f.gender === k} onPress={() => set('gender')(k)} />)}</View>
              </View>
              {fld('birth_year', 'Birth year', 'උපන් වර්ෂය', { keyboardType: 'number-pad' })}
              {fld('birth_date', 'Birth date (YYYY-MM-DD, members only)', 'උපන් දිනය')}
              {fld('death_year', 'Year of passing (if deceased)', 'අභාවප්‍රාප්ත වූ වර්ෂය', { keyboardType: 'number-pad' })}
              {fld('death_date', 'Date of passing', 'අභාවප්‍රාප්ත දිනය')}
              {fld('birthplace', 'Birthplace', 'උපන් ස්ථානය')}
              {fld('hometown', 'Lives in (town)', 'පදිංචි නගරය')}
              {fld('profession', 'Profession', 'වෘත්තිය')}
              {fld('skills', 'Skills, interests, roles', 'කුසලතා')}
            </View>
            <Field label={T('Biography (English)', 'චරිතාපදානය (ඉංග්‍රීසි)')} value={f.bio_en} onChangeText={set('bio_en')} multiline />
            <Field label={T('Biography (Sinhala)', 'චරිතාපදානය (සිංහල)')} value={f.bio_si} onChangeText={set('bio_si')} multiline />
            <H3 style={{ marginTop: 6 }}>{T('Contact & privacy', 'සම්බන්ධතා සහ රහස්‍යතාව')}</H3>
            <Small>{T('Contact details are only ever shown to signed-in, approved family members.', 'සම්බන්ධතා විස්තර පෙන්වන්නේ අනුමත සාමාජිකයින්ට පමණි.')}</Small>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {fld('email', 'Email', 'ඊමේල්')}{fld('phone', 'Phone', 'දුරකථනය')}{fld('residence', 'City / country', 'නගරය / රට')}{fld('address', 'Address', 'ලිපිනය')}
            </View>
            <View style={{ gap: 8 }}>
              <Small style={{ fontWeight: '700', color: C.ink }}>{T('Who can see the profile', 'පැතිකඩ දැකිය හැක්කේ කාටද')}</Small>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[['public', 'Everyone', 'සැමට'], ['members', 'Family members', 'පවුලේ සාමාජිකයින්ට'], ['private', 'Only admins', 'පරිපාලකයින්ට පමණි']].map(([k, en, si]) => (
                  <Chip key={k} label={T(en, si)} active={f.privacy === k} onPress={() => set('privacy')(k)} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Btn label={adding ? T('Send for approval', 'අනුමැතියට යවන්න') : T('Save changes', 'සුරකින්න')} onPress={save} loading={busy} disabled={adding && !f.name_en} />
              {!adding && p ? <Btn variant="outline" label={T('Back to profile', 'පැතිකඩට')} href={`/people/${p.slug}`} /> : null}
              {!adding && p && Platform.OS === 'web' ? <Btn variant="ghost" label={T('Upload a photo', 'ඡායාරූපයක්')} onPress={upload} /> : null}
            </View>
          </Card>
        )}
        {!adding && p ? (
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
            <Card style={{ flex: 1, gap: 10, padding: 22 }}>
              <H3>{T('Add education', 'අධ්‍යාපනය එක් කරන්න')}</H3>
              {(p.education || []).map((e: any) => <Small key={e.id}>• {[e.qualification, e.field, e.institution, e.year_to].filter(Boolean).join(', ')}</Small>)}
              <Field label={T('School / university', 'පාසල / විශ්වවිද්‍යාලය')} value={edu.institution} onChangeText={(v: string) => setEdu({ ...edu, institution: v })} />
              <Field label={T('Qualification (e.g. BSc, MBBS, A/L)', 'සුදුසුකම')} value={edu.qualification} onChangeText={(v: string) => setEdu({ ...edu, qualification: v })} />
              <Field label={T('Field', 'විෂය')} value={edu.field} onChangeText={(v: string) => setEdu({ ...edu, field: v })} />
              <Field label={T('Year completed', 'අවසන් වර්ෂය')} value={edu.year_to} onChangeText={(v: string) => setEdu({ ...edu, year_to: v })} keyboardType="number-pad" />
              <Btn small variant="dark" label={T('Add', 'එක් කරන්න')} disabled={!edu.institution} onPress={() => addRow('education.add', edu, () => setEdu({}))} />
            </Card>
            <Card style={{ flex: 1, gap: 10, padding: 22 }}>
              <H3>{T('Add career', 'වෘත්තිය එක් කරන්න')}</H3>
              {(p.careers || []).map((c: any) => <Small key={c.id}>• {[c.title, c.organization, c.current ? T('now', 'දැන්') : c.year_to].filter(Boolean).join(', ')}</Small>)}
              <Field label={T('Title', 'තනතුර')} value={car.title} onChangeText={(v: string) => setCar({ ...car, title: v })} />
              <Field label={T('Organisation', 'ආයතනය')} value={car.organization} onChangeText={(v: string) => setCar({ ...car, organization: v })} />
              <Field label={T('From (year)', 'සිට')} value={car.year_from} onChangeText={(v: string) => setCar({ ...car, year_from: v })} keyboardType="number-pad" />
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip label={T('Current role', 'වත්මන්')} active={!!car.current} onPress={() => setCar({ ...car, current: !car.current })} />
                <Chip label={T('Happy to mentor', 'උපදේශනයට කැමතියි')} active={!!car.open_to_mentor} onPress={() => setCar({ ...car, open_to_mentor: !car.open_to_mentor })} />
              </View>
              <Btn small variant="dark" label={T('Add', 'එක් කරන්න')} disabled={!car.title} onPress={() => addRow('career.add', car, () => setCar({}))} />
            </Card>
          </View>
        ) : null}
      </Container>
    </Screen>
  );
}
