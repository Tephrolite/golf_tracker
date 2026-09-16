import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Session } from '@supabase/supabase-js';

export interface SessionReader {
  getSession(): Promise<{ data: { session: Session | null } }>;
}
export interface AuthSubscription {
  unsubscribe(): void;
}
export interface AuthClient extends SessionReader {
  onAuthStateChange(callback: (event: string, session: Session | null) => void): {
    data: { subscription: AuthSubscription };
  };
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const isLoading = ref(true);
  const isAuthenticated = computed(() => session.value !== null);
  let initialized = false;
  let subscription: AuthSubscription | undefined;
  async function initialize(client?: AuthClient) {
    if (initialized) return;
    initialized = true;
    try {
      const auth = client ?? (await import('../lib/supabase')).supabase.auth;
      subscription = auth.onAuthStateChange((_event, nextSession) => {
        session.value = nextSession;
      }).data.subscription;
      session.value = (await auth.getSession()).data.session;
    } catch {
      session.value = null;
    } finally {
      isLoading.value = false;
    }
  }
  function dispose() {
    subscription?.unsubscribe();
    subscription = undefined;
    initialized = false;
  }
  return { session, isLoading, isAuthenticated, initialize, dispose };
});
