import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LangProvider } from '../lib/i18n';
import { AuthProvider } from '../lib/auth';
import { Header } from '../components/chrome';
import { C } from '../lib/theme';

const CSS = `
html,body{background:${C.ink};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
::selection{background:${C.gold};color:${C.ink}}
:focus-visible{outline:2px solid ${C.gold}!important;outline-offset:2px}
@keyframes idwspin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.08)}100%{transform:rotate(360deg) scale(1)}}
@keyframes idwup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes idwglow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes idwfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.idw-up{animation:idwup .9s cubic-bezier(.2,.7,.2,1) both}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
`;

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!document.getElementById('idw-css')) {
      const st = document.createElement('style'); st.id = 'idw-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    if (!document.getElementById('idw-fonts')) {
      const l = document.createElement('link'); l.id = 'idw-fonts'; l.rel = 'stylesheet'; l.href = '/fonts/fonts.css'; document.head.appendChild(l);
    }
    // easter egg: type "pahana" anywhere (outside a text field) to find the hidden room
    let buf = '';
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      buf = (buf + (e.key || '')).slice(-6).toLowerCase();
      if (buf === 'pahana') { buf = ''; router.push('/play' as any); }
    };
    window.addEventListener('keydown', onKey);
    if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <View style={{ flex: 1, backgroundColor: C.parchment }}>
            <Header />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.parchment }, animation: 'fade' }} />
          </View>
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
