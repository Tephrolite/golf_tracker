<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profile';
import { useRoundStore } from '../stores/rounds';
const router = useRouter();
const profiles = useProfileStore();
const rounds = useRoundStore();
onMounted(() => {
  void rounds.loadActiveRound();
});
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    profiles.clear();
    rounds.clear();
    await router.push('/sign-in');
  }
}
</script>
<template>
  <main class="app-shell">
    <RouterView /><button type="button" @click="signOut">Sign Out</button>
    <nav aria-label="Primary navigation">
      <RouterLink to="/app">Home</RouterLink><RouterLink to="/app/rounds">Rounds</RouterLink
      ><span v-if="!rounds.isLoaded || rounds.isLoading" class="start">Checking</span
      ><RouterLink
        v-else
        class="start"
        :to="rounds.activeRound ? `/app/rounds/${rounds.activeRound.id}/play` : '/app/round/start'"
        >{{ rounds.activeRound ? 'Resume' : 'Start' }}</RouterLink
      ><RouterLink to="/app/courses">Courses</RouterLink
      ><RouterLink to="/app/profile">Profile</RouterLink>
    </nav>
  </main>
</template>
