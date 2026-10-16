import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { cached, load } from './api';
import { useAuth } from './auth';

export function useApi<T = any>(path: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<T | undefined>(path ? cached(path) : undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path && !cached(path));
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try { setData(await load<T>(path)); setError(null); } catch (e: any) { setError(e.message || 'Error'); }
    setLoading(false);
  }, [path, user?.id, user?.status]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, wide: width >= 900, mid: width >= 640, xl: width >= 1200 };
}

export function useTitle(title?: string) {
  useEffect(() => {
    if (Platform.OS === 'web' && title) document.title = title.includes('Iddawela') ? title : `${title} · Iddawela Foundation`;
  }, [title]);
}

export function useReveal() {
  // fade-up on first paint (web only; respects reduced motion via CSS)
  const ref = useRef<any>(null);
  return ref;
}
