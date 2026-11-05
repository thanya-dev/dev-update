import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Check, X, Plus, AlertTriangle, CalendarRange } from 'lucide-react';
import clsx from 'clsx';
import { EMPTY_FILTERS, countActiveFilters, type FilterState } from '../filters';

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  options: { years: string[]; types: string[]; statuses: string[]; owners: string[] };
  shownCount: number;
  totalCount: number;
  onAddProject: () => void;
}

export function FilterBar({ filters, onChange, options, shownCount, totalCount, onAddProject }: FilterBarProps) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => onChange({ ...filters, [key]: value });
  const active = countActiveFilters(filters);

  return (
    <div className="bg-white border-b border-gray-200 px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          placeholder="Search project, owner…"
          className="pl-8 pr-3 py-1.5 w-56 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      <MultiSelect label="Year" values={filters.years} options={options.years} onChange={v => set('years', v)} />
      <MultiSelect label="Type" values={filters.types} options={options.types} onChange={v => set('types', v)} />
      <MultiSelect label="Status" values={filters.statuses} options={options.statuses} onChange={v => set('statuses', v)} />
      <MultiSelect label="Owner" values={filters.owners} options={options.owners} onChange={v => set('owners', v)} searchable />

      <div
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-sm',
          filters.from || filters.to ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
        )}
        title="Show projects with work in this date range"
      >
        <CalendarRange className="h-4 w-4 text-gray-400" />
        <input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={e => set('from', e.target.value)}
          className="bg-transparent text-sm text-gray-700 focus:outline-none"
        />
        <span className="text-gray-400">–</span>
        <input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={e => set('to', e.target.value)}
          className="bg-transparent text-sm text-gray-700 focus:outline-none"
        />
      </div>

      <button
        onClick={() => set('overdueOnly', !filters.overdueOnly)}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors',
          filters.overdueOnly ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
        )}
      >
        <AlertTriangle className="h-4 w-4" /> Overdue only
      </button>

      {active > 0 && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <X className="h-4 w-4" /> Clear ({active})
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-500 tabular-nums">
          {shownCount === totalCount ? `${totalCount} projects` : `${shownCount} of ${totalCount} projects`}
        </span>
        <button
          onClick={onAddProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#01082F] hover:bg-[#1a2150] shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add project
        </button>
      </div>
    </div>
  );
}

interface MultiSelectProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}

function MultiSelect({ label, values, options, onChange, searchable }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);

  const visible = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;
  const summary = values.length === 0 ? 'All' : values.length === 1 ? values[0] : `${values.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-1.5 pl-3 pr-2 py-1.5 border rounded-lg text-sm transition-colors max-w-[220px]',
          values.length ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
        )}
      >
        <span className="text-gray-500">{label}:</span>
        <span className="font-medium truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 flex-none" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-60 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {searchable && (
            <div className="px-2 pb-1 pt-0.5">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Find ${label.toLowerCase()}…`}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
              />
            </div>
          )}
          <div className="flex justify-between px-3 py-1 text-xs">
            <button className="text-blue-600 hover:underline" onClick={() => onChange(Array.from(new Set([...values, ...visible])))}>
              Select all
            </button>
            <button className="text-gray-500 hover:underline" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-auto">
            {visible.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No matches</div>}
            {visible.map(opt => {
              const checked = values.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50"
                >
                  <span
                    className={clsx(
                      'flex-none w-4 h-4 rounded border flex items-center justify-center',
                      checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    )}
                  >
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
