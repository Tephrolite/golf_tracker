<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { archiveCourse, getCourse } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const course = ref<Awaited<ReturnType<typeof getCourse>> | null>(null);
const error = ref('');
async function load() {
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  try {
    course.value = await getCourse(token, String(route.params.courseId));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not load course.';
  }
}
async function archive() {
  if (!course.value || !confirm(`Archive ${course.value.name}?`)) return;
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  await archiveCourse(token, course.value.id);
  await router.push('/app/courses');
}
onMounted(load);
</script>
<template>
  <section class="catalog">
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else-if="course"
      ><header>
        <div>
          <p class="eyebrow">{{ course.locationText || 'Course' }}</p>
          <h1>{{ course.name }}</h1>
          <p>
            {{ course.holeCount }} holes · Par {{ course.totalPar }} · {{ course.teeCount }} tees
          </p>
        </div>
        <div v-if="course.canEdit" class="actions">
          <RouterLink class="command" :to="`/app/courses/${course.id}/edit`">Edit</RouterLink
          ><button class="danger" @click="archive">Archive</button>
        </div>
      </header>
      <h2>Tees</h2>
      <div class="tee-list">
        <div v-for="tee in course.tees" :key="tee.id">
          <strong>{{ tee.name }}</strong
          ><span>{{ tee.totalYardage }} yd</span
          ><span>{{ tee.courseRating18 ?? '—' }} / {{ tee.slopeRating18 ?? '—' }}</span>
        </div>
      </div>
      <h2>Holes</h2>
      <div class="hole-grid">
        <div v-for="hole in course.holes" :key="hole.holeNumber">
          <strong>{{ hole.holeNumber }}</strong
          ><span>Par {{ hole.par }}</span
          ><span>SI {{ hole.strokeIndex ?? '—' }}</span
          ><span v-for="tee in course.tees" :key="tee.id"
            >{{ tee.name }}: {{ hole.yardages[tee.id] }} yd</span
          >
        </div>
      </div></template
    >
    <p v-else>Loading course...</p>
  </section>
</template>
