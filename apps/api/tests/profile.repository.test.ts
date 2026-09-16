import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { Database } from '../src/db/client.js';
import { createProfileRepository } from '../src/modules/profiles/profile.repository.js';

function databaseReturning(startingHandicap: string | null) {
  let whereClause: unknown;
  const db = {
    select: () => ({ from: () => ({ innerJoin: () => ({ where: (clause: unknown) => { whereClause = clause; return { limit: async () => [{ id: 'a1b2c3d4-1111-4222-8333-444444444444', displayName: 'Taylor', email: 'taylor@example.com', startingHandicap, createdAt: new Date('2026-01-01T00:00:00Z') }] }; } }) }) }),
  } as unknown as Database;
  return { repository: createProfileRepository(db), whereClause: () => whereClause };
}

describe('profile repository', () => {
  it('filters identities by the Supabase provider and subject', async () => {
    const testDatabase = databaseReturning(null);
    await testDatabase.repository.findByAuthSubject('supabase-subject');
    const query = new PgDialect().sqlToQuery(testDatabase.whereClause() as never);
    expect(query.sql).toContain('"users"."auth_provider"');
    expect(query.params).toEqual(['supabase', 'supabase-subject']);
  });
  it('preserves a zero starting handicap', async () => {
    const testDatabase = databaseReturning('0.0');
    expect((await testDatabase.repository.findByAuthSubject('subject'))?.startingHandicap).toBe(0);
  });
  it('preserves a null starting handicap', async () => {
    const testDatabase = databaseReturning(null);
    expect((await testDatabase.repository.findByAuthSubject('subject'))?.startingHandicap).toBeNull();
  });
});