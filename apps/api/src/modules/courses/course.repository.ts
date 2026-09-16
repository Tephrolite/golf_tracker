import { and, eq, ilike, or, sql } from 'drizzle-orm';
import type {
  CourseDetails,
  CourseInput,
  CourseSummary,
  CourseUpdateInput,
} from '@golf-track/shared';
import type { Database } from '../../db/client.js';
import {
  courseHoleYardages,
  courseHoles,
  courseTees,
  courses,
  users,
} from '../../db/schema/index.js';

export interface CourseRepository {
  findUserId(subject: string): Promise<string | null>;
  list(
    userId: string,
    search: string,
    page: number,
    pageSize: number,
  ): Promise<{ courses: CourseSummary[]; total: number }>;
  findDetails(id: string, userId: string): Promise<CourseDetails | null>;
  findLikelyDuplicates(name: string, locationText: string | null): Promise<CourseSummary[]>;
  create(userId: string, input: CourseInput): Promise<CourseDetails>;
  replace(
    id: string,
    userId: string,
    input: CourseUpdateInput,
  ): Promise<CourseDetails | 'forbidden' | 'conflict' | null>;
  archive(id: string, userId: string): Promise<'archived' | 'forbidden' | null>;
}

export function toCourseSummary(row: {
  id: string;
  name: string;
  locationText: string | null;
  holeCount: number;
  status: string;
  createdByUserId: string | null;
  totalPar: unknown;
  teeCount: unknown;
}): CourseSummary {
  const totalPar = row.totalPar === null ? null : Number(row.totalPar);
  const teeCount = Number(row.teeCount);
  if ((totalPar !== null && !Number.isFinite(totalPar)) || !Number.isFinite(teeCount))
    throw new Error('Course aggregate values must be finite numbers.');
  return {
    id: row.id,
    name: row.name,
    locationText: row.locationText,
    holeCount: row.holeCount,
    totalPar,
    teeCount,
    status: row.status as CourseSummary['status'],
    canEdit: row.createdByUserId !== null,
  };
}

