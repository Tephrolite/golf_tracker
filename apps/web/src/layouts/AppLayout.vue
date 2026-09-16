<script setup lang="ts">
import { useRouter } from 'vue-router';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profile';
const router = useRouter();
const profiles = useProfileStore();
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    profiles.clear();
    await router.push('/sign-in');
  }
}
</script>
<template>
  <main class="app-shell">
    <RouterView /><button type="button" @click="signOut">Sign Out</button>
    <nav aria-label="Primary navigation">
      <RouterLink to="/app">Home</RouterLink><RouterLink to="/app/rounds">Rounds</RouterLink
      ><RouterLink class="start" to="/app/round/start">Start</RouterLink
      ><RouterLink to="/app/courses">Courses</RouterLink
      ><RouterLink to="/app/profile">Profile</RouterLink>
    </nav>
  </main>
</template>
