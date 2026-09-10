import { format, parseISO, min, max, isValid, differenceInCalendarDays, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import type { ReleaseData, GroupedReleases } from './types';

export function groupReleasesByMonth(releases: ReleaseData[]): GroupedReleases[] {
  const groups: { [key: string]: GroupedReleases } = {};

  releases.forEach(release => {
    if (!release.releaseDate) return;
    const date = parseISO(release.releaseDate);
    const monthKey = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'MMMM yyyy');
    const year = date.getFullYear();

    const nowMonth = format(new Date(), 'yyyy-MM');
    const isPlan = monthKey > nowMonth;

    if (!groups[monthKey]) {
      groups[monthKey] = {
        monthKey,
        monthLabel,
        year,
        isPlan,
        releases: []
      };
    }
    groups[monthKey].releases.push(release);
  });

  // Sort groups chronologically
  const sortedGroups = Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  const typeOrder: Record<string, number> = {
    'Feature': 1,
    'Improvement': 2,
    'Bug Fix': 3
  };

  // Sort releases within each group by type, then chronologically
  sortedGroups.forEach(group => {
    group.releases.sort((a, b) => {
      const typeA = typeOrder[a.type] || 99;
      const typeB = typeOrder[b.type] || 99;
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      return a.releaseDate.localeCompare(b.releaseDate);
    });
  });

  return sortedGroups;
}

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
  });

  const validDates = allDates.filter(d => isValid(d));
  
  if (validDates.length === 0) {
    const now = new Date();
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }

  // Add some padding (start of earliest month, end of latest month)
  const earliest = startOfMonth(min(validDates));
  const latest = endOfMonth(max(validDates));
  
  return { startDate: earliest, endDate: latest };
}

export function sortGanttReleases(data: ReleaseData[]): ReleaseData[] {
  return [...data].sort((a, b) => {
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    return idA - idB;
  });
}

export function checkDateConflicts(release: ReleaseData) {
  if (!release.releaseDate || !release.lastWorkDate) return { hasPostReleaseWork: false };
  
  const relDate = parseISO(release.releaseDate);
  const lastWork = parseISO(release.lastWorkDate);
  
  const hasPostReleaseWork = isValid(relDate) && isValid(lastWork) && isAfter(lastWork, relDate);
  
  return { hasPostReleaseWork };
}