export function createCourseRepository(db: Database): CourseRepository {
  async function details(id: string, userId: string): Promise<CourseDetails | null> {
    const base = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, id),
          or(
            and(eq(courses.status, 'active'), eq(courses.visibility, 'shared')),
            eq(courses.createdByUserId, userId),
          ),
        ),
      )
      .limit(1);
    const course = base[0];
    if (!course) return null;
    const [tees, holes, yardages] = await Promise.all([
      db
        .select()
        .from(courseTees)
        .where(and(eq(courseTees.courseId, id), sql`${courseTees.archivedAt} is null`))
        .orderBy(courseTees.displayOrder),
      db
        .select()
        .from(courseHoles)
        .where(eq(courseHoles.courseId, id))
        .orderBy(courseHoles.holeNumber),
      db
        .select({
          courseTeeId: courseHoleYardages.courseTeeId,
          courseHoleId: courseHoleYardages.courseHoleId,
          yardage: courseHoleYardages.yardage,
        })
        .from(courseHoleYardages)
        .innerJoin(courseHoles, eq(courseHoleYardages.courseHoleId, courseHoles.id))
        .where(eq(courseHoles.courseId, id)),
    ]);
    const yardageMap = new Map(
      yardages.map((yardage) => [
        `${yardage.courseHoleId}:${yardage.courseTeeId}`,
        yardage.yardage,
      ]),
    );
    const totalPar = holes.reduce((total, hole) => total + hole.par, 0);
    return {
      id: course.id,
      name: course.name,
      locationText: course.locationText,
      holeCount: course.holeCount,
      status: course.status as CourseDetails['status'],
      visibility: course.visibility as CourseDetails['visibility'],
      canEdit: course.createdByUserId === userId,
      totalPar,
      teeCount: tees.length,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      revision: course.revision,
      tees: tees.map((tee) => ({
        id: tee.id,
        name: tee.name,
        displayOrder: tee.displayOrder,
        courseRating18: tee.courseRating18 === null ? null : Number(tee.courseRating18),
        slopeRating18: tee.slopeRating18,
        frontNineRating: tee.frontNineRating === null ? null : Number(tee.frontNineRating),
        frontNineSlope: tee.frontNineSlope,
        backNineRating: tee.backNineRating === null ? null : Number(tee.backNineRating),
        backNineSlope: tee.backNineSlope,
        totalYardage: holes.reduce(
          (total, hole) => total + (yardageMap.get(`${hole.id}:${tee.id}`) ?? 0),
          0,
        ),
      })),
      holes: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        yardages: Object.fromEntries(
          tees.map((tee) => [tee.id, yardageMap.get(`${hole.id}:${tee.id}`) ?? 0]),
        ),
      })),
    };
  }
  async function insertStructure(transaction: Database, courseId: string, input: CourseInput) {
    const insertedTees = await transaction
      .insert(courseTees)
      .values(
        input.tees.map((tee) => ({
          courseId,
          name: tee.name,
          displayOrder: tee.displayOrder,
          courseRating18: tee.courseRating18 == null ? null : String(tee.courseRating18),
          slopeRating18: tee.slopeRating18 ?? null,
          frontNineRating: tee.frontNineRating == null ? null : String(tee.frontNineRating),
          frontNineSlope: tee.frontNineSlope ?? null,
          backNineRating: tee.backNineRating == null ? null : String(tee.backNineRating),
          backNineSlope: tee.backNineSlope ?? null,
        })),
      )
      .returning({ id: courseTees.id, clientId: courseTees.name });
    const teeIds = new Map(
      input.tees.map((tee) => [
        tee.clientId,
        insertedTees.find((inserted) => inserted.clientId === tee.name)?.id,
      ]),
    );
    const insertedHoles = await transaction
      .insert(courseHoles)
      .values(
        input.holes.map((hole) => ({
          courseId,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex ?? null,
        })),
      )
      .returning({ id: courseHoles.id, holeNumber: courseHoles.holeNumber });
    await transaction.insert(courseHoleYardages).values(
      input.holes.flatMap((hole) =>
        input.tees.map((tee) => ({
          courseTeeId: teeIds.get(tee.clientId)!,
          courseHoleId: insertedHoles.find((inserted) => inserted.holeNumber === hole.holeNumber)!
            .id,
          yardage: hole.yardages[tee.clientId]!,
        })),
      ),
    );
  }
  return {
    async findUserId(subject) {
      const result = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.authProvider, 'supabase'), eq(users.authSubject, subject)))
        .limit(1);
      return result[0]?.id ?? null;
    },
    async list(userId, search, page, pageSize) {
      const text = `%${search}%`;
      const condition = and(
        eq(courses.status, 'active'),
        eq(courses.visibility, 'shared'),
        search ? or(ilike(courses.name, text), ilike(courses.locationText, text)) : undefined,
      );
      const rows = await db
        .select({
          id: courses.id,
          name: courses.name,
          locationText: courses.locationText,
          holeCount: courses.holeCount,
          status: courses.status,
          createdByUserId: courses.createdByUserId,
          totalPar: sql<string | null>`(
            select sum(${courseHoles.par})
            from ${courseHoles}
            where ${courseHoles.courseId} = ${courses.id}
          )`,
          teeCount: sql<string>`(
            select count(*)
            from ${courseTees}
            where ${courseTees.courseId} = ${courses.id}
              and ${courseTees.archivedAt} is null
          )`,
        })
        .from(courses)
        .where(condition)
        .orderBy(courses.name, courses.id)
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const count = await db
        .select({ value: sql<number>`count(*)` })
        .from(courses)
        .where(condition);
      return {
        courses: rows.map((row) => ({
          ...toCourseSummary(row),
          canEdit: row.createdByUserId === userId,
        })),
        total: Number(count[0]?.value ?? 0),
      };
    },
    findDetails: details,
    async findLikelyDuplicates(name, locationText) {
      const rows = await db
        .select({
          id: courses.id,
          name: courses.name,
          locationText: courses.locationText,
          holeCount: courses.holeCount,
          status: courses.status,
          createdByUserId: courses.createdByUserId,
          totalPar: sql<number | null>`null`,
          teeCount: sql<number>`0`,
        })
        .from(courses)
        .where(
          and(
            eq(courses.status, 'active'),
            eq(courses.visibility, 'shared'),
            eq(sql`lower(${courses.name})`, name.toLowerCase()),
            locationText
              ? eq(sql`lower(${courses.locationText})`, locationText.toLowerCase())
              : sql`${courses.locationText} is null`,
          ),
        );
      return rows.map((row) => ({ ...toCourseSummary(row), canEdit: false }));
    },
    async create(userId, input) {
      const id = await db.transaction(async (transaction) => {
        const inserted = await transaction
          .insert(courses)
          .values({
            name: input.name,
            locationText: input.locationText ?? null,
            holeCount: input.holeCount,
            status: 'active',
            visibility: 'shared',
            createdByUserId: userId,
          })
          .returning({ id: courses.id });
        const course = inserted[0];
        if (!course) throw new Error('Course insert failed.');
        await insertStructure(transaction as unknown as Database, course.id, input);
        return course.id;
      });
      const result = await details(id, userId);
      if (!result) throw new Error('Course retrieval failed.');
      return result;
    },
    async replace(id, userId, input) {
      const existing = await db
        .select({ id: courses.id, createdByUserId: courses.createdByUserId })
        .from(courses)
        .where(eq(courses.id, id))
        .limit(1);
      if (!existing[0]) return null;
      if (existing[0].createdByUserId !== userId) return 'forbidden';
      const updated = await db.transaction(async (transaction) => {
        const changed = await transaction
          .update(courses)
          .set({
            name: input.name,
            locationText: input.locationText ?? null,
            holeCount: input.holeCount,
            revision: sql`${courses.revision} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(courses.id, id),
              eq(courses.createdByUserId, userId),
              eq(courses.revision, input.expectedRevision),
            ),
          )
          .returning({ id: courses.id });
        if (!changed[0]) return false;
        await transaction
          .delete(courseHoleYardages)
          .where(
            sql`${courseHoleYardages.courseTeeId} in (select id from course_tees where course_id = ${id})`,
          );
        await transaction.delete(courseTees).where(eq(courseTees.courseId, id));
        await transaction.delete(courseHoles).where(eq(courseHoles.courseId, id));
        await insertStructure(transaction as unknown as Database, id, input);
        return true;
      });
      if (!updated) return 'conflict';
      return (await details(id, userId))!;
    },
    async archive(id, userId) {
      const existing = await db
        .select({ createdByUserId: courses.createdByUserId })
        .from(courses)
        .where(eq(courses.id, id))
        .limit(1);
      if (!existing[0]) return null;
      if (existing[0].createdByUserId !== userId) return 'forbidden';
      await db
        .update(courses)
        .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(courses.id, id));
      return 'archived';
    },
  };
}
