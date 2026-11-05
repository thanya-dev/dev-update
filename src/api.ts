import type { ReleaseData } from './types';

// Sheety endpoint backing the "manday" tab of the Product Monitoring sheet.
// To write (POST/PUT) the Sheety project must have those methods enabled.
// If the project uses Bearer auth, set VITE_SHEETY_TOKEN in .env.local.
const SHEETY_URL = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/manday';
const ROOT_KEY = 'manday';

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = import.meta.env.VITE_SHEETY_TOKEN as string | undefined;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handle(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.detail || json?.errors?.[0]?.message || res.statusText;
    throw new Error(`Sheety ${res.status}: ${msg}`);
  }
  return json;
}

export async function fetchReleases(): Promise<ReleaseData[]> {
  const json = await handle(await fetch(SHEETY_URL, { headers: headers() }));
  return json[ROOT_KEY] ?? [];
}

/** Appends a new row. Sheety returns the row with its id (= sheet row number). */
export async function createRelease(row: Omit<ReleaseData, 'id'>): Promise<ReleaseData> {
  const json = await handle(
    await fetch(SHEETY_URL, { method: 'POST', headers: headers(), body: JSON.stringify({ [ROOT_KEY]: row }) })
  );
  return json[ROOT_KEY];
}

/** Updates only the given fields of a row, so formula columns we don't touch stay intact. */
export async function updateRelease(id: number, patch: Partial<ReleaseData>): Promise<void> {
  await handle(
    await fetch(`${SHEETY_URL}/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ [ROOT_KEY]: patch }) })
  );
}

export async function deleteRelease(id: number): Promise<void> {
  const res = await fetch(`${SHEETY_URL}/${id}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) await handle(res);
}

export interface StatusOption {
  status: string;
  description: string;
}

const STATUS_URL = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/projectStatus';

/** Status master list from the "projectStatus" tab, in sheet order. */
export async function fetchStatusOptions(): Promise<StatusOption[]> {
  const json = await handle(await fetch(STATUS_URL, { headers: headers() }));
  return (json.projectStatus ?? [])
    .filter((r: Record<string, unknown>) => typeof r.status === 'string' && r.status.trim())
    .map((r: Record<string, unknown>) => ({
      status: String(r.status).trim(),
      description: String(r['ความหมาย'] ?? ''),
    }));
}

// --- Action items: one row per item in the "actionItems" tab ---
// Columns: projectId | text | owner | due | done | order
// projectId is the manday row id (Sheety id); App keeps it in sync when a project row is deleted.

// Note: Sheety wants the request body under `actionitem` (lowercase) but replies with `actionItem`.
const ACTION_URL = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/actionItems';

export interface ActionItemRow {
  id: number;
  projectId: number;
  text: string;
  owner: string;
  due: string;
  done: boolean;
  order: number;
}

type ActionItemFields = Omit<ActionItemRow, 'id'>;

/** Sheets may hand back dates in its display format and booleans as text; normalise both. */
function toIsoDate(v: unknown): string {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toActionItemRow(r: Record<string, unknown>): ActionItemRow {
  return {
    id: Number(r.id),
    projectId: Number(r.projectId),
    text: String(r.text ?? ''),
    owner: String(r.owner ?? ''),
    due: toIsoDate(r.due),
    done: r.done === true || String(r.done).toUpperCase() === 'TRUE',
    order: Number(r.order) || 0,
  };
}

export async function fetchActionItems(): Promise<ActionItemRow[]> {
  const json = await handle(await fetch(ACTION_URL, { headers: headers() }));
  return ((json.actionItems ?? []) as Record<string, unknown>[])
    .map(toActionItemRow)
    .filter(r => r.projectId && r.text.trim());
}

export async function createActionItem(fields: ActionItemFields): Promise<ActionItemRow> {
  const json = await handle(
    await fetch(ACTION_URL, { method: 'POST', headers: headers(), body: JSON.stringify({ actionitem: fields }) })
  );
  return toActionItemRow({ ...fields, ...json.actionItem });
}

export async function updateActionItem(id: number, patch: Partial<ActionItemFields>): Promise<void> {
  await handle(
    await fetch(`${ACTION_URL}/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ actionitem: patch }) })
  );
}

export async function deleteActionItem(id: number): Promise<void> {
  const res = await fetch(`${ACTION_URL}/${id}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) await handle(res);
}
