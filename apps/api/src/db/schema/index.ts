import { relations, sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, numeric, pgTable, primaryKey, smallint, text, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), authProvider: text('auth_provider').notNull(), authSubject: text('auth_subject').notNull(),
  email: varchar('email', { length: 320 }).notNull(), emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }), deletedAt: timestamp('deleted_at', { withTimezone: true }), ...timestamps,
}, (table) => [unique('users_auth_provider_subject_unique').on(table.authProvider, table.authSubject), uniqueIndex('users_email_unique').on(sql`lower(${table.email})`)]);

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'restrict' }), displayName: varchar('display_name', { length: 100 }).notNull(),
  startingHandicap: numeric('starting_handicap', { precision: 4, scale: 1 }), startingHandicapEnteredAt: timestamp('starting_handicap_entered_at', { withTimezone: true }), ...timestamps,
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(), name: varchar('name', { length: 200 }).notNull(), locationText: varchar('location_text', { length: 200 }),
  holeCount: smallint('hole_count').notNull(), status: text('status').notNull().default('draft'), visibility: text('visibility').notNull().default('shared'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }), archivedAt: timestamp('archived_at', { withTimezone: true }), ...timestamps,
}, (table) => [check('courses_hole_count_check', sql`${table.holeCount} in (9, 18)`), check('courses_status_check', sql`${table.status} in ('draft', 'active', 'archived')`), check('courses_visibility_check', sql`${table.visibility} in ('shared', 'private')`), index('courses_name_lookup_idx').on(sql`lower(${table.name})`), index('courses_status_visibility_idx').on(table.status, table.visibility)]);

export const courseTees = pgTable('course_tees', {
  id: uuid('id').primaryKey().defaultRandom(), courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }), name: varchar('name', { length: 80 }).notNull(),
  courseRating18: numeric('course_rating_18', { precision: 4, scale: 1 }), slopeRating18: smallint('slope_rating_18'), frontNineRating: numeric('front_nine_rating', { precision: 4, scale: 1 }), frontNineSlope: smallint('front_nine_slope'), backNineRating: numeric('back_nine_rating', { precision: 4, scale: 1 }), backNineSlope: smallint('back_nine_slope'),
  displayOrder: smallint('display_order').notNull(), archivedAt: timestamp('archived_at', { withTimezone: true }), ...timestamps,
}, (table) => [index('course_tees_course_idx').on(table.courseId), uniqueIndex('course_tees_active_name_unique').on(table.courseId, sql`lower(${table.name})`).where(sql`${table.archivedAt} is null`), uniqueIndex('course_tees_active_order_unique').on(table.courseId, table.displayOrder).where(sql`${table.archivedAt} is null`), check('course_tees_slope_check', sql`(${table.slopeRating18} is null or ${table.slopeRating18} between 55 and 155) and (${table.frontNineSlope} is null or ${table.frontNineSlope} between 55 and 155) and (${table.backNineSlope} is null or ${table.backNineSlope} between 55 and 155)`)]);

export const courseHoles = pgTable('course_holes', {
  id: uuid('id').primaryKey().defaultRandom(), courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }), holeNumber: smallint('hole_number').notNull(), par: smallint('par').notNull(), strokeIndex: smallint('stroke_index'), ...timestamps,
}, (table) => [unique('course_holes_course_number_unique').on(table.courseId, table.holeNumber), uniqueIndex('course_holes_stroke_index_unique').on(table.courseId, table.strokeIndex).where(sql`${table.strokeIndex} is not null`), check('course_holes_number_check', sql`${table.holeNumber} between 1 and 18`), check('course_holes_par_check', sql`${table.par} between 3 and 6`), check('course_holes_stroke_index_check', sql`${table.strokeIndex} is null or ${table.strokeIndex} between 1 and 18`)]);

export const courseHoleYardages = pgTable('course_hole_yardages', {
  courseTeeId: uuid('course_tee_id').notNull().references(() => courseTees.id, { onDelete: 'cascade' }), courseHoleId: uuid('course_hole_id').notNull().references(() => courseHoles.id, { onDelete: 'cascade' }), yardage: smallint('yardage').notNull(), ...timestamps,
}, (table) => [primaryKey({ columns: [table.courseTeeId, table.courseHoleId] }), check('course_hole_yardages_yardage_check', sql`${table.yardage} >= 0`)]);

