import { useState, useEffect } from 'react';
import { groupReleasesByMonth } from './utils';
import type { ReleaseData } from './types';
import { ReleaseCard } from './components/ReleaseCard';
import { ReleaseDetailModal } from './components/ReleaseDetailModal';
import { Filter, Calendar, FolderOutput } from 'lucide-react';

function App() {
  const [data, setData] = useState<ReleaseData[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  const [selectedRelease, setSelectedRelease] = useState<ReleaseData | null>(null);

  useEffect(() => {
    const url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/manday';
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.manday) {
          setData(json.manday);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const years = ['All', ...Array.from(new Set(data.map(r => r.releaseDate ? r.releaseDate.substring(0, 4) : '').filter(Boolean)))].sort().reverse();
  const types = ['All', 'Feature', 'Improvement', 'Bug Fix'];

  const filteredData = data.filter(r => {
    if (selectedYear !== 'All' && r.releaseDate && !r.releaseDate.startsWith(selectedYear)) return false;
    if (selectedType !== 'All' && r.type !== selectedType) return false;
    // Only show Released items based on user story or all if status not considered? Spec says "all completed product releases", so we filter by Released.
    if (r.status !== 'Released') return false;
    return true;
  });

  const groupedData = groupReleasesByMonth(filteredData);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-16 lg:px-24 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOutput className="w-6 h-6 text-primary-600" />
              Executive Release Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Monthly release cadence and delivery effort.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 hover:bg-gray-100 transition-colors appearance-none"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 hover:bg-gray-100 transition-colors appearance-none"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
              <FolderOutput className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No releases found for the selected filters.</h3>
              <p className="text-gray-500 text-sm">Try adjusting your year or type filter to see more results.</p>
              <button
                onClick={() => { setSelectedYear('All'); setSelectedType('All'); }}
                className="mt-6 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto snap-x snap-mandatory hide-scrollbar">
            <div className="flex gap-8 h-full min-h-[600px] w-max px-16 lg:px-24 py-8">
              {groupedData.map((group) => (
                <div key={group.monthKey} className="w-[340px] flex-shrink-0 snap-start flex flex-col">
                  {/* Month Header */}
                  <div className="mb-6 sticky top-0 bg-gray-50/90 backdrop-blur-sm z-20 pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">{group.monthLabel}</h2>
                    <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800">
                      {group.releases.length} Release{group.releases.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Timeline Column */}
                  <div className="relative flex-1">
                    {/* Vertical Connector Line */}
                    <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-gray-200"></div>

                    <div className="space-y-6">
                      {group.releases.map((release) => (
                        <ReleaseCard
                          key={release.id}
                          release={release}
                          onClick={setSelectedRelease}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedRelease && (
        <ReleaseDetailModal
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
        />
      )}
    </div>
  );
}

export default App;
