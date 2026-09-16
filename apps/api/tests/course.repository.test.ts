import { describe, expect, it } from 'vitest';
import { toCourseSummary } from '../src/modules/courses/course.repository.js';

const aggregateRow = {
  id: 'b1b2c3d4-1111-4222-8333-444444444444',
  name: 'Test Course',
  locationText: 'Test Location',
  holeCount: 9,
  status: 'active',
  createdByUserId: 'a1b2c3d4-1111-4222-8333-444444444444',
};

describe('course summary aggregate mapping', () => {
  it('normalizes PostgreSQL aggregate strings without multiplying a 9-hole two-tee par', () => {
    const result = toCourseSummary({ ...aggregateRow, totalPar: '36', teeCount: '2' });
    expect(result.totalPar).toBe(36);
    expect(typeof result.totalPar).toBe('number');
    expect(result.teeCount).toBe(2);
    expect(typeof result.teeCount).toBe('number');
  });
  it('preserves null total par for a course with no holes and reports zero active tees', () => {
    expect(toCourseSummary({ ...aggregateRow, totalPar: null, teeCount: '0' })).toMatchObject({
      totalPar: null,
      teeCount: 0,
    });
  });
  it('rejects invalid aggregate database values at the repository boundary', () => {
    expect(() =>
      toCourseSummary({ ...aggregateRow, totalPar: 'not-a-number', teeCount: '2' }),
    ).toThrow('Course aggregate values must be finite numbers.');
  });
});
