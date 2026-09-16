<script setup lang="ts">
import { ref } from 'vue';
import { profileBootstrapSchema } from '@golf-track/shared';
import { useProfileStore } from '../stores/profile';
import { useRouter } from 'vue-router';
const displayName = ref('');
const startingHandicap = ref('');
const error = ref('');
const profiles = useProfileStore();
const router = useRouter();
async function submit() {
  const parsed = profileBootstrapSchema.safeParse({
    displayName: displayName.value,
    startingHandicap: startingHandicap.value === '' ? undefined : Number(startingHandicap.value),
  });
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check your details.';
    return;
  }
  try {
    await profiles.bootstrap(parsed.data);
    await router.push('/app');
  } catch {
    error.value = profiles.error ?? 'We could not complete your profile.';
  }
}
</script>
<template>
  <section>
    <h1>Complete Your Profile</h1>
    <form @submit.prevent="submit">
      <label>Name<input v-model="displayName" autocomplete="name" /></label
      ><label
        >Starting handicap (optional)<input
          v-model="startingHandicap"
          type="number"
          min="-10"
          max="54"
          step="0.1"
      /></label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="profiles.isBootstrapping">
        {{ profiles.isBootstrapping ? 'Saving...' : 'Continue' }}
      </button>
    </form>
  </section>
</template>
