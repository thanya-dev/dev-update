import React, { useEffect, useRef, useMemo } from 'react';
import { getGanttTimelineRange, sortGanttReleases, PUBLIC_HOLIDAYS_2026 } from '../utils';
import { GanttTimelineHeader } from './GanttTimelineHeader';
import { GanttProjectRow } from './GanttProjectRow';
import type { ReleaseData } from '../types';
import { differenceInCalendarDays, format } from 'date-fns';
import clsx from 'clsx';

interface GanttChartProps {
  data: ReleaseData[];
  onProjectClick?: (release: ReleaseData) => void;
}

export function GanttChart({ data, onProjectClick }: GanttChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { startDate, endDate } = useMemo(() => getGanttTimelineRange(data), [data]);
  const sortedData = useMemo(() => sortGanttReleases(data), [data]);
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

  const DAY_WIDTH = 20;

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
  }, [startDate, endDate]);

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 m-4 rounded-2xl border border-dashed border-gray-300">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No project data found for the selected filters.</h3>
          <p className="text-gray-500 text-sm">Try adjusting your year or type filter to see more results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white/50 backdrop-blur-sm m-4 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
      >
        <div className="min-w-max min-h-full pb-16">
          <GanttTimelineHeader 
            timelineStartDate={startDate} 
            timelineEndDate={endDate} 
            dayWidth={DAY_WIDTH} 
          />
          
          <div className="flex flex-col relative z-0">
            {/* Timeline Grid & Weekends */}
            <div className="absolute inset-0 z-[-1] pointer-events-none flex" style={{ marginLeft: '360px' }}>
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
