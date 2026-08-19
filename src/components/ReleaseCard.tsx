import React from 'react';
import { format, parseISO } from 'date-fns';
import { Sparkles, Wrench, Bug, CheckCircle2, BarChart2 } from 'lucide-react';
import type { ReleaseData } from '../types';
import { formatMD } from '../utils';

interface Props {
  release: ReleaseData;
  onClick: (release: ReleaseData) => void;
}

export const ReleaseCard: React.FC<Props> = ({ release, onClick }) => {
  const isBugFix = release.type === 'Bug Fix';
  const isMinorBugFix = isBugFix && release.totalMd <= 2.0;
  const hasUsage = [
    'Year Plan Report', 
    'Search by Brief', 
    'Centralize Draft Submission', 
    'Draft improvement', 
    'Draft Improvement #2',
    'Buddy Rank Content Idea Co-pilot',
    'Buddy Ranks',
    'Expense Report Bug, Evidence for Lotus Report',
    'Convert Manual post / Manual account',
    'AI pillar, Year Plan Report improvement',
    'Schedule update post data'
  ].includes(release.name);

  const images = release.gallery ? release.gallery.split(',').map(s => s.trim()).filter(Boolean) : [];
  const firstImage = images.length > 0 ? images[0] : null;

  const dateStr = release.releaseDate ? format(parseISO(release.releaseDate), 'dd MMM') : '';

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Feature': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Improvement': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Bug Fix': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (release.type) {
      case 'Feature': return <Sparkles className="w-8 h-8 text-blue-500" />;
      case 'Improvement': return <Wrench className="w-8 h-8 text-purple-500" />;
      case 'Bug Fix': return <Bug className="w-8 h-8 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="relative pl-6">
      {/* Timeline Connector Dot */}
      <div className="absolute left-[-11px] top-4 bg-white rounded-full border-2 border-primary-500 p-0.5 z-10">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>

      <div
        onClick={() => onClick(release)}
        className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col group h-full"
      >
        {!isMinorBugFix && (
          <div className="w-full aspect-[4/3] bg-gray-50 border-b border-gray-100 flex items-center justify-center group-hover:bg-gray-100 transition-colors overflow-hidden">
            {firstImage ? (
              <img src={firstImage} alt={release.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              getIcon()
            )}
          </div>
        )}

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500">{dateStr}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(release.type)}`}>
              {release.type}
            </span>
            {hasUsage && (
              <span className="text-xs px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> Usage
              </span>
            )}
          </div>

          <h4 className="font-semibold text-gray-900 leading-tight mb-3 line-clamp-2" title={release.name}>
            {release.name}
          </h4>

          <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center text-sm">
            <span className="text-gray-500">Effort</span>
            <span className="font-medium text-gray-900">{formatMD(release.totalMd)} MD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
