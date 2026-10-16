import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import AuthShell from '../components/AuthShell';
import { Btn, Field, Notice } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import { useTitle } from '../lib/hooks';

export default function Reset() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { signIn } = useAuth();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useTitle(T('Choose a new password', 'නව මුරපදයක්'));
  const submit = async () => {
    if (pw !== pw2) { setErr(T("The two passwords don't match", 'මුරපද දෙක නොගැළපේ')); return; }
    setBusy(true); setErr(null);
    try { const r = await api('/api/auth/reset', { body: { token, password: pw } }); signIn(r.token, r.user); router.replace('/me'); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <AuthShell kicker={T('Account', 'ගිණුම')} title={T('Choose a new password', 'නව මුරපදයක් තෝරන්න')}>
      {!token ? <Notice tone="err">{T('This link is missing its token. Ask for a new one.', 'මෙම සබැඳිය අසම්පූර්ණයි.')}</Notice> : null}
      {err ? <Notice tone="err">{err}</Notice> : null}
      <Field label={T('New password', 'නව මුරපදය')} value={pw} onChangeText={setPw} secure autoComplete="new-password" />
      <Field label={T('Again', 'නැවතත්')} value={pw2} onChangeText={setPw2} secure autoComplete="new-password" />
      <Btn label={T('Save and sign in', 'සුරකින්න')} onPress={submit} loading={busy} disabled={!token || pw.length < 8} />
    </AuthShell>
  );
}
