import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from '../src/app.js';
import type { Environment } from '../src/config/env.js';
import type { AuthVerifier } from '../src/plugins/auth.js';
import type { ProfileRepository } from '../src/modules/profiles/profile.repository.js';
import type { CourseRepository } from '../src/modules/courses/course.repository.js';
import type { RoundRepository } from '../src/modules/rounds/round.repository.js';
import { parseRequest } from '../src/validation.js';

const environment: Environment = {
  PORT: 3000,
  HOST: '127.0.0.1',
  ALLOWED_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://postgres:password@localhost:5432/golf_track_test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-key',
};
const rejectedAuth: AuthVerifier = { verify: async () => null };
const profile = {
  id: 'a1b2c3d4-1111-4222-8333-444444444444',
  displayName: 'Taylor',
  email: 'taylor@example.com',
  startingHandicap: null,
  createdAt: new Date('2026-09-16T00:00:00Z'),
};
const repository: ProfileRepository = {
  findByAuthSubject: async () => profile,
  bootstrap: async () => profile,
};
const course = {
  id: 'b1b2c3d4-1111-4222-8333-444444444444',
  name: 'Pine Ridge',
  locationText: 'Austin',
  holeCount: 9,
  totalPar: 36,
  teeCount: 2,
  status: 'active' as const,
  visibility: 'shared' as const,
  canEdit: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  revision: 1,
  tees: [
    {
      id: 'c1b2c3d4-1111-4222-8333-444444444444',
      name: 'Blue',
      displayOrder: 1,
      courseRating18: null,
      slopeRating18: null,
      frontNineRating: null,
      frontNineSlope: null,
      backNineRating: null,
      backNineSlope: null,
      totalYardage: 3000,
    },
    {
      id: 'd1b2c3d4-1111-4222-8333-444444444444',
      name: 'White',
      displayOrder: 2,
      courseRating18: null,
      slopeRating18: null,
      frontNineRating: null,
      frontNineSlope: null,
      backNineRating: null,
      backNineSlope: null,
      totalYardage: 2800,
    },
  ],
  holes: Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    yardages: { 'c1b2c3d4-1111-4222-8333-444444444444': 333 },
  })),
};
const courseRepository: CourseRepository = {
  findUserId: async () => profile.id,
  list: async () => ({ courses: [course], total: 1 }),
  findDetails: async () => course,
  findLikelyDuplicates: async () => [],
  create: async () => course,
  replace: async () => course,
  archive: async () => 'archived',
};
const round = {
  id: 'e1b2c3d4-1111-4222-8333-444444444444',
  status: 'in_progress' as const,
  trackingMode: 'basic' as const,
  scheduledHoleCount: 9,
  startingHoleNumber: 1,
  playedOn: '2026-09-17',
  startedAt: '2026-09-17T10:00:00.000Z',
  revision: 1,
  courseId: course.id,
  courseTeeId: course.tees[0]!.id,
  courseNameSnapshot: course.name,
  courseLocationSnapshot: course.locationText,
  teeNameSnapshot: 'Blue',
  courseRatingSnapshot: null,
  slopeRatingSnapshot: null,
  courseParSnapshot: 36,
  holes: Array.from({ length: 9 }, (_, index) => ({
    id: `${index + 1}1b2c3d4-1111-4222-8333-444444444444`,
    holeNumber: index + 1,
    playSequence: index + 1,
    par: 4,
    yardage: 300,
    strokeIndex: index + 1,
    revision: 1,
  })),
};
const roundRepository: RoundRepository = {
  findUserId: async () => profile.id,
  findActive: async () => null,
  findOwned: async () => round,
  start: async () => round,
};
const courseUpdatePayload = {
  name: 'Pine Ridge',
  locationText: 'Austin',
  holeCount: 9,
  tees: [{ clientId: 'blue', name: 'Blue', displayOrder: 1 }],
  holes: Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    yardages: { blue: 300 },
  })),
};
const apps: FastifyInstance[] = [];

