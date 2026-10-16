// Relationship naming in English and in Sinhala (Sinhala kinship distinguishes parallel and cross relatives,
// elder and younger siblings, and the father's from the mother's side).
export type TNode = { id: number; name_en: string; name_si?: string; gender?: 'M' | 'F' | null; birth_year?: number | null; parent_ids: number[]; spouse_ids: number[]; is_descendant: boolean };

function ancestors(id: number, byId: Map<number, TNode>) {
  const out = new Map<number, { d: number; via: number[] }>();
  const q: [number, number, number[]][] = [[id, 0, [id]]];
  while (q.length) {
    const [x, d, path] = q.shift()!;
    if (out.has(x)) continue;
    out.set(x, { d, via: path });
    for (const p of byId.get(x)?.parent_ids || []) if (!out.has(p)) q.push([p, d + 1, [...path, p]]);
  }
  return out;
}

export type Rel = { en: string; si: string; lca?: number };

function ord(n: number) { return ['', 'first', 'second', 'third', 'fourth', 'fifth'][n] || `${n}th`; }
function greats(n: number) { return n <= 0 ? '' : n === 1 ? 'great-' : `${n}× great-`; }

export function blood(a: number, b: number, byId: Map<number, TNode>): Rel | null {
  if (a === b) return { en: 'the same person', si: 'එකම පුද්ගලයා' };
  const A = ancestors(a, byId), Bm = ancestors(b, byId);
  let best: { id: number; up: number; down: number } | null = null;
  for (const [id, { d }] of A) {
    const o = Bm.get(id);
    if (o && (!best || d + o.d < best.up + best.down)) best = { id, up: d, down: o.d };
  }
  if (!best) return null;
  const B = byId.get(b)!; const g = B.gender; const { up, down } = best;
  const pick = (m: string, f: string, n: string) => (g === 'M' ? m : g === 'F' ? f : n);
  const elder = (x?: TNode | null, y?: TNode | null) => (x?.birth_year && y?.birth_year ? x.birth_year < y.birth_year : null);
  const pathA = A.get(best.id)!.via; const pathB = Bm.get(best.id)!.via;
  const sa = byId.get(pathA[pathA.length - 2]); const sb = byId.get(pathB[pathB.length - 2]);  // the two siblings under the common ancestor
  const Anode = byId.get(a)!;
  if (down === 0) {
    if (up === 1) return { en: pick('father', 'mother', 'parent'), si: pick('තාත්තා', 'අම්මා', 'දෙමාපියා'), lca: best.id };
    if (up === 2) return { en: pick('grandfather', 'grandmother', 'grandparent'), si: pick('සීයා', 'ආච්චි', 'සීයා / ආච්චි'), lca: best.id };
    return { en: greats(up - 2) + pick('grandfather', 'grandmother', 'grandparent'), si: (up === 3 ? 'මුත්තා / මිත්තණිය' : `${up - 2} වන පරම්පරාවේ මුතුන් මිත්තෙකු`), lca: best.id };
  }
  if (up === 0) {
    if (down === 1) return { en: pick('son', 'daughter', 'child'), si: pick('පුතා', 'දුව', 'දරුවා'), lca: best.id };
    if (down === 2) return { en: pick('grandson', 'granddaughter', 'grandchild'), si: pick('මුණුපුරා', 'මිණිපිරිය', 'මුනුබුරා'), lca: best.id };
    return { en: greats(down - 2) + pick('grandson', 'granddaughter', 'grandchild'), si: 'මී මුණුපුරා / මී මිණිපිරිය', lca: best.id };
  }
  if (up === 1 && down === 1) {
    const e = elder(B, Anode);
    return { en: pick('brother', 'sister', 'sibling'),
      si: g === 'M' ? (e === false ? 'මල්ලී' : 'අයියා') : g === 'F' ? (e === false ? 'නංගී' : 'අක්කා') : 'සහෝදරයා / සහෝදරිය', lca: best.id };
  }
  if (down === 1 && up >= 2) {
    // B is a sibling of A's ancestor: uncle/aunt
    const viaParent = sa; // A's ancestor who is B's sibling
    const en = greats(up - 2) + pick('uncle', 'aunt', 'uncle/aunt');
    let si = 'මාමා / නැන්දා';
    if (up === 2 && viaParent) {
      const older = elder(B, viaParent);
      if (viaParent.gender === 'M') si = g === 'M' ? (older ? 'ලොකු තාත්තා' : 'බාප්පා') : 'නැන්දා';
      else if (viaParent.gender === 'F') si = g === 'M' ? 'මාමා' : (older ? 'ලොකු අම්මා' : 'පුංචි අම්මා');
    } else if (up > 2) si = 'මුත්තණුවන්ගේ සහෝදර / සහෝදරිය';
    return { en, si, lca: best.id };
  }
  if (up === 1 && down >= 2) {
    const en = greats(down - 2) + pick('nephew', 'niece', 'nephew/niece');
    let si = pick('බෑණා', 'ලේලි', 'බෑණා / ලේලි');
    if (down === 2 && sb && Anode.gender) {
      const parallel = sb.gender === Anode.gender;   // my brother's children (for a man) are my "own" children
      si = parallel ? pick('පුතා (සහෝදර දරුවා)', 'දුව (සහෝදර දරුවා)', 'දරුවා') : pick('බෑණා', 'ලේලි', 'බෑණා / ලේලි');
    }
    return { en, si, lca: best.id };
  }
  const degree = Math.min(up, down) - 1; const removed = Math.abs(up - down);
  const en = `${ord(degree)} cousin${removed ? (removed === 1 ? ' once removed' : removed === 2 ? ' twice removed' : ` ${removed}× removed`) : ''}`;
  let si = 'ඥාති සොහොයුරා / සොහොයුරිය';
  if (degree === 1 && !removed && sa && sb && sa.gender && sb.gender) {
    if (sa.gender === sb.gender) {
      const e = elder(B, Anode);
      si = g === 'M' ? (e === false ? 'මල්ලී (ඥාති)' : 'අයියා (ඥාති)') : g === 'F' ? (e === false ? 'නංගී (ඥාති)' : 'අක්කා (ඥාති)') : 'ඥාති සහෝදරයා';
    } else si = pick('මස්සිනා', 'නෑනා', 'මස්සිනා / නෑනා');
  }
  return { en, si, lca: best.id };
}

