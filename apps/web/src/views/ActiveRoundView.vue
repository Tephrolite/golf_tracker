<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { RoundDetails } from '@golf-track/shared';
import { useRoundStore } from '../stores/rounds';
const route = useRoute();
const rounds = useRoundStore();
const round = ref<RoundDetails | null>(null);
const error = ref('');
onMounted(async () => {
  try {
    round.value = await rounds.loadRound(String(route.params.roundId));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Round not found.';
  }
});
</script>
<template>
  <section class="catalog">
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else-if="round"
      ><p class="eyebrow">Round in progress</p>
      <h1>{{ round.courseNameSnapshot }}</h1>
      <p>
        {{ round.teeNameSnapshot }} · {{ round.scheduledHoleCount }} holes ·
        {{ round.trackingMode }} · {{ round.playedOn }}
      </p>
      <p>Starting hole {{ round.startingHoleNumber }}</p>
      <div class="hole-grid">
        <div v-for="hole in round.holes" :key="hole.id">
          <strong>{{ hole.playSequence }}. Hole {{ hole.holeNumber }}</strong
          ><span>Par {{ hole.par }} · {{ hole.yardage ?? '—' }} yd</span>
        </div>
      </div>
      <p>Score entry is the next part of the application.</p></template
    >
    <p v-else>Loading round...</p>
  </section>
</template>
