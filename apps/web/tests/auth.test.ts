import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore, type AuthClient } from '../src/stores/auth';

function createAuthClient(initialSession: Session | null = null) {
  let listener: ((event: string, session: Session | null) => void) | undefined;
  let subscriptions = 0;
  let unsubscribed = 0;
  const client: AuthClient = {
    getSession: async () => ({ data: { session: initialSession } }),
    onAuthStateChange(callback) {
      listener = callback; subscriptions += 1;
      return { data: { subscription: { unsubscribe: () => { unsubscribed += 1; } } } };
    },
  };
  return { client, emit: (event: string, session: Session | null) => listener?.(event, session), subscriptions: () => subscriptions, unsubscribed: () => unsubscribed };
}

describe('authentication store', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('stays loading until the initial session lookup resolves', async () => {
    const store = useAuthStore(); let resolveSession!: (value: { data: { session: null } }) => void;
    const auth = createAuthClient(); auth.client.getSession = () => new Promise((resolve) => { resolveSession = resolve; });
    const task = store.initialize(auth.client);
    expect(store.isLoading).toBe(true); resolveSession({ data: { session: null } }); await task;
    expect(store.isLoading).toBe(false); expect(store.isAuthenticated).toBe(false);
  });
  it('updates the session from state changes and clears it on sign-out', async () => {
    const store = useAuthStore(); const auth = createAuthClient(); await store.initialize(auth.client);
    const session = { access_token: 'token' } as Session;
    auth.emit('SIGNED_IN', session); expect(store.session).toStrictEqual(session);
    auth.emit('SIGNED_OUT', null); expect(store.session).toBeNull();
  });
  it('does not duplicate subscriptions and disposes the listener', async () => {
    const store = useAuthStore(); const auth = createAuthClient();
    await store.initialize(auth.client); await store.initialize(auth.client);
    expect(auth.subscriptions()).toBe(1); store.dispose(); expect(auth.unsubscribed()).toBe(1);
  });
  it('finishes loading when the initial session read fails', async () => {
    const store = useAuthStore(); const auth = createAuthClient(); auth.client.getSession = async () => { throw new Error('network failure'); };
    await store.initialize(auth.client);
    expect(store.isLoading).toBe(false); expect(store.session).toBeNull();
  });
});