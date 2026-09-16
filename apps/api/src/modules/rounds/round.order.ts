export function determinePlayOrder(
  availableHoleNumbers: number[],
  scheduledHoleCount: 9 | 18,
  startingHoleNumber: number,
): number[] {
  const ordered = [...availableHoleNumbers].sort((left, right) => left - right);
  if (!ordered.includes(startingHoleNumber)) throw new Error('Starting hole is not available.');
  if (scheduledHoleCount > ordered.length)
    throw new Error('Requested round length is not available.');
  const startIndex = ordered.indexOf(startingHoleNumber);
  return Array.from(
    { length: scheduledHoleCount },
    (_, index) => ordered[(startIndex + index) % ordered.length]!,
  );
}
