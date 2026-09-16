import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createRound, getActiveRound } from '../src/lib/api';
import { useAuthStore } from '../src/stores/auth';
import { useRoundStore } from '../src/stores/rounds';
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
  getActiveRound: vi.fn(),
  createRound: vi.fn(),
  getRound: vi.fn(),
}));
const round = {
  id: 'a1b2c3d4-1111-4222-8333-444444444444',
  status: 'in_progress' as const,
  trackingMode: 'basic' as const,
  scheduledHoleCount: 9,
  startingHoleNumber: 1,
  playedOn: '2026-09-17',
  startedAt: '2026-09-17T00:00:00.000Z',
  revision: 1,
  courseId: null,
  courseTeeId: null,
  courseNameSnapshot: 'Pine Ridge',
  courseLocationSnapshot: null,
  teeNameSnapshot: 'Blue',
  courseRatingSnapshot: null,
  slopeRatingSnapshot: null,
  courseParSnapshot: 36,
  holes: [],
};
describe('round store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    useAuthStore().session = { access_token: 'token' } as never;
  });
  it('loads the active round once for a session', async () => {
    vi.mocked(getActiveRound).mockResolvedValue(round);
    const store = useRoundStore();
    await Promise.all([store.loadActiveRound(), store.loadActiveRound()]);
    expect(store.activeRound).toEqual(round);
    expect(getActiveRound).toHaveBeenCalledTimes(1);
  });
  it('stores a newly created active round', async () => {
    vi.mocked(createRound).mockResolvedValue(round);
    const store = useRoundStore();
    await store.startRound({
      courseId: 'a1b2c3d4-1111-4222-8333-444444444444',
      courseTeeId: 'b1b2c3d4-1111-4222-8333-444444444444',
      scheduledHoleCount: 9,
      startingHoleNumber: 1,
      trackingMode: 'basic',
      playedOn: '2026-09-17',
    });
    expect(store.hasActiveRound).toBe(true);
  });
});