async function makeApp(
  authVerifier = rejectedAuth,
  profileRepository = repository,
  courses = courseRepository,
  roundRepositoryOption = roundRepository,
) {
  const app = await buildApp({
    environment,
    authVerifier,
    profileRepository,
    courseRepository: courses,
    roundRepository: roundRepositoryOption,
  });
  apps.push(app);
  return app;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('application routes', () => {
  it('reports liveness without a database connection', async () => {
    const response = await (await makeApp()).inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
  it('rejects an unauthenticated profile request', async () => {
    const response = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
  it('uses the injected verifier instead of Supabase during tests', async () => {
    const auth: AuthVerifier = {
      verify: async (token) =>
        token === 'valid-token'
          ? { subject: 'supabase-user-id', email: 'taylor@example.com' }
          : null,
    };
    const response = await (
      await makeApp(auth)
    ).inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().profile.displayName).toBe('Taylor');
  });
  it('returns a shared 400 response for Zod errors', async () => {
    const app = await makeApp();
    app.get('/test/zod', () => parseRequest(z.object({ value: z.string() }), {}));
    const response = await app.inject({ method: 'GET', url: '/test/zod' });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'The request is invalid.' },
    });
  });
  it('returns a shared 400 response for Fastify schema errors', async () => {
    const app = await makeApp();
    app.get(
      '/test/schema',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'string' } },
          },
        },
      },
      () => ({ ok: true }),
    );
    const response = await app.inject({ method: 'GET', url: '/test/schema' });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('returns a generic 500 response without internal details', async () => {
    const app = await makeApp();
    app.get('/test/error', () => {
      throw new Error('database password secret');
    });
    const response = await app.inject({ method: 'GET', url: '/test/error' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
    expect(response.body).not.toContain('secret');
  });
  it('requires authentication to bootstrap a profile', async () => {
    const response = await (
      await makeApp()
    ).inject({
      method: 'POST',
      url: '/api/v1/profile/bootstrap',
      payload: { displayName: 'Taylor' },
    });
    expect(response.statusCode).toBe(401);
  });
  it('requires authentication for course catalog requests', async () => {
    const response = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/courses' });
    expect(response.statusCode).toBe(401);
  });
  it('returns an explicit null response when no active round exists', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const response = await (
      await makeApp(auth)
    ).inject({
      method: 'GET',
      url: '/api/v1/rounds/active',
      headers: { authorization: 'Bearer token' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ round: null });
  });
  it('creates and retrieves an owned active round', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const active: RoundRepository = { ...roundRepository, findActive: async () => round };
    const payload = {
      courseId: course.id,
      courseTeeId: course.tees[0]!.id,
      scheduledHoleCount: 9,
      startingHoleNumber: 1,
      trackingMode: 'basic',
      playedOn: '2026-09-17',
    };
    const app = await makeApp(auth, repository, courseRepository, active);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/rounds',
      headers: { authorization: 'Bearer token' },
      payload,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().round.holes).toHaveLength(9);
    const current = await app.inject({
      method: 'GET',
      url: '/api/v1/rounds/active',
      headers: { authorization: 'Bearer token' },
    });
    expect(current.statusCode).toBe(200);
    expect(current.json().round.id).toBe(round.id);
    const owned = await app.inject({
      method: 'GET',
      url: `/api/v1/rounds/${round.id}`,
      headers: { authorization: 'Bearer token' },
    });
    expect(owned.statusCode).toBe(200);
  });
  it('validates create-round bodies and hides unowned rounds', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const hidden: RoundRepository = { ...roundRepository, findOwned: async () => null };
    const app = await makeApp(auth, repository, courseRepository, hidden);
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/rounds',
      headers: { authorization: 'Bearer token' },
      payload: { playedOn: '2026-02-30' },
    });
    expect(invalid.statusCode).toBe(400);
    const unowned = await app.inject({
      method: 'GET',
      url: `/api/v1/rounds/${round.id}`,
      headers: { authorization: 'Bearer token' },
    });
    expect(unowned.statusCode).toBe(404);
    expect(unowned.json().error.code).toBe('ROUND_NOT_FOUND');
  });
  it('lists active shared courses for the verified application user', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    let received: unknown[] = [];
    const searchable: CourseRepository = {
      ...courseRepository,
      list: async (...args) => {
        received = args;
        return { courses: [course], total: 1 };
      },
    };
    const response = await (
      await makeApp(auth, repository, searchable)
    ).inject({
      method: 'GET',
      url: '/api/v1/courses?search=Austin&page=2&pageSize=10',
      headers: { authorization: 'Bearer token' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().courses[0].name).toBe('Pine Ridge');
    expect(response.json().courses[0].totalPar).toBe(36);
    expect(typeof response.json().courses[0].totalPar).toBe('number');
    expect(response.json().courses[0].teeCount).toBe(2);
    expect(typeof response.json().courses[0].teeCount).toBe('number');
    expect(received).toEqual([profile.id, 'Austin', 2, 10]);
  });
  it('returns an empty list for a search with no matching course', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const empty: CourseRepository = {
      ...courseRepository,
      list: async () => ({ courses: [], total: 0 }),
    };
    const response = await (
      await makeApp(auth, repository, empty)
    ).inject({
      method: 'GET',
      url: '/api/v1/courses?search=does-not-exist&page=1&pageSize=20',
      headers: { authorization: 'Bearer token' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().courses).toEqual([]);
  });
  it('rejects malformed course list query parameters', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const response = await (
      await makeApp(auth)
    ).inject({
      method: 'GET',
      url: '/api/v1/courses?page=not-a-number',
      headers: { authorization: 'Bearer token' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('returns generic 500 for an invalid server-generated course response', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const invalid: CourseRepository = {
      ...courseRepository,
      list: async () => ({ courses: [{ ...course, teeCount: Number.NaN }], total: 1 }) as never,
    };
    const response = await (
      await makeApp(auth, repository, invalid)
    ).inject({
      method: 'GET',
      url: '/api/v1/courses',
      headers: { authorization: 'Bearer token' },
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  });
  it('returns validation error for a malformed course id', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const response = await (
      await makeApp(auth)
    ).inject({
      method: 'GET',
      url: '/api/v1/courses/not-a-uuid',
      headers: { authorization: 'Bearer token' },
    });
    expect(response.statusCode).toBe(400);
  });
  it('requires duplicate acknowledgement before creating', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const duplicates: CourseRepository = {
      ...courseRepository,
      findLikelyDuplicates: async () => [course],
    };
    const payload = {
      name: 'Pine Ridge',
      locationText: 'Austin',
      holeCount: 9,
      tees: [{ clientId: 'blue', name: 'Blue', displayOrder: 1 }],
      holes: Array.from({ length: 9 }, (_, index) => ({
        holeNumber: index + 1,
        par: 4,
        strokeIndex: index + 1,
        yardages: { blue: 300 },
      })),
    };
    const response = await (
      await makeApp(auth, repository, duplicates)
    ).inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: { authorization: 'Bearer token' },
      payload,
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('POSSIBLE_DUPLICATE');
  });
  it('returns an optimistic conflict without exposing database details', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const conflict: CourseRepository = { ...courseRepository, replace: async () => 'conflict' };
    const response = await (
      await makeApp(auth, repository, conflict)
    ).inject({
      method: 'PUT',
      url: `/api/v1/courses/${course.id}`,
      headers: { authorization: 'Bearer token' },
      payload: { ...courseUpdatePayload, expectedRevision: 1 },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('COURSE_CONFLICT');
  });
  it('updates with the loaded revision, rejects stale revisions, and succeeds after reloading', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    let current = { ...course, revision: 1 };
    const revisioned: CourseRepository = {
      ...courseRepository,
      findDetails: async () => current,
      replace: async (_id, _userId, input) => {
        if (input.expectedRevision !== current.revision) return 'conflict';
        current = { ...current, revision: current.revision + 1 };
        return current;
      },
    };
    const app = await makeApp(auth, repository, revisioned);
    const first = await app.inject({
      method: 'PUT',
      url: `/api/v1/courses/${course.id}`,
      headers: { authorization: 'Bearer token' },
      payload: { ...courseUpdatePayload, expectedRevision: 1 },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().course.revision).toBe(2);
    const stale = await app.inject({
      method: 'PUT',
      url: `/api/v1/courses/${course.id}`,
      headers: { authorization: 'Bearer token' },
      payload: { ...courseUpdatePayload, expectedRevision: 1 },
    });
    expect(stale.statusCode).toBe(409);
    const reloaded = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${course.id}`,
      headers: { authorization: 'Bearer token' },
    });
    const afterReload = await app.inject({
      method: 'PUT',
      url: `/api/v1/courses/${course.id}`,
      headers: { authorization: 'Bearer token' },
      payload: { ...courseUpdatePayload, expectedRevision: reloaded.json().course.revision },
    });
    expect(afterReload.statusCode).toBe(200);
    expect(afterReload.json().course.revision).toBe(3);
  });
  it('does not allow an unauthorized owner to edit a course', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const forbidden: CourseRepository = { ...courseRepository, replace: async () => 'forbidden' };
    const response = await (
      await makeApp(auth, repository, forbidden)
    ).inject({
      method: 'PUT',
      url: `/api/v1/courses/${course.id}`,
      headers: { authorization: 'Bearer token' },
      payload: { ...courseUpdatePayload, expectedRevision: 1 },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('COURSE_FORBIDDEN');
  });
  it('rejects bootstrap when the verified identity has no email', async () => {
    const auth: AuthVerifier = { verify: async () => ({ subject: 'subject', email: null }) };
    const response = await (
      await makeApp(auth)
    ).inject({
      method: 'POST',
      url: '/api/v1/profile/bootstrap',
      headers: { authorization: 'Bearer token' },
      payload: { displayName: 'Taylor' },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('IDENTITY_EMAIL_REQUIRED');
  });
  it('validates profile bootstrap input', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'subject', email: 'verified@example.com' }),
    };
    const response = await (
      await makeApp(auth)
    ).inject({
      method: 'POST',
      url: '/api/v1/profile/bootstrap',
      headers: { authorization: 'Bearer token' },
      payload: { displayName: '', startingHandicap: 90 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('uses the verified identity email and does not overwrite existing profile values', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'verified-subject', email: 'verified@example.com' }),
    };
    let received: unknown;
    const existingRepository: ProfileRepository = {
      findByAuthSubject: async () => profile,
      bootstrap: async (data) => {
        received = data;
        return profile;
      },
    };
    const response = await (
      await makeApp(auth, existingRepository)
    ).inject({
      method: 'POST',
      url: '/api/v1/profile/bootstrap',
      headers: { authorization: 'Bearer token' },
      payload: { displayName: 'New value', startingHandicap: 9.4, email: 'untrusted@example.com' },
    });
    expect(response.statusCode).toBe(200);
    expect(received).toMatchObject({
      subject: 'verified-subject',
      email: 'verified@example.com',
      displayName: 'New value',
    });
    expect(response.json().profile.displayName).toBe('Taylor');
  });
  it('returns typed profile-not-found only for the authenticated subject', async () => {
    const auth: AuthVerifier = {
      verify: async () => ({ subject: 'missing-subject', email: 'missing@example.com' }),
    };
    const missingRepository: ProfileRepository = {
      findByAuthSubject: async () => null,
      bootstrap: async () => profile,
    };
    const response = await (
      await makeApp(auth, missingRepository)
    ).inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: 'Bearer token' } });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PROFILE_NOT_FOUND');
  });
});
