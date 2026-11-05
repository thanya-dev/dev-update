import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { ActionItem, ReleaseData } from './types';
import { ReleaseDetailModal } from './components/ReleaseDetailModal';
import { GanttChart } from './components/GanttChart';
import { FeatureUsageView } from './components/FeatureUsageView';
import { FilterBar } from './components/FilterBar';
import { ProjectFormModal } from './components/ProjectFormModal';
import {
  fetchReleases, fetchStatusOptions, createRelease, updateRelease, deleteRelease, type StatusOption,
  fetchActionItems, createActionItem, updateActionItem, deleteActionItem, type ActionItemRow,
} from './api';
import { applyFilters, getFilterOptions, DEFAULT_FILTERS, type FilterState } from './filters';
import { countWorkingDays, deriveWorkSpan, withComputedDevMd, sortGanttReleases, STATUS_OPTIONS, type PhaseKey } from './utils';

type Toast = { kind: 'saving' | 'ok' | 'error'; message: string } | null;

function App() {
  const [data, setData] = useState<ReleaseData[]>([]);
  const [loading, setLoading] = useState(true);
  /** Rows of the "actionItems" tab. Items not yet saved have a negative temporary id. */
  const hasSortColumn = useRef(false);
  const [actionRows, setActionRows] = useState<ActionItemRow[]>([]);

  const [viewMode, setViewMode] = useState<'gantt' | 'usage'>('gantt');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Falls back to the built-in list until (or if) the projectStatus tab loads.
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(
    STATUS_OPTIONS.map(status => ({ status, description: '' }))
  );

  const [selectedRelease, setSelectedRelease] = useState<ReleaseData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((t: Toast) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    if (t?.kind === 'ok') toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  const reload = useCallback(
    () =>
      fetchReleases()
        .then(rows => {
          hasSortColumn.current = rows.length > 0 && 'sortOrder' in rows[0];
          setData(rows.map(withComputedDevMd));
        })
        .catch(err => {
          console.error(err);
          showToast({ kind: 'error', message: `Couldn't load data: ${err.message}` });
        }),
    [showToast]
  );

  const reloadActionItems = useCallback(
    () =>
      fetchActionItems()
        .then(setActionRows)
        .catch(err => {
          console.error(err);
          showToast({ kind: 'error', message: `Couldn't load action items (is the "actionItems" tab enabled in Sheety?) ${err.message}` });
        }),
    [showToast]
  );

  useEffect(() => {
    reload().finally(() => setLoading(false));
    reloadActionItems();
    fetchStatusOptions()
      .then(list => list.length && setStatusOptions(list))
      .catch(err => console.error('Could not load project statuses', err));
  }, [reload, reloadActionItems]);

  const options = useMemo(() => getFilterOptions(data, statusOptions.map(s => s.status)), [data, statusOptions]);
  const dataWithItems = useMemo(() => {
    const byProject = new Map<number, ActionItemRow[]>();
    for (const a of actionRows) byProject.set(a.projectId, [...(byProject.get(a.projectId) ?? []), a]);
    return data.map(r => {
      const rows = (byProject.get(r.id) ?? []).sort((a, b) => a.order - b.order || a.id - b.id);
      return { ...r, actionItems: rows.map(({ id, text, owner, due, done }) => ({ id: String(id), text, owner, due, done })) };
    });
  }, [data, actionRows]);
  const filteredData = useMemo(() => applyFilters(dataWithItems, filters), [dataWithItems, filters]);

  /** Optimistically applies `localPatch`, sends `remotePatch` to the Sheet, rolls back on failure. */
  const saveRow = async (release: ReleaseData, remotePatch: Partial<ReleaseData>, localPatch = remotePatch) => {
    const before = data.find(r => r.id === release.id);
    setData(rows => rows.map(r => (r.id === release.id ? { ...r, ...localPatch } : r)));
    showToast({ kind: 'saving', message: `Saving “${release.name}”…` });
    try {
      await updateRelease(release.id, remotePatch);
      showToast({ kind: 'ok', message: 'Saved to Google Sheet' });
    } catch (err) {
      if (before) setData(rows => rows.map(r => (r.id === release.id ? before : r)));
      showToast({ kind: 'error', message: `Save failed, change reverted. ${(err as Error).message}` });
    }
  };

  const handlePhaseChange = (release: ReleaseData, phase: PhaseKey, start: string, end: string) => {
    const patch = { [`${phase}Start`]: start, [`${phase}End`]: end } as Partial<ReleaseData>;
    if (phase === 'dev') {
      // Dev manday = working days in the dev range (no weekends / public holidays).
      // totalMd is shifted by the same difference so any effort outside the 4 phases is kept.
      const devMd = countWorkingDays(start, end);
      patch.devMd = devMd;
      patch.totalMd = Math.round(((Number(release.totalMd) || 0) - (Number(release.devMd) || 0) + devMd) * 100) / 100;
      // (withComputedDevMd does the same on load, so the screen never shows a stale sheet value.)
    }
    // First/last work date may be formulas in the sheet, so we only refresh them locally.
    const local = { ...patch, ...deriveWorkSpan({ ...release, ...patch }) };
    saveRow(release, patch, local);
  };

  const handleStatusChange = (release: ReleaseData, status: string) => saveRow(release, { status });

  const handleNameChange = (release: ReleaseData, name: string) => saveRow(release, { name });

  /** Drag & drop: renumber sortOrder 1..n over ALL projects (not just the filtered ones) and save the changed rows. */
  const handleReorder = async (dragId: number, targetId: number, place: 'before' | 'after') => {
    const sorted = sortGanttReleases(data);
    const moving = sorted.find(r => r.id === dragId);
    if (!moving) return;
    const rest = sorted.filter(r => r.id !== dragId);
    const at = rest.findIndex(r => r.id === targetId);
    if (at < 0) return;
    rest.splice(place === 'before' ? at : at + 1, 0, moving);

    const newOrder = new Map(rest.map((r, i) => [r.id, i + 1]));
    const changed = rest.filter(r => Number(r.sortOrder) !== newOrder.get(r.id) || r.sortOrder === '');

    setData(rows => rows.map(r => ({ ...r, sortOrder: newOrder.get(r.id) ?? r.sortOrder })));

    // Sheety silently ignores fields it has no column for, so check before pretending it was saved.
    if (!hasSortColumn.current) {
      showToast({
        kind: 'error',
        message: 'Order changed on this screen only. Add a "sortOrder" column to the manday tab (and refresh Sheety) to save it.',
      });
      return;
    }
    showToast({ kind: 'saving', message: `Saving order (${changed.length} rows)…` });
    try {
      // A few requests at a time so Sheety isn't flooded.
      for (let i = 0; i < changed.length; i += 4) {
        await Promise.all(changed.slice(i, i + 4).map(r => updateRelease(r.id, { sortOrder: newOrder.get(r.id) })));
      }
      showToast({ kind: 'ok', message: 'Project order saved' });
    } catch (err) {
      showToast({ kind: 'error', message: `Couldn't save order, reloading. ${(err as Error).message}` });
      await reload();
    }
  };

  const handleReleaseDateChange = (release: ReleaseData, releaseDate: string) => saveRow(release, { releaseDate });

  /**
   * The panel hands back the project's whole new list; diff it against what we have and send
   * only the adds / edits / deletes to the actionItems tab. Optimistic, reloads on failure.
   */
  const handleActionItemsChange = async (release: ReleaseData, next: ActionItem[]) => {
    const prev = actionRows.filter(a => a.projectId === release.id);
    const prevById = new Map(prev.map(a => [String(a.id), a]));
    const nextIds = new Set(next.map(i => i.id));

    const deleted = prev.filter(a => !nextIds.has(String(a.id)));
    const added: { tempId: number; fields: Omit<ActionItemRow, 'id'> }[] = [];
    const updated: { id: number; patch: Partial<ActionItemRow> }[] = [];
    let tempId = Math.min(0, ...actionRows.map(a => a.id));

    const optimistic: ActionItemRow[] = next.map((item, order) => {
      const fields = { projectId: release.id, text: item.text, owner: item.owner, due: item.due, done: item.done, order };
      const old = prevById.get(item.id);
      if (!old) {
        added.push({ tempId: --tempId, fields });
        return { id: tempId, ...fields };
      }
      const patch: Partial<ActionItemRow> = {};
      (['text', 'owner', 'due', 'done', 'order'] as const).forEach(k => {
        if (old[k] !== fields[k]) Object.assign(patch, { [k]: fields[k] });
      });
      if (Object.keys(patch).length) updated.push({ id: old.id, patch });
      return { ...old, ...fields };
    });

    setActionRows(rows => [...rows.filter(a => a.projectId !== release.id), ...optimistic]);
    showToast({ kind: 'saving', message: 'Saving action items…' });
    try {
      for (const u of updated) if (u.id > 0) await updateActionItem(u.id, u.patch);
      for (const a of added) {
        const created = await createActionItem(a.fields);
        setActionRows(rows => rows.map(r => (r.id === a.tempId ? created : r)));
      }
      // Bottom-up so earlier deletes don't shift the row ids of later ones.
      for (const d of [...deleted].sort((a, b) => b.id - a.id)) if (d.id > 0) await deleteActionItem(d.id);
      if (deleted.length) await reloadActionItems();
      showToast({ kind: 'ok', message: 'Saved to Google Sheet' });
    } catch (err) {
      showToast({ kind: 'error', message: `Action item save failed. ${(err as Error).message}` });
      await reloadActionItems();
    }
  };

  const handleDelete = async (release: ReleaseData) => {
    if (!window.confirm(`Delete “${release.name}” from the Google Sheet?\nThis removes the row and can't be undone here.`)) return;
    showToast({ kind: 'saving', message: `Deleting “${release.name}”…` });
    try {
      await deleteRelease(release.id);
      // Sheety ids are row numbers, so project rows after the deleted one shift up by one.
      // Drop this project's action items and re-point the ones that belong to later projects.
      const own = actionRows.filter(a => a.projectId === release.id).sort((a, b) => b.id - a.id);
      for (const a of own) await deleteActionItem(a.id);
      for (const a of actionRows) if (a.projectId > release.id) await updateActionItem(a.id, { projectId: a.projectId - 1 });
      await Promise.all([reload(), reloadActionItems()]);
      showToast({ kind: 'ok', message: 'Project deleted' });
    } catch (err) {
      showToast({ kind: 'error', message: `Delete failed. ${(err as Error).message}` });
    }
  };

  const handleCreate = async (row: Omit<ReleaseData, 'id'>) => {
    const created = await createRelease(row);
    setData(rows => [...rows, { ...row, ...created }]);
    showToast({ kind: 'ok', message: `Added “${row.name}”` });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#01082F] sticky top-0 z-30 shadow-md">
        <div className="w-full px-16 lg:px-24 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
              Executive Release Dashboard
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">Monthly release cadence and delivery effort.</p>
          </div>

          <div className="flex bg-gray-200/50 p-1 rounded-lg">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'gantt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setViewMode('gantt')}
            >
              Gantt Chart
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'usage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setViewMode('usage')}
            >
              Usage
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'gantt' && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          options={options}
          shownCount={filteredData.length}
          totalCount={data.length}
          onAddProject={() => setShowAddForm(true)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'usage' ? (
          <FeatureUsageView />
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <GanttChart
            data={filteredData}
            onProjectClick={setSelectedRelease}
            onPhaseChange={handlePhaseChange}
            onReleaseDateChange={handleReleaseDateChange}
            onDelete={handleDelete}
            statusOptions={statusOptions}
            onStatusChange={handleStatusChange}
            onNameChange={handleNameChange}
            onReorder={handleReorder}
            onActionItemsChange={handleActionItemsChange}
            ownerSuggestions={options.owners}
          />
        )}
      </main>

      {/* Modals */}
      {selectedRelease && (
        <ReleaseDetailModal release={selectedRelease} onClose={() => setSelectedRelease(null)} />
      )}
      {showAddForm && (
        <ProjectFormModal ownerSuggestions={options.owners} statusOptions={statusOptions} onSubmit={handleCreate} onClose={() => setShowAddForm(false)} />
      )}

      {/* Save status */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex items-start gap-2 max-w-sm px-4 py-2.5 rounded-lg shadow-lg text-sm ${
            toast.kind === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {toast.kind === 'saving' && <Loader2 className="w-4 h-4 mt-0.5 animate-spin flex-none" />}
          {toast.kind === 'ok' && <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 flex-none" />}
          {toast.kind === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-none" />}
          <span>{toast.message}</span>
          {toast.kind === 'error' && (
            <button onClick={() => setToast(null)} className="ml-1 opacity-80 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
