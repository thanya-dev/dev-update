import { parseISO, min, max, isValid, startOfMonth, endOfMonth, isAfter, addMonths, addDays, format } from 'date-fns';
import type { ReleaseData } from './types';

export function formatMD(md: any): string {
  if (md === undefined || md === null) return '0.0';
  const num = Number(md);
  if (isNaN(num)) return '0.0';
  return num.toFixed(1);
}

// --- Gantt Chart Utilities ---

export const PUBLIC_HOLIDAYS_2026 = [
  '2026-01-01',
  '2026-01-02',
  '2026-03-03',
  '2026-04-06',
  '2026-04-13',
  '2026-04-14',
  '2026-04-15',
  '2026-05-01',
  '2026-05-04',
  '2026-06-01',
  '2026-06-03',
  '2026-07-28',
  '2026-07-29',
  '2026-08-12',
  '2026-10-13',
  '2026-10-23',
  '2026-12-07',
  '2026-12-10',
  '2026-12-31'
];

const HOLIDAY_SET = new Set(PUBLIC_HOLIDAYS_2026);

export const isNonWorkingDay = (d: Date) =>
  d.getDay() === 0 || d.getDay() === 6 || HOLIDAY_SET.has(format(d, 'yyyy-MM-dd'));

/** Working days from start to end inclusive, skipping weekends and PUBLIC_HOLIDAYS_2026. 0 if either date is missing. */
export function countWorkingDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  let d = parseISO(start);
  const last = parseISO(end);
  if (!isValid(d) || !isValid(last)) return 0;
  let n = 0;
  for (; d <= last; d = addDays(d, 1)) if (!isNonWorkingDay(d)) n++;
  return n;
}

/** Sum of the four phase mandays, rounded to 2 decimals. */
export const sumPhaseMd = (r: Pick<ReleaseData, 'reqMd' | 'designMd' | 'devMd' | 'testUatMd'>) =>
  Math.round(((Number(r.reqMd) || 0) + (Number(r.designMd) || 0) + (Number(r.devMd) || 0) + (Number(r.testUatMd) || 0)) * 100) / 100;

export function getGanttTimelineRange(data: ReleaseData[]) {
  const allDates: Date[] = [];
  
  data.forEach(r => {
    if (r.firstWorkDate) allDates.push(parseISO(r.firstWorkDate));
    if (r.lastWorkDate) allDates.push(parseISO(r.lastWorkDate));
    if (r.releaseDate) allDates.push(parseISO(r.releaseDate));
    
    // Fallbacks just in case
    if (r.reqStart) allDates.push(parseISO(r.reqStart));
    if (r.reqEnd) allDates.push(parseISO(r.reqEnd));
    if (r.designStart) allDates.push(parseISO(r.designStart));
    if (r.designEnd) allDates.push(parseISO(r.designEnd));
    if (r.devStart) allDates.push(parseISO(r.devStart));
    if (r.devEnd) allDates.push(parseISO(r.devEnd));
    if (r.testUatStart) allDates.push(parseISO(r.testUatStart));
    if (r.testUatEnd) allDates.push(parseISO(r.testUatEnd));
    // Keep action-item markers on the chart
    r.actionItems?.forEach(a => a.due && allDates.push(parseISO(a.due)));
  });

  const validDates = allDates.filter(d => isValid(d));
  
  if (validDates.length === 0) {
    const now = new Date();
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }

  // Add some padding (start of earliest month, end of latest month)
  const earliest = startOfMonth(min(validDates));
  // One extra month at the end leaves room to drag bars forward.
  const latest = endOfMonth(addMonths(max(validDates), 1));
  
  return { startDate: earliest, endDate: latest };
}

export function sortGanttReleases(data: ReleaseData[]): ReleaseData[] {
  const order = (r: ReleaseData) => {
    const n = Number(r.sortOrder);
    return r.sortOrder !== '' && r.sortOrder != null && Number.isFinite(n) ? n : Infinity;
  };
  return [...data].sort((a, b) => order(a) - order(b) || (Number(a.id) || 0) - (Number(b.id) || 0));
}

