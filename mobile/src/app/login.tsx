import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import AuthShell from '../components/AuthShell';
import { Btn, Field, Notice, Small } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import { useTitle } from '../lib/hooks';
import { C, F } from '../lib/theme';

export default function Login() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { signIn } = useAuth();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useTitle(T('Sign in', 'ඇතුළු වන්න'));
  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await api('/api/auth/login', { body: { identifier: id, password: pw } });
      signIn(r.token, r.user);
      const admin = r.user.status === 'approved' && ['super_admin', 'family_admin'].includes(r.user.role);
      router.replace((typeof next === 'string' && next.startsWith('/') ? next : admin ? '/admin' : '/me') as any);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <AuthShell kicker={T('Members', 'සාමාජිකයින්')} title={T('Welcome home', 'ආයුබෝවන්')}
      body={T('Sign in to see family details, add your household and RSVP to the Hamuwa.', 'පවුලේ විස්තර බැලීමට, ඔබේ පවුල එක් කිරීමට සහ හමුවට සහභාගී වීම දැනුම් දීමට ඇතුළු වන්න.')}>
      {err ? <Notice tone="err">{err}</Notice> : null}
      <Field label={T('Email or phone', 'ඊමේල් හෝ දුරකථනය')} value={id} onChangeText={setId} autoComplete="username" placeholder="name@example.com / 07X XXX XXXX" />
      <Field label={T('Password', 'මුරපදය')} value={pw} onChangeText={setPw} secure autoComplete="current-password" />
      <Btn label={T('Sign in', 'ඇතුළු වන්න')} onPress={submit} loading={busy} disabled={!id || !pw} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/forgot" asChild><Pressable><Small color={C.lacquer}>{T('Forgot password?', 'මුරපදය අමතකද?')}</Small></Pressable></Link>
        <Link href="/join" asChild><Pressable><Text style={{ fontFamily: F.body, fontSize: 14, color: C.ink, fontWeight: '700' }}>{T('New here? Join the family →', 'අලුත්ද? පවුලට එක්වන්න →')}</Text></Pressable></Link>
      </View>
    </AuthShell>
  );
}
