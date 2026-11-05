import { useState } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, Trash2, ListTodo, Flag, Eraser, Pencil, GripVertical } from 'lucide-react';
import { parseISO, differenceInCalendarDays, isValid, format, addDays } from 'date-fns';
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import type { ActionItem, ReleaseData } from '../types';
import { ActionItemsPanel } from './ActionItemsPanel';
import { ActionItemMarker, groupByDue } from './ActionItemMarker';
import { GanttPhaseBar } from './GanttPhaseBar';
import { checkDateConflicts, formatMD, PHASES, toISODate, type PhaseKey } from '../utils';
import { useDayDrag } from '../hooks/useDayDrag';
import { StatusPicker } from './StatusPicker';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import type { StatusOption } from '../api';

export interface RowReorder {
  armed: boolean;
  dragging: boolean;
  indicator: 'before' | 'after' | null;
  onArm: () => void;
  onDisarm: () => void;
  onDragStart: () => void;
  onDragOver: (place: 'before' | 'after') => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

interface GanttProjectRowProps {
  release: ReleaseData;
  timelineStartDate: Date;
  dayWidth: number;
  onProjectClick?: (release: ReleaseData) => void;
  onPhaseChange?: (release: ReleaseData, phase: PhaseKey, start: string, end: string) => void;
  onReleaseDateChange?: (release: ReleaseData, date: string) => void;
  onDelete?: (release: ReleaseData) => void;
  statusOptions?: StatusOption[];
  onStatusChange?: (release: ReleaseData, status: string) => void;
  onNameChange?: (release: ReleaseData, name: string) => void;
  reorder?: RowReorder;
  onActionItemsChange?: (release: ReleaseData, items: ActionItem[]) => void;
  ownerSuggestions?: string[];
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

export function GanttProjectRow({
  release,
  timelineStartDate,
  dayWidth,
  onProjectClick,
  onPhaseChange,
  onReleaseDateChange,
  onDelete,
  statusOptions = [],
  onStatusChange,
  onNameChange,
  onActionItemsChange,
  ownerSuggestions,
  reorder,
}: GanttProjectRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  /** Right-click on the main timeline row: `day` is the date under the cursor. */
  const [releaseMenu, setReleaseMenu] = useState<{ x: number; y: number; day: string } | null>(null);
  const actionItems = release.actionItems ?? [];
  const openActions = actionItems.filter(a => !a.done).length;

  const statusColor = statusColors[release.status] || 'bg-gray-100 text-gray-800 border-gray-200';
  const { hasPostReleaseWork } = checkDateConflicts(release);

  const releaseDateObj = release.releaseDate ? parseISO(release.releaseDate) : null;
  const isReleaseDateValid = releaseDateObj && isValid(releaseDateObj);
  const { drag: milestoneDrag, bind: milestoneBind } = useDayDrag(dayWidth, (_mode, delta) => {
    if (releaseDateObj && isValid(releaseDateObj)) onReleaseDateChange?.(release, toISODate(addDays(releaseDateObj, delta)));
  });

  let releaseOffsetDays = 0;
  if (isReleaseDateValid) {
    releaseOffsetDays = differenceInCalendarDays(releaseDateObj, timelineStartDate) + (milestoneDrag?.delta ?? 0);
  }
  const shownReleaseDate = isReleaseDateValid ? addDays(releaseDateObj, milestoneDrag?.delta ?? 0) : null;

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
    <div
      draggable={reorder?.armed}
      onDragStart={e => {
        if (!reorder?.armed) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(release.id));
        reorder.onDragStart();
      }}
      onDragOver={
        reorder
          ? e => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              reorder.onDragOver(e.clientY < r.top + r.height / 2 ? 'before' : 'after');
            }
          : undefined
      }
      onDrop={
        reorder
          ? e => {
              e.preventDefault();
              reorder.onDrop();
            }
          : undefined
      }
      onDragEnd={reorder?.onDragEnd}
      className={clsx(
        'flex flex-col border-b border-gray-200 hover:bg-gray-50/50 transition-colors',
        reorder?.dragging && 'opacity-40',
        reorder?.indicator === 'before' && 'shadow-[inset_0_3px_0_#2563eb]',
        reorder?.indicator === 'after' && 'shadow-[inset_0_-3px_0_#2563eb]'
      )}
    >
      {/* Main Row */}
      <div className="flex h-14 group">
        {/* Left Panel */}
        <div className="flex-none w-[var(--left-col)] flex items-center border-r border-gray-200 bg-white sticky left-0 z-20 shadow-[1px_0_2px_rgba(0,0,0,0.05)] pl-2 pr-4">
          {reorder && (
            <span
              title="Drag to reorder"
              onMouseDown={reorder.onArm}
              onMouseUp={reorder.onDisarm}
              className="absolute left-0 inset-y-0 flex items-center px-0.5 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}
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
              {editingName && onNameChange ? (
                <NameInput
                  initial={release.name}
                  onDone={name => {
                    setEditingName(false);
                    if (name && name !== release.name) onNameChange(release, name);
                  }}
                />
              ) : (
                <>
                  <span className="text-sm font-semibold text-gray-900 truncate" title={release.name}>{release.name}</span>
                  {onNameChange && (
                    <button
                      type="button"
                      title="Rename project"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingName(true);
                      }}
                      className="flex-none p-0.5 -ml-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-700 rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <StatusPicker
                value={release.status}
                options={statusOptions}
                className={statusColor}
                onChange={onStatusChange ? (status) => onStatusChange(release, status) : undefined}
              />
              {isOverdue && release.status !== 'Overdue' && (
                <span className="px-2 py-0.5 rounded-full border font-medium bg-red-100 text-red-800 border-red-200">
                  Overdue
                </span>
              )}
              <span className="text-gray-500 truncate">{release.type}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-medium">{formatMD(release.totalMd)} MD</span>
              {actionItems.length > 0 && (
                <button
                  type="button"
                  title={`${openActions} open action item(s) — click to view`}
                  onClick={e => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className={clsx(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border font-medium',
                    openActions ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                  )}
                >
                  <ListTodo className="w-3 h-3" />
                  {openActions ? openActions : '✓'}
                </button>
              )}
            </div>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(release)}
              title="Delete project"
              className="p-1.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 rounded-md transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Timeline Panel */}
        <div
          className="flex-1 relative min-w-0"
          onContextMenu={
            onReleaseDateChange
              ? e => {
                  e.preventDefault();
                  const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
                  const day = toISODate(addDays(timelineStartDate, Math.floor(x / dayWidth)));
                  setReleaseMenu({ x: e.clientX, y: e.clientY, day });
                }
              : undefined
          }
        >
          {/* Action item due-date markers (grouped per day) */}
          {groupByDue(actionItems).map(({ due, items: dayItems }) => (
            <ActionItemMarker
              key={due}
              due={due}
              items={dayItems}
              timelineStartDate={timelineStartDate}
              dayWidth={dayWidth}
              onClick={() => setIsExpanded(true)}
            />
          ))}

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
              <Tooltip.Root open={milestoneDrag ? false : undefined}>
                <Tooltip.Trigger asChild>
                  <div
                    {...(onReleaseDateChange ? milestoneBind : {})}
                    className={clsx(
                      "absolute top-1/2 -translate-y-1/2 z-10 select-none touch-none",
                      onReleaseDateChange ? (milestoneDrag ? "cursor-grabbing" : "cursor-grab") : "cursor-help"
                    )}
                    style={{ left: releaseOffsetDays * dayWidth + (dayWidth / 2) }}
                  >
                    <div
                      className={clsx(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 border-2 shadow-sm transition-transform hover:scale-125",
                        isOverdue || hasPostReleaseWork ? "bg-red-500 border-red-600" : "bg-emerald-500 border-emerald-600"
                      )}
                    />
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-500 whitespace-nowrap pointer-events-none">
                      {format(shownReleaseDate!, 'dd MMM yy')}
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
                    {onReleaseDateChange && <div className="text-gray-400 mt-1">Drag or right-click to change release date</div>}
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
                left: releaseOffsetDays * dayWidth + (dayWidth / 2), 
                width: Math.max(0, differenceInCalendarDays(parseISO(release.lastWorkDate), releaseDateObj) + 0.5) * dayWidth 
              }}
            >
              <div className="absolute -top-4 left-2 text-[10px] font-medium text-red-500 whitespace-nowrap flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Post-release work
              </div>
            </div>
          )}
        </div>
      </div>

