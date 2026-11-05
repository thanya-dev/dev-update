import { Fragment } from 'react';
import { STATUS_LABEL } from '../features';
import type { Website } from '../features';

interface Props {
  site: Website;
  periods: string[];
  periodLabel: (key: string) => string;
  usage: Record<string, Record<string, number>>;
  showInactive: boolean;
  trackedIds: Set<string>;
}

export const FeatureHeatmapTable = ({ site, periods, periodLabel, usage, showInactive, trackedIds }: Props) => {
  const featureTotal = (id: string) => Object.values(usage[id] || {}).reduce((a, b) => a + b, 0);

  const visibleGroups = site.groups
    .map((g) => ({ ...g, features: g.features.filter((f) => showInactive || f.status === 'active' || featureTotal(f.id) > 0) }))
    .filter((g) => g.features.length > 0);

  const maxCell = Math.max(1, ...site.groups.flatMap((g) => g.features).flatMap((f) => Object.values(usage[f.id] || {})));

  const cellStyle = (value: number) => {
    if (!value) return undefined;
    const alpha = Math.round((0.12 + 0.68 * (value / maxCell)) * 255).toString(16).padStart(2, '0');
    return { backgroundColor: `${site.color}${alpha}` };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs">
            <th className="sticky left-0 z-10 bg-gray-50 text-left font-semibold px-4 py-3 min-w-[320px]">Feature</th>
            {periods.map((p) => (
              <th key={p} className="font-semibold px-1 py-3 text-center whitespace-nowrap min-w-[52px]">
                {periodLabel(p)}
              </th>
            ))}
            <th className="font-semibold px-4 py-3 text-right">รวม</th>
          </tr>
        </thead>
        <tbody>
          {visibleGroups.map((group) => (
            <Fragment key={group.name}>
              <tr className="border-t border-gray-100">
                <td
                  colSpan={periods.length + 2}
                  className="sticky left-0 bg-white px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400"
                >
                  {group.name}
                </td>
              </tr>
              {group.features.map((f) => {
                const total = featureTotal(f.id);
                return (
                  <tr key={f.id} className={`border-t border-gray-50 ${f.status !== 'active' ? 'opacity-60' : ''}`}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{f.name}</span>
                        {!trackedIds.has(f.id) && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-gray-100 text-gray-500">ยังไม่มี tracking</span>
                        )}
                        {f.status !== 'active' && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_LABEL[f.status].className}`}>
                            {STATUS_LABEL[f.status].label}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono truncate max-w-[300px]" title={f.path}>{f.path}</div>
                    </td>
                    {periods.map((p) => {
                      const value = usage[f.id]?.[p] || 0;
                      return (
                        <td key={p} className="px-0.5 py-1 text-center">
                          <div
                            className={`rounded-md py-1.5 tabular-nums text-xs ${value ? 'font-semibold text-gray-900' : 'text-gray-300'}`}
                            style={cellStyle(value)}
                            title={`${f.name} · ${periodLabel(p)}: ${value.toLocaleString()}`}
                          >
                            {value ? value.toLocaleString() : '–'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right font-bold text-gray-900 tabular-nums">{total ? total.toLocaleString() : '–'}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
