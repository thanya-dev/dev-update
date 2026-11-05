import { parseISO, isValid, endOfDay } from 'date-fns';
import type { ReleaseData } from './types';
import { PHASES, TYPE_OPTIONS, getProjectSpan, isOverdue } from './utils';

export interface FilterState {
  search: string;
  years: string[];
  types: string[];
  statuses: string[];
  owners: string[];
  /** yyyy-MM-dd; keeps projects whose work span overlaps [from, to] */
  from: string;
  to: string;
  overdueOnly: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  years: [],
  types: [],
  statuses: [],
  owners: [],
  from: '',
  to: '',
  overdueOnly: false,
};

/** Initial view: only projects still in flight (hides Released / On Hold / Cancelled). */
export const DEFAULT_FILTERS: FilterState = {
  ...EMPTY_FILTERS,
  statuses: ['Not Started', 'Requirement', 'Design', 'Development', 'Testing / UAT', 'Ready for Release'],
};

const uniq = (xs: (string | undefined)[]) => Array.from(new Set(xs.map(x => x?.trim()).filter((x): x is string => !!x)));

export const projectOwners = (r: ReleaseData) => uniq(PHASES.map(p => r[`${p.key}Owner`]));

export function getFilterOptions(data: ReleaseData[], statusMaster: string[] = []) {
  return {
    years: uniq(data.map(r => r.releaseDate?.substring(0, 4))).sort().reverse(),
    types: uniq([...TYPE_OPTIONS, ...data.map(r => r.type)]),
    // Master list order first, then any legacy statuses still present in the data.
    statuses: uniq([...statusMaster, ...data.map(r => r.status)]),
    owners: uniq(data.flatMap(projectOwners)).sort((a, b) => a.localeCompare(b)),
  };
}

export function countActiveFilters(f: FilterState): number {
  return (
    (f.search.trim() ? 1 : 0) +
    (f.years.length ? 1 : 0) +
    (f.types.length ? 1 : 0) +
    (f.statuses.length ? 1 : 0) +
    (f.owners.length ? 1 : 0) +
    (f.from || f.to ? 1 : 0) +
    (f.overdueOnly ? 1 : 0)
  );
}

export function applyFilters(data: ReleaseData[], f: FilterState): ReleaseData[] {
  const q = f.search.trim().toLowerCase();
  const from = f.from ? parseISO(f.from) : null;
  const to = f.to ? endOfDay(parseISO(f.to)) : null;

  return data.filter(r => {
    if (q) {
      const haystack = [
        r.id, r.name, r.type, r.status, ...projectOwners(r),
        ...(r.actionItems ?? []).flatMap(a => [a.text, a.owner]),
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // Projects without a release date stay visible under a year filter (they're still being planned).
    if (f.years.length && r.releaseDate && !f.years.includes(r.releaseDate.substring(0, 4))) return false;
    if (f.types.length && !f.types.includes(r.type)) return false;
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (f.owners.length && !projectOwners(r).some(o => f.owners.includes(o))) return false;
    if (f.overdueOnly && !isOverdue(r)) return false;
    if ((from && isValid(from)) || (to && isValid(to))) {
      const span = getProjectSpan(r);
      if (!span) return false;
      if (from && isValid(from) && span.end < from) return false;
      if (to && isValid(to) && span.start > to) return false;
    }
    return true;
  });
}
