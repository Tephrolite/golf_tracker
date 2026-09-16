import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Profile, ProfileBootstrapInput } from '@golf-track/shared';
import { ApiError, bootstrapProfile, getMe } from '../lib/api';
import { useAuthStore } from './auth';

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null);
  const isLoading = ref(false);
  const isBootstrapping = ref(false);
  const error = ref<string | null>(null);
  let loadedForToken: string | null = null;
  const hasProfile = computed(() => profile.value !== null);
  async function restore() {
    const auth = useAuthStore();
    const token = auth.session?.access_token;
    if (!token) {
      clear();
      return;
    }
    if (loadedForToken === token) return;
    isLoading.value = true;
    error.value = null;
    try {
      profile.value = (await getMe(token)).profile;
      loadedForToken = token;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        profile.value = null;
        loadedForToken = token;
      } else {
        error.value = 'We could not load your profile. Please try again.';
      }
    } finally {
      isLoading.value = false;
    }
  }
  async function bootstrap(input: ProfileBootstrapInput) {
    const token = useAuthStore().session?.access_token;
    if (!token) throw new Error('Your session has expired.');
    isBootstrapping.value = true;
    error.value = null;
    try {
      profile.value = await bootstrapProfile(token, input);
      loadedForToken = token;
      return profile.value;
    } catch (caught) {
      error.value =
        caught instanceof ApiError
          ? caught.message
          : 'We could not complete your profile. Please try again.';
      throw caught;
    } finally {
      isBootstrapping.value = false;
    }
  }
  function clear() {
    profile.value = null;
    error.value = null;
    loadedForToken = null;
    isLoading.value = false;
  }
  return { profile, isLoading, isBootstrapping, error, hasProfile, restore, bootstrap, clear };
});
