import { Platform } from 'react-native';

const BASE = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL || 'https://iddawela.com');
const KEY = 'idw_token';
let memToken: string | null = null;

export function getToken(): string | null {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage.getItem(KEY);
  return memToken;
}
/** Images are plain <img> requests (no Authorization header), so members-only photos are authorised by a cookie scoped to /media only. */
function mediaCookie(t: string | null) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = t ? `idw_session=${t}; Path=/media; Max-Age=${30 * 86400}; SameSite=Lax${secure}` : `idw_session=; Path=/media; Max-Age=0; SameSite=Lax${secure}`;
}
export function setToken(t: string | null) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); }
  memToken = t;
  mediaCookie(t);
}
if (Platform.OS === 'web' && typeof localStorage !== 'undefined') mediaCookie(localStorage.getItem(KEY));
export const mediaUrl = (u?: string | null) => (u ? (u.startsWith('http') ? u : BASE + u) : undefined);

export class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }

export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  let body: any;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
  const res = await fetch(BASE + path, { method: opts.method || (body ? 'POST' : 'GET'), headers, body });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    let msg = (data && (typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail[0]?.msg : null)) || `Something went wrong (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

// tiny SWR-ish cache so tabs feel instant
const cache = new Map<string, any>();
export function cached(path: string) { return cache.get(path); }
export async function load<T = any>(path: string): Promise<T> { const d = await api<T>(path); cache.set(path, d); return d; }
export function clearCache() { cache.clear(); }
