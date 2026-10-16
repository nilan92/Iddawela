import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, Modal } from 'react-native';
import { Link, router, usePathname } from 'expo-router';
import { Menu, X, User as UserIcon } from './icons';
import { C, F } from '../lib/theme';
import { useLang } from '../lib/i18n';
import { useAuth, isAdmin } from '../lib/auth';
import { useLayout } from '../lib/hooks';
import { Container, Lotus, Liyawela, Small, Btn, Tap } from './ui';

const NAV = [
  ['/story', 'story'], ['/tree', 'tree'], ['/events', 'events'], ['/causes', 'causes'], ['/memorial', 'memorial'], ['/gallery', 'gallery'], ['/news', 'news'],
] as const;

export function LangToggle({ dark = true }: { dark?: boolean }) {
  const { lang, setLang } = useLang();
  const opt = (l: 'en' | 'si', label: string) => (
    <Pressable onPress={() => setLang(l)} accessibilityRole="button" accessibilityLabel={l === 'en' ? 'English' : 'සිංහල'}
      style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: lang === l ? C.gold : 'transparent' }}>
      <Text style={{ fontFamily: F.body, fontWeight: '700', fontSize: 13, color: lang === l ? C.ink : dark ? C.parchment : C.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', borderRadius: 999, borderWidth: 1, borderColor: dark ? 'rgba(230,207,143,.35)' : C.line, padding: 2 }}>
      {opt('en', 'EN')}{opt('si', 'සිං')}
    </View>
  );
}

