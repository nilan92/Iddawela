import React, { useState } from 'react';
import AuthShell from '../components/AuthShell';
import { Btn, Field, Notice } from '../components/ui';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { useTitle } from '../lib/hooks';

export default function Forgot() {
  const { lang } = useLang();
  const T = (en: string, si: string) => (lang === 'si' ? si : en);
  const [id, setId] = useState(''); const [done, setDone] = useState<null | boolean>(null); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useTitle(T('Reset password', 'මුරපදය යළි සකසන්න'));
  const submit = async () => {
    setBusy(true); setErr(null);
    try { const r = await api('/api/auth/forgot', { body: { identifier: id } }); setDone(!!r.email_enabled); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <AuthShell kicker={T('Account', 'ගිණුම')} title={T('Forgot your password?', 'මුරපදය අමතකද?')}>
      {err ? <Notice tone="err">{err}</Notice> : null}
      {done === null ? (
        <>
          <Field label={T('Email or phone', 'ඊමේල් හෝ දුරකථනය')} value={id} onChangeText={setId} />
          <Btn label={T('Send me a reset link', 'යළි සැකසීමේ සබැඳිය එවන්න')} onPress={submit} loading={busy} disabled={!id} />
        </>
      ) : done ? (
        <Notice tone="ok">{T('If that account exists, a reset link is on its way to its email. It works for 24 hours.', 'ගිණුම තිබේ නම්, සබැඳියක් ඊමේල් වෙත එවා ඇත. එය පැය 24ක් වලංගුයි.')}</Notice>
      ) : (
        <Notice tone="info">{T('Ask a family admin for a reset link: they can make one for you from the admin page.', 'යළි සැකසීමේ සබැඳියක් සඳහා පවුලේ පරිපාලකයෙකුගෙන් ඉල්ලන්න.')}</Notice>
      )}
    </AuthShell>
  );
}
