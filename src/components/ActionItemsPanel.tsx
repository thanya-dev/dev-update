import { useState, type ReactNode } from 'react';
import { Plus, Trash2, Check, GripVertical, User, CalendarDays } from 'lucide-react';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import clsx from 'clsx';
import type { ActionItem } from '../types';
import { newActionItemId } from '../utils';

interface Props {
  items: ActionItem[];
  ownerSuggestions?: string[];
  /** Omit for a read-only list. */
  onChange?: (items: ActionItem[]) => void;
  /** Content for the timeline side of an item's row (e.g. its due-date marker). */
  renderTimeline?: (item: ActionItem) => ReactNode;
}

/** Left side of every row: pinned and exactly as wide as the "Project / Release" column. */
const LEFT = 'flex-none w-[var(--left-col)] sticky left-0 z-20 bg-gray-50 border-r border-gray-200';

const LIST_ID = 'action-owner-suggestions';

const inputCls =
  'px-2.5 py-1.5 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

function isLate(item: ActionItem) {
  if (item.done || !item.due) return false;
  const d = parseISO(item.due);
  return isValid(d) && d < startOfDay(new Date());
}

export function ActionItemsPanel({ items, ownerSuggestions = [], onChange, renderTimeline }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Drag only starts from the grip handle, so clicks on the row still open the editor.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const openCount = items.filter(i => !i.done).length;

  const update = (id: string, patch: Partial<ActionItem>) =>
    onChange?.(items.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (item: ActionItem) => {
    if (window.confirm(`Delete action item “${item.text}”?`)) {
      onChange?.(items.filter(i => i.id !== item.id));
      setEditingId(null);
    }
  };

  const endDrag = () => {
    setArmedId(null);
    setDragId(null);
    setDropIndex(null);
  };

  const drop = () => {
    const from = items.findIndex(i => i.id === dragId);
    if (from >= 0 && dropIndex !== null && dropIndex !== from && dropIndex !== from + 1) {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(dropIndex > from ? dropIndex - 1 : dropIndex, 0, moved);
      onChange?.(next);
    }
    endDrag();
  };

  return (
    <div className="border-t border-gray-200">
      <div className="flex">
        <div className={clsx(LEFT, 'flex items-center gap-2 pl-10 pr-4 pt-2.5 pb-1')}>
          <span className="text-xs font-semibold text-gray-700">Action items</span>
          {items.length > 0 && (
            <span className="text-[11px] text-gray-400">
              {openCount} open · {items.length - openCount} done
            </span>
          )}
        </div>
        <div className="flex-1" />
      </div>

      {items.length > 0 && (
        <ul>
          {items.map((item, index) =>
            editingId === item.id && onChange ? (
              <li key={item.id} className="flex">
                <div className={clsx(LEFT, 'pl-8 pr-3 py-1')}>
                  <ItemForm
                    initial={item}
                    submitLabel="Save"
                    onSubmit={v => {
                      update(item.id, v);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => remove(item)}
                  />
                </div>
                <div className="flex-1 relative">{renderTimeline?.(item)}</div>
              </li>
            ) : (
              <li
                key={item.id}
                draggable={armedId === item.id}
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', item.id);
                  setDragId(item.id);
                }}
                onDragOver={e => {
                  if (!dragId) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  setDropIndex(e.clientY < r.top + r.height / 2 ? index : index + 1);
                }}
                onDrop={e => {
                  e.preventDefault();
                  drop();
                }}
                onDragEnd={endDrag}
                className={clsx(
                  'group/item flex h-10 text-xs',
                  dragId === item.id && 'opacity-40',
                  dragId && dropIndex === index && 'shadow-[inset_0_2px_0_#2563eb]',
                  dragId && dropIndex === index + 1 && index === items.length - 1 && 'shadow-[inset_0_-2px_0_#2563eb]'
                )}
              >
                <div
                  onClick={() => onChange && !dragId && (setAdding(false), setEditingId(item.id))}
                  className={clsx(LEFT, 'flex items-center gap-2 pl-8 pr-3', onChange && 'cursor-pointer group-hover/item:bg-white')}
                >
                  {onChange && (
                    <span
                      title="Drag to reorder"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={() => setArmedId(item.id)}
                      onMouseUp={() => !dragId && setArmedId(null)}
                      className={clsx(
                        'flex-none text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing',
                        items.length > 1 ? 'opacity-0 group-hover/item:opacity-100' : 'invisible'
                      )}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={!onChange}
                    onClick={e => {
                      e.stopPropagation();
                      update(item.id, { done: !item.done });
                    }}
                    title={item.done ? 'Mark as open' : 'Mark as done'}
                    className={clsx(
                      'flex-none w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                      item.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white hover:border-emerald-500'
                    )}
                  >
                    {item.done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>

                  <span
                    className={clsx('flex-1 min-w-0 truncate', item.done ? 'line-through text-gray-400' : 'text-gray-800')}
                    title={item.text}
                  >
                    {item.text}
                  </span>

                  {item.owner && (
                    <span className="flex-none flex items-center gap-1 max-w-28 text-[11px] text-gray-500" title={item.owner}>
                      <User className="w-3 h-3 flex-none" />
                      <span className="truncate">{item.owner}</span>
                    </span>
                  )}
                  {item.due && isValid(parseISO(item.due)) && (
                    <span
                      className={clsx(
                        'flex-none flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]',
                        isLate(item) ? 'bg-red-50 text-red-600' : 'text-gray-500'
                      )}
                    >
                      <CalendarDays className="w-3 h-3" />
                      {format(parseISO(item.due), 'd MMM')}
                    </span>
                  )}

                  {onChange && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        remove(item);
                      }}
                      title="Delete action item"
                      className="flex-none p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 relative">{renderTimeline?.(item)}</div>
              </li>
            )
          )}
        </ul>
      )}

      {onChange && (
        <div className="flex">
          <div className={clsx(LEFT, 'pl-8 pr-3 pt-1 pb-2.5')}>
            {adding ? (
              <ItemForm
                submitLabel="Add"
                keepOpenAfterSubmit
                onSubmit={v => onChange([...items, { id: newActionItemId(), done: false, ...v }])}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setAdding(true);
                }}
                className="flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add action item
              </button>
            )}
          </div>
          <div className="flex-1" />
        </div>
      )}

      <datalist id={LIST_ID}>
        {ownerSuggestions.map(o => <option key={o} value={o} />)}
      </datalist>
    </div>
  );
}

