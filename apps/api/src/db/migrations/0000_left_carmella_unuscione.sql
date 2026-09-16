CREATE TABLE "course_hole_yardages" (
	"course_tee_id" uuid NOT NULL,
	"course_hole_id" uuid NOT NULL,
	"yardage" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_hole_yardages_course_tee_id_course_hole_id_pk" PRIMARY KEY("course_tee_id","course_hole_id"),
	CONSTRAINT "course_hole_yardages_yardage_check" CHECK ("course_hole_yardages"."yardage" >= 0)
);
--> statement-breakpoint
CREATE TABLE "course_holes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"hole_number" smallint NOT NULL,
	"par" smallint NOT NULL,
	"stroke_index" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_holes_course_number_unique" UNIQUE("course_id","hole_number"),
	CONSTRAINT "course_holes_number_check" CHECK ("course_holes"."hole_number" between 1 and 18),
	CONSTRAINT "course_holes_par_check" CHECK ("course_holes"."par" between 3 and 6),
	CONSTRAINT "course_holes_stroke_index_check" CHECK ("course_holes"."stroke_index" is null or "course_holes"."stroke_index" between 1 and 18)
);
--> statement-breakpoint
CREATE TABLE "course_tees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"course_rating_18" numeric(4, 1),
	"slope_rating_18" smallint,
	"front_nine_rating" numeric(4, 1),
	"front_nine_slope" smallint,
	"back_nine_rating" numeric(4, 1),
	"back_nine_slope" smallint,
	"display_order" smallint NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_tees_slope_check" CHECK (("course_tees"."slope_rating_18" is null or "course_tees"."slope_rating_18" between 55 and 155) and ("course_tees"."front_nine_slope" is null or "course_tees"."front_nine_slope" between 55 and 155) and ("course_tees"."back_nine_slope" is null or "course_tees"."back_nine_slope" between 55 and 155))
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"location_text" varchar(200),
	"hole_count" smallint NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'shared' NOT NULL,
	"created_by_user_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_hole_count_check" CHECK ("courses"."hole_count" in (9, 18)),
	CONSTRAINT "courses_status_check" CHECK ("courses"."status" in ('draft', 'active', 'archived')),
	CONSTRAINT "courses_visibility_check" CHECK ("courses"."visibility" in ('shared', 'private'))
);
--> statement-breakpoint
CREATE TABLE "handicap_revision_rounds" (
	"handicap_revision_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"differential_snapshot" numeric(5, 1) NOT NULL,
	"counted" boolean NOT NULL,
	"selection_order" smallint,
	CONSTRAINT "handicap_revision_rounds_handicap_revision_id_round_id_pk" PRIMARY KEY("handicap_revision_id","round_id")
);
--> statement-breakpoint
CREATE TABLE "handicap_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"handicap_index" numeric(4, 1) NOT NULL,
	"eligible_round_count" smallint NOT NULL,
	"counting_round_count" smallint NOT NULL,
	"calculation_version" varchar(40) NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_round_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_holes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"course_hole_id" uuid,
	"hole_number" smallint NOT NULL,
	"play_sequence" smallint NOT NULL,
	"par_snapshot" smallint NOT NULL,
	"yardage_snapshot" smallint,
	"stroke_index_snapshot" smallint,
	"score" smallint,
	"putts" smallint,
	"fairway_result" text,
	"green_in_regulation" boolean,
	"penalty_strokes" smallint,
	"notes" varchar(2000),
	"revision" integer DEFAULT 1 NOT NULL,
	"last_client_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "round_holes_round_number_unique" UNIQUE("round_id","hole_number"),
	CONSTRAINT "round_holes_round_sequence_unique" UNIQUE("round_id","play_sequence"),
	CONSTRAINT "round_holes_number_check" CHECK ("round_holes"."hole_number" between 1 and 18 and "round_holes"."play_sequence" between 1 and 18),
	CONSTRAINT "round_holes_score_check" CHECK ("round_holes"."score" is null or "round_holes"."score" between 1 and 30),
	CONSTRAINT "round_holes_putts_check" CHECK ("round_holes"."putts" is null or "round_holes"."putts" between 0 and 30),
	CONSTRAINT "round_holes_penalty_check" CHECK ("round_holes"."penalty_strokes" is null or "round_holes"."penalty_strokes" between 0 and 30),
	CONSTRAINT "round_holes_fairway_check" CHECK ("round_holes"."fairway_result" is null or "round_holes"."fairway_result" in ('hit', 'left', 'right'))
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"course_tee_id" uuid,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"tracking_mode" text DEFAULT 'basic' NOT NULL,
	"scheduled_hole_count" smallint NOT NULL,
	"starting_hole_number" smallint NOT NULL,
	"played_on" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"course_name_snapshot" varchar(200) NOT NULL,
	"course_location_snapshot" varchar(200),
	"tee_name_snapshot" varchar(80) NOT NULL,
	"course_rating_snapshot" numeric(4, 1),
	"slope_rating_snapshot" smallint,
	"course_par_snapshot" smallint,
	"handicap_eligible" boolean DEFAULT false NOT NULL,
	"handicap_ineligible_reason" text,
	"score_differential" numeric(5, 1),
	"calculation_version" varchar(40),
	"revision" integer DEFAULT 1 NOT NULL,
	"last_client_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rounds_status_check" CHECK ("rounds"."status" in ('in_progress', 'completed', 'abandoned', 'deleted')),
	CONSTRAINT "rounds_tracking_mode_check" CHECK ("rounds"."tracking_mode" in ('basic', 'detailed')),
	CONSTRAINT "rounds_count_check" CHECK ("rounds"."scheduled_hole_count" in (9, 18)),
	CONSTRAINT "rounds_starting_hole_check" CHECK ("rounds"."starting_hole_number" between 1 and 18)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"starting_handicap" numeric(4, 1),
	"starting_handicap_entered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_provider" text NOT NULL,
	"auth_subject" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_provider_subject_unique" UNIQUE("auth_provider","auth_subject")
);
--> statement-breakpoint
ALTER TABLE "course_hole_yardages" ADD CONSTRAINT "course_hole_yardages_course_tee_id_course_tees_id_fk" FOREIGN KEY ("course_tee_id") REFERENCES "public"."course_tees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_hole_yardages" ADD CONSTRAINT "course_hole_yardages_course_hole_id_course_holes_id_fk" FOREIGN KEY ("course_hole_id") REFERENCES "public"."course_holes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_holes" ADD CONSTRAINT "course_holes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tees" ADD CONSTRAINT "course_tees_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handicap_revision_rounds" ADD CONSTRAINT "handicap_revision_rounds_handicap_revision_id_handicap_revisions_id_fk" FOREIGN KEY ("handicap_revision_id") REFERENCES "public"."handicap_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handicap_revision_rounds" ADD CONSTRAINT "handicap_revision_rounds_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handicap_revisions" ADD CONSTRAINT "handicap_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handicap_revisions" ADD CONSTRAINT "handicap_revisions_trigger_round_id_rounds_id_fk" FOREIGN KEY ("trigger_round_id") REFERENCES "public"."rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_holes" ADD CONSTRAINT "round_holes_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_holes" ADD CONSTRAINT "round_holes_course_hole_id_course_holes_id_fk" FOREIGN KEY ("course_hole_id") REFERENCES "public"."course_holes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_course_tee_id_course_tees_id_fk" FOREIGN KEY ("course_tee_id") REFERENCES "public"."course_tees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_holes_stroke_index_unique" ON "course_holes" USING btree ("course_id","stroke_index") WHERE "course_holes"."stroke_index" is not null;--> statement-breakpoint
CREATE INDEX "course_tees_course_idx" ON "course_tees" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_tees_active_name_unique" ON "course_tees" USING btree ("course_id",lower("name")) WHERE "course_tees"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "course_tees_active_order_unique" ON "course_tees" USING btree ("course_id","display_order") WHERE "course_tees"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "courses_name_lookup_idx" ON "courses" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "courses_status_visibility_idx" ON "courses" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "handicap_revisions_user_effective_idx" ON "handicap_revisions" USING btree ("user_id","effective_at");--> statement-breakpoint
CREATE INDEX "round_holes_round_idx" ON "round_holes" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "rounds_user_history_idx" ON "rounds" USING btree ("user_id","played_on");--> statement-breakpoint
CREATE INDEX "rounds_user_status_updated_idx" ON "rounds" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "rounds_course_idx" ON "rounds" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_in_progress_round_per_user" ON "rounds" USING btree ("user_id") WHERE "rounds"."status" = 'in_progress' and "rounds"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
-- CUSTOM SECURITY AND INTEGRITY SQL: preserve this section when regenerating an unapplied migration.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_tees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_holes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_hole_yardages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "round_holes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "handicap_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "handicap_revision_rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "users" FROM anon;
REVOKE ALL ON TABLE "users" FROM authenticated;
REVOKE ALL ON TABLE "user_profiles" FROM anon;
REVOKE ALL ON TABLE "user_profiles" FROM authenticated;
REVOKE ALL ON TABLE "courses" FROM anon;
REVOKE ALL ON TABLE "courses" FROM authenticated;
REVOKE ALL ON TABLE "course_tees" FROM anon;
REVOKE ALL ON TABLE "course_tees" FROM authenticated;
REVOKE ALL ON TABLE "course_holes" FROM anon;
REVOKE ALL ON TABLE "course_holes" FROM authenticated;
REVOKE ALL ON TABLE "course_hole_yardages" FROM anon;
REVOKE ALL ON TABLE "course_hole_yardages" FROM authenticated;
REVOKE ALL ON TABLE "rounds" FROM anon;
REVOKE ALL ON TABLE "rounds" FROM authenticated;
REVOKE ALL ON TABLE "round_holes" FROM anon;
REVOKE ALL ON TABLE "round_holes" FROM authenticated;
REVOKE ALL ON TABLE "handicap_revisions" FROM anon;
REVOKE ALL ON TABLE "handicap_revisions" FROM authenticated;
REVOKE ALL ON TABLE "handicap_revision_rounds" FROM anon;
REVOKE ALL ON TABLE "handicap_revision_rounds" FROM authenticated;--> statement-breakpoint
CREATE FUNCTION validate_course_hole_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM courses WHERE id = NEW.course_id AND NEW.hole_number <= hole_count) THEN
		RAISE EXCEPTION 'course hole number must not exceed the parent course hole count';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER course_holes_valid_number BEFORE INSERT OR UPDATE OF course_id, hole_number ON course_holes
