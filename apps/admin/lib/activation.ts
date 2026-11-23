export interface CohortRow {
  cohort_week: string; // Monday of the week, YYYY-MM-DD
  installs: number;
  reached_three: number;
  returned_week2: number;
}

export interface CohortView {
  week: string;
  installs: number;
  /** Share that checked 3+ products in their first 7 days, or null while that week is still running. */
  reachedThree: number | null;
  /** Share that scanned again in days 8-14, or null while that window is still open. */
  returned: number | null;
}

const DAY = 86_400_000;

/**
 * A cohort's installs arrive through its whole week, so its "first 7 days" are only complete 14 days after the
 * week starts, and its "days 8-14" 21 days after. Before then the figure would look worse than it is, so it's withheld.
 */
export function cohortView(row: CohortRow, now: Date): CohortView {
  const start = Date.parse(`${row.cohort_week}T00:00:00Z`);
  const share = (n: number) => (row.installs ? Math.round((n / row.installs) * 100) : 0);
  return {
    week: row.cohort_week,
    installs: row.installs,
    reachedThree: now.getTime() >= start + 14 * DAY ? share(row.reached_three) : null,
    returned: now.getTime() >= start + 21 * DAY ? share(row.returned_week2) : null,
  };
}

/** Across the weeks that are complete: the share of all those phones that reached three scans. */
export function overallReachedThree(rows: CohortRow[], now: Date): { installs: number; pct: number } | null {
  const done = rows.filter((r) => cohortView(r, now).reachedThree !== null);
  const installs = done.reduce((a, r) => a + r.installs, 0);
  if (!installs) return null;
  return { installs, pct: Math.round((done.reduce((a, r) => a + r.reached_three, 0) / installs) * 100) };
}
