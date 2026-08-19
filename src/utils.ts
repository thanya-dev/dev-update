import { format, parseISO } from 'date-fns';
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

export function formatMD(md: number): string {
  if (md === undefined || md === null) return '0.0';
  return md.toFixed(1);
}
