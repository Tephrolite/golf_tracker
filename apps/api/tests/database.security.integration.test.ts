import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL;
const runDatabaseTests =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === 'true' && databaseUrl !== undefined;
const database = runDatabaseTests ? postgres(databaseUrl) : undefined;

describe.runIf(runDatabaseTests)('database security integration', () => {
  afterAll(async () => {
    await database?.end();
  });
  it('enables RLS and denies anon/authenticated table privileges', async () => {
    const result = await database!.unsafe<
      {
        tablename: string;
        rowsecurity: boolean;
        anon_access: boolean;
        authenticated_access: boolean;
      }[]
    >(`
      select tablename, rowsecurity,
        has_table_privilege('anon', 'public.' || quote_ident(tablename), 'select,insert,update,delete') as anon_access,
        has_table_privilege('authenticated', 'public.' || quote_ident(tablename), 'select,insert,update,delete') as authenticated_access
      from pg_tables where schemaname = 'public' and tablename in ('users','user_profiles','courses','course_tees','course_holes','course_hole_yardages','rounds','round_holes','handicap_revisions','handicap_revision_rounds')
    `);
    expect(result).toHaveLength(10);
    expect(
      result.every(
        (table) => table.rowsecurity && !table.anon_access && !table.authenticated_access,
      ),
    ).toBe(true);
  });
});
