import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Environment } from '../config/env.js';
import * as schema from './schema/index.js';

export function createDatabase(environment: Environment) {
  const client = postgres(environment.DATABASE_URL, { max: 10 });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

export type Database = ReturnType<typeof createDatabase>['db'];
