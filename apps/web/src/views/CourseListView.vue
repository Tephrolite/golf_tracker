<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { listCourses, type ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth';
const courses = ref<Awaited<ReturnType<typeof listCourses>>['courses']>([]);
const search = ref('');
const loading = ref(true);
const error = ref('');
async function load() {
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  loading.value = true;
  error.value = '';
  try {
    courses.value = (await listCourses(token, search.value)).courses;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not load courses.';
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="catalog">
    <header>
      <div>
        <p class="eyebrow">Course catalog</p>
        <h1>Courses</h1>
      </div>
      <RouterLink class="command" to="/app/courses/new">Add course</RouterLink>
    </header>
    <form class="search" @submit.prevent="load">
      <label>Search courses<input v-model="search" placeholder="Name or location" /></label
      ><button>Search</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="loading">Loading courses...</p>
    <p v-else-if="courses.length === 0">No courses match this search.</p>
    <div v-else class="course-list">
      <RouterLink
        v-for="course in courses"
        :key="course.id"
        :to="`/app/courses/${course.id}`"
        class="course-row"
        ><strong>{{ course.name }}</strong
        ><span>{{ course.locationText || 'Location not set' }}</span
        ><span
          >{{ course.holeCount }} holes · Par {{ course.totalPar ?? '—' }} ·
          {{ course.teeCount }} tees</span
        ></RouterLink
      >
    </div>
  </section>
</template>
