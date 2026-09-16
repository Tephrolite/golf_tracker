import type { CourseInput, CourseUpdateInput } from '@golf-track/shared';
import type { CourseRepository } from './course.repository.js';
export class CourseError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly matches?: unknown,
  ) {
    super(message);
  }
}
export function createCourseService(repository: CourseRepository) {
  return {
    async userId(subject: string) {
      const userId = await repository.findUserId(subject);
      if (!userId)
        throw new CourseError(
          'PROFILE_NOT_FOUND',
          404,
          'No application profile exists for this account.',
        );
      return userId;
    },
    list: (userId: string, search: string, page: number, pageSize: number) =>
      repository.list(userId, search, page, pageSize),
    async details(id: string, userId: string) {
      const course = await repository.findDetails(id, userId);
      if (!course) throw new CourseError('COURSE_NOT_FOUND', 404, 'Course not found.');
      return course;
    },
    async create(userId: string, input: CourseInput) {
      const matches = await repository.findLikelyDuplicates(input.name, input.locationText ?? null);
      if (matches.length > 0 && !input.acknowledgeDuplicate)
        throw new CourseError(
          'POSSIBLE_DUPLICATE',
          409,
          'Possible matching courses were found.',
          matches,
        );
      return repository.create(userId, input);
    },
    async update(id: string, userId: string, input: CourseUpdateInput) {
      const result = await repository.replace(id, userId, input);
      if (result === 'forbidden')
        throw new CourseError('COURSE_FORBIDDEN', 403, 'You cannot edit this course.');
      if (result === 'conflict')
        throw new CourseError(
          'COURSE_CONFLICT',
          409,
          'This course was updated elsewhere. Reload it before saving.',
        );
      if (!result) throw new CourseError('COURSE_NOT_FOUND', 404, 'Course not found.');
      return result;
    },
    async archive(id: string, userId: string) {
      const result = await repository.archive(id, userId);
      if (result === 'forbidden')
        throw new CourseError('COURSE_FORBIDDEN', 403, 'You cannot archive this course.');
      if (!result) throw new CourseError('COURSE_NOT_FOUND', 404, 'Course not found.');
    },
  };
}
