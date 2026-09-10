import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Calendar, AlertTriangle } from 'lucide-react';
import { parseISO, differenceInCalendarDays, isValid, format } from 'date-fns';
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import type { ReleaseData } from '../types';
import { GanttPhaseBar } from './GanttPhaseBar';
import { checkDateConflicts, formatMD } from '../utils';

interface GanttProjectRowProps {
  release: ReleaseData;
  timelineStartDate: Date;
  dayWidth: number;
  onProjectClick?: (release: ReleaseData) => void;
}

const statusColors: Record<string, string> = {
  'Not Started': 'bg-[#f1f3f4] text-gray-800 border-gray-200',
  'Requirement': 'bg-[#e9d5ff] text-purple-900 border-purple-300',
  'Design': 'bg-[#e9d5ff] text-purple-900 border-purple-300',
  'Development': 'bg-[#fde68a] text-amber-900 border-amber-300',
  'Testing / UAT': 'bg-[#fde68a] text-amber-900 border-amber-300',
  'Ready for Release': 'bg-[#bbf7d0] text-green-900 border-green-300',
  'Ready for Release...': 'bg-[#bbf7d0] text-green-900 border-green-300',
  'Released': 'bg-[#bbf7d0] text-green-900 border-green-300',
  'On Hold': 'bg-[#f1f3f4] text-gray-800 border-gray-200',
  'Cancelled': 'bg-[#fecaca] text-red-900 border-red-300',
  // Fallbacks for older data variations
  'Testing/UAT': 'bg-[#fde68a] text-amber-900 border-amber-300',
  'At Risk': 'bg-orange-200 text-orange-900 border-orange-300',
  'Delayed': 'bg-red-200 text-red-900 border-red-300',
};

