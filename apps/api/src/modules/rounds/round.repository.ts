import { and, asc, eq, or, sql } from 'drizzle-orm';
import type { CreateRoundInput, RoundDetails } from '@golf-track/shared';
import type { Database } from '../../db/client.js';
import {
  courseHoleYardages,
  courseHoles,
  courseTees,
  courses,
  roundHoles,
  rounds,
  users,
} from '../../db/schema/index.js';
import { determinePlayOrder } from './round.order.js';

export class RoundRepositoryError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface RoundRepository {
  findUserId(subject: string): Promise<string | null>;
  findActive(userId: string): Promise<RoundDetails | null>;
  findOwned(id: string, userId: string): Promise<RoundDetails | null>;
  start(userId: string, input: CreateRoundInput): Promise<RoundDetails>;
}

function toRoundDetails(
  round: typeof rounds.$inferSelect,
  holes: (typeof roundHoles.$inferSelect)[],
): RoundDetails {
  return {
    id: round.id,
    status: round.status as RoundDetails['status'],
    trackingMode: round.trackingMode as RoundDetails['trackingMode'],
    scheduledHoleCount: round.scheduledHoleCount,
    startingHoleNumber: round.startingHoleNumber,
    playedOn: round.playedOn,
    startedAt: round.startedAt.toISOString(),
    revision: round.revision,
    courseId: round.courseId,
    courseTeeId: round.courseTeeId,
    courseNameSnapshot: round.courseNameSnapshot,
    courseLocationSnapshot: round.courseLocationSnapshot,
    teeNameSnapshot: round.teeNameSnapshot,
    courseRatingSnapshot:
      round.courseRatingSnapshot === null ? null : Number(round.courseRatingSnapshot),
    slopeRatingSnapshot: round.slopeRatingSnapshot,
    courseParSnapshot: round.courseParSnapshot,
    holes: holes.map((hole) => ({
      id: hole.id,
      holeNumber: hole.holeNumber,
      playSequence: hole.playSequence,
      par: hole.parSnapshot,
      yardage: hole.yardageSnapshot,
      strokeIndex: hole.strokeIndexSnapshot,
      revision: hole.revision,
    })),
  };
}

