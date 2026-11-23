import { describe, expect, it } from 'vitest';
import { cohortView, overallReachedThree, type CohortRow } from './activation';

const row = (cohort_week: string, installs: number, reached_three: number, returned_week2: number): CohortRow => ({ cohort_week, installs, reached_three, returned_week2 });

describe('cohortView', () => {
  it('shows percentages once the windows have closed', () => {
    const v = cohortView(row('2026-10-26', 10, 4, 2), new Date('2026-11-23T00:00:00Z')); // 28 days later
    expect(v).toEqual({ week: '2026-10-26', installs: 10, reachedThree: 40, returned: 20 });
  });

  it('withholds the first-week figure until the cohort has had a full 7 days', () => {
    const v = cohortView(row('2026-11-16', 10, 1, 0), new Date('2026-11-23T00:00:00Z'));
    expect(v.reachedThree).toBeNull();
    expect(v.returned).toBeNull();
  });

  it('withholds only the week-2 figure while days 8-14 are still open', () => {
    const v = cohortView(row('2026-11-02', 8, 6, 3), new Date('2026-11-23T00:00:00Z')); // 21 days
    expect(v.reachedThree).toBe(75);
    expect(v.returned).toBe(38);
    const early = cohortView(row('2026-11-09', 8, 6, 3), new Date('2026-11-23T00:00:00Z')); // 14 days
    expect(early.reachedThree).toBe(75);
    expect(early.returned).toBeNull();
  });
});

describe('overallReachedThree', () => {
  it('pools only the complete weeks', () => {
    const rows = [row('2026-10-19', 10, 5, 2), row('2026-10-26', 30, 6, 3), row('2026-11-16', 100, 0, 0)];
    expect(overallReachedThree(rows, new Date('2026-11-23T00:00:00Z'))).toEqual({ installs: 40, pct: 28 });
  });

  it('is null when no week is complete yet', () => {
    expect(overallReachedThree([row('2026-11-16', 5, 0, 0)], new Date('2026-11-23T00:00:00Z'))).toBeNull();
  });
});
