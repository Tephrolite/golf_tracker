import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ApiError, bootstrapProfile, getMe } from '../src/lib/api';
import { useAuthStore } from '../src/stores/auth';
import { useProfileStore } from '../src/stores/profile';

vi.mock('../src/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
  getMe: vi.fn(),
  bootstrapProfile: vi.fn(),
}));
const profile = {
  id: 'a1b2c3d4-1111-4222-8333-444444444444',
  displayName: 'Taylor',
  email: 'taylor@example.com',
  startingHandicap: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    useAuthStore().session = { access_token: 'token' } as never;
  });
  it('restores an existing application profile through the API', async () => {
    vi.mocked(getMe).mockResolvedValue({ profile });
    const store = useProfileStore();
    await store.restore();
    expect(getMe).toHaveBeenCalledWith('token');
    expect(store.profile).toStrictEqual(profile);
  });
  it('represents profile-not-found without treating it as an API failure', async () => {
    vi.mocked(getMe).mockRejectedValue(new ApiError(404, 'PROFILE_NOT_FOUND', 'Missing'));
    const store = useProfileStore();
    await store.restore();
    expect(store.profile).toBeNull();
    expect(store.error).toBeNull();
  });
  it('bootstraps a missing profile with the current access token', async () => {
    vi.mocked(bootstrapProfile).mockResolvedValue(profile);
    const store = useProfileStore();
    await store.bootstrap({ displayName: 'Taylor' });
    expect(bootstrapProfile).toHaveBeenCalledWith('token', { displayName: 'Taylor' });
    expect(store.hasProfile).toBe(true);
  });
});
