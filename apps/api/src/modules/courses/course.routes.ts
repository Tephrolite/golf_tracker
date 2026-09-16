import type { FastifyInstance } from 'fastify';
import {
  courseInputSchema,
  courseListResponseSchema,
  courseResponseSchema,
  courseUpdateInputSchema,
} from '@golf-track/shared';
import { z } from 'zod';
import { CourseError, createCourseService } from './course.service.js';
import type { CourseRepository } from './course.repository.js';
import { parseRequest } from '../../validation.js';
const uuid = z.string().uuid();
const listQuery = z.object({
  search: z.string().trim().max(200).optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export async function courseRoutes(app: FastifyInstance, repository: CourseRepository) {
  const service = createCourseService(repository);
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
    if (error instanceof CourseError)
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message }, matches: error.matches });
    throw error;
  };
  app.get('/courses', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      const query = parseRequest(listQuery, request.query);
      const result = await service.list(id, query.search, query.page, query.pageSize);
      return courseListResponseSchema.parse({
        ...result,
        page: query.page,
        pageSize: query.pageSize,
      });
    } catch (error) {
      return handle(error, reply);
    }
  });
  app.get('/courses/:courseId', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      const course = await service.details(
        parseRequest(uuid, (request.params as { courseId: string }).courseId),
        id,
      );
      return courseResponseSchema.parse({ course });
    } catch (error) {
      return handle(error, reply);
    }
  });
  app.post('/courses', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      const course = await service.create(id, parseRequest(courseInputSchema, request.body));
      return reply.status(201).send(courseResponseSchema.parse({ course }));
    } catch (error) {
      return handle(error, reply);
    }
  });
  app.put('/courses/:courseId', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      const course = await service.update(
        parseRequest(uuid, (request.params as { courseId: string }).courseId),
        id,
        parseRequest(courseUpdateInputSchema, request.body),
      );
      return courseResponseSchema.parse({ course });
    } catch (error) {
      return handle(error, reply);
    }
  });
  app.post('/courses/:courseId/archive', async (request, reply) => {
    try {
      const id = await userId(request, reply);
      if (typeof id !== 'string') return id;
      await service.archive(
        parseRequest(uuid, (request.params as { courseId: string }).courseId),
        id,
      );
      return reply.status(204).send();
    } catch (error) {
      return handle(error, reply);
    }
  });
}
