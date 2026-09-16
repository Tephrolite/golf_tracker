import {
  courseListResponseSchema,
  courseResponseSchema,
  errorResponseSchema,
  meResponseSchema,
  profileBootstrapResponseSchema,
  type CourseInput,
  type CourseUpdateInput,
  type CourseDetails,
  type MeResponse,
  type ProfileBootstrapInput,
  activeRoundResponseSchema,
  createRoundInputSchema,
  roundResponseSchema,
  type CreateRoundInput,
  type RoundDetails,
} from '@golf-track/shared';
import { environment } from './env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
async function request(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${environment.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
  });
  if (!response.ok) {
    const body = errorResponseSchema.safeParse(await response.json());
    throw new ApiError(
      response.status,
      body.success ? body.data.error.code : 'API_ERROR',
      body.success ? body.data.error.message : 'The API request failed.',
    );
  }
  return response;
}
export async function getMe(accessToken: string): Promise<MeResponse> {
  const response = await request('/me', accessToken);
  return meResponseSchema.parse(await response.json());
}
export async function bootstrapProfile(accessToken: string, input: ProfileBootstrapInput) {
  const response = await request('/profile/bootstrap', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return profileBootstrapResponseSchema.parse(await response.json()).profile;
}
export async function listCourses(accessToken: string, search = '') {
  const response = await request(`/courses?search=${encodeURIComponent(search)}`, accessToken);
  return courseListResponseSchema.parse(await response.json());
}
export async function getCourse(accessToken: string, id: string): Promise<CourseDetails> {
  const response = await request(`/courses/${id}`, accessToken);
  return courseResponseSchema.parse(await response.json()).course;
}
export async function createCourse(
  accessToken: string,
  input: CourseInput,
): Promise<CourseDetails> {
  const response = await request('/courses', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return courseResponseSchema.parse(await response.json()).course;
}
export async function updateCourse(
  accessToken: string,
  id: string,
  input: CourseUpdateInput,
): Promise<CourseDetails> {
  const response = await request(`/courses/${id}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return courseResponseSchema.parse(await response.json()).course;
}
export async function archiveCourse(accessToken: string, id: string) {
  await request(`/courses/${id}/archive`, accessToken, { method: 'POST' });
}
export async function getActiveRound(accessToken: string): Promise<RoundDetails | null> {
  const response = await request('/rounds/active', accessToken);
  return activeRoundResponseSchema.parse(await response.json()).round;
}
export async function createRound(
  accessToken: string,
  input: CreateRoundInput,
): Promise<RoundDetails> {
  const response = await request('/rounds', accessToken, {
    method: 'POST',
    body: JSON.stringify(createRoundInputSchema.parse(input)),
  });
  return roundResponseSchema.parse(await response.json()).round;
}
export async function getRound(accessToken: string, id: string): Promise<RoundDetails> {
  const response = await request(`/rounds/${id}`, accessToken);
  return roundResponseSchema.parse(await response.json()).round;
}
