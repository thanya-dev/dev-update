import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { ReleaseData } from '../types';
import { PHASES, TYPE_OPTIONS, countWorkingDays, deriveWorkSpan } from '../utils';
import type { StatusOption } from '../api';

type NewRelease = Omit<ReleaseData, 'id'>;

interface Props {
  ownerSuggestions: string[];
  statusOptions: StatusOption[];
  onSubmit: (row: NewRelease) => Promise<void>;
  onClose: () => void;
}

const blank: NewRelease = {
  name: '',
  type: 'Feature',
  status: 'Not Started',
  releaseDate: '',
  totalMd: 0,
  firstWorkDate: '',
  lastWorkDate: '',
  reqOwner: '', reqStart: '', reqEnd: '', reqMd: 0,
  designOwner: '', designStart: '', designEnd: '', designMd: 0,
  devOwner: '', devStart: '', devEnd: '', devMd: 0,
  testUatOwner: '', testUatStart: '', testUatEnd: '', testUatMd: 0,
  gallery: '',
};

const inputCls =
  'w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

export function ProjectFormModal({ ownerSuggestions, statusOptions, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<NewRelease>(() => ({ ...blank, status: statusOptions[0]?.status ?? blank.status }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, saving]);

  const set = (key: keyof NewRelease, value: string | number) =>
    setForm(f => {
      const next = { ...f, [key]: value };
      // Dev manday follows the dev dates (working days only); still editable afterwards.
      if (key === 'devStart' || key === 'devEnd') next.devMd = countWorkingDays(next.devStart, next.devEnd);
      return next;
    });

  const totalMd = PHASES.reduce((sum, p) => sum + (Number(form[`${p.key}Md`]) || 0), 0);

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Project name is required.';
    for (const p of PHASES) {
      const s = form[`${p.key}Start`];
      const e = form[`${p.key}End`];
      if (s && e && s > e) return `${p.label}: start date is after end date.`;
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    const row: NewRelease = { ...form, name: form.name.trim(), totalMd: Math.round(totalMd * 100) / 100 };
    Object.assign(row, deriveWorkSpan(row as ReleaseData));
    try {
      await onSubmit(row);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !saving && onClose()}>
      <form
        onSubmit={submit}
        onMouseDown={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add project</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="sm:col-span-4 text-sm">
              <span className="block text-gray-600 mb-1">Project name *</span>
              <input autoFocus className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Type</span>
              <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Status</span>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {statusOptions.map(s => <option key={s.status} value={s.status} title={s.description}>{s.status}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Release date</span>
              <input type="date" className={inputCls} value={form.releaseDate} onChange={e => set('releaseDate', e.target.value)} />
            </label>
            <div className="text-sm">
              <span className="block text-gray-600 mb-1">Total MD</span>
              <div className="px-2.5 py-1.5 text-gray-900 font-medium tabular-nums">{totalMd.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-[110px_1fr_1fr_1fr_80px] gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <span>Phase</span><span>Owner</span><span>Start</span><span>End</span><span>MD</span>
            </div>
            <div className="space-y-2">
              {PHASES.map(p => (
                <div key={p.key} className="grid grid-cols-[110px_1fr_1fr_1fr_80px] gap-2 items-center">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <span className={`w-2.5 h-2.5 rounded-sm ${p.colorClass}`} />
                    {p.label}
                  </span>
                  <input
                    className={inputCls}
                    list="owner-suggestions"
                    value={form[`${p.key}Owner`]}
                    onChange={e => set(`${p.key}Owner`, e.target.value)}
                  />
                  <input type="date" className={inputCls} value={form[`${p.key}Start`]} onChange={e => set(`${p.key}Start`, e.target.value)} />
                  <input
                    type="date"
                    className={inputCls}
                    min={form[`${p.key}Start`] || undefined}
                    value={form[`${p.key}End`]}
                    onChange={e => set(`${p.key}End`, e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    className={inputCls}
                    value={form[`${p.key}Md`] || ''}
                    onChange={e => set(`${p.key}Md`, Number(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
            <datalist id="owner-suggestions">
              {ownerSuggestions.map(o => <option key={o} value={o} />)}
            </datalist>
            <p className="text-xs text-gray-400 mt-2">You can leave phase dates empty and set them later by clicking the phase row on the timeline.</p>
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#01082F] hover:bg-[#1a2150] rounded-lg disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving to Sheet…' : 'Add project'}
          </button>
        </div>
      </form>
    </div>
  );
}
