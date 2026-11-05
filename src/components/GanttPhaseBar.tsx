import { parseISO, differenceInCalendarDays, isValid, format, addDays } from 'date-fns';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AlertCircle, Eraser } from 'lucide-react';
import { useState } from 'react';
import { ContextMenu } from './ContextMenu';
import clsx from 'clsx';
import { useDayDrag } from '../hooks/useDayDrag';
import { toISODate } from '../utils';

interface GanttPhaseBarProps {
  name: string;
  startDate?: string;
  endDate?: string;
  owner?: string;
  md?: number;
  timelineStartDate: Date;
  dayWidth: number;
  colorClass: string;
  /** When provided the bar can be dragged (move) and resized from either edge. */
  onChange?: (start: string, end: string) => void;
  /** Right-click menu → "Clear dates". */
  onClear?: () => void;
}

export function GanttPhaseBar({
  name,
  startDate,
  endDate,
  owner,
  md,
  timelineStartDate,
  dayWidth,
  colorClass,
  onChange,
  onClear,
}: GanttPhaseBarProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  let start = startDate ? parseISO(startDate) : new Date();
  let end = endDate ? parseISO(endDate) : new Date();
  const missingEnd = !endDate;

  if (!isValid(start)) start = new Date();
  if (!isValid(end)) end = new Date();

  // If start is after end due to data error, swap them
  if (start > end && !missingEnd) {
    [start, end] = [end, start];
  }

  const { drag, bind } = useDayDrag(dayWidth, (mode, delta) => {
    const [s, e] = applyDelta(start, end, mode, delta);
    onChange?.(toISODate(s), toISODate(e));
  });

  if (!startDate && !endDate) {
    if (md && md > 0) {
      return (
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="absolute top-1/2 -translate-y-1/2 left-4 text-amber-500 cursor-help">
                <AlertCircle className="w-4 h-4" />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-xl z-50">
                Timeline unavailable for {name}
                {onChange && <div className="text-gray-400">Click the row to set dates</div>}
                <Tooltip.Arrow className="fill-gray-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    }
    return null;
  }

  // Live preview while dragging
  const [viewStart, viewEnd] = drag ? applyDelta(start, end, drag.mode, drag.delta) : [start, end];

  const offsetDays = differenceInCalendarDays(viewStart, timelineStartDate);
  const durationDays = Math.max(1, differenceInCalendarDays(viewEnd, viewStart) + 1);

  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;
  const editable = !!onChange;

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{name}</div>
      <div className="text-gray-300">Owner: {owner || 'Unassigned'}</div>
      <div className="text-gray-300">
        {startDate ? format(start, 'dd MMM yyyy') : 'Unknown'} – {endDate ? format(end, 'dd MMM yyyy') : 'Unknown'}
      </div>
      <div className="text-gray-300">Duration: {durationDays} days</div>
      {md !== undefined && <div className="text-gray-300">Effort: {!isNaN(Number(md)) ? Number(md).toFixed(2) : '0.00'} MD</div>}
      {editable && (
        <div className="text-gray-400 pt-1 border-t border-gray-700">
          Drag to move · drag edges to resize{onClear && ' · right-click to clear'}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root open={drag || menu ? false : undefined}>
          <Tooltip.Trigger asChild>
            <div
              {...(editable ? bind : {})}
              onContextMenu={
                onClear
                  ? e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenu({ x: e.clientX, y: e.clientY });
                    }
                  : undefined
              }
              className={clsx(
                'group/bar absolute top-1/2 -translate-y-1/2 h-8 rounded-md flex flex-col justify-center px-2 text-[10px] font-medium shadow-sm z-10 whitespace-nowrap leading-tight select-none touch-none',
                colorClass,
                editable ? (drag ? 'cursor-grabbing ring-2 ring-offset-1 ring-gray-900/30 z-20' : 'cursor-grab') : 'cursor-pointer transition-transform hover:scale-[1.02]',
                missingEnd && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)] border border-current'
              )}
              style={{ left, width }}
            >
              {editable && (
                <>
                  <span data-drag="start" className="absolute left-0 inset-y-0 w-2 cursor-ew-resize rounded-l-md group-hover/bar:bg-black/15" />
                  <span data-drag="end" className="absolute right-0 inset-y-0 w-2 cursor-ew-resize rounded-r-md group-hover/bar:bg-black/15" />
                </>
              )}
              <span className="w-full text-white drop-shadow-sm pointer-events-none">
                {name} {md ? `· ${!isNaN(Number(md)) ? Number(md).toFixed(2) : '0.00'} MD` : ''}
              </span>
              {owner && <span className="text-[8.5px] text-white/90 drop-shadow-sm pointer-events-none">{owner}</span>}
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-xl z-50 max-w-xs" sideOffset={5}>
              {tooltipContent}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      {menu && onClear && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[{ label: `Clear ${name} dates`, icon: <Eraser className="w-4 h-4" />, danger: true, onSelect: onClear }]}
          onClose={() => setMenu(null)}
        />
      )}

      {/* Date readout while dragging */}
      {drag && (
        <div
          className="absolute -top-1 z-30 bg-gray-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap"
          style={{ left }}
        >
          {format(viewStart, 'dd MMM')} – {format(viewEnd, 'dd MMM yyyy')} · {durationDays}d
        </div>
      )}
    </>
  );
}

function applyDelta(start: Date, end: Date, mode: 'move' | 'start' | 'end', delta: number): [Date, Date] {
  if (mode === 'move') return [addDays(start, delta), addDays(end, delta)];
  if (mode === 'start') {
    const s = addDays(start, delta);
    return [s > end ? end : s, end];
  }
  const e = addDays(end, delta);
  return [start, e < start ? start : e];
}

