import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { CreateRoundInput, RoundDetails } from '@golf-track/shared';
import { ApiError, createRound, getActiveRound, getRound } from '../lib/api';
import { useAuthStore } from './auth';

export const useRoundStore = defineStore('rounds', () => {
  const activeRound = ref<RoundDetails | null>(null);
  const isLoading = ref(false);
  const isLoaded = ref(false);
  const isStarting = ref(false);
  const error = ref<string | null>(null);
  let loadedForToken: string | null = null;
  let inFlight: Promise<RoundDetails | null> | null = null;
  const hasActiveRound = computed(() => activeRound.value !== null);
  async function loadActiveRound(force = false) {
    const token = useAuthStore().session?.access_token;
    if (!token) {
      clear();
      return null;
    }
    if (!force && loadedForToken === token) return activeRound.value;
    if (inFlight) return inFlight;
    isLoading.value = true;
    error.value = null;
    inFlight = getActiveRound(token)
      .then((round) => {
        activeRound.value = round;
        loadedForToken = token;
        return round;
      })
      .catch((caught) => {
        error.value =
          caught instanceof ApiError ? caught.message : 'We could not load your active round.';
        return null;
      })
      .finally(() => {
        isLoading.value = false;
        isLoaded.value = true;
        inFlight = null;
      });
    return inFlight;
  }
  async function startRound(input: CreateRoundInput) {
    const token = useAuthStore().session?.access_token;
    if (!token) throw new Error('Your session has expired.');
    isStarting.value = true;
    error.value = null;
    try {
      activeRound.value = await createRound(token, input);
      loadedForToken = token;
      isLoaded.value = true;
      return activeRound.value;
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'ACTIVE_ROUND_EXISTS')
        await loadActiveRound(true);
      error.value = caught instanceof ApiError ? caught.message : 'We could not start your round.';
      throw caught;
    } finally {
      isStarting.value = false;
    }
  }
  async function loadRound(id: string) {
    const token = useAuthStore().session?.access_token;
    if (!token) throw new Error('Your session has expired.');
    return getRound(token, id);
  }
  function clear() {
    activeRound.value = null;
    isLoading.value = false;
    isLoaded.value = false;
    isStarting.value = false;
    error.value = null;
    loadedForToken = null;
    inFlight = null;
  }
  return {
    activeRound,
    isLoading,
    isLoaded,
    isStarting,
    error,
    hasActiveRound,
    loadActiveRound,
    startRound,
    loadRound,
    clear,
  };
});
