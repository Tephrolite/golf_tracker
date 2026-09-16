import { describe, expect, it } from 'vitest';
import { determinePlayOrder } from '../src/modules/rounds/round.order.js';

describe('determinePlayOrder', () => {
  const eighteen = Array.from({ length: 18 }, (_, index) => index + 1);
  const nine = Array.from({ length: 9 }, (_, index) => index + 1);
  it('orders 18-hole rounds from one and ten', () => {
    expect(determinePlayOrder(eighteen, 18, 1)).toEqual(eighteen);
    expect(determinePlayOrder(eighteen, 18, 10)).toEqual([
      ...eighteen.slice(9),
      ...eighteen.slice(0, 9),
    ]);
  });
  it('orders standard and wrapped nines without duplicates', () => {
    expect(determinePlayOrder(eighteen, 9, 1)).toEqual(eighteen.slice(0, 9));
    expect(determinePlayOrder(eighteen, 9, 10)).toEqual(eighteen.slice(9));
    expect(determinePlayOrder(eighteen, 9, 15)).toEqual([15, 16, 17, 18, 1, 2, 3, 4, 5]);
    const result = determinePlayOrder(nine, 9, 7);
    expect(result).toEqual([7, 8, 9, 1, 2, 3, 4, 5, 6]);
    expect(new Set(result).size).toBe(9);
  });
});