export function checkDateConflicts(release: ReleaseData) {
  if (!release.releaseDate || !release.lastWorkDate) return { hasPostReleaseWork: false };
  
  const relDate = parseISO(release.releaseDate);
  const lastWork = parseISO(release.lastWorkDate);
  
  const hasPostReleaseWork = isValid(relDate) && isValid(lastWork) && isAfter(lastWork, relDate);
  
  return { hasPostReleaseWork };
}


// --- Project editing helpers ---

export type PhaseKey = 'req' | 'design' | 'dev' | 'testUat';

export const PHASES: { key: PhaseKey; label: string; colorClass: string }[] = [
  { key: 'req', label: 'Requirement', colorClass: 'bg-purple-500' },
  { key: 'design', label: 'Design', colorClass: 'bg-blue-500' },
  { key: 'dev', label: 'Development', colorClass: 'bg-orange-500' },
  { key: 'testUat', label: 'Test / UAT', colorClass: 'bg-green-500' },
];

export const TYPE_OPTIONS = ['Feature', 'Improvement', 'Bug Fix'];

export const STATUS_OPTIONS = [
  'Not Started',
  'Requirement',
  'Design',
  'Development',
  'Testing / UAT',
  'Ready for Release',
  'Released',
  'On Hold',
  'Cancelled',
];

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');

function validDate(s?: string): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

/** First/last work date derived from the phase dates (used to refresh the summary bar after a drag). */
export function deriveWorkSpan(r: ReleaseData): { firstWorkDate: string; lastWorkDate: string } {
  const starts = PHASES.map(p => validDate(r[`${p.key}Start`])).filter((d): d is Date => !!d);
  const ends = PHASES.map(p => validDate(r[`${p.key}End`])).filter((d): d is Date => !!d);
  return {
    // Empty when every phase has been cleared, so the summary bar disappears too.
    firstWorkDate: starts.length ? toISODate(min(starts)) : '',
    lastWorkDate: ends.length ? toISODate(max(ends)) : '',
  };
}

/** Earliest and latest date a project touches, for date-range filtering. */
export function getProjectSpan(r: ReleaseData): { start: Date; end: Date } | null {
  const dates = [
    r.firstWorkDate, r.lastWorkDate, r.releaseDate,
    ...PHASES.flatMap(p => [r[`${p.key}Start`], r[`${p.key}End`]]),
  ].map(validDate).filter((d): d is Date => !!d);
  if (!dates.length) return null;
  return { start: min(dates), end: max(dates) };
}

export function isOverdue(r: ReleaseData): boolean {
  const rel = validDate(r.releaseDate);
  return !!rel && r.status !== 'Released' && r.status !== 'Cancelled' && rel < new Date();
}

export const newActionItemId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/**
 * Dev manday is always the working days in the dev range (no weekends / public holidays).
 * totalMd is shifted by the same difference so effort outside the 4 phases is kept.
 * Rows without both dev dates are returned unchanged.
 */
export function withComputedDevMd<T extends ReleaseData>(r: T): T {
  if (!r.devStart || !r.devEnd) return r;
  const devMd = countWorkingDays(r.devStart, r.devEnd);
  const totalMd = Math.round(((Number(r.totalMd) || 0) - (Number(r.devMd) || 0) + devMd) * 100) / 100;
  return { ...r, devMd, totalMd };
}

/**
 * Turns a Google Drive share link into a URL an <img> can load; other URLs pass through.
 * Handles .../file/d/<id>/view, ...open?id=<id>, ...uc?id=<id>. The file must be shared
 * as "Anyone with the link".
 */
export function toImageUrl(url: string): string {
  const u = url.trim();
  if (!/^https?:\/\/(drive|docs)\.google\.com\//.test(u)) return u;
  const id = u.match(/\/d\/([\w-]{10,})/)?.[1] ?? u.match(/[?&]id=([\w-]{10,})/)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w2000` : u;
}