      {releaseMenu && onReleaseDateChange && (
        <ContextMenu
          x={releaseMenu.x}
          y={releaseMenu.y}
          onClose={() => setReleaseMenu(null)}
          items={[
            ...(releaseMenu.day !== release.releaseDate
              ? [{
                  label: `Set release date to ${format(parseISO(releaseMenu.day), 'd MMM yyyy')}`,
                  icon: <Flag className="w-4 h-4 text-emerald-600" />,
                  onSelect: () => onReleaseDateChange(release, releaseMenu.day),
                }]
              : []),
            ...(release.releaseDate
              ? [{
                  label: 'Clear release date',
                  icon: <Eraser className="w-4 h-4" />,
                  danger: true,
                  onSelect: () => onReleaseDateChange(release, ''),
                }]
              : []),
          ] satisfies ContextMenuItem[]}
        >
          <ReleaseDateForm
            initial={release.releaseDate || ''}
            onSave={date => {
              setReleaseMenu(null);
              if (date !== release.releaseDate) onReleaseDateChange(release, date);
            }}
          />
        </ContextMenu>
      )}

      {/* Expanded Sub-rows */}
      {isExpanded && (
        <div className="bg-gray-50/80 border-t border-gray-100 pb-2 pt-1 shadow-inner">
          {PHASES.map(phase => {
            const owner = release[`${phase.key}Owner`];
            const phaseStart = release[`${phase.key}Start`];
            const phaseEnd = release[`${phase.key}End`];
            const hasDates = !!(phaseStart || phaseEnd);
            const canCreate = !!onPhaseChange && !hasDates;
            return (
              <div key={phase.key} className="flex h-12 group">
                <div className="flex-none w-[var(--left-col)] flex flex-col justify-center border-r border-gray-200 bg-gray-50/80 sticky left-0 z-20 pl-10 pr-4 !bg-gray-50">
                  <span className="text-xs text-gray-600 font-medium leading-tight">{phase.label}</span>
                  {owner && <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{owner}</span>}
                </div>
                <div
                  className={clsx("flex-1 relative", canCreate && "cursor-copy hover:bg-gray-100/70")}
                  title={canCreate ? `Click to add ${phase.label} dates` : undefined}
                  onClick={canCreate ? (e) => {
                    // Drop a 5-day bar starting on the clicked day
                    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
                    const day = addDays(timelineStartDate, Math.floor(x / dayWidth));
                    onPhaseChange!(release, phase.key, toISODate(day), toISODate(addDays(day, 4)));
                  } : undefined}
                >
                  <GanttPhaseBar
                    name={phase.label}
                    startDate={phaseStart}
                    endDate={phaseEnd}
                    owner={owner}
                    md={release[`${phase.key}Md`]}
                    timelineStartDate={timelineStartDate}
                    dayWidth={dayWidth}
                    colorClass={phase.colorClass}
                    onChange={onPhaseChange ? (start, end) => onPhaseChange(release, phase.key, start, end) : undefined}
                    onClear={onPhaseChange ? () => onPhaseChange(release, phase.key, '', '') : undefined}
                  />
                </div>
              </div>
            );
          })}
          <ActionItemsPanel
            items={actionItems}
            ownerSuggestions={ownerSuggestions}
            onChange={onActionItemsChange ? items => onActionItemsChange(release, items) : undefined}
            renderTimeline={item =>
              item.due ? (
                <ActionItemMarker due={item.due} items={[item]} timelineStartDate={timelineStartDate} dayWidth={dayWidth} />
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
}

function ReleaseDateForm({ initial, onSave }: { initial: string; onSave: (date: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="px-3 pt-1.5 pb-2 mb-1 border-b border-gray-100"
      onSubmit={e => {
        e.preventDefault();
        if (value) onSave(value);
      }}
    >
      <span className="block text-[11px] font-medium text-gray-500 mb-1">Release date</span>
      <div className="flex gap-1.5">
        <input
          type="date"
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={!value || value === initial}
          className="px-2.5 py-1 rounded-md text-xs font-medium text-white bg-[#01082F] hover:bg-[#1a2150] disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </form>
  );
}

/** Inline project-name editor: Enter or click away saves, Esc cancels. */
function NameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      value={value}
      onFocus={e => e.currentTarget.select()}
      onClick={e => e.stopPropagation()}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onDone(value.trim() || null)}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') onDone(null);
      }}
      className="flex-1 min-w-0 px-1.5 py-0.5 -my-0.5 border border-blue-400 rounded text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
    />
  );
}
