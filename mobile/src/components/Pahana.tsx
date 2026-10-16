import React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Path, Ellipse, G } from 'react-native-svg';
import { C } from '../lib/theme';
/** Traditional clay oil lamp (pahana) with a flickering flame */
export default function Pahana({ size = 40, lit = true }: { size?: number; lit?: boolean }) {
  const flick = Platform.OS === 'web' && lit ? ({ animationName: 'idwglow', animationDuration: '1.8s', animationIterationCount: 'infinite' } as any) : null;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <G>
          {lit ? <Path d="M32 6c5 8 7 13 0 22-7-9-5-14 0-22z" fill={C.gold} /> : null}
          {lit ? <Path d="M32 14c2 4 3 7 0 11-3-4-2-7 0-11z" fill="#FFF3C4" /> : null}
          <Path d="M8 34c6 12 14 16 24 16s18-4 24-16c-8 3-16 4-24 4S16 37 8 34z" fill={C.ember} />
          <Ellipse cx={32} cy={35} rx={24} ry={4} fill={C.lacquer} />
          <Path d="M24 50h16l-3 6H27z" fill={C.maroon} />
        </G>
      </Svg>
      {flick ? <View style={[{ position: 'absolute', left: size * 0.3, top: 0, width: size * 0.4, height: size * 0.45, borderRadius: size, backgroundColor: 'rgba(201,162,74,.25)' }, flick]} /> : null}
    </View>
  );
}