type ItemValues = Pick<ActionItem, 'text' | 'owner' | 'due'>;

interface ItemFormProps {
  initial?: ItemValues;
  submitLabel: string;
  /** Clear and refocus after submit so several items can be added in a row. */
  keepOpenAfterSubmit?: boolean;
  onSubmit: (values: ItemValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function ItemForm({ initial, submitLabel, keepOpenAfterSubmit, onSubmit, onCancel, onDelete }: ItemFormProps) {
  const [text, setText] = useState(initial?.text ?? '');
  const [owner, setOwner] = useState(initial?.owner ?? '');
  const [due, setDue] = useState(initial?.due ?? '');
  const [focusKey, setFocusKey] = useState(0);

  return (
    <form
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-2.5 space-y-2"
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      onSubmit={e => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        onSubmit({ text: t, owner: owner.trim(), due });
        if (keepOpenAfterSubmit) {
          setText('');
          setDue('');
          setFocusKey(k => k + 1);
        }
      }}
    >
      <input
        key={focusKey}
        autoFocus
        className={clsx(inputCls, 'w-full text-sm')}
        placeholder="What needs to be done?"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            className={clsx(inputCls, 'w-32 pl-7')}
            list={LIST_ID}
            placeholder="Owner"
            value={owner}
            onChange={e => setOwner(e.target.value)}
          />
        </div>
        <input type="date" className={clsx(inputCls, 'w-32 text-gray-600')} value={due} onChange={e => setDue(e.target.value)} />

        <div className="ml-auto flex items-center gap-1.5">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-2.5 py-1.5 text-xs text-red-600 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <button type="button" onClick={onCancel} className="px-2.5 py-1.5 text-xs text-gray-600 rounded-md hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#01082F] hover:bg-[#1a2150] disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
