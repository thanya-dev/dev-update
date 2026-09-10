
import { parseISO, differenceInCalendarDays, isValid, format } from 'date-fns';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface GanttPhaseBarProps {
  name: string;
  startDate?: string;
  endDate?: string;
  owner?: string;
  md?: number;
  timelineStartDate: Date;
  dayWidth: number;
  colorClass: string;
}

export function GanttPhaseBar({
  name,
  startDate,
  endDate,
  owner,
  md,
  timelineStartDate,
  dayWidth,
  colorClass
}: GanttPhaseBarProps) {
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
                <Tooltip.Arrow className="fill-gray-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    }
    return null;
  }

  let start = startDate ? parseISO(startDate) : new Date();
  let end = endDate ? parseISO(endDate) : new Date();
  let missingEnd = !endDate;

  if (!isValid(start)) start = new Date();
  if (!isValid(end)) end = new Date();

  // If start is after end due to data error, swap them
  if (start > end && !missingEnd) {
    const temp = start;
    start = end;
    end = temp;
  }

  const offsetDays = differenceInCalendarDays(start, timelineStartDate);
  const durationDays = Math.max(1, differenceInCalendarDays(end, start) + 1);

  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{name}</div>
      <div className="text-gray-300">Owner: {owner || 'Unassigned'}</div>
      <div className="text-gray-300">
        {startDate ? format(start, 'dd MMM yyyy') : 'Unknown'} – {endDate ? format(end, 'dd MMM yyyy') : 'Unknown'}
      </div>
      <div className="text-gray-300">Duration: {durationDays} days</div>
      {md !== undefined && <div className="text-gray-300">Effort: {!isNaN(Number(md)) ? Number(md).toFixed(2) : '0.00'} MD</div>}
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={clsx(
              "absolute top-[6px] h-6 rounded-md flex items-center px-2 text-[10px] font-medium cursor-pointer transition-transform hover:scale-[1.02] shadow-sm z-10 whitespace-nowrap",
              colorClass,
              missingEnd && "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)] border border-current"
            )}
            style={{ left, width }}
          >
            <span className="w-full text-white drop-shadow-sm">
              {name} {md ? `· ${!isNaN(Number(md)) ? Number(md).toFixed(2) : '0.00'} MD` : ''}
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            className="bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-xl z-50 max-w-xs"
            sideOffset={5}
          >
            {tooltipContent}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
