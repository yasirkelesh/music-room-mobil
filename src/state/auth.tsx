import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api, ApiError, refreshSession, session } from '@/api/client';
import type { OwnProfile, TokenPair } from '@/api/types';
import { forgetDevice } from '@/lib/device';
import { googleCode } from '@/lib/social';

const KEY = 'musicroom.refreshToken';
const store = {
  get: () => SecureStore.getItemAsync(KEY).catch(() => null),
  set: (v: string) => SecureStore.setItemAsync(KEY, v).catch(() => {}),
  clear: () => SecureStore.deleteItemAsync(KEY).catch(() => {}),
};

type Status = 'loading' | 'signedOut' | 'signedIn';

type Auth = {
  status: Status;
  /** Own profile (display name, preferences). Null until loaded. */
  me: OwnProfile | null;
  /** The account id (`sub`), which ownerId / userId fields in the API refer to. */
  userId: string | null;
  /** Resolves with the freshly loaded profile (null if it could not be read). */
  signIn: (email: string, password: string) => Promise<OwnProfile | null>;
  /** Google's consent page, then the API's tokens. `undefined` when the user closed the page. An account is created on first use. */
  signInWithGoogle: () => Promise<OwnProfile | null | undefined>;
  signOut: () => Promise<void>;
  reloadMe: () => Promise<OwnProfile>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<OwnProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const reloadMe = useCallback(async () => {
    const [profile, info] = await Promise.all([api.me.get(), api.me.userInfo()]);
    setMe(profile);
    setUserId(info.sub);
    return profile;
  }, []);

  const finish = useCallback(async (pair: TokenPair) => {
    session.set(pair);
    await store.set(pair.refreshToken);
    const profile = await reloadMe().catch(() => null);
    setStatus('signedIn');
    return profile;
  }, [reloadMe]);

  // Persist every rotated refresh token; drop to the welcome screen when the session is revoked.
  useEffect(() => {
    session.configure({
      onTokens: (pair) => store.set(pair.refreshToken),
      onExpired: () => {
        store.clear();
        forgetDevice();
        setMe(null);
        setUserId(null);
        setStatus('signedOut');
        router.replace('/welcome');
      },
    });
  }, []);

  // Restore the session on launch by rotating the stored refresh token.
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await store.get();
      if (!stored) { if (alive) setStatus('signedOut'); return; }
      session.setRefreshOnly(stored);
      const ok = await refreshSession();
      if (!alive) return;
      if (!ok) {
        // Offline at launch keeps the token for next time; a revoked one was already cleared by onExpired.
        setStatus('signedOut');
        return;
      }
      await reloadMe().catch(() => {});
      if (alive) setStatus('signedIn');
    })();
    return () => { alive = false; };
  }, [reloadMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    return finish(await api.auth.signIn(email.trim(), password));
  }, [finish]);

  const signInWithGoogle = useCallback(async () => {
    const code = await googleCode();
    if (!code) return undefined;
    return finish(await api.auth.signInSocial(code));
  }, [finish]);

  const signOut = useCallback(async () => {
    try { await api.auth.signOut(); } catch (e) { if (!(e instanceof ApiError)) throw e; }
    session.set(null);
    forgetDevice();
    await store.clear();
    setMe(null);
    setUserId(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<Auth>(() => ({ status, me, userId, signIn, signInWithGoogle, signOut, reloadMe }), [status, me, userId, signIn, signInWithGoogle, signOut, reloadMe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
