import { describe, expect, it } from 'vitest';
import { activeRoundResponseSchema, createRoundInputSchema } from '../src/index.js';
import { meResponseSchema, profileSchema, registrationSchema } from '../src/index.js';

describe('shared schemas', () => {
  it('accepts a valid profile response', () => {
    expect(
      meResponseSchema.safeParse({
        profile: {
          id: 'a1b2c3d4-1111-4222-8333-444444444444',
          displayName: 'Taylor',
          email: 'taylor@example.com',
          startingHandicap: 12.4,
          createdAt: '2026-09-16T12:00:00.000Z',
        },
      }).success,
    ).toBe(true);
  });

  it('rejects invalid profile data', () => {
    expect(profileSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
  it('normalizes registration email and rejects mismatched passwords', () => {
    expect(
      registrationSchema.parse({
        displayName: ' Taylor ',
        email: ' TAYLOR@EXAMPLE.COM ',
        password: 'password1',
        passwordConfirmation: 'password1',
      }).email,
    ).toBe('taylor@example.com');
    expect(
      registrationSchema.safeParse({
        displayName: 'Taylor',
        email: 'taylor@example.com',
        password: 'password1',
        passwordConfirmation: 'different',
      }).success,
    ).toBe(false);
  });
});

describe('round schemas', () => {
  const input = {
    courseId: 'a1b2c3d4-1111-4222-8333-444444444444',
    courseTeeId: 'b1b2c3d4-1111-4222-8333-444444444444',
    scheduledHoleCount: 9,
    startingHoleNumber: 1,
    trackingMode: 'basic',
    playedOn: '2026-09-17',
  };
  it('accepts a valid round setup and explicit no-active response', () => {
    expect(createRoundInputSchema.parse(input)).toMatchObject(input);
    expect(activeRoundResponseSchema.parse({ round: null })).toEqual({ round: null });
  });
  it('rejects invalid UUIDs, configuration values, and impossible dates', () => {
    expect(createRoundInputSchema.safeParse({ ...input, courseId: 'bad' }).success).toBe(false);
    expect(createRoundInputSchema.safeParse({ ...input, scheduledHoleCount: 12 }).success).toBe(
      false,
    );
    expect(createRoundInputSchema.safeParse({ ...input, startingHoleNumber: 19 }).success).toBe(
      false,
    );
    expect(createRoundInputSchema.safeParse({ ...input, trackingMode: 'other' }).success).toBe(
      false,
    );
    expect(createRoundInputSchema.safeParse({ ...input, playedOn: '2026-02-30' }).success).toBe(
      false,
    );
  });
});
