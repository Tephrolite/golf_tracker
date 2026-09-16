import { createMemoryHistory } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() } } }));
import { createAppRouter } from '../src/router/index';
import { resolveInternalRedirect } from '../src/router/redirect';
import { useAuthStore, type AuthClient } from '../src/stores/auth';

const signedOutClient: AuthClient = { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };

describe('routing security', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('redirects unauthenticated protected navigation and preserves its internal path', async () => {
    await useAuthStore().initialize(signedOutClient); const router = createAppRouter(createMemoryHistory());
    await router.push('/app/rounds'); await router.isReady();
    expect(router.currentRoute.value.path).toBe('/sign-in'); expect(router.currentRoute.value.query.redirect).toBe('/app/rounds');
  });
  it('redirects unprovisioned authenticated users from sign-in to profile completion', async () => {
    const store = useAuthStore(); await store.initialize(signedOutClient); store.session = { access_token: 'token' } as never;
    const router = createAppRouter(createMemoryHistory()); await router.push('/sign-in'); await router.isReady();
    expect(router.currentRoute.value.path).toBe('/profile/complete');
  });
  it('accepts only internal post-authentication redirect paths', () => {
    expect(resolveInternalRedirect('/app/rounds?tab=recent')).toBe('/app/rounds?tab=recent');
    expect(resolveInternalRedirect('https://attacker.example')).toBe('/app');
    expect(resolveInternalRedirect('//attacker.example')).toBe('/app');
    expect(resolveInternalRedirect('\\\\attacker.example')).toBe('/app');
  });
});