export function GanttProjectRow({ release, timelineStartDate, dayWidth, onProjectClick }: GanttProjectRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = statusColors[release.status] || 'bg-gray-100 text-gray-800 border-gray-200';
  const { hasPostReleaseWork } = checkDateConflicts(release);

  const releaseDateObj = release.releaseDate ? parseISO(release.releaseDate) : null;
  const isReleaseDateValid = releaseDateObj && isValid(releaseDateObj);
  let releaseOffsetDays = 0;
  if (isReleaseDateValid) {
    releaseOffsetDays = differenceInCalendarDays(releaseDateObj, timelineStartDate);
  }

  // Determine if it's Overdue (Status not Released but current date > release date)
  const isOverdue = release.status !== 'Released' && isReleaseDateValid && releaseDateObj < new Date();

  // Calculate pre-release bar
  const firstWorkDateObj = release.firstWorkDate ? parseISO(release.firstWorkDate) : null;
  const isFirstWorkValid = firstWorkDateObj && isValid(firstWorkDateObj);

  let preReleaseOffsetDays = 0;
  let preReleaseDurationDays = 0;

  if (isFirstWorkValid) {
    preReleaseOffsetDays = differenceInCalendarDays(firstWorkDateObj, timelineStartDate);
    if (isReleaseDateValid) {
      preReleaseDurationDays = Math.max(0, differenceInCalendarDays(releaseDateObj, firstWorkDateObj));
    } else if (release.lastWorkDate) {
      const lastWorkDateObj = parseISO(release.lastWorkDate);
      if (isValid(lastWorkDateObj)) {
        preReleaseDurationDays = Math.max(0, differenceInCalendarDays(lastWorkDateObj, firstWorkDateObj));
      }
    }
  }

  return (
    <div className="flex flex-col border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
      {/* Main Row */}
      <div className="flex h-14 group">
        {/* Left Panel */}
        <div className="flex-none w-[360px] flex items-center border-r border-gray-200 bg-white sticky left-0 z-20 shadow-[1px_0_2px_rgba(0,0,0,0.05)] pl-2 pr-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 mr-1 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          <div 
            className={clsx("flex-1 min-w-0 flex flex-col justify-center", onProjectClick ? "cursor-pointer hover:opacity-80" : "")}
            onClick={() => onProjectClick?.(release)}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{release.id || 'N/A'}</span>
              <span className="text-sm font-semibold text-gray-900 truncate" title={release.name}>{release.name}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={clsx("px-2 py-0.5 rounded-full border font-medium", statusColor)}>
                {release.status}
              </span>
              {isOverdue && release.status !== 'Overdue' && (
                <span className="px-2 py-0.5 rounded-full border font-medium bg-red-100 text-red-800 border-red-200">
                  Overdue
                </span>
              )}
              <span className="text-gray-500 truncate">{release.type}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-medium">{formatMD(release.totalMd)} MD</span>
            </div>
          </div>
        </div>

        {/* Timeline Panel */}
        <div className="flex-1 relative min-w-0">
          {/* Pre-release summary bar */}
          {isFirstWorkValid && preReleaseDurationDays > 0 && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 h-6 bg-gray-200/80 border-y border-l border-gray-300 rounded-l-md z-0 pointer-events-none"
              style={{ left: preReleaseOffsetDays * dayWidth, width: preReleaseDurationDays * dayWidth }}
            />
          )}

          {/* Release Milestone */}
          {isReleaseDateValid && (
            <Tooltip.Provider delayDuration={200}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 z-10 cursor-help"
                    style={{ left: releaseOffsetDays * dayWidth }}
                  >
                    <div
                      className={clsx(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 border-2 shadow-sm transition-transform hover:scale-125",
                        isOverdue || hasPostReleaseWork ? "bg-red-500 border-red-600" : "bg-emerald-500 border-emerald-600"
                      )}
                    />
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-500 whitespace-nowrap pointer-events-none">
                      {format(releaseDateObj, 'dd MMM yy')}
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-xl z-50">
                    <div className="font-semibold mb-1">{release.name} (Milestone)</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">Date:</span>
                      <span>{format(releaseDateObj, 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">Status:</span>
                      <span className={isOverdue ? 'text-red-400 font-medium' : ''}>{isOverdue ? 'Overdue' : release.status}</span>
                    </div>
                    {hasPostReleaseWork && (
                      <div className="mt-1 pt-1 border-t border-gray-700 text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Has post-release work
                      </div>
                    )}
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}

          {/* Post-release warning zone */}
          {hasPostReleaseWork && isReleaseDateValid && release.lastWorkDate && isValid(parseISO(release.lastWorkDate)) && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 h-6 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(239,68,68,0.1)_10px,rgba(239,68,68,0.1)_20px)] border-y border-red-200 z-0 pointer-events-none rounded-r-md"
              style={{ 
                left: releaseOffsetDays * dayWidth, 
                width: Math.max(0, differenceInCalendarDays(parseISO(release.lastWorkDate), releaseDateObj)) * dayWidth 
              }}
            >
              <div className="absolute -top-4 left-2 text-[10px] font-medium text-red-500 whitespace-nowrap flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Post-release work
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Sub-rows */}
      {isExpanded && (
        <div className="bg-gray-50/80 border-t border-gray-100 pb-2 pt-1 shadow-inner">
          {/* Requirement Row */}
          <div className="flex h-10 group">
            <div className="flex-none w-[360px] flex items-center border-r border-gray-200 bg-gray-50/80 sticky left-0 z-20 pl-10 pr-4">
              <span className="text-xs text-gray-600 font-medium">Requirement</span>
            </div>
            <div className="flex-1 relative">
              <GanttPhaseBar
                name="Requirement"
                startDate={release.reqStart}
                endDate={release.reqEnd}
                owner={release.reqOwner}
                md={release.reqMd}
                timelineStartDate={timelineStartDate}
                dayWidth={dayWidth}
                colorClass="bg-purple-500"
              />
            </div>
          </div>
          
          {/* Design Row */}
          <div className="flex h-10 group">
            <div className="flex-none w-[360px] flex items-center border-r border-gray-200 bg-gray-50/80 sticky left-0 z-20 pl-10 pr-4">
              <span className="text-xs text-gray-600 font-medium">Design</span>
            </div>
            <div className="flex-1 relative">
              <GanttPhaseBar
                name="Design"
                startDate={release.designStart}
                endDate={release.designEnd}
                owner={release.designOwner}
                md={release.designMd}
                timelineStartDate={timelineStartDate}
                dayWidth={dayWidth}
                colorClass="bg-blue-500"
              />
            </div>
          </div>

          {/* Development Row */}
          <div className="flex h-10 group">
            <div className="flex-none w-[360px] flex items-center border-r border-gray-200 bg-gray-50/80 sticky left-0 z-20 pl-10 pr-4">
              <span className="text-xs text-gray-600 font-medium">Development</span>
            </div>
            <div className="flex-1 relative">
              <GanttPhaseBar
                name="Development"
                startDate={release.devStart}
                endDate={release.devEnd}
                owner={release.devOwner}
                md={release.devMd}
                timelineStartDate={timelineStartDate}
                dayWidth={dayWidth}
                colorClass="bg-orange-500"
              />
            </div>
          </div>

          {/* Test/UAT Row */}
          <div className="flex h-10 group">
            <div className="flex-none w-[360px] flex items-center border-r border-gray-200 bg-gray-50/80 sticky left-0 z-20 pl-10 pr-4">
              <span className="text-xs text-gray-600 font-medium">Test / UAT</span>
            </div>
            <div className="flex-1 relative">
              <GanttPhaseBar
                name="Test / UAT"
                startDate={release.testUatStart}
                endDate={release.testUatEnd}
                owner={release.testUatOwner}
                md={release.testUatMd}
                timelineStartDate={timelineStartDate}
                dayWidth={dayWidth}
                colorClass="bg-green-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
