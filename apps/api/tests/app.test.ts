import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from '../src/app.js';
import type { Environment } from '../src/config/env.js';
import type { AuthVerifier } from '../src/plugins/auth.js';
import type { ProfileRepository } from '../src/modules/profiles/profile.repository.js';

const environment: Environment = { PORT: 3000, HOST: '127.0.0.1', ALLOWED_ORIGIN: 'http://localhost:5173', DATABASE_URL: 'postgresql://postgres:password@localhost:5432/golf_track_test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test-key' };
const rejectedAuth: AuthVerifier = { verify: async () => null };
const profile = { id: 'a1b2c3d4-1111-4222-8333-444444444444', displayName: 'Taylor', email: 'taylor@example.com', startingHandicap: null, createdAt: new Date('2026-09-16T00:00:00Z') };
const repository: ProfileRepository = { findByAuthSubject: async () => profile, bootstrap: async () => profile };
const apps: FastifyInstance[] = [];

async function makeApp(authVerifier = rejectedAuth, profileRepository = repository) { const app = await buildApp({ environment, authVerifier, profileRepository }); apps.push(app); return app; }
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe('application routes', () => {
  it('reports liveness without a database connection', async () => {
    const response = await (await makeApp()).inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200); expect(response.json()).toEqual({ status: 'ok' });
  });
  it('rejects an unauthenticated profile request', async () => {
    const response = await (await makeApp()).inject({ method: 'GET', url: '/api/v1/me' });
    expect(response.statusCode).toBe(401); expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
  it('uses the injected verifier instead of Supabase during tests', async () => {
    const auth: AuthVerifier = { verify: async (token) => token === 'valid-token' ? { subject: 'supabase-user-id', email: 'taylor@example.com' } : null };
    const response = await (await makeApp(auth)).inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: 'Bearer valid-token' } });
    expect(response.statusCode).toBe(200); expect(response.json().profile.displayName).toBe('Taylor');
  });
  it('returns a shared 400 response for Zod errors', async () => {
    const app = await makeApp(); app.get('/test/zod', () => z.object({ value: z.string() }).parse({}));
    const response = await app.inject({ method: 'GET', url: '/test/zod' });
    expect(response.statusCode).toBe(400); expect(response.json()).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'The request is invalid.' } });
  });
  it('returns a shared 400 response for Fastify schema errors', async () => {
    const app = await makeApp(); app.get('/test/schema', { schema: { querystring: { type: 'object', required: ['value'], properties: { value: { type: 'string' } } } } }, () => ({ ok: true }));
    const response = await app.inject({ method: 'GET', url: '/test/schema' });
    expect(response.statusCode).toBe(400); expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('returns a generic 500 response without internal details', async () => {
    const app = await makeApp(); app.get('/test/error', () => { throw new Error('database password secret'); });
    const response = await app.inject({ method: 'GET', url: '/test/error' });
    expect(response.statusCode).toBe(500); expect(response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }); expect(response.body).not.toContain('secret');
  });
  it('requires authentication to bootstrap a profile', async () => {
    const response = await (await makeApp()).inject({ method: 'POST', url: '/api/v1/profile/bootstrap', payload: { displayName: 'Taylor' } });
    expect(response.statusCode).toBe(401);
  });
  it('rejects bootstrap when the verified identity has no email', async () => {
    const auth: AuthVerifier = { verify: async () => ({ subject: 'subject', email: null }) };
    const response = await (await makeApp(auth)).inject({ method: 'POST', url: '/api/v1/profile/bootstrap', headers: { authorization: 'Bearer token' }, payload: { displayName: 'Taylor' } });
    expect(response.statusCode).toBe(422); expect(response.json().error.code).toBe('IDENTITY_EMAIL_REQUIRED');
  });
  it('validates profile bootstrap input', async () => {
    const auth: AuthVerifier = { verify: async () => ({ subject: 'subject', email: 'verified@example.com' }) };
    const response = await (await makeApp(auth)).inject({ method: 'POST', url: '/api/v1/profile/bootstrap', headers: { authorization: 'Bearer token' }, payload: { displayName: '', startingHandicap: 90 } });
    expect(response.statusCode).toBe(400); expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('uses the verified identity email and does not overwrite existing profile values', async () => {
    const auth: AuthVerifier = { verify: async () => ({ subject: 'verified-subject', email: 'verified@example.com' }) };
    let received: unknown;
    const existingRepository: ProfileRepository = { findByAuthSubject: async () => profile, bootstrap: async (data) => { received = data; return profile; } };
    const response = await (await makeApp(auth, existingRepository)).inject({ method: 'POST', url: '/api/v1/profile/bootstrap', headers: { authorization: 'Bearer token' }, payload: { displayName: 'New value', startingHandicap: 9.4, email: 'untrusted@example.com' } });
    expect(response.statusCode).toBe(200); expect(received).toMatchObject({ subject: 'verified-subject', email: 'verified@example.com', displayName: 'New value' }); expect(response.json().profile.displayName).toBe('Taylor');
  });
  it('returns typed profile-not-found only for the authenticated subject', async () => {
    const auth: AuthVerifier = { verify: async () => ({ subject: 'missing-subject', email: 'missing@example.com' }) };
    const missingRepository: ProfileRepository = { findByAuthSubject: async () => null, bootstrap: async () => profile };
    const response = await (await makeApp(auth, missingRepository)).inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: 'Bearer token' } });
    expect(response.statusCode).toBe(404); expect(response.json().error.code).toBe('PROFILE_NOT_FOUND');
  });
});