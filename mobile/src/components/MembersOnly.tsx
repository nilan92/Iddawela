import React from 'react';
import { View } from 'react-native';
import { Lock } from './icons';
import { Screen } from './chrome';
import { Btn, Card, Container, H3, P } from './ui';
import { C } from '../lib/theme';
import { useLang } from '../lib/i18n';
import { useAuth } from '../lib/auth';

/** Shown in place of a page the public can't see (a living relative's profile, a register of living relatives). */
export function MembersOnlyCard() {
  const { t } = useLang();
  const { user } = useAuth();
  return (
    <Card style={{ gap: 12, alignItems: 'flex-start' }}>
      <Lock size={22} color={C.lacquer} />
      <H3>{t('membersOnly')}</H3>
      <P color={C.stone}>{t('livingPrivate')}</P>
      {!user ? (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn small label={t('signin')} href="/login" />
          <Btn small variant="outline" label={t('join')} href="/join" />
        </View>
      ) : null}
    </Card>
  );
}

export default function MembersOnlyScreen() {
  return (
    <Screen>
      <Container narrow style={{ paddingVertical: 56 }}>
        <MembersOnlyCard />
      </Container>
    </Screen>
  );
}

export const isMembersOnly = (err?: string | null) => err === 'members_only';
