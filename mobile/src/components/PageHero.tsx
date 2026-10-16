import React from 'react';
import { View } from 'react-native';
import { C } from '../lib/theme';
import { useLayout } from '../lib/hooks';
import { Container, H1, Kicker, P } from './ui';

export default function PageHero({ kicker, title, body, children }: { kicker?: string; title: string; body?: string; children?: React.ReactNode }) {
  const { wide } = useLayout();
  return (
    <View style={{ backgroundColor: C.ink }}>
      <Container style={{ paddingVertical: wide ? 72 : 44, gap: 14 }}>
        {kicker ? <Kicker color={C.gold}>{kicker}</Kicker> : null}
        <H1 color={C.parchment} style={{ fontSize: wide ? 56 : 38, lineHeight: wide ? 62 : 44, maxWidth: 900 }}>{title}</H1>
        {body ? <P color="#D8CCB6" style={{ fontSize: 18, lineHeight: 29, maxWidth: 760 }}>{body}</P> : null}
        {children}
      </Container>
    </View>
  );
}
