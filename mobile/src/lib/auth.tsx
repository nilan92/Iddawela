import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearCache } from './api';

export type User = { id: number; name: string; email?: string; phone?: string; role: 'super_admin' | 'family_admin' | 'member'; status: string; person?: any; branch_person_id?: number | null; lang: string; webmaster?: { en: string; si: string } | null };
type Ctx = { user: User | null; ready: boolean; signIn: (token: string, user: User) => void; signOut: () => void; refresh: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, ready: false, signIn: () => {}, signOut: () => {}, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setReady(true); return; }
    try { setUser(await api<User>('/api/auth/me')); } catch (e: any) { if (e?.status === 401) setToken(null); setUser(null); }
    setReady(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const signIn = (token: string, u: User) => { setToken(token); clearCache(); setUser(u); };
  const signOut = () => { setToken(null); clearCache(); setUser(null); };
  return <AuthCtx.Provider value={{ user, ready, signIn, signOut, refresh }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
export const isAdmin = (u?: User | null) => !!u && u.status === 'approved' && (u.role === 'super_admin' || u.role === 'family_admin');
export const isMember = (u?: User | null) => !!u && u.status === 'approved';
/** The webmaster's name comes from the server for signed-in members; everyone else sees the role. */
export const webmasterName = (u: User | null | undefined, lang: string) => (isMember(u) && u!.webmaster ? (lang === 'si' ? u!.webmaster.si : u!.webmaster.en) : null);
