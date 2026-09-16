import { z } from 'zod';

export const ROUND_STATUSES = ['in_progress', 'completed', 'abandoned', 'deleted'] as const;
export const TRACKING_MODES = ['basic', 'detailed'] as const;
export const FAIRWAY_RESULTS = ['hit', 'left', 'right'] as const;

export const profileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  startingHandicap: z.number().min(-10).max(54).nullable(),
  createdAt: z.string().datetime(),
});

const normalizedEmail = z.string().trim().toLowerCase().email();
export const startingHandicapSchema = z.number().finite().min(-10).max(54).nullable().optional();
export const registrationSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Name is required.').max(100),
    email: normalizedEmail,
    password: z.string().min(8, 'Password must meet the configured minimum length.'),
    passwordConfirmation: z.string(),
    startingHandicap: startingHandicapSchema,
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Passwords do not match.',
  });
export const signInSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, 'Password is required.'),
});
export const profileBootstrapSchema = z.object({
  displayName: z.string().trim().min(1, 'Name is required.').max(100),
  startingHandicap: startingHandicapSchema,
});
export const profileBootstrapResponseSchema = z.object({ profile: profileSchema });

const optionalDecimal = z.number().finite().min(0).max(99.9).nullable().optional();
const optionalSlope = z.number().int().min(55).max(155).nullable().optional();
export const courseTeeInputSchema = z
  .object({
    clientId: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(80),
    displayOrder: z.number().int().min(1).max(99),
    courseRating18: optionalDecimal,
    slopeRating18: optionalSlope,
    frontNineRating: optionalDecimal,
    frontNineSlope: optionalSlope,
    backNineRating: optionalDecimal,
    backNineSlope: optionalSlope,
  })
  .strict();
export const courseHoleInputSchema = z
  .object({
    holeNumber: z.number().int().min(1).max(18),
    par: z.number().int().min(3).max(6),
    strokeIndex: z.number().int().min(1).max(18).nullable().optional(),
    yardages: z.record(z.string().min(1).max(80), z.number().int().min(0).max(2000)),
  })
  .strict();
const courseShape = z.object({
  name: z.string().trim().min(1, 'Course name is required.').max(200),
  locationText: z.string().trim().max(200).nullable().optional(),
  holeCount: z.union([z.literal(9), z.literal(18)]),
  tees: z.array(courseTeeInputSchema).min(1, 'Add at least one tee.'),
  holes: z.array(courseHoleInputSchema),
  acknowledgeDuplicate: z.boolean().optional().default(false),
});
function validateCourse(course: z.infer<typeof courseShape>, context: z.RefinementCtx) {
  if (course.holes.length !== course.holeCount)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['holes'],
      message: `Enter all ${course.holeCount} holes.`,
    });
  const expected = new Set(Array.from({ length: course.holeCount }, (_, index) => index + 1));
  const names = new Set<string>();
  const orders = new Set<number>();
  const strokeIndexes = new Set<number>();
  const teeIds = new Set(course.tees.map((tee) => tee.clientId));
  for (const tee of course.tees) {
    const name = tee.name.toLowerCase();
    if (names.has(name))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tees'],
        message: 'Tee names must be unique.',
      });
    names.add(name);
    if (orders.has(tee.displayOrder))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tees'],
        message: 'Tee display orders must be unique.',
      });
    orders.add(tee.displayOrder);
  }
  for (const hole of course.holes) {
    if (!expected.delete(hole.holeNumber))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['holes'],
        message: 'Hole numbers must be unique and sequential.',
      });
    if (hole.strokeIndex !== null && hole.strokeIndex !== undefined) {
      if (strokeIndexes.has(hole.strokeIndex))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['holes'],
          message: 'Stroke indexes must be unique.',
        });
      strokeIndexes.add(hole.strokeIndex);
    }
    for (const teeId of teeIds)
      if (!(teeId in hole.yardages))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['holes'],
          message: `Every hole needs yardage for tee ${teeId}.`,
        });
  }
  if (expected.size > 0)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['holes'],
      message: 'Hole numbers must be sequential.',
    });
}
export const courseInputSchema = courseShape.strict().superRefine(validateCourse);
export const courseUpdateInputSchema = courseShape
  .extend({ expectedRevision: z.number().int().positive() })
  .strict()
  .superRefine(validateCourse);
export const courseSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  locationText: z.string().nullable(),
  holeCount: z.number().int(),
  totalPar: z.number().int().nullable(),
  teeCount: z.number().int(),
  status: z.enum(['draft', 'active', 'archived']),
  canEdit: z.boolean(),
});
export const courseDetailsSchema = courseSummarySchema.extend({
  visibility: z.enum(['shared', 'private']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  revision: z.number().int().positive(),
  tees: z.array(
    courseTeeInputSchema
      .omit({ clientId: true })
      .extend({ id: z.string().uuid(), totalYardage: z.number().int() }),
  ),
  holes: z.array(
    courseHoleInputSchema
      .omit({ yardages: true })
      .extend({ yardages: z.record(z.string().uuid(), z.number().int()) }),
  ),
});
export const courseListResponseSchema = z.object({
  courses: z.array(courseSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export const courseResponseSchema = z.object({ course: courseDetailsSchema });

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parts = value.split('-').map(Number);
    const year = parts[0]!;
    const month = parts[1]!;
    const day = parts[2]!;
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Enter a valid calendar date.');
export const createRoundInputSchema = z
  .object({
    courseId: z.string().uuid(),
    courseTeeId: z.string().uuid(),
    scheduledHoleCount: z.union([z.literal(9), z.literal(18)]),
    startingHoleNumber: z.number().int().min(1).max(18),
    trackingMode: z.enum(TRACKING_MODES),
    playedOn: calendarDateSchema,
  })
  .strict();
export const roundHoleSchema = z.object({
  id: z.string().uuid(),
  holeNumber: z.number().int(),
  playSequence: z.number().int().positive(),
  par: z.number().int(),
  yardage: z.number().int().nullable(),
  strokeIndex: z.number().int().nullable(),
  revision: z.number().int().positive(),
});
export const roundDetailsSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ROUND_STATUSES),
  trackingMode: z.enum(TRACKING_MODES),
  scheduledHoleCount: z.number().int(),
  startingHoleNumber: z.number().int(),
  playedOn: calendarDateSchema,
  startedAt: z.string().datetime(),
  revision: z.number().int().positive(),
  courseId: z.string().uuid().nullable(),
  courseTeeId: z.string().uuid().nullable(),
  courseNameSnapshot: z.string(),
  courseLocationSnapshot: z.string().nullable(),
  teeNameSnapshot: z.string(),
  courseRatingSnapshot: z.number().nullable(),
  slopeRatingSnapshot: z.number().int().nullable(),
  courseParSnapshot: z.number().int().nullable(),
  holes: z.array(roundHoleSchema),
});
export const roundResponseSchema = z.object({ round: roundDetailsSchema });
export const activeRoundResponseSchema = z.object({ round: roundDetailsSchema.nullable() });

export const meResponseSchema = z.object({ profile: profileSchema.nullable() });

export const errorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type Profile = z.infer<typeof profileSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ProfileBootstrapInput = z.infer<typeof profileBootstrapSchema>;
export type CourseInput = z.infer<typeof courseInputSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateInputSchema>;
export type CourseSummary = z.infer<typeof courseSummarySchema>;
export type CourseDetails = z.infer<typeof courseDetailsSchema>;
export type CreateRoundInput = z.infer<typeof createRoundInputSchema>;
export type RoundDetails = z.infer<typeof roundDetailsSchema>;
export type RoundHole = z.infer<typeof roundHoleSchema>;
