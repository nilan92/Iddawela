import React from 'react';
import { View } from 'react-native';
import { Screen } from '../components/chrome';
import { Btn, Container, H1, Lotus, P } from '../components/ui';
import { useLang } from '../lib/i18n';
export default function NotFound() {
  const { lang } = useLang();
  return (
    <Screen>
      <Container narrow style={{ paddingVertical: 100, alignItems: 'center', gap: 18 }}>
        <Lotus size={56} />
        <H1 style={{ textAlign: 'center' }}>{lang === 'si' ? 'මෙම පිටුව හමු නොවීය' : 'This page wandered off'}</H1>
        <P style={{ textAlign: 'center' }}>{lang === 'si' ? 'නමුත් පවුල මෙතැනමයි.' : 'But the family is still here.'}</P>
        <View style={{ flexDirection: 'row', gap: 12 }}><Btn label={lang === 'si' ? 'මුල් පිටුව' : 'Home'} href="/" /><Btn variant="outline" label={lang === 'si' ? 'පවුල් ගස' : 'Family tree'} href="/tree" /></View>
      </Container>
    </Screen>
  );
}
