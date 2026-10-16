export type N = {
  id: number; slug: string; name_en: string; name_si?: string; gender?: string | null; generation?: number | null; branch_no?: number | null;
  is_descendant: boolean; deceased: boolean; birth_year?: number | null; death_year?: number | null; photo?: string | null;
  parent_ids: number[]; spouse_ids: number[]; sibling_order?: number | null; restricted?: boolean;
};
export type Placed = { id: number; x: number; y: number; angle?: number; partners: number[]; depth: number; hasHidden?: boolean };
export type Link = { from: number; to: number };

export function index(nodes: N[]) {
  const byId = new Map<number, N>(nodes.map((n) => [n.id, n]));
  const kids = new Map<number, number[]>();
  for (const n of nodes) for (const p of n.parent_ids) { if (!kids.has(p)) kids.set(p, []); kids.get(p)!.push(n.id); }
  const ord = (a: number, b: number) => {
    const A = byId.get(a)!, B = byId.get(b)!;
    return (A.sibling_order ?? 999) - (B.sibling_order ?? 999) || (A.birth_year ?? 9999) - (B.birth_year ?? 9999) || a - b;
  };
  for (const [k, v] of kids) kids.set(k, Array.from(new Set(v)).sort(ord));
  return { byId, kids };
}

/** Blood-line children shown under a person: descendants, de-duplicated so each child appears once (under its descendant parent). */
function bloodKids(id: number, byId: Map<number, N>, kids: Map<number, number[]>, placed: Set<number>) {
  return (kids.get(id) || []).filter((c) => !placed.has(c) && byId.get(c)?.is_descendant);
}

// ---------------- classic top-down family tree with couples ----------------
export const CW = 168, CH = 72, GAPX = 18, GAPY = 120;
export function classic(rootId: number, byId: Map<number, N>, kids: Map<number, number[]>, collapsed: Set<number>) {
  const placed = new Set<number>(); const out: Placed[] = []; const links: Link[] = [];
  type T = { id: number; partners: number[]; children: T[]; w: number; depth: number; hidden: boolean };
  const build = (id: number, depth: number): T => {
    placed.add(id);
    const partners = (byId.get(id)?.spouse_ids || []).filter((s) => !placed.has(s) && !(byId.get(s)?.is_descendant && byId.get(s)?.parent_ids.length));
    partners.forEach((p) => placed.add(p));
    // children of the person or of their partners
    let ch: number[] = bloodKids(id, byId, kids, placed);
    for (const p of partners) ch = ch.concat(bloodKids(p, byId, kids, placed).filter((c) => !ch.includes(c)));
    const hidden = collapsed.has(id) && ch.length > 0;
    const children = hidden ? [] : ch.map((c) => build(c, depth + 1));
    const own = CW * (1 + partners.length) + 8 * partners.length;
    const cw = children.reduce((a, c) => a + c.w, 0) + GAPX * Math.max(0, children.length - 1);
    return { id, partners, children, w: Math.max(own, cw), depth, hidden };
  };
  const root = build(rootId, 0);
  const place = (t: T, x0: number) => {
    const own = CW * (1 + t.partners.length) + 8 * t.partners.length;
    let cx = x0 + t.w / 2;
    let x = x0 + (t.w - (t.children.reduce((a, c) => a + c.w, 0) + GAPX * Math.max(0, t.children.length - 1))) / 2;
    for (const c of t.children) { place(c, x); links.push({ from: t.id, to: c.id }); x += c.w + GAPX; }
    out.push({ id: t.id, x: cx - own / 2, y: t.depth * (CH + GAPY), partners: t.partners, depth: t.depth, hasHidden: t.hidden });
  };
  place(root, 0);
  return { placed: out, links, width: root.w, height: (Math.max(...out.map((p) => p.depth)) + 1) * (CH + GAPY) };
}

// ---------------- radial "lotus" layout of all descendants ----------------
export function radial(centerId: number, byId: Map<number, N>, kids: Map<number, number[]>, collapsed: Set<number>) {
  const placed = new Set<number>([centerId]); const out: Placed[] = []; const links: Link[] = [];
  const center = byId.get(centerId)!;
  center.spouse_ids.forEach((s) => placed.add(s));
  type T = { id: number; children: T[]; leaves: number; depth: number; hidden: boolean };
  const build = (id: number, depth: number): T => {
    placed.add(id);
    const sp = byId.get(id)?.spouse_ids || [];
    let ch = bloodKids(id, byId, kids, placed);
    for (const s of sp) ch = ch.concat(bloodKids(s, byId, kids, placed).filter((c) => !ch.includes(c)));
    const hidden = collapsed.has(id) && ch.length > 0;
    const children = hidden ? [] : ch.map((c) => build(c, depth + 1));
    return { id, children, leaves: Math.max(1, children.reduce((a, c) => a + c.leaves, 0)), depth, hidden };
  };
  const top = (kids.get(centerId) || []).filter((c) => byId.get(c)?.is_descendant).map((c) => build(c, 1));
  const total = top.reduce((a, c) => a + c.leaves, 0);
  const R = (d: number) => (d === 1 ? 260 : 260 + (d - 1) * 250 + (d > 2 ? (d - 2) * 60 : 0));
  const gapPerBranch = 0.035;
  const usable = Math.PI * 2 - gapPerBranch * top.length;
  const place = (t: T, a0: number, a1: number, parent: number | null) => {
    const a = (a0 + a1) / 2; const r = R(t.depth);
    out.push({ id: t.id, x: Math.cos(a) * r, y: Math.sin(a) * r, angle: a, partners: [], depth: t.depth, hasHidden: t.hidden });
    if (parent != null) links.push({ from: parent, to: t.id });
    let s = a0;
    for (const c of t.children) { const span = ((a1 - a0) * c.leaves) / t.leaves; place(c, s, s + span, t.id); s += span; }
  };
  let s = -Math.PI / 2 - (usable / total) * (top[0]?.leaves || 0) / 2;
  for (const t of top) { const span = (usable * t.leaves) / total; place(t, s, s + span, centerId); s += span + gapPerBranch; }
  out.push({ id: centerId, x: 0, y: 0, partners: center.spouse_ids, depth: 0 });
  const maxR = R(Math.max(...out.map((o) => o.depth)));
  return { placed: out, links, radius: maxR + 220 };
}
