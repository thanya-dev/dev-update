import { differenceInCalendarDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Check, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import type { ActionItem } from '../types';

interface Props {
  /** yyyy-MM-dd shared by every item in `items` */
  due: string;
  items: ActionItem[];
  timelineStartDate: Date;
  dayWidth: number;
  onClick?: () => void;
}

/** Due-date marker on the timeline, styled like the Go-live diamond: centred on the day, date underneath. */
export function ActionItemMarker({ due, items, timelineStartDate, dayWidth, onClick }: Props) {
  const date = parseISO(due);
  if (!isValid(date)) return null;

  const offset = differenceInCalendarDays(date, timelineStartDate);
  const open = items.filter(a => !a.done);
  const late = open.length > 0 && date < startOfDay(new Date());

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onClick?.();
            }}
            className={clsx('absolute top-1/2 -translate-y-1/2 z-[15] select-none', !onClick && 'cursor-default')}
            style={{ left: offset * dayWidth + dayWidth / 2 }}
          >
            <span
              className={clsx(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 shadow-sm text-white text-[9px] font-bold transition-transform hover:scale-125',
                !open.length ? 'bg-gray-300 border-gray-400' : late ? 'bg-red-500 border-red-600' : 'bg-blue-500 border-blue-600'
              )}
            >
              {!open.length ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              ) : items.length > 1 ? (
                items.length
              ) : (
                <ListTodo className="w-2.5 h-2.5" />
              )}
            </span>
            <span
              className={clsx(
                'absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap pointer-events-none',
                !open.length ? 'text-gray-400' : late ? 'text-red-500' : 'text-blue-600'
              )}
            >
              {format(date, 'dd MMM yy')}
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-xl z-50 max-w-xs" sideOffset={4}>
            <div className="font-semibold mb-1">Action items · {format(date, 'dd MMM yyyy')}</div>
            <ul className="space-y-0.5">
              {items.map(a => (
                <li key={a.id} className={clsx('flex gap-1.5', a.done && 'line-through text-gray-400')}>
                  <span>{a.done ? '✓' : '•'}</span>
                  <span>
                    {a.text}
                    {a.owner && <span className="text-gray-400"> — {a.owner}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {late && <div className="mt-1 pt-1 border-t border-gray-700 text-red-400">Overdue</div>}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/** Items that have a valid due date, grouped by that date. */
export function groupByDue(items: ActionItem[]) {
  const map = new Map<string, ActionItem[]>();
  for (const a of items) {
    if (!a.due || !isValid(parseISO(a.due))) continue;
    map.set(a.due, [...(map.get(a.due) ?? []), a]);
  }
  return Array.from(map, ([due, items]) => ({ due, items }));
}
