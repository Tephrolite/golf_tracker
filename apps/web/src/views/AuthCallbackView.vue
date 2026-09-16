<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProfileStore } from '../stores/profile';
import { resolveInternalRedirect } from '../router/redirect';
const message = ref('Confirming your account...');
const router = useRouter();
const route = useRoute();
onMounted(async () => {
  const auth = useAuthStore();
  await auth.initialize();
  if (!auth.isAuthenticated) {
    message.value = 'This confirmation link is invalid or has expired.';
    return;
  }
  const profiles = useProfileStore();
  await profiles.restore();
  if (profiles.hasProfile) {
    await router.replace(resolveInternalRedirect(route.query.redirect));
  } else {
    await router.replace('/profile/complete');
  }
});
</script>
<template>
  <section>
    <h1>Account Confirmation</h1>
    <p>{{ message }}</p>
  </section>
</template>