export const rounds = pgTable('rounds', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }), courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }), courseTeeId: uuid('course_tee_id').references(() => courseTees.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('in_progress'), trackingMode: text('tracking_mode').notNull().default('basic'), scheduledHoleCount: smallint('scheduled_hole_count').notNull(), startingHoleNumber: smallint('starting_hole_number').notNull(), playedOn: date('played_on').notNull(), startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(), completedAt: timestamp('completed_at', { withTimezone: true }), abandonedAt: timestamp('abandoned_at', { withTimezone: true }), deletedAt: timestamp('deleted_at', { withTimezone: true }),
  courseNameSnapshot: varchar('course_name_snapshot', { length: 200 }).notNull(), courseLocationSnapshot: varchar('course_location_snapshot', { length: 200 }), teeNameSnapshot: varchar('tee_name_snapshot', { length: 80 }).notNull(), courseRatingSnapshot: numeric('course_rating_snapshot', { precision: 4, scale: 1 }), slopeRatingSnapshot: smallint('slope_rating_snapshot'), courseParSnapshot: smallint('course_par_snapshot'), handicapEligible: boolean('handicap_eligible').notNull().default(false), handicapIneligibleReason: text('handicap_ineligible_reason'), scoreDifferential: numeric('score_differential', { precision: 5, scale: 1 }), calculationVersion: varchar('calculation_version', { length: 40 }), revision: integer('revision').notNull().default(1), lastClientUpdatedAt: timestamp('last_client_updated_at', { withTimezone: true }), ...timestamps,
}, (table) => [check('rounds_status_check', sql`${table.status} in ('in_progress', 'completed', 'abandoned', 'deleted')`), check('rounds_tracking_mode_check', sql`${table.trackingMode} in ('basic', 'detailed')`), check('rounds_count_check', sql`${table.scheduledHoleCount} in (9, 18)`), check('rounds_starting_hole_check', sql`${table.startingHoleNumber} between 1 and 18`), index('rounds_user_history_idx').on(table.userId, table.playedOn), index('rounds_user_status_updated_idx').on(table.userId, table.status, table.updatedAt), index('rounds_course_idx').on(table.courseId), uniqueIndex('one_in_progress_round_per_user').on(table.userId).where(sql`${table.status} = 'in_progress' and ${table.deletedAt} is null`)]);

export const roundHoles = pgTable('round_holes', {
  id: uuid('id').primaryKey().defaultRandom(), roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }), courseHoleId: uuid('course_hole_id').references(() => courseHoles.id, { onDelete: 'set null' }), holeNumber: smallint('hole_number').notNull(), playSequence: smallint('play_sequence').notNull(), parSnapshot: smallint('par_snapshot').notNull(), yardageSnapshot: smallint('yardage_snapshot'), strokeIndexSnapshot: smallint('stroke_index_snapshot'), score: smallint('score'), putts: smallint('putts'), fairwayResult: text('fairway_result'), greenInRegulation: boolean('green_in_regulation'), penaltyStrokes: smallint('penalty_strokes'), notes: varchar('notes', { length: 2000 }), revision: integer('revision').notNull().default(1), lastClientUpdatedAt: timestamp('last_client_updated_at', { withTimezone: true }), ...timestamps,
}, (table) => [unique('round_holes_round_number_unique').on(table.roundId, table.holeNumber), unique('round_holes_round_sequence_unique').on(table.roundId, table.playSequence), index('round_holes_round_idx').on(table.roundId), check('round_holes_number_check', sql`${table.holeNumber} between 1 and 18 and ${table.playSequence} between 1 and 18`), check('round_holes_score_check', sql`${table.score} is null or ${table.score} between 1 and 30`), check('round_holes_putts_check', sql`${table.putts} is null or ${table.putts} between 0 and 30`), check('round_holes_penalty_check', sql`${table.penaltyStrokes} is null or ${table.penaltyStrokes} between 0 and 30`), check('round_holes_fairway_check', sql`${table.fairwayResult} is null or ${table.fairwayResult} in ('hit', 'left', 'right')`)]);

export const handicapRevisions = pgTable('handicap_revisions', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }), effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(), handicapIndex: numeric('handicap_index', { precision: 4, scale: 1 }).notNull(), eligibleRoundCount: smallint('eligible_round_count').notNull(), countingRoundCount: smallint('counting_round_count').notNull(), calculationVersion: varchar('calculation_version', { length: 40 }).notNull(), triggerType: text('trigger_type').notNull(), triggerRoundId: uuid('trigger_round_id').references(() => rounds.id, { onDelete: 'set null' }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('handicap_revisions_user_effective_idx').on(table.userId, table.effectiveAt)]);

export const handicapRevisionRounds = pgTable('handicap_revision_rounds', {
  handicapRevisionId: uuid('handicap_revision_id').notNull().references(() => handicapRevisions.id, { onDelete: 'cascade' }), roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'restrict' }), differentialSnapshot: numeric('differential_snapshot', { precision: 5, scale: 1 }).notNull(), counted: boolean('counted').notNull(), selectionOrder: smallint('selection_order'),
}, (table) => [primaryKey({ columns: [table.handicapRevisionId, table.roundId] })]);

export const usersRelations = relations(users, ({ one, many }) => ({ profile: one(userProfiles), rounds: many(rounds), handicapRevisions: many(handicapRevisions) }));
export const roundsRelations = relations(rounds, ({ many }) => ({ holes: many(roundHoles) }));