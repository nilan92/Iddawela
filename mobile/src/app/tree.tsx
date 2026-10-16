import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, Plus, Minus, Maximize2, X, GitBranch, Flower2, Link2, ArrowRight } from '../components/icons';
import TreeCanvas, { CanvasHandle } from '../components/TreeCanvas';
import { Avatar, Btn, Chip, H3, Loading, Small } from '../components/ui';
import { C, F, branchColor, shadow } from '../lib/theme';
import { nm, useLang, years } from '../lib/i18n';
import { useApi, useLayout, useTitle } from '../lib/hooks';
import { index, N } from '../lib/treeLayout';
import { relation, path as kinPath } from '../lib/kinship';
import { useAuth } from '../lib/auth';

export default function TreeScreen() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { wide } = useLayout();
  const params = useLocalSearchParams<{ q?: string; branch?: string; p?: string }>();
  const { data } = useApi<{ nodes: N[] }>('/api/tree');
  useTitle(t('tree'));
  const nodes = data?.nodes || [];
  const { byId, kids } = useMemo(() => index(nodes), [nodes]);
  const bySlug = useMemo(() => new Map(nodes.map((n) => [n.slug, n])), [nodes]);
  const rootId = bySlug.get('mudalihami')?.id || 0; const centerId = bySlug.get('ukkubanda')?.id || 0;
  const [view, setView] = useState<'lotus' | 'classic'>('lotus');
  const [sel, setSel] = useState<number | null>(null);
  const [relA, setRelA] = useState<number | null>(null);
  const [relMode, setRelMode] = useState(false);
  const [branch, setBranch] = useState<number | null>(params.branch ? Number(params.branch) : null);
  const [q, setQ] = useState(params.q || '');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const canvas = useRef<CanvasHandle>(null);
  const me = user?.person?.id as number | undefined;

  // classic view starts folded at the grandchildren so it opens readable
  useEffect(() => {
    if (!nodes.length) return;
    setCollapsed(new Set(nodes.filter((n) => n.generation === 3 && n.is_descendant).map((n) => n.id)));
  }, [nodes.length]);
  useEffect(() => {
    if (params.p && bySlug.get(params.p)) focus(bySlug.get(params.p)!.id);
  }, [params.p, nodes.length]); // eslint-disable-line

  const reveal = (id: number) => {
    // unfold every ancestor so the person is visible in the classic view
    setCollapsed((prev) => { const s = new Set(prev); let cur: number | undefined = id; const seen = new Set<number>();
      while (cur && !seen.has(cur)) { seen.add(cur); s.delete(cur); const n = byId.get(cur); cur = n?.parent_ids.find((x) => byId.get(x)?.is_descendant) ?? n?.parent_ids[0]; for (const sp of n?.spouse_ids || []) s.delete(sp); }
      return s; });
  };
  const focus = (id: number) => {
    reveal(id); setSel(id);
    setTimeout(() => canvas.current?.flyTo(id, view === 'classic' ? 0.9 : 1.1), 60);
  };
  const pick = (id: number) => {
    if (relMode && relA && id !== relA) { setSel(id); setRelMode(false); reveal(id); return; }
    setSel(id);
  };
  const pathIds = useMemo(() => (relA && sel && relA !== sel ? kinPath(relA, sel, byId as any, kids) : []), [relA, sel, byId, kids]);
  const rel = useMemo(() => (relA && sel && relA !== sel ? relation(relA, sel, byId as any) : null), [relA, sel, byId]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return [];
    return nodes.filter((n) => n.name_en.toLowerCase().includes(s) || (n.name_si || '').includes(q.trim())).slice(0, 8);
  }, [q, nodes]);
  const selected = sel ? byId.get(sel) : null;
  const A = relA ? byId.get(relA) : null;
  const thirteen = useMemo(() => nodes.filter((n) => n.generation === 2 && n.is_descendant && n.branch_no).sort((a, b) => (a.branch_no || 0) - (b.branch_no || 0)), [nodes]);

  if (!data) return <View style={{ flex: 1, backgroundColor: C.ink }}><Loading /></View>;
  const dark = view === 'lotus';
  const glass = { backgroundColor: dark ? 'rgba(21,17,14,.82)' : 'rgba(251,247,239,.94)', borderWidth: 1, borderColor: dark ? 'rgba(201,162,74,.3)' : C.line, borderRadius: 18, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)' } as any) : {}) };
  const fg = dark ? C.parchment : C.ink;
  return (
    <View style={{ flex: 1, backgroundColor: dark ? C.ink : C.parchment }}>
      <TreeCanvas ref={canvas} nodes={nodes} view={view} rootId={rootId} centerId={centerId} lang={lang} selected={sel} pathIds={pathIds}
        branch={branch} collapsed={view === 'classic' ? collapsed : new Set()} onSelect={pick}
        onToggle={(id: number) => setCollapsed((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; })} />

      {/* toolbar */}
      <View style={{ position: 'absolute', top: 14, left: 14, right: 14, gap: 10 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }} pointerEvents="box-none">
          <View style={[glass, { flex: 1, minWidth: 240, maxWidth: 440 }, shadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
              <Search size={18} color={dark ? C.goldSoft : C.stone} />
              <TextInput value={q} onChangeText={setQ} placeholder={relMode ? t('pickPerson') : lang === 'si' ? 'නමක් සොයන්න…' : 'Search 370+ relatives…'} placeholderTextColor={dark ? '#9C8F7B' : C.mute}
                accessibilityLabel={t('search')} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontFamily: F.body, fontSize: 16, color: fg, outlineStyle: 'none' } as any} />
              {q ? <Pressable onPress={() => setQ('')}><X size={18} color={fg} /></Pressable> : null}
            </View>
            {results.length ? (
              <View style={{ borderTopWidth: 1, borderTopColor: dark ? 'rgba(201,162,74,.2)' : C.line, paddingVertical: 4 }}>
                {results.map((n) => (
                  <Pressable key={n.id} onPress={() => { setQ(''); if (relMode && relA) { pick(n.id); focus(n.id); } else focus(n.id); }}
                    style={({ hovered }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: hovered ? 'rgba(201,162,74,.14)' : 'transparent' })}>
                    <Avatar person={n} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 15.5, color: fg }} numberOfLines={1}>{nm(n, lang)}</Text>
                      <Small color={dark ? '#9C8F7B' : C.stone}>{t('generation')} {n.generation} {n.branch_no ? `· ${t('branch')} ${n.branch_no}` : ''} {years(n) ? '· ' + years(n) : ''}</Small>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <View style={[glass, { flexDirection: 'row', padding: 4 }]}>
            {(['lotus', 'classic'] as const).map((v) => (
              <Pressable key={v} onPress={() => setView(v)} accessibilityLabel={v}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, backgroundColor: view === v ? C.gold : 'transparent' }}>
                {v === 'lotus' ? <Flower2 size={16} color={view === v ? C.ink : fg} /> : <GitBranch size={16} color={view === v ? C.ink : fg} />}
                <Text style={{ fontFamily: F.body, fontWeight: '700', fontSize: 13.5, color: view === v ? C.ink : fg }}>{v === 'lotus' ? (lang === 'si' ? 'නෙළුම' : 'Lotus') : (lang === 'si' ? 'ගස' : 'Tree')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
          <Chip label={t('all')} active={!branch} onPress={() => setBranch(null)} />
          {thirteen.map((n) => (
            <Chip key={n.id} label={`${n.branch_no}. ${nm(n, lang).replace(/ Iddawela| ඉද්දවෙල/, '')}`} color={branchColor(n.branch_no)} active={branch === n.branch_no}
              onPress={() => { setBranch(branch === n.branch_no ? null : n.branch_no!); if (branch !== n.branch_no) focus(n.id); }} />
          ))}
        </ScrollView>
      </View>

      {/* zoom */}
      <View style={[glass, { position: 'absolute', right: 14, bottom: selected && !wide ? 250 : 18, padding: 4, gap: 2 }]}>
        {[[Plus, () => canvas.current?.zoom(1.4), 'Zoom in'], [Minus, () => canvas.current?.zoom(1 / 1.4), 'Zoom out'], [Maximize2, () => canvas.current?.fit(), 'Fit']].map(([I, fn, l]: any) => (
          <Pressable key={l} onPress={fn} accessibilityLabel={l} style={{ padding: 10 }}><I size={20} color={fg} /></Pressable>
        ))}
      </View>
      {me && !selected ? (
        <View style={{ position: 'absolute', left: 14, bottom: 18 }}>
          <Btn small label={lang === 'si' ? 'මාව පෙන්වන්න' : 'Show me'} onPress={() => focus(me)} />
        </View>
      ) : null}

      {/* person panel */}
      {selected ? (
        <View style={[glass, shadow, { position: 'absolute', right: wide ? 76 : 10, left: wide ? undefined : 10, bottom: wide ? 18 : 10, width: wide ? 380 : undefined, padding: 18, gap: 12 }]}>
          <Pressable onPress={() => { setSel(null); setRelA(null); setRelMode(false); }} style={{ position: 'absolute', right: 10, top: 10, padding: 6, zIndex: 2 }} accessibilityLabel={t('close')}><X size={18} color={fg} /></Pressable>
          {rel && A ? (
            <View style={{ gap: 6, paddingRight: 24 }}>
              <Small color={dark ? C.goldSoft : C.lacquer}>{t('howRelated')}</Small>
              <Text style={{ fontFamily: F.display, fontSize: 21, color: fg, lineHeight: 28 }}>
                {lang === 'si' ? `${nm(selected, lang)}, ${nm(A, lang)}ගේ ` : `${nm(selected, lang)} is ${nm(A, lang)}'s `}
                <Text style={{ color: C.gold, fontWeight: '700' }}>{lang === 'si' ? rel.si : rel.en}</Text>
              </Text>
              <Small color={dark ? '#B9AC95' : C.stone}>{lang === 'si' ? `ඉංග්‍රීසියෙන්: ${rel.en}` : `In Sinhala: ${rel.si}`} · {pathIds.length - 1} {lang === 'si' ? 'පියවර' : 'steps'}</Small>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingRight: 24 }}>
            <Avatar person={selected} size={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.display, fontSize: 21, color: fg, fontWeight: '600' }} numberOfLines={2}>{nm(selected, lang)}</Text>
              <Small color={dark ? '#B9AC95' : C.stone}>{years(selected) || (selected.restricted ? t('membersOnly') : '')}</Small>
              <Small color={branchColor(selected.branch_no)}>{selected.branch_no ? `${t('branch')} ${selected.branch_no}` : ''}{selected.generation != null ? ` · ${t('generation')} ${selected.generation}` : ''}</Small>
            </View>
          </View>
          {selected.spouse_ids.length ? <Small color={dark ? '#CDBFA8' : C.ink2}>∞ {selected.spouse_ids.map((s) => nm(byId.get(s), lang)).join(', ')}</Small> : null}
          {kids.get(selected.id)?.length ? <Small color={dark ? '#CDBFA8' : C.ink2}>{t('children')}: {kids.get(selected.id)!.map((c) => nm(byId.get(c), lang).split(' ')[0]).join(', ')}</Small> : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Btn small label={lang === 'si' ? 'පැතිකඩ' : 'Open profile'} href={`/people/${selected.slug}`} icon={<ArrowRight size={15} color={C.ink} />} />
            <Btn small variant={dark ? 'light' : 'outline'} label={relMode ? t('pickPerson') : t('howRelated')} icon={<Link2 size={15} color={fg} />}
              onPress={() => { if (me && me !== selected.id && !relA) { setRelA(me); return; } setRelA(selected.id); setRelMode(true); }} />
          </View>
          {relMode ? <Small color={C.gold}>{lang === 'si' ? 'දැන් ගසේ හෝ සෙවුමෙන් දෙවන පුද්ගලයා තෝරන්න.' : 'Now tap a second person on the tree, or search for them.'}</Small> : null}
        </View>
      ) : null}
    </View>
  );
}
