import React from 'react';
import { View } from 'react-native';
import { Screen } from './chrome';
import { C } from '../lib/theme';
import { useLayout } from '../lib/hooks';
import { H1, Kicker, Liyawela, Lotus, P } from './ui';
import { shadow as shadowCard } from '../lib/theme';

/** Centered card on the ink ground, used by sign in / join / reset. */
export default function AuthShell({ kicker, title, body, children, wideCard }: { kicker?: string; title: string; body?: string; children: React.ReactNode; wideCard?: boolean }) {
  const { wide } = useLayout();
  return (
    <Screen bg={C.ink}>
      <View style={{ paddingVertical: wide ? 72 : 32, paddingHorizontal: 16, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: wideCard ? 720 : 520, gap: 22 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Lotus size={44} />
            {kicker ? <Kicker color={C.gold}>{kicker}</Kicker> : null}
            <H1 color={C.parchment} style={{ textAlign: 'center', fontSize: wide ? 46 : 34, lineHeight: wide ? 52 : 40 }}>{title}</H1>
            {body ? <P color="#D8CCB6" style={{ textAlign: 'center', fontSize: 16.5, lineHeight: 26 }}>{body}</P> : null}
            <Liyawela width={200} />
          </View>
          <View style={[{ backgroundColor: C.paper, borderRadius: 22, padding: wide ? 32 : 20, gap: 16 }, shadowCard]}>{children}</View>
        </View>
      </View>
    </Screen>
  );
}