FOR EACH ROW EXECUTE FUNCTION validate_course_hole_number();--> statement-breakpoint
CREATE FUNCTION validate_course_hole_yardage_course() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM course_tees tee JOIN course_holes hole ON tee.course_id = hole.course_id
		WHERE tee.id = NEW.course_tee_id AND hole.id = NEW.course_hole_id
	) THEN RAISE EXCEPTION 'course tee and course hole must belong to the same course'; END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER course_hole_yardages_same_course BEFORE INSERT OR UPDATE ON course_hole_yardages
FOR EACH ROW EXECUTE FUNCTION validate_course_hole_yardage_course();--> statement-breakpoint
CREATE FUNCTION validate_round_catalog_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW.course_id IS NOT NULL AND NEW.course_tee_id IS NOT NULL AND NOT EXISTS (
		SELECT 1 FROM course_tees WHERE id = NEW.course_tee_id AND course_id = NEW.course_id
	) THEN RAISE EXCEPTION 'round course tee must belong to the selected course'; END IF;
	IF NEW.course_id IS NOT NULL AND NOT EXISTS (
		SELECT 1 FROM course_holes WHERE course_id = NEW.course_id AND hole_number = NEW.starting_hole_number
	) THEN RAISE EXCEPTION 'round starting hole must exist for the selected course'; END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER rounds_valid_catalog BEFORE INSERT OR UPDATE OF course_id, course_tee_id, starting_hole_number ON rounds
FOR EACH ROW EXECUTE FUNCTION validate_round_catalog_integrity();--> statement-breakpoint
CREATE FUNCTION validate_round_hole_sequence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM rounds WHERE id = NEW.round_id AND NEW.play_sequence <= scheduled_hole_count) THEN
		RAISE EXCEPTION 'round-hole play sequence must not exceed the parent round scheduled hole count';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER round_holes_valid_sequence BEFORE INSERT OR UPDATE OF round_id, play_sequence ON round_holes
FOR EACH ROW EXECUTE FUNCTION validate_round_hole_sequence();