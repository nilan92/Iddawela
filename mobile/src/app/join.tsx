import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, router } from 'expo-router';
import AuthShell from '../components/AuthShell';
import { Btn, Field, Notice, P, Small } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import { useLayout, useTitle } from '../lib/hooks';
import { C } from '../lib/theme';

export default function Join() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { signIn } = useAuth();
  const { mid } = useLayout();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', note: '' });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((o) => ({ ...o, [k]: v }));
  useTitle(T('Join the family', 'පවුලට එක්වන්න'));
  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await api('/api/auth/register', { body: { ...f, person_id: null, lang } });
      signIn(r.token, r.user); router.replace('/me');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const half = { flex: 1, minWidth: mid ? 200 : '100%' } as any;
  return (
    <AuthShell wideCard kicker={T('Join', 'එක්වන්න')} title={T('Join the family', 'පවුලට එක්වන්න')}
      body={T('For descendants of Ukkubanda & Lokumenike Iddawela and their families. A family admin checks every new account, so private details stay in the family.',
        'උක්කුබණ්ඩා සහ ලොකුමැණිකේ ඉද්දවෙල දෙපලගේ පරපුරට සහ ඔවුන්ගේ පවුල්වලට. පෞද්ගලික විස්තර පවුල තුළ රැකීමට, සෑම නව ගිණුමක්ම පවුලේ පරිපාලකයෙක් පරීක්ෂා කරයි.')}>
      {err ? <Notice tone="err">{err}</Notice> : null}
      <Field label={T('Your full name', 'ඔබේ සම්පූර්ණ නම')} value={f.name} onChangeText={set('name')} autoComplete="name" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <Field style={half} label={T('Email', 'ඊමේල්')} value={f.email} onChangeText={set('email')} keyboardType="email-address" autoComplete="email" />
        <Field style={half} label={T('Phone (optional)', 'දුරකථනය (අත්‍යවශ්‍ය නැත)')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
      </View>
      <Field label={T('Password', 'මුරපදය')} value={f.password} onChangeText={set('password')} secure autoComplete="new-password" hint={T('At least 8 characters.', 'අවම අකුරු 8ක්.')} />
      <Field label={T('How are you related? Name your parents and grandparents; a family admin links you to your place on the tree', 'ඔබ සම්බන්ධ වන්නේ කෙසේද? ඔබේ දෙමාපියන් සහ සීයා/ආච්චි නම් කරන්න; පවුලේ පරිපාලකයෙක් ඔබව ගසේ ඔබේ ස්ථානයට සම්බන්ධ කරයි')} value={f.note} onChangeText={set('note')} multiline
        placeholder={T('e.g. Grandson of Abey Iddawela, son of …', 'උදා: ඒබේ ඉද්දවෙලගේ මුණුබුරා…')} />
      <Btn label={T('Create my account', 'ගිණුම සාදන්න')} onPress={submit} loading={busy} disabled={!f.name || !f.password || (!f.email && !f.phone)} />
      <Small color={C.stone}>{T('Until approved you can browse the public site; your details are never shown publicly without your say.', 'අනුමත වන තුරු ඔබට පොදු අඩවිය බැලිය හැක.')}</Small>
      <Link href="/login" asChild><Pressable><P style={{ fontSize: 15 }}>{T('Already a member? Sign in →', 'දැනටමත් සාමාජිකයෙක්ද? ඇතුළු වන්න →')}</P></Pressable></Link>
    </AuthShell>
  );
}
