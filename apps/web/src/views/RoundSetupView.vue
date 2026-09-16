<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { CourseDetails } from '@golf-track/shared';
import { getCourse, listCourses } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { useRoundStore } from '../stores/rounds';
import { useRouter } from 'vue-router';
const router = useRouter();
const rounds = useRoundStore();
const courses = ref<Awaited<ReturnType<typeof listCourses>>['courses']>([]);
const selected = ref<CourseDetails | null>(null);
const search = ref('');
const teeId = ref('');
const length = ref<9 | 18>(9);
const startingHoleNumber = ref(1);
const trackingMode = ref<'basic' | 'detailed'>('basic');
const playedOn = ref(new Date().toLocaleDateString('en-CA'));
const error = ref('');
const canSubmit = computed(
  () => selected.value !== null && teeId.value !== '' && !rounds.isStarting,
);
async function loadCourses() {
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  try {
    courses.value = (await listCourses(token, search.value)).courses;
  } catch {
    error.value = 'We could not load courses.';
  }
}
async function selectCourse(id: string) {
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  selected.value = await getCourse(token, id);
  teeId.value = '';
  length.value = selected.value.holeCount === 9 ? 9 : length.value;
  startingHoleNumber.value = selected.value.holes[0]?.holeNumber ?? 1;
}
async function submit() {
  if (!selected.value || !teeId.value || rounds.isStarting) return;
  try {
    const round = await rounds.startRound({
      courseId: selected.value.id,
      courseTeeId: teeId.value,
      scheduledHoleCount: length.value,
      startingHoleNumber: startingHoleNumber.value,
      trackingMode: trackingMode.value,
      playedOn: playedOn.value,
    });
    await router.push(`/app/rounds/${round.id}/play`);
  } catch {
    if (rounds.activeRound) await router.push(`/app/rounds/${rounds.activeRound.id}/play`);
    else error.value = rounds.error ?? 'We could not start your round.';
  }
}
onMounted(async () => {
  await rounds.loadActiveRound();
  await loadCourses();
});
</script>
<template>
  <section class="catalog">
    <template v-if="rounds.activeRound"
      ><p class="eyebrow">Round in progress</p>
      <h1>{{ rounds.activeRound.courseNameSnapshot }}</h1>
      <RouterLink class="command" :to="`/app/rounds/${rounds.activeRound.id}/play`"
        >Resume Round</RouterLink
      ></template
    ><template v-else
      ><h1>Start Round</h1>
      <p v-if="error" role="alert">{{ error }}</p>
      <label>Search courses<input v-model="search" @change="loadCourses" /></label>
      <div class="course-list">
        <button
          v-for="course in courses"
          :key="course.id"
          type="button"
          @click="selectCourse(course.id)"
        >
          {{ course.name }} · {{ course.locationText || 'No location' }}
        </button>
      </div>
      <form v-if="selected" @submit.prevent="submit">
        <h2>{{ selected.name }}</h2>
        <label
          >Tee<select v-model="teeId">
            <option value="" disabled>Select tee</option>
            <option v-for="tee in selected.tees" :key="tee.id" :value="tee.id">
              {{ tee.name }}
            </option>
          </select></label
        >
        <fieldset>
          <legend>Holes</legend>
          <button type="button" :disabled="selected.holeCount === 9" @click="length = 18">18</button
          ><button type="button" @click="length = 9">9</button>
        </fieldset>
        <label
          >Starting hole<select v-model.number="startingHoleNumber">
            <option v-for="hole in selected.holes" :key="hole.holeNumber" :value="hole.holeNumber">
              Hole {{ hole.holeNumber }}
            </option>
          </select></label
        >
        <fieldset>
          <legend>Tracking</legend>
          <button type="button" @click="trackingMode = 'basic'">Basic</button
          ><button type="button" @click="trackingMode = 'detailed'">Detailed</button>
          <p>Basic records scores next; Detailed prepares additional hole details.</p>
        </fieldset>
        <label>Played on<input v-model="playedOn" type="date" /></label
        ><button class="command" :disabled="!canSubmit">
          {{ rounds.isStarting ? 'Starting...' : 'Start Round' }}
        </button>
      </form></template
    >
  </section>
</template>
