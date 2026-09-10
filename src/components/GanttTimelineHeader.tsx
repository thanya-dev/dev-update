
import { eachMonthOfInterval, format, getDaysInMonth, differenceInCalendarDays } from 'date-fns';
import clsx from 'clsx';
import { PUBLIC_HOLIDAYS_2026 } from '../utils';

interface GanttTimelineHeaderProps {
  timelineStartDate: Date;
  timelineEndDate: Date;
  dayWidth: number;
}

export function GanttTimelineHeader({ timelineStartDate, timelineEndDate, dayWidth }: GanttTimelineHeaderProps) {
  const months = eachMonthOfInterval({
    start: timelineStartDate,
    end: timelineEndDate
  });

  const today = new Date();
  const isTodayInRange = today >= timelineStartDate && today <= timelineEndDate;
  const todayOffset = differenceInCalendarDays(today, timelineStartDate);

  return (
    <div className="flex border-b border-gray-200 bg-gray-50/95 backdrop-blur-md sticky top-0 z-30">
      {/* Left Panel Header Placeholder */}
      <div className="flex-none w-[360px] border-r border-gray-200 sticky left-0 z-40 bg-gray-50 flex items-end pb-2 px-4 shadow-[1px_0_2px_rgba(0,0,0,0.05)]">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Project / Release</div>
      </div>

      {/* Timeline Header */}
      <div className="flex-1 relative flex">
        {/* Today line marker */}
        {isTodayInRange && (
          <div 
            className="absolute top-0 bottom-[-9999px] w-0 border-l-2 border-red-500/50 z-20 pointer-events-none"
            style={{ left: todayOffset * dayWidth }}
          >
            <div className="absolute top-1 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              Today
            </div>
          </div>
        )}

        {months.map((monthDate) => {
          const daysInMonth = getDaysInMonth(monthDate);
          const monthWidth = daysInMonth * dayWidth;

          // Create an array of days for this month
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          return (
            <div 
              key={monthDate.toISOString()} 
              className="flex-none border-r border-gray-200"
              style={{ width: monthWidth }}
            >
              {/* Month Label */}
              <div className="h-8 border-b border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700 bg-white/50">
                {format(monthDate, 'MMMM yyyy')}
              </div>
              
              {/* Day/Week indicators */}
              <div className="h-6 flex">
                {days.map(day => {
                  const currentDayDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                  const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
                  const dateString = format(currentDayDate, 'yyyy-MM-dd');
                  const isHoliday = PUBLIC_HOLIDAYS_2026.includes(dateString);

                  return (
                    <div 
                      key={day}
                      className={clsx(
                        "flex-none h-full border-r border-gray-100/50 flex justify-center items-center",
                        (isWeekend || isHoliday) ? "bg-gray-200/60" : ""
                      )}
                      style={{ width: dayWidth }}
                    >
                      <span className="text-[9px] text-gray-500 font-medium">
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
