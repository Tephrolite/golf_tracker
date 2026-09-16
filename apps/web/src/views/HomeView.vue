<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoundStore } from '../stores/rounds';
const rounds = useRoundStore();
onMounted(() => {
  void rounds.loadActiveRound();
});
</script>
<template>
  <section class="catalog">
    <h1>Golf Track</h1>
    <article v-if="rounds.activeRound" class="active-round">
      <p>Round in progress</p>
      <h2>{{ rounds.activeRound.courseNameSnapshot }}</h2>
      <p>
        {{ rounds.activeRound.teeNameSnapshot }} · {{ rounds.activeRound.scheduledHoleCount }} holes
        · {{ rounds.activeRound.playedOn }}
      </p>
      <RouterLink class="command" :to="`/app/rounds/${rounds.activeRound.id}/play`"
        >Resume Round</RouterLink
      >
    </article>
    <p v-else-if="rounds.error" role="alert">
      {{ rounds.error }} <button @click="rounds.loadActiveRound(true)">Retry</button>
    </p>
  </section>
</template>
