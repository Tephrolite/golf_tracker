import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const tables = [
  'users',
  'user_profiles',
  'courses',
  'course_tees',
  'course_holes',
  'course_hole_yardages',
  'rounds',
  'round_holes',
  'handicap_revisions',
  'handicap_revision_rounds',
];

describe('initial migration security SQL', () => {
  async function initialMigration() {
    const directory = new URL('../src/db/migrations/', import.meta.url);
    const file = (await readdir(directory)).find((entry) => entry.endsWith('.sql'));
    if (!file) throw new Error('No generated migration exists. Run npm run db:generate.');
    return readFile(new URL(`../src/db/migrations/${file}`, import.meta.url), 'utf8');
  }
  it('enables RLS and revokes browser role access to every application table', async () => {
    const migration = await initialMigration();
    for (const table of tables) {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`REVOKE ALL ON TABLE "${table}" FROM anon`);
      expect(migration).toContain(`REVOKE ALL ON TABLE "${table}" FROM authenticated`);
    }
  });
  it('contains all cross-table trigger protections and the active-round index', async () => {
    const migration = await initialMigration();
    expect(migration).toContain('validate_course_hole_number');
    expect(migration).toContain('validate_course_hole_yardage_course');
    expect(migration).toContain('validate_round_catalog_integrity');
    expect(migration).toContain('validate_round_hole_sequence');
    expect(migration).toContain('course hole number must not exceed the parent course hole count');
    expect(migration).toContain('course tee and course hole must belong to the same course');
    expect(migration).toContain('round course tee must belong to the selected course');
    expect(migration).toContain('round starting hole must exist for the selected course');
    expect(migration).toContain(
      'round-hole play sequence must not exceed the parent round scheduled hole count',
    );
    expect(migration).toContain('one_in_progress_round_per_user');
  });
});
