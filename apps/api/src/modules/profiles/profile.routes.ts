import type { FastifyInstance } from 'fastify';
import {
  meResponseSchema,
  profileBootstrapResponseSchema,
  profileBootstrapSchema,
} from '@golf-track/shared';
import type { ProfileRepository } from './profile.repository.js';
import { createProfileService } from './profile.service.js';
import { parseRequest } from '../../validation.js';

export async function profileRoutes(
  app: FastifyInstance,
  repository: ProfileRepository,
): Promise<void> {
  const service = createProfileService(repository);
  app.get('/me', async (request, reply) => {
    if (!request.identity)
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' } });
    const profile = await service.getForAuthenticatedSubject(request.identity.subject);
    if (!profile)
      return reply.status(404).send({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'No application profile exists for this account.',
        },
      });
    return meResponseSchema.parse({
      profile: { ...profile, createdAt: profile.createdAt.toISOString() },
    });
  });
  app.post('/profile/bootstrap', async (request, reply) => {
    if (!request.identity)
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' } });
    if (!request.identity.email)
      return reply.status(422).send({
        error: {
          code: 'IDENTITY_EMAIL_REQUIRED',
          message: 'Your authenticated account does not include an email address.',
        },
      });
    const input = parseRequest(profileBootstrapSchema, request.body);
    const profile = await service.bootstrap({
      subject: request.identity.subject,
      email: request.identity.email,
      displayName: input.displayName,
      startingHandicap: input.startingHandicap ?? null,
    });
    return reply.status(200).send(
      profileBootstrapResponseSchema.parse({
        profile: { ...profile, createdAt: profile.createdAt.toISOString() },
      }),
    );
  });
}
