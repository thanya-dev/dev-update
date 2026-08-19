import React, { useState } from 'react';
import { X, Calendar, User, Clock, CheckCircle2 } from 'lucide-react';
import type { ReleaseData } from '../types';
import { formatMD } from '../utils';
import { format, parseISO } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Bar } from 'react-chartjs-2';
import { UsageChart } from './UsageChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface Props {
  release: ReleaseData;
  onClose: () => void;
}

export const ReleaseDetailModal: React.FC<Props> = ({ release, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'usage'>('details');
  const isYearPlanReport = release.name === 'Year Plan Report';

  // Chart Data preparation
  const phases = [
    { label: 'Requirement', start: release.reqStart, end: release.reqEnd, owner: release.reqOwner, md: release.reqMd },
    { label: 'Design', start: release.designStart, end: release.designEnd, owner: release.designOwner, md: release.designMd },
    { label: 'Development', start: release.devStart, end: release.devEnd, owner: release.devOwner, md: release.devMd },
    { label: 'Test/UAT', start: release.testUatStart, end: release.testUatEnd, owner: release.testUatOwner, md: release.testUatMd },
  ].filter(p => p.start && p.end && p.md > 0);

  const data = {
    labels: phases.map(p => p.label),
    datasets: [
      {
        label: 'Timeline',
        data: phases.map(p => [parseISO(p.start).getTime(), parseISO(p.end).getTime()]),
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)', // purple
          'rgba(236, 72, 153, 0.8)', // pink
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(34, 197, 94, 0.8)',  // green
        ],
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.5,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const start = format(new Date(context.raw[0]), 'MMM d, yyyy');
            const end = format(new Date(context.raw[1]), 'MMM d, yyyy');
            const phase = phases[context.dataIndex];
            return ` ${start} - ${end} (${phase.md} MD)`;
          },
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        grid: {
          color: '#f3f4f6',
        }
      },
      y: {
        grid: { display: false }
      }
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-[1600px] h-[95vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">
                {release.type}
              </span>
              <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {release.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{release.name}</h2>
            {release.releaseDate && (
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Released on {format(parseISO(release.releaseDate), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Navigation */}
        {isYearPlanReport && (
          <div className="px-6 border-b border-gray-100 flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'usage' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Usage
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main timeline column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Implementation Timeline</h3>
              <div className="h-64 w-full">
                {phases.length > 0 ? (
                  <Bar data={data} options={options} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No detailed timeline dates available.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase Breakdown</h3>
              <div className="space-y-4">
                {phases.map((phase, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-gray-900">{phase.label}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" /> {phase.owner || 'Unassigned'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatMD(phase.md)} MD</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 justify-end mt-1">
                        <Clock className="w-3 h-3" /> 
                        {format(parseISO(phase.start), 'MMM d')} - {format(parseISO(phase.end), 'MMM d')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
              <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wider mb-2">Total Effort</h3>
              <div className="text-4xl font-bold text-purple-700">{formatMD(release.totalMd)}</div>
              <div className="text-sm text-purple-600 mt-1">Mandays</div>
            </div>
          </div>
        </div>
        ) : (
          <div className="flex-1 w-full h-full min-h-[500px] pb-6">
             <UsageChart />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
