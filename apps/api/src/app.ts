import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { loadEnvironment, type Environment } from './config/env.js';
import { profileRoutes } from './modules/profiles/profile.routes.js';
import { createProfileRepository, type ProfileRepository } from './modules/profiles/profile.repository.js';
import { createSupabaseAuthVerifier, type AuthVerifier } from './plugins/auth.js';
import { authenticationPlugin } from './plugins/auth.js';
import { databasePlugin } from './plugins/database.js';

export interface AppOptions {
  environment?: Environment;
  authVerifier?: AuthVerifier;
  profileRepository?: ProfileRepository;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const environment = options.environment ?? loadEnvironment();
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: environment.ALLOWED_ORIGIN });
  if (!options.profileRepository) await app.register(databasePlugin, environment);
  await app.register(authenticationPlugin, options.authVerifier ?? createSupabaseAuthVerifier(environment));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError || (typeof error === 'object' && error !== null && 'validation' in error)) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'The request is invalid.' } });
    app.log.error(error);
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });

  app.get('/health', async () => ({ status: 'ok' }));
  const profileRepository = options.profileRepository ?? createProfileRepository(app.db);
  await app.register(async (api) => profileRoutes(api, profileRepository), { prefix: '/api/v1' });
  return app;
}