import fp from 'fastify-plugin';
import type { Environment } from '../config/env.js';
import { createDatabase, type Database } from '../db/client.js';

declare module 'fastify' { interface FastifyInstance { db: Database } }

export const databasePlugin = fp(async (app, environment: Environment) => {
  const database = createDatabase(environment);
  app.decorate('db', database.db);
  app.addHook('onClose', async () => database.close());
});