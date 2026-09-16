import type { CreateRoundInput } from '@golf-track/shared';
import type { RoundRepository } from './round.repository.js';
import { RoundRepositoryError } from './round.repository.js';
export function createRoundService(repository: RoundRepository) {
  return {
    async userId(subject: string) {
      const userId = await repository.findUserId(subject);
      if (!userId)
        throw new RoundRepositoryError(
          'PROFILE_NOT_FOUND',
          404,
          'No application profile exists for this account.',
        );
      return userId;
    },
    active: (userId: string) => repository.findActive(userId),
    details: (id: string, userId: string) => repository.findOwned(id, userId),
    start: (userId: string, input: CreateRoundInput) => repository.start(userId, input),
  };
}
