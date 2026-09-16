import type { z } from 'zod';

export class RequestValidationError extends Error {
  constructor() {
    super('The request is invalid.');
  }
}

export function parseRequest<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new RequestValidationError();
  return result.data;
}
