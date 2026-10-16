import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { BRANCH, C } from '../lib/theme';
import { classic, radial, CW, CH, N, index } from '../lib/treeLayout';

export type CanvasHandle = { zoom: (f: number) => void; fit: () => void; flyTo: (id: number, k?: number) => void };
type Props = {
  nodes: N[]; view: 'lotus' | 'classic'; rootId: number; centerId: number; lang: 'en' | 'si';
  selected?: number | null; pathIds?: number[]; branch?: number | null; collapsed: Set<number>;
  onSelect: (id: number) => void; onToggle: (id: number) => void;
};

const bc = (n?: number | null) => (n ? BRANCH[(n - 1) % 13] : '#8C7E6A');
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const label = (n: N, lang: string) => (lang === 'si' && n.name_si ? n.name_si : n.name_en).replace(/^(Wijesundara Mudiyanselage|Bulumulle Weerakoon Mudiyanselage)\s+/, '');
const yrs = (n: N) => (n.birth_year || n.death_year ? `${n.birth_year || ''}${n.death_year ? '–' + n.death_year : ''}` : '');

const TreeCanvas = forwardRef<CanvasHandle, Props>(function TreeCanvas(p, ref) {
  const wrap = useRef<HTMLDivElement>(null); const vp = useRef<SVGGElement>(null); const svg = useRef<SVGSVGElement>(null);
  const T = useRef({ x: 0, y: 0, k: 1 }); const anim = useRef<number | null>(null);
  const { byId, kids } = useMemo(() => index(p.nodes), [p.nodes]);
  const L = useMemo(() => (p.view === 'classic' ? classic(p.rootId, byId, kids, p.collapsed) : radial(p.centerId, byId, kids, p.collapsed)), [p.view, p.rootId, p.centerId, byId, kids, p.collapsed]);
  const pos = useMemo(() => {
    const m = new Map<number, { x: number; y: number; a?: number; d: number }>();
    for (const q of L.placed) {
      if (p.view === 'classic') {
        m.set(q.id, { x: q.x + CW / 2, y: q.y + CH / 2, d: q.depth });
        q.partners.forEach((s, i) => m.set(s, { x: q.x + (CW + 8) * (i + 1) + CW / 2, y: q.y + CH / 2, d: q.depth }));
      } else m.set(q.id, { x: q.x, y: q.y, a: q.angle, d: q.depth });
    }
    return m;
  }, [L, p.view]);

  const apply = useCallback(() => {
    const t = T.current; vp.current?.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
    svg.current?.setAttribute('data-z', t.k < 0.35 ? 'far' : t.k < 0.8 ? 'mid' : 'near');
    // perimeter labels for the 13 siblings keep a constant, readable screen size at any zoom
    // and are nudged apart in screen space so neighbours never sit on top of each other
    const els = Array.from(svg.current?.querySelectorAll<SVGGElement>('.plbl') || []);
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    els.map((g) => ({ g, x: +g.dataset.x! * t.k, y: +g.dataset.y! * t.k, w: +g.dataset.w!, h: +g.dataset.h!, a: g.dataset.a! }))
      .sort((a, b) => a.y - b.y)
      .forEach((o) => {
        const x0 = o.a === 'end' ? o.x - o.w : o.a === 'start' ? o.x : o.x - o.w / 2;
        let y = o.y; let guard = 0;
        const hit = () => boxes.some((b) => x0 < b.x1 && x0 + o.w > b.x0 && y - o.h / 2 < b.y1 && y + o.h / 2 > b.y0);
        while (hit() && guard++ < 40) y += 4;
        boxes.push({ x0, x1: x0 + o.w, y0: y - o.h / 2, y1: y + o.h / 2 });
        o.g.setAttribute('transform', `translate(${o.x / t.k},${y / t.k}) scale(${1 / t.k})`);
      });
  }, []);
  useEffect(() => { apply(); });   // re-place perimeter labels after every render

  const animateTo = useCallback((x: number, y: number, k: number) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const s = { ...T.current }; const t0 = performance.now(); const dur = 650;
    const step = (now: number) => {
      const e = Math.min(1, (now - t0) / dur); const q = 1 - Math.pow(1 - e, 3);
      T.current = { x: s.x + (x - s.x) * q, y: s.y + (y - s.y) * q, k: s.k + (k - s.k) * q }; apply();
      if (e < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [apply]);
  const bounds = useCallback(() => {
    if (p.view === 'classic') { const l = L as any; return { x0: -40, y0: -40, x1: l.width + 40, y1: l.height }; }
    const r = (L as any).radius + 120; return { x0: -r - 60, y0: -r - 420, x1: r + 60, y1: r + 80 };
  }, [L, p.view]);
  const fit = useCallback((animate = true) => {
    const el = wrap.current; if (!el) return;
    const { x0, y0, x1, y1 } = bounds(); const W = el.clientWidth, H = el.clientHeight;
    let k = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.96;
    if (p.view === 'classic') k = Math.max(k, Math.min(0.55, W / 900));
    const x = W / 2 - ((x0 + x1) / 2) * k; const y = p.view === 'classic' ? 30 - y0 * k : H / 2 - ((y0 + y1) / 2) * k;
    if (animate) animateTo(x, y, k); else { T.current = { x, y, k }; apply(); }
  }, [bounds, animateTo, apply, p.view]);
  const flyTo = useCallback((id: number, k = 1.25) => {
    const el = wrap.current; const q = pos.get(id); if (!el || !q) return;
    animateTo(el.clientWidth / 2 - q.x * k, el.clientHeight / 2 - q.y * k, k);
  }, [pos, animateTo]);
  const zoom = useCallback((f: number) => {
    const el = wrap.current; if (!el) return; const t = T.current; const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    const k = Math.max(0.05, Math.min(4, t.k * f)); animateTo(cx - ((cx - t.x) / t.k) * k, cy - ((cy - t.y) / t.k) * k, k);
  }, [animateTo]);
  useImperativeHandle(ref, () => ({ zoom, fit: () => fit(true), flyTo }), [zoom, fit, flyTo]);
  useEffect(() => {
    if (p.view === 'classic' && wrap.current) {
      const q = pos.get(p.centerId); const k = 0.78;
      if (q) { T.current = { k, x: wrap.current.clientWidth / 2 - q.x * k, y: 190 - q.y * k }; apply(); return; }
    }
    fit(false);
  }, [p.view]); // eslint-disable-line

  // pan / pinch / wheel
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const pts = new Map<number, { x: number; y: number }>(); let moved = 0; let pinch: { d: number; k: number; cx: number; cy: number; tx: number; ty: number } | null = null;
    const down = (e: PointerEvent) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const r = el.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: T.current.k, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, tx: T.current.x, ty: T.current.y }; } };
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId); if (!prev) return; const cur = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, cur);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const k = Math.max(0.05, Math.min(4, (pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
        T.current = { k, x: pinch.cx - ((pinch.cx - pinch.tx) / pinch.k) * k, y: pinch.cy - ((pinch.cy - pinch.ty) / pinch.k) * k }; apply(); moved = 99; return; }
      const dx = cur.x - prev.x, dy = cur.y - prev.y; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 4) { if (anim.current) cancelAnimationFrame(anim.current); T.current.x += dx; T.current.y += dy; apply(); el.style.cursor = 'grabbing'; }
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; el.style.cursor = 'grab'; (el as any)._moved = moved; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); const cx = e.clientX - r.left, cy = e.clientY - r.top; const t = T.current;
      const k = Math.max(0.05, Math.min(4, t.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))));
      T.current = { k, x: cx - ((cx - t.x) / t.k) * k, y: cy - ((cy - t.y) / t.k) * k }; apply(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }, [apply]);

  const click = (id: number) => (e: React.MouseEvent) => { if ((wrap.current as any)?._moved > 6) return; e.stopPropagation(); p.onSelect(id); };
  const pathSet = useMemo(() => new Set(p.pathIds || []), [p.pathIds]);
  const pathEdges = useMemo(() => { const s = new Set<string>(); const a = p.pathIds || []; for (let i = 1; i < a.length; i++) { s.add(a[i - 1] + '-' + a[i]); s.add(a[i] + '-' + a[i - 1]); } return s; }, [p.pathIds]);
  const dimmed = (n?: N) => !!n && ((pathSet.size > 0 && !pathSet.has(n.id)) || (!!p.branch && n.branch_no !== p.branch && n.generation !== 1 && n.generation !== 0));
  const css = `
    .tc text{font-family:Inter,'Noto Sans Sinhala',sans-serif;user-select:none}
    .tc .nm{font-family:Fraunces,'Abhaya Libre',Georgia,serif}
    .tc[data-z=far] .lbl-d4,.tc[data-z=far] .lbl-d3{display:none}
    .tc[data-z=far] .lbl-d2{display:none}
    .tc[data-z=mid] .lbl-d4{display:none}
    .tc[data-z=far] .lbl-d1{display:none}
    .tc .plbl{display:none;cursor:pointer}
    .tc[data-z=far] .plbl{display:inline}
    .tc .plbl text{paint-order:stroke;stroke:${C.ink};stroke-width:5px;stroke-linejoin:round}
    .tc .plbl:hover text.pn{fill:${C.gold}}
    .tc .node{cursor:pointer;transition:opacity .35s}
    .tc .node:hover .ring{stroke:${C.gold};stroke-width:3}
    .tc .dim{opacity:.16}
    .tc .lk{transition:opacity .35s}
  `;
  const nodeEls: React.ReactNode[] = []; const linkEls: React.ReactNode[] = []; const perim: React.ReactNode[] = [];
  if (p.view === 'classic') {
    for (const l of L.links) {
      const a = pos.get(l.from), b = pos.get(l.to); if (!a || !b) continue;
      const q = L.placed.find((x) => x.id === l.from)!; const ax = q.partners.length ? a.x + (CW + 8) / 2 : a.x;
      const my = a.y + CH / 2 + GAP_HALF;
      const on = pathEdges.has(l.from + '-' + l.to) || (q.partners.some((s) => pathEdges.has(s + '-' + l.to)));
      linkEls.push(<path key={'l' + l.to} className="lk" d={`M${ax} ${a.y + CH / 2} V${my} H${b.x} V${b.y - CH / 2}`} fill="none" stroke={on ? C.gold : bc(byId.get(l.to)?.branch_no)} strokeOpacity={on ? 1 : dimmed(byId.get(l.to)) ? 0.12 : 0.5} strokeWidth={on ? 4 : 1.6} />);
    }
    for (const q of L.placed) {
      const ids = [q.id, ...q.partners];
      ids.forEach((id, i) => {
        const n = byId.get(id); if (!n) return; const c = pos.get(id)!; const x = c.x - CW / 2, y = c.y - CH / 2;
        const sel = p.selected === id; const inPath = pathSet.has(id); const col = bc(n.branch_no);
        nodeEls.push(
          <g key={'n' + id} className={'node' + (dimmed(n) ? ' dim' : '')} onClick={click(id)} role="button" aria-label={n.name_en}>
            <title>{label(n, p.lang)}{yrs(n) ? ` (${yrs(n)})` : ''}</title>
            {i > 0 ? <g><circle cx={x - 4} cy={c.y} r={7} fill={C.parchment} stroke={C.gold} strokeWidth={1.5} /><circle cx={x - 4} cy={c.y} r={3} fill="none" stroke={C.gold} strokeWidth={1.2} /></g> : null}
            <rect className="ring" x={x} y={y} width={CW} height={CH} rx={14} fill={n.is_descendant ? C.paper : '#F3EBDC'} stroke={sel || inPath ? C.gold : 'rgba(0,0,0,.12)'} strokeWidth={sel || inPath ? 3 : 1} />
            <rect x={x} y={y + 10} width={4} height={CH - 20} rx={2} fill={col} />
            <clipPath id={'cp' + id}><circle cx={x + 34} cy={c.y} r={21} /></clipPath>
            <circle cx={x + 34} cy={c.y} r={23} fill={n.deceased ? C.ink2 : C.sand} stroke={col} strokeWidth={2} />
            {n.photo ? <image href={n.photo} x={x + 13} y={c.y - 21} width={42} height={42} clipPath={`url(#cp${id})`} preserveAspectRatio="xMidYMid slice" />
              : <text x={x + 34} y={c.y + 6} textAnchor="middle" fontSize={16} className="nm" fill={n.deceased ? C.goldSoft : col} fontWeight={600}>{(n.name_en.match(/\b[A-Z]/g) || ['?']).slice(-2).join('')}</text>}
            <text x={x + 64} y={c.y - 4} fontSize={13.5} className="nm" fill={C.ink} fontWeight={600}>{short(label(n, p.lang), 15)}</text>
            <text x={x + 64} y={c.y + 14} fontSize={11} fill={C.stone}>{yrs(n) || (n.is_descendant ? '' : p.lang === 'si' ? 'විවාහයෙන්' : 'by marriage')}{n.deceased ? ' ✦' : ''}</text>
            {i === 0 && q.hasHidden ? (
              <g onClick={(e) => { e.stopPropagation(); if ((wrap.current as any)?._moved > 6) return; p.onToggle(id); }}>
                <circle cx={q.partners.length ? x + CW + 4 : c.x} cy={y + CH + 14} r={12} fill={col} />
                <text x={q.partners.length ? x + CW + 4 : c.x} y={y + CH + 19} textAnchor="middle" fontSize={15} fill="#fff" fontWeight={700}>+</text>
              </g>
            ) : null}
          </g>
        );
      });
    }
  } else {
    for (const l of L.links) {
      const a = pos.get(l.from), b = pos.get(l.to); if (!a || !b) continue;
      const on = pathEdges.has(l.from + '-' + l.to) || pathEdges.has(byId.get(l.from)?.spouse_ids.map((s) => s + '-' + l.to)[0] || '');
      const mx = (a.x + b.x) / 2 * 0.92, my = (a.y + b.y) / 2 * 0.92;
      linkEls.push(<path key={'l' + l.to} className="lk" d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`} fill="none" stroke={on ? C.gold : bc(byId.get(l.to)?.branch_no)} strokeOpacity={on ? 1 : dimmed(byId.get(l.to)) ? 0.08 : 0.45} strokeWidth={on ? 5 : l.from === p.centerId ? 3 : 1.6} />);
    }
    for (const q of L.placed) {
      const n = byId.get(q.id); if (!n) continue; const c = pos.get(q.id)!; const col = bc(n.branch_no); const sel = p.selected === q.id; const inPath = pathSet.has(q.id);
      if (q.depth === 0) {
        const sp = byId.get(n.spouse_ids[0]);
        nodeEls.push(
          <g key="center" className="node" onClick={click(q.id)} role="button" aria-label={n.name_en}>
            <circle r={118} fill={C.ink} stroke={C.gold} strokeWidth={2} />
            <circle r={104} fill="none" stroke={C.gold} strokeOpacity={0.35} strokeDasharray="3 7" />
            <text y={-22} textAnchor="middle" fontSize={26} className="nm" fill={C.parchment} fontWeight={600}>{p.lang === 'si' ? 'උක්කුබණ්ඩා' : 'Ukkubanda'}</text>
            <text y={6} textAnchor="middle" fontSize={16} fill={C.gold}>&amp;</text>
            <text y={34} textAnchor="middle" fontSize={26} className="nm" fill={C.parchment} fontWeight={600}>{p.lang === 'si' ? 'ලොකුමැණිකේ' : 'Lokumenike'}</text>
            <text y={60} textAnchor="middle" fontSize={12} fill={C.goldSoft} letterSpacing={2}>1880 · 1885</text>
            {sp ? null : null}
          </g>
        );
        continue;
      }
      const r = q.depth === 1 ? 34 : q.depth === 2 ? 17 : q.depth === 3 ? 11 : 8;
      const a = c.a || 0; const deg = (a * 180) / Math.PI; const flip = Math.cos(a) < 0;
      const lx = c.x + Math.cos(a) * (r + 8), ly = c.y + Math.sin(a) * (r + 8);
      nodeEls.push(
        <g key={'n' + q.id} className={'node' + (dimmed(n) ? ' dim' : '')} onClick={click(q.id)} role="button" aria-label={n.name_en}>
          <title>{label(n, p.lang)}{yrs(n) ? ` (${yrs(n)})` : ''}</title>
          {(sel || inPath) ? <circle cx={c.x} cy={c.y} r={r + 9} fill={C.gold} fillOpacity={0.25} /> : null}
          <clipPath id={'cp' + q.id}><circle cx={c.x} cy={c.y} r={r - 2} /></clipPath>
          <circle className="ring" cx={c.x} cy={c.y} r={r} fill={q.depth === 1 ? (n.deceased ? C.ink2 : C.paper) : col} fillOpacity={q.depth === 1 ? 1 : n.deceased ? 0.55 : 0.95} stroke={sel || inPath ? C.gold : q.depth === 1 ? col : 'rgba(246,239,226,.55)'} strokeWidth={sel || inPath ? 4 : q.depth === 1 ? 3 : 1.2} />
          {n.photo && r >= 11 ? <image href={n.photo} x={c.x - r} y={c.y - r} width={r * 2} height={r * 2} clipPath={`url(#cp${q.id})`} preserveAspectRatio="xMidYMid slice" /> : null}
          {q.depth === 1 && !n.photo ? <text x={c.x} y={c.y + 7} textAnchor="middle" fontSize={20} className="nm" fill={n.deceased ? C.goldSoft : col} fontWeight={700}>{n.sibling_order}</text> : null}
          {q.hasHidden ? <circle cx={c.x + Math.cos(a) * (r + 3)} cy={c.y + Math.sin(a) * (r + 3)} r={5} fill={col} /> : null}
          {q.depth === 1 ? (
            <text className="nm lbl-d1" x={c.x + Math.cos(a) * (r + 12)} y={c.y + Math.sin(a) * (r + 12)} dominantBaseline="middle" textAnchor={flip ? 'end' : 'start'}
              transform={`rotate(${flip ? deg + 180 : deg} ${c.x + Math.cos(a) * (r + 12)} ${c.y + Math.sin(a) * (r + 12)})`} fontSize={30} fill={C.goldSoft} fontWeight={600}>
              {short(label(n, p.lang).replace(' Iddawela', '').replace(' ඉද්දවෙල', ''), 14)}
            </text>
          ) : (
            <text className={`lbl-d${q.depth}`} x={lx} y={ly} fontSize={q.depth === 2 ? 15 : q.depth === 3 ? 12 : 10.5} fill={q.depth === 2 ? C.parchment : '#CDBFA8'} dominantBaseline="middle"
              textAnchor={flip ? 'end' : 'start'} transform={`rotate(${flip ? deg + 180 : deg} ${lx} ${ly})`}>{short(label(n, p.lang), 26)}</text>
          )}
        </g>
      );
    }
    const R = (L as any).radius || 1200;
    for (const q of L.placed) {
      if (q.depth !== 1) continue;
      const n = byId.get(q.id); if (!n) continue;
      const a = q.angle || 0; const cx = Math.cos(a), sy = Math.sin(a);
      const px = (R + 30) * cx, py = (R + 30) * sy;
      const narrow = typeof window !== 'undefined' && window.innerWidth < 700;
      const anchor = narrow ? 'middle' : cx > 0.25 ? 'end' : cx < -0.25 ? 'start' : 'middle';  // read inward so labels never leave the canvas
      const nmTxt = short(label(n, p.lang).replace(' Iddawela', '').replace(' ඉද්දවෙල', ''), 22);
      const txt = `${n.sibling_order ? `${n.sibling_order} · ` : ''}${nmTxt}`;
      perim.push(narrow ? (
        <g key={'p' + q.id} className={'plbl' + (dimmed(n) ? ' dim' : '')} data-x={px} data-y={py} data-w={30} data-h={30} data-a="middle" transform={`translate(${px},${py})`} onClick={click(q.id)} role="button" aria-label={n.name_en}>
          <circle r={14} fill={C.ink} stroke={bc(n.branch_no)} strokeWidth={2.5} />
          <text className="nm pn" y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.goldSoft}>{n.sibling_order || ''}</text>
        </g>
      ) : (
        <g key={'p' + q.id} className={'plbl' + (dimmed(n) ? ' dim' : '')} data-x={px} data-y={py} data-w={txt.length * 8.6 + 8} data-h={38} data-a={anchor} transform={`translate(${px},${py})`} onClick={click(q.id)} role="button" aria-label={n.name_en}>
          <text className="nm pn" y={-2} textAnchor={anchor} fontSize={16} fontWeight={600} fill={C.goldSoft}>{txt}</text>
          <text y={14} textAnchor={anchor} fontSize={11.5} fill={bc(n.branch_no)} style={{ letterSpacing: 1 }}>{yrs(n)}</text>
        </g>
      ));
    }
  }
  const bg = p.view === 'classic' ? C.parchment : C.ink;
  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none', cursor: 'grab', background: p.view === 'classic'
      ? `radial-gradient(circle at 50% 0%, #FFFDF8 0%, ${C.parchment} 60%)` : `radial-gradient(circle at 50% 50%, #2A211B 0%, ${C.ink} 70%)` }}>
      <svg ref={svg} className="tc" width="100%" height="100%" style={{ display: 'block', background: 'transparent' }}>
        <style>{css}</style>
        <g ref={vp}>
          {p.view === 'lotus' ? [1, 2, 3, 4].map((d) => <circle key={d} r={d === 1 ? 260 : 260 + (d - 1) * 250 + (d > 2 ? (d - 2) * 60 : 0)} fill="none" stroke={C.gold} strokeOpacity={0.1} strokeDasharray="4 10" />) : null}
          {linkEls}{nodeEls}{perim}
        </g>
      </svg>
      <span style={{ display: 'none' }}>{bg}</span>
    </div>
  );
});
const GAP_HALF = 60;
export default TreeCanvas;
