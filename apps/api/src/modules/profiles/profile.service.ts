import type { ProfileRepository } from './profile.repository.js';
import type { ProfileBootstrapData } from './profile.repository.js';

export function createProfileService(repository: ProfileRepository) {
  return {
    getForAuthenticatedSubject: (subject: string) => repository.findByAuthSubject(subject),
    bootstrap: (data: ProfileBootstrapData) => repository.bootstrap(data),
  };
}