export function createRoundRepository(db: Database): RoundRepository {
  async function find(
    id: string,
    userId: string,
    activeOnly: boolean,
  ): Promise<RoundDetails | null> {
    const round = (
      await db
        .select()
        .from(rounds)
        .where(
          and(
            eq(rounds.id, id),
            eq(rounds.userId, userId),
            activeOnly ? eq(rounds.status, 'in_progress') : undefined,
            activeOnly ? sql`${rounds.deletedAt} is null` : undefined,
          ),
        )
        .limit(1)
    )[0];
    if (!round) return null;
    const holes = await db
      .select()
      .from(roundHoles)
      .where(eq(roundHoles.roundId, round.id))
      .orderBy(asc(roundHoles.playSequence));
    return toRoundDetails(round, holes);
  }
  return {
    async findUserId(subject) {
      return (
        (
          await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.authProvider, 'supabase'), eq(users.authSubject, subject)))
            .limit(1)
        )[0]?.id ?? null
      );
    },
    async findActive(userId) {
      const result = await db
        .select({ id: rounds.id })
        .from(rounds)
        .where(
          and(
            eq(rounds.userId, userId),
            eq(rounds.status, 'in_progress'),
            sql`${rounds.deletedAt} is null`,
          ),
        )
        .orderBy(asc(rounds.startedAt))
        .limit(1);
      return result[0] ? find(result[0].id, userId, true) : null;
    },
    findOwned: (id, userId) => find(id, userId, false),
    async start(userId, input) {
      try {
        return await db.transaction(async (transaction) => {
          const existing = await transaction
            .select({ id: rounds.id })
            .from(rounds)
            .where(
              and(
                eq(rounds.userId, userId),
                eq(rounds.status, 'in_progress'),
                sql`${rounds.deletedAt} is null`,
              ),
            )
            .limit(1);
          if (existing[0])
            throw new RoundRepositoryError(
              'ACTIVE_ROUND_EXISTS',
              409,
              'You already have a round in progress.',
            );
          const course = (
            await transaction
              .select()
              .from(courses)
              .where(
                and(
                  eq(courses.id, input.courseId),
                  eq(courses.status, 'active'),
                  or(eq(courses.visibility, 'shared'), eq(courses.createdByUserId, userId)),
                ),
              )
              .limit(1)
          )[0];
          if (!course)
            throw new RoundRepositoryError(
              'COURSE_UNAVAILABLE',
              404,
              'The selected course is unavailable.',
            );
          const tee = (
            await transaction
              .select()
              .from(courseTees)
              .where(eq(courseTees.id, input.courseTeeId))
              .limit(1)
          )[0];
          if (!tee)
            throw new RoundRepositoryError('TEE_NOT_FOUND', 404, 'The selected tee was not found.');
          if (tee.courseId !== course.id)
            throw new RoundRepositoryError(
              'TEE_COURSE_MISMATCH',
              400,
              'The selected tee does not belong to this course.',
            );
          if (tee.archivedAt)
            throw new RoundRepositoryError(
              'TEE_UNAVAILABLE',
              400,
              'The selected tee is unavailable.',
            );
          if (course.holeCount === 9 && input.scheduledHoleCount !== 9)
            throw new RoundRepositoryError(
              'INVALID_ROUND_LENGTH',
              400,
              'A 9-hole course supports a 9-hole round only.',
            );
          const sourceHoles = await transaction
            .select()
            .from(courseHoles)
            .where(eq(courseHoles.courseId, course.id))
            .orderBy(asc(courseHoles.holeNumber));
          const numbers = sourceHoles.map((hole) => hole.holeNumber);
          let order: number[];
          try {
            order = determinePlayOrder(numbers, input.scheduledHoleCount, input.startingHoleNumber);
          } catch {
            throw new RoundRepositoryError(
              numbers.includes(input.startingHoleNumber)
                ? 'INVALID_ROUND_LENGTH'
                : 'INVALID_STARTING_HOLE',
              400,
              numbers.includes(input.startingHoleNumber)
                ? 'The selected round length is unavailable.'
                : 'The starting hole is unavailable.',
            );
          }
          const yardages = await transaction
            .select()
            .from(courseHoleYardages)
            .where(eq(courseHoleYardages.courseTeeId, tee.id));
          const yardageByHole = new Map(
            yardages.map((yardage) => [yardage.courseHoleId, yardage.yardage]),
          );
          const holesByNumber = new Map(sourceHoles.map((hole) => [hole.holeNumber, hole]));
          const orderedHoles = order.map((number) => holesByNumber.get(number)!);
          if (orderedHoles.some((hole) => !yardageByHole.has(hole.id)))
            throw new RoundRepositoryError(
              'TEE_UNAVAILABLE',
              400,
              'The selected tee does not have yardage for every scheduled hole.',
            );
          const standardFront =
            input.scheduledHoleCount === 9 && order.every((number, index) => number === index + 1);
          const standardBack =
            input.scheduledHoleCount === 9 && order.every((number, index) => number === index + 10);
          const rating =
            input.scheduledHoleCount === 18
              ? tee.courseRating18
              : course.holeCount === 9 || standardFront
                ? tee.frontNineRating
                : standardBack
                  ? tee.backNineRating
                  : null;
          const slope =
            input.scheduledHoleCount === 18
              ? tee.slopeRating18
              : course.holeCount === 9 || standardFront
                ? tee.frontNineSlope
                : standardBack
                  ? tee.backNineSlope
                  : null;
          const inserted = await transaction
            .insert(rounds)
            .values({
              userId,
              courseId: course.id,
              courseTeeId: tee.id,
              status: 'in_progress',
              trackingMode: input.trackingMode,
              scheduledHoleCount: input.scheduledHoleCount,
              startingHoleNumber: input.startingHoleNumber,
              playedOn: input.playedOn,
              courseNameSnapshot: course.name,
              courseLocationSnapshot: course.locationText,
              teeNameSnapshot: tee.name,
              courseRatingSnapshot: rating,
              slopeRatingSnapshot: slope,
              courseParSnapshot: orderedHoles.reduce((total, hole) => total + hole.par, 0),
              handicapEligible: false,
            })
            .returning();
          const round = inserted[0];
          if (!round) throw new Error('Round insert failed.');
          const insertedHoles = await transaction
            .insert(roundHoles)
            .values(
              orderedHoles.map((hole, index) => ({
                roundId: round.id,
                courseHoleId: hole.id,
                holeNumber: hole.holeNumber,
                playSequence: index + 1,
                parSnapshot: hole.par,
                yardageSnapshot: yardageByHole.get(hole.id)!,
                strokeIndexSnapshot: hole.strokeIndex,
              })),
            )
            .returning();
          return toRoundDetails(
            round,
            insertedHoles.sort((left, right) => left.playSequence - right.playSequence),
          );
        });
      } catch (error) {
        if (error instanceof RoundRepositoryError) throw error;
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        )
          throw new RoundRepositoryError(
            'ACTIVE_ROUND_EXISTS',
            409,
            'You already have a round in progress.',
          );
        throw error;
      }
    },
  };
}
