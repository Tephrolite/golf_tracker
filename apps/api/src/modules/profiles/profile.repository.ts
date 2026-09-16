import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { userProfiles, users } from '../../db/schema/index.js';

export interface ProfileRecord {
  id: string;
  displayName: string;
  email: string;
  startingHandicap: number | null;
  createdAt: Date;
}

export interface ProfileBootstrapData {
  subject: string;
  email: string;
  displayName: string;
  startingHandicap: number | null;
}
export interface ProfileRepository {
  findByAuthSubject(subject: string): Promise<ProfileRecord | null>;
  bootstrap(data: ProfileBootstrapData): Promise<ProfileRecord>;
}

const profileSelection = {
  id: users.id,
  displayName: userProfiles.displayName,
  email: users.email,
  startingHandicap: userProfiles.startingHandicap,
  createdAt: userProfiles.createdAt,
};
type SelectedProfile = {
  id: string;
  displayName: string;
  email: string;
  startingHandicap: string | null;
  createdAt: Date;
};
function toProfileRecord(profile: SelectedProfile): ProfileRecord {
  return {
    ...profile,
    startingHandicap: profile.startingHandicap === null ? null : Number(profile.startingHandicap),
  };
}

export function createProfileRepository(db: Database): ProfileRepository {
  return {
    async findByAuthSubject(subject) {
      const result = await db
        .select(profileSelection)
        .from(users)
        .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(and(eq(users.authProvider, 'supabase'), eq(users.authSubject, subject)))
        .limit(1);
      const profile = result[0];
      return profile ? toProfileRecord(profile) : null;
    },
    async bootstrap(data) {
      return db.transaction(async (transaction) => {
        await transaction
          .insert(users)
          .values({ authProvider: 'supabase', authSubject: data.subject, email: data.email })
          .onConflictDoNothing();
        const applicationUser = await transaction
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.authProvider, 'supabase'), eq(users.authSubject, data.subject)))
          .limit(1);
        const user = applicationUser[0];
        if (!user) throw new Error('Authenticated application user could not be resolved.');
        await transaction
          .insert(userProfiles)
          .values({
            userId: user.id,
            displayName: data.displayName,
            startingHandicap: data.startingHandicap === null ? null : String(data.startingHandicap),
            startingHandicapEnteredAt: data.startingHandicap === null ? null : new Date(),
          })
          .onConflictDoNothing();
        const profile = await transaction
          .select(profileSelection)
          .from(users)
          .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
          .where(and(eq(users.authProvider, 'supabase'), eq(users.authSubject, data.subject)))
          .limit(1);
        const result = profile[0];
        if (!result) throw new Error('Application profile could not be resolved.');
        return toProfileRecord(result);
      });
    },
  };
}