function Brand() {
  const { lang } = useLang();
  return (
    <Link href="/" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Iddawela Foundation home" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Lotus size={30} />
        <View>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, fontWeight: '600', letterSpacing: 0.3, lineHeight: 24 }}>{lang === 'si' ? 'ඉද්දවෙල' : 'Iddawela'}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 10.5, color: C.goldSoft, letterSpacing: 2.4, textTransform: 'uppercase' }}>{lang === 'si' ? 'පදනම' : 'Foundation'}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function Header() {
  const { t } = useLang();
  const { user } = useAuth();
  const { width, mid } = useLayout();
  const full = width >= 1180;      // the whole nav fits on one line from here up
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const go = (h: string) => { setOpen(false); router.push(h as any); };
  const acct = user ? { label: isAdmin(user) ? t('admin') : t('me'), href: isAdmin(user) ? '/admin' : '/me' } : { label: t('signin'), href: '/login' };
  return (
    <View style={{ backgroundColor: C.ink, borderBottomWidth: 1, borderBottomColor: 'rgba(201,162,74,.22)', zIndex: 20 }}>
      <Container style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 68, gap: 16 }}>
        <Brand />
        {full ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }} accessibilityRole={'navigation' as any}>
            {NAV.map(([h, k]) => {
              const active = path === h || path.startsWith(h + '/');
              return (
                <Tap key={h} href={h} style={(hv) => ({ paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: 1, borderRadius: 8, backgroundColor: hv ? 'rgba(246,239,226,.07)' : 'transparent' })}>
                  <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 14.5, fontWeight: '600', color: active ? C.gold : '#E9DFCB', paddingHorizontal: 2, whiteSpace: 'nowrap' } as any}>{t(k)}</Text>
                </Tap>
              );
            })}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: mid ? 10 : 6, flexShrink: 0 }}>
          {mid ? <LangToggle /> : null}
          <Btn small label={acct.label} href={acct.href} icon={user ? <UserIcon size={16} color={C.ink} /> : undefined} style={!mid ? { paddingHorizontal: 12 } : null} />
          {!full ? (
            <Pressable onPress={() => setOpen(true)} accessibilityLabel={t('menu')} style={{ padding: 6 }}><Menu color={C.parchment} size={26} /></Pressable>
          ) : null}
        </View>
      </Container>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: C.ink }}>
          <Container style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
            <Brand />
            <Pressable onPress={() => setOpen(false)} accessibilityLabel={t('close')} style={{ padding: 8 }}><X color={C.parchment} size={28} /></Pressable>
          </Container>
          <ScrollView contentContainerStyle={{ padding: 28, gap: 6 }}>
            <View style={{ alignSelf: 'flex-start', marginBottom: 10 }}><LangToggle /></View>
            {[['/', 'home'], ...NAV, ['/opportunities', 'opportunities'], ['/ask', 'ask']].map(([h, k]) => (
              <Pressable key={h} onPress={() => go(h)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontFamily: F.display, fontSize: 32, color: path === h ? C.gold : C.parchment, fontWeight: '500' }}>{t(k)}</Text>
              </Pressable>
            ))}
            <Liyawela width={260} style={{ alignItems: 'flex-start', marginVertical: 18 }} />
            {user ? (
              <View style={{ gap: 12 }}>
                <Btn label={t('me')} onPress={() => go('/me')} />
                {isAdmin(user) ? <Btn variant="light" label={t('admin')} onPress={() => go('/admin')} /> : null}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <Btn label={t('signin')} onPress={() => go('/login')} />
                <Btn variant="light" label={t('join')} onPress={() => go('/join')} />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export function Footer() {
  const { t, lang } = useLang();
  const taps = useRef<number[]>([]);
  const tapLotus = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((x) => now - x < 2500), now];
    if (taps.current.length >= 7) { taps.current = []; router.push('/play'); }
  };
  const col = (title: string, links: [string, string][]) => (
    <View style={{ gap: 10, minWidth: 150 }}>
      <Text style={{ fontFamily: F.body, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: '700' }}>{title}</Text>
      {links.map(([h, k]) => (
        <Link key={h} href={h as any} asChild><Pressable><Text style={{ fontFamily: F.body, color: '#D9CDB6', fontSize: 15 }}>{t(k)}</Text></Pressable></Link>
      ))}
    </View>
  );
  return (
    <View style={{ backgroundColor: C.ink, paddingTop: 56, paddingBottom: 36, marginTop: 0 }}>
      <Container style={{ gap: 36 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between' }}>
          <View style={{ gap: 14, maxWidth: 360 }}>
            <Pressable onPress={tapLotus} accessibilityLabel="Lotus" style={{ alignSelf: 'flex-start' }}><Lotus size={44} /></Pressable>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.parchment, fontWeight: '600' }}>{t('org')}</Text>
            <Text style={{ fontFamily: F.body, color: '#B9AC95', fontSize: 15, lineHeight: 23 }}>
              {lang === 'si' ? 'ඉද්දවෙල මහගෙදර, ගඩලාදෙණිය හන්දියට ඉදිරියෙන්, කොළඹ–මහනුවර A1 මාර්ගය, පිළිමතලාව.' : 'Iddawela Mahagedara, opposite Gadaladeniya Junction on the Colombo–Kandy A1, Pilimathalawa, Sri Lanka.'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 36 }}>
            {col(t('story'), [['/story', 'story'], ['/tree', 'tree'], ['/gallery', 'gallery'], ['/ask', 'ask']])}
            {col(t('events'), [['/events', 'events'], ['/memorial', 'memorial'], ['/news', 'news'], ['/causes', 'causes']])}
            {col(t('members'), [['/join', 'join'], ['/login', 'signin'], ['/opportunities', 'opportunities'], ['/me', 'me']])}
          </View>
        </View>
        <Liyawela width={1000} color="rgba(201,162,74,.5)" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
          <Small color="#8E8270">© {new Date().getFullYear()} {t('org')} · iddawela.com {lang === 'si' ? '2008 සිට' : 'since 2008'} · {lang === 'si' ? 'වෙබ් පරිපාලක: රෝහණ ඉද්දවෙල (2008 සිට)' : 'Webmaster since 2008: Rohana Iddawela'}</Small>
          <Small color="#8E8270">{lang === 'si' ? 'පවුලෙන් පවුලට, පරම්පරාවෙන් පරම්පරාවට.' : 'From family to family, generation to generation.'}</Small>
        </View>
      </Container>
    </View>
  );
}

/** Standard scrolling page with footer */
export function Screen({ children, bg = C.parchment, footer = true }: { children: React.ReactNode; bg?: string; footer?: boolean }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flexGrow: 1 }}>{children}</View>
      {footer ? <Footer /> : null}
    </ScrollView>
  );
}
