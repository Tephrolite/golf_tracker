import type { FastifyInstance } from 'fastify';
import {
  activeRoundResponseSchema,
  createRoundInputSchema,
  roundResponseSchema,
} from '@golf-track/shared';
import { z } from 'zod';
import type { RoundRepository } from './round.repository.js';
import { RoundRepositoryError } from './round.repository.js';
import { createRoundService } from './round.service.js';
import { parseRequest } from '../../validation.js';
const uuid = z.string().uuid();
export async function roundRoutes(app: FastifyInstance, repository: RoundRepository) {
  const service = createRoundService(repository);
  async function userId(
    request: { identity: { subject: string } | null },
    reply: { status: (code: number) => { send: (value: unknown) => unknown } },
  ) {
    if (!request.identity)
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' } });
    return service.userId(request.identity.subject);
  }
  const handle = (
    error: unknown,
    reply: { status: (code: number) => { send: (value: unknown) => unknown } },
  ) => {
    if (error instanceof RoundRepositoryError)
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message } });
    throw error;
  };
  app.get('/rounds/active', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      return activeRoundResponseSchema.parse({ round: await service.active(id) });
    } catch (error) {
      return handle(error, reply);
    }
  });
  app.post('/rounds', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      const round = await service.start(id, parseRequest(createRoundInputSchema, request.body));
      return reply.status(201).send(roundResponseSchema.parse({ round }));
    } catch (error) {
      return handle(error, reply);
    }
  });
  app.get('/rounds/:roundId', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      const round = await service.details(
        parseRequest(uuid, (request.params as { roundId: string }).roundId),
        id,
      );
      if (!round)
        return reply
          .status(404)
          .send({ error: { code: 'ROUND_NOT_FOUND', message: 'Round not found.' } });
      return roundResponseSchema.parse({ round });
    } catch (error) {
      return handle(error, reply);
    }
  });
}
