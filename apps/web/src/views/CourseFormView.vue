<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { courseInputSchema, type CourseInput } from '@golf-track/shared';
import { ApiError, createCourse, getCourse, updateCourse } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const editing = computed(() => typeof route.params.courseId === 'string');
const step = ref(1);
const error = ref('');
const saving = ref(false);
const revision = ref<number | null>(null);
const form = ref<CourseInput>({
  name: '',
  locationText: null,
  holeCount: 9,
  tees: [{ clientId: 'tee-1', name: 'Blue', displayOrder: 1 }],
  holes: Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    yardages: { 'tee-1': 0 },
  })),
  acknowledgeDuplicate: false,
});
function resetHoles() {
  const teeIds = form.value.tees.map((tee) => tee.clientId);
  form.value.holes = Array.from({ length: form.value.holeCount }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    yardages: Object.fromEntries(teeIds.map((id) => [id, 0])),
  }));
}
function addTee() {
  const clientId = `tee-${Date.now()}`;
  form.value.tees.push({ clientId, name: '', displayOrder: form.value.tees.length + 1 });
  form.value.holes.forEach((hole) => {
    hole.yardages[clientId] = 0;
  });
}
function removeTee(clientId: string) {
  if (form.value.tees.length === 1) return;
  form.value.tees = form.value.tees.filter((tee) => tee.clientId !== clientId);
  form.value.holes.forEach((hole) => delete hole.yardages[clientId]);
}
async function load() {
  if (!editing.value) return;
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  const course = await getCourse(token, String(route.params.courseId));
  revision.value = course.revision;
  form.value = {
    name: course.name,
    locationText: course.locationText,
    holeCount: course.holeCount as 9 | 18,
    acknowledgeDuplicate: false,
    tees: course.tees.map((tee) => ({
      clientId: tee.id,
      name: tee.name,
      displayOrder: tee.displayOrder,
      courseRating18: tee.courseRating18,
      slopeRating18: tee.slopeRating18,
      frontNineRating: tee.frontNineRating,
      frontNineSlope: tee.frontNineSlope,
      backNineRating: tee.backNineRating,
      backNineSlope: tee.backNineSlope,
    })),
    holes: course.holes.map((hole) => ({ ...hole })),
  };
}
async function submit() {
  const parsed = courseInputSchema.safeParse(form.value);
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check the course details.';
    return;
  }
  const token = useAuthStore().session?.access_token;
  if (!token) return;
  saving.value = true;
  error.value = '';
  try {
    const course = editing.value
      ? await updateCourse(token, String(route.params.courseId), {
          ...parsed.data,
          expectedRevision: revision.value ?? 0,
        })
      : await createCourse(token, parsed.data);
    revision.value = course.revision;
    await router.push(`/app/courses/${course.id}`);
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'POSSIBLE_DUPLICATE') {
      error.value = 'A matching course exists. Confirm that you still want to create it.';
      form.value.acknowledgeDuplicate = true;
    } else error.value = caught instanceof Error ? caught.message : 'Could not save course.';
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="catalog">
    <header>
      <div>
        <p class="eyebrow">{{ editing ? 'Edit course' : 'New course' }}</p>
        <h1>
          {{ step === 1 ? 'Course details' : step === 2 ? 'Tees and holes' : 'Review course' }}
        </h1>
      </div>
      <span>Step {{ step }} of 3</span>
    </header>
    <p v-if="error" role="alert">{{ error }}</p>
    <form @submit.prevent="step === 3 ? submit() : step++">
      <fieldset v-show="step === 1">
        <label>Course name<input v-model="form.name" required /></label
        ><label>Location<input v-model="form.locationText" /></label
        ><label
          >Holes<select v-model.number="form.holeCount" @change="resetHoles">
            <option :value="9">9 holes</option>
            <option :value="18">18 holes</option>
          </select></label
        >
      </fieldset>
      <fieldset v-show="step === 2">
        <div class="form-actions">
          <h2>Tees</h2>
          <button type="button" @click="addTee">Add tee</button>
        </div>
        <div v-for="tee in form.tees" :key="tee.clientId" class="tee-edit">
          <input v-model="tee.name" placeholder="Tee name" /><input
            v-model.number="tee.displayOrder"
            type="number"
            min="1"
            aria-label="Tee order"
          /><button
            type="button"
            :disabled="form.tees.length === 1"
            @click="removeTee(tee.clientId)"
          >
            Remove
          </button>
        </div>
        <h2>Holes</h2>
        <div class="hole-edit" v-for="hole in form.holes" :key="hole.holeNumber">
          <strong>{{ hole.holeNumber }}</strong
          ><label>Par<input v-model.number="hole.par" type="number" min="3" max="6" /></label
          ><label
            >Stroke<input
              v-model.number="hole.strokeIndex"
              type="number"
              min="1"
              :max="form.holeCount" /></label
          ><label v-for="tee in form.tees" :key="tee.clientId"
            >{{ tee.name || 'Tee' }} yd<input
              v-model.number="hole.yardages[tee.clientId]"
              type="number"
              min="0"
          /></label>
        </div>
      </fieldset>
      <fieldset v-show="step === 3">
        <h2>{{ form.name || 'Untitled course' }}</h2>
        <p>
          {{ form.locationText || 'No location' }} · {{ form.holeCount }} holes ·
          {{ form.tees.length }} tees
        </p>
        <p>Review every hole and tee before saving.</p>
      </fieldset>
      <footer class="form-actions">
        <button v-if="step > 1" type="button" @click="step--">Back</button
        ><button class="command" :disabled="saving">
          {{ step === 3 ? (saving ? 'Saving...' : 'Save course') : 'Continue' }}
        </button>
      </footer>
    </form>
  </section>
</template>
