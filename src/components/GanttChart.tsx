import { useEffect, useRef, useMemo, useState } from 'react';
import { getGanttTimelineRange, sortGanttReleases, PUBLIC_HOLIDAYS_2026 } from '../utils';
import { GanttTimelineHeader } from './GanttTimelineHeader';
import { GanttProjectRow } from './GanttProjectRow';
import type { ActionItem, ReleaseData } from '../types';
import type { PhaseKey } from '../utils';
import type { StatusOption } from '../api';
import { differenceInCalendarDays, format } from 'date-fns';
import clsx from 'clsx';

interface GanttChartProps {
  data: ReleaseData[];
  onProjectClick?: (release: ReleaseData) => void;
  onPhaseChange?: (release: ReleaseData, phase: PhaseKey, start: string, end: string) => void;
  onReleaseDateChange?: (release: ReleaseData, date: string) => void;
  onDelete?: (release: ReleaseData) => void;
  statusOptions?: StatusOption[];
  onStatusChange?: (release: ReleaseData, status: string) => void;
  onNameChange?: (release: ReleaseData, name: string) => void;
  /** Move project `dragId` before/after project `targetId`. */
  onReorder?: (dragId: number, targetId: number, place: 'before' | 'after') => void;
  onActionItemsChange?: (release: ReleaseData, items: ActionItem[]) => void;
  ownerSuggestions?: string[];
}

const DEFAULT_LEFT_COL = 440;
const MIN_LEFT_COL = 280;
const MAX_LEFT_COL = 800;

export function GanttChart({ data, onProjectClick, onPhaseChange, onReleaseDateChange, onDelete, statusOptions, onStatusChange, onNameChange, onReorder, onActionItemsChange, ownerSuggestions }: GanttChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { startDate, endDate } = useMemo(() => getGanttTimelineRange(data), [data]);
  const sortedData = useMemo(() => sortGanttReleases(data), [data]);
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

  const DAY_WIDTH = 20;

  // Project drag & drop (starts only from a row's grip handle)
  const [armedId, setArmedId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<{ id: number; place: 'before' | 'after' } | null>(null);
  const endDrag = () => {
    setArmedId(null);
    setDragId(null);
    setDropAt(null);
  };

  // Width of the "Project / Release" column; drag its right edge in the header to resize.
  const [leftCol, setLeftCol] = useState(() => {
    try {
      return Number(localStorage.getItem('gantt.leftCol')) || DEFAULT_LEFT_COL;
    } catch {
      return DEFAULT_LEFT_COL;
    }
  });
  const resizeLeftCol = (w: number) => {
    const clamped = Math.round(Math.min(MAX_LEFT_COL, Math.max(MIN_LEFT_COL, w)));
    setLeftCol(clamped);
    try {
      localStorage.setItem('gantt.leftCol', String(clamped));
    } catch {
      /* storage unavailable — width just won't be remembered */
    }
  };

  useEffect(() => {
    // Scroll to today on mount
    if (scrollContainerRef.current) {
      const today = new Date();
      if (today >= startDate && today <= endDate) {
        const offsetDays = differenceInCalendarDays(today, startDate);
        // Calculate scroll pos: today's offset minus a bit of padding to center it
        const scrollPosition = (offsetDays * DAY_WIDTH) - 200; 
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
    // Depend on the timestamps, not the Date objects, so editing a bar doesn't jump the scroll back to today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate.getTime(), endDate.getTime()]);

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 m-4 rounded-2xl border border-dashed border-gray-300">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No project data found for the selected filters.</h3>
          <p className="text-gray-500 text-sm">Try adjusting or clearing the filters to see more results.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ '--left-col': `${leftCol}px` } as React.CSSProperties}
      className="flex-1 overflow-hidden flex flex-col bg-white/50 backdrop-blur-sm m-4 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
      >
        <div className="min-w-max min-h-full pb-16">
          <GanttTimelineHeader 
            timelineStartDate={startDate} 
            timelineEndDate={endDate} 
            dayWidth={DAY_WIDTH} 
            leftColWidth={leftCol}
            onLeftColResize={resizeLeftCol}
          />
          
          <div className="flex flex-col relative z-0">
            {/* Timeline Grid & Weekends */}
            <div className="absolute inset-0 z-[-1] pointer-events-none flex" style={{ marginLeft: 'var(--left-col)' }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const dateString = format(d, 'yyyy-MM-dd');
                const isHoliday = PUBLIC_HOLIDAYS_2026.includes(dateString);
                
                return (
                  <div
                    key={i}
                    className={clsx(
                      "flex-none h-full border-r border-gray-100/50",
                      (isWeekend || isHoliday) ? "bg-gray-200/60" : ""
                    )}
                    style={{ width: DAY_WIDTH }}
                  />
                );
              })}
            </div>
            
            {sortedData.map((release) => (
              <GanttProjectRow 
                key={release.id} 
                release={release} 
                timelineStartDate={startDate} 
                dayWidth={DAY_WIDTH} 
                onProjectClick={onProjectClick}
                onPhaseChange={onPhaseChange}
                onReleaseDateChange={onReleaseDateChange}
                onDelete={onDelete}
                statusOptions={statusOptions}
                onStatusChange={onStatusChange}
                onNameChange={onNameChange}
                reorder={
                  onReorder
                    ? {
                        armed: armedId === release.id,
                        dragging: dragId === release.id,
                        indicator: dragId !== null && dragId !== release.id && dropAt?.id === release.id ? dropAt.place : null,
                        onArm: () => setArmedId(release.id),
                        onDisarm: () => dragId === null && setArmedId(null),
                        onDragStart: () => setDragId(release.id),
                        onDragOver: place => dragId !== null && setDropAt({ id: release.id, place }),
                        onDrop: () => {
                          if (dragId !== null && dropAt && dragId !== dropAt.id) onReorder(dragId, dropAt.id, dropAt.place);
                          endDrag();
                        },
                        onDragEnd: endDrag,
                      }
                    : undefined
                }
                onActionItemsChange={onActionItemsChange}
                ownerSuggestions={ownerSuggestions}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