export function relation(a: number, b: number, byId: Map<number, TNode>): Rel {
  const r = blood(a, b, byId);
  if (r) return r;
  const A = byId.get(a)!, B = byId.get(b)!;
  if (A.spouse_ids.includes(b)) return { en: B.gender === 'F' ? 'wife' : B.gender === 'M' ? 'husband' : 'spouse', si: B.gender === 'F' ? 'බිරිඳ' : B.gender === 'M' ? 'සැමියා' : 'කලත්‍රයා' };
  // B married into my blood family
  for (const s of B.spouse_ids) {
    const r2 = blood(a, s, byId);
    if (r2) {
      const sp = byId.get(s)!;
      if (r2.en === 'brother' || r2.en === 'sister' || r2.en === 'sibling') return { en: B.gender === 'F' ? 'sister-in-law' : 'brother-in-law', si: B.gender === 'F' ? 'නෑනා / අක්කා' : 'මස්සිනා / අයියා' };
      if (['son', 'daughter', 'child'].includes(r2.en)) return { en: B.gender === 'F' ? 'daughter-in-law' : 'son-in-law', si: B.gender === 'F' ? 'ලේලි' : 'බෑණා' };
      return { en: `${r2.en}'s ${B.gender === 'F' ? 'wife' : B.gender === 'M' ? 'husband' : 'spouse'}`, si: `${r2.si}ගේ ${B.gender === 'F' ? 'බිරිඳ' : 'සැමියා'}`, lca: r2.lca };
    }
  }
  // I married into B's family
  for (const s of A.spouse_ids) {
    const r3 = blood(s, b, byId);
    if (r3) {
      if (['father', 'mother', 'parent'].includes(r3.en)) return { en: B.gender === 'F' ? 'mother-in-law' : 'father-in-law', si: B.gender === 'F' ? 'නැන්දම්මා' : 'මාමණ්ඩිය' };
      if (['brother', 'sister', 'sibling'].includes(r3.en)) return { en: B.gender === 'F' ? 'sister-in-law' : 'brother-in-law', si: B.gender === 'F' ? 'නෑනා' : 'මස්සිනා' };
      return { en: `spouse's ${r3.en}`, si: `කලත්‍රයාගේ ${r3.si}`, lca: r3.lca };
    }
  }
  return { en: 'related by marriage', si: 'විවාහයෙන් ඥාති' };
}

/** shortest path through parent/child/spouse links (for highlighting) */
export function path(a: number, b: number, byId: Map<number, TNode>, childrenOf: Map<number, number[]>): number[] {
  const prev = new Map<number, number | null>([[a, null]]); const q = [a];
  while (q.length) {
    const x = q.shift()!; if (x === b) break;
    const n = byId.get(x); if (!n) continue;
    for (const y of [...n.parent_ids, ...(childrenOf.get(x) || []), ...n.spouse_ids]) if (!prev.has(y)) { prev.set(y, x); q.push(y); }
  }
  if (!prev.has(b)) return [];
  const out = [b]; let c = b; while (prev.get(c) != null) { c = prev.get(c)!; out.push(c); }
  return out.reverse();
}
