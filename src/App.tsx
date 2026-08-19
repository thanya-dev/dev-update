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
    const nowMonth = new Date().toISOString().substring(0, 7);
    const itemMonth = r.releaseDate ? r.releaseDate.substring(0, 7) : '';
    
    // Only filter by 'Released' status if it's a past month.
    // For current and future months, show them regardless of status.
    if (itemMonth < nowMonth && r.status !== 'Released') return false;
    
    return true;
  });

  const groupedData = groupReleasesByMonth(filteredData);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#01082F] sticky top-0 z-30 shadow-md">
        <div className="w-full px-16 lg:px-24 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
              Executive Release Dashboard
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">Monthly release cadence and delivery effort.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 hover:bg-gray-100 transition-colors appearance-none"
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
                className="pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 hover:bg-gray-100 transition-colors appearance-none"
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
          <div className="flex-1 overflow-x-auto overflow-y-auto snap-x snap-mandatory hide-scrollbar scroll-pl-8">
            <div className="w-max min-h-full px-16 lg:px-24 pb-8">
              
              {/* Sticky Header Row */}
              <div className="sticky top-0 z-20 flex gap-8 pt-8 pb-4 mb-6 bg-gray-50/95 backdrop-blur-md border-b border-gray-200">
                {groupedData.map((group) => (
                  <div key={group.monthKey} className="w-[340px] flex-shrink-0 snap-start">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{group.monthLabel}</h2>
                      {group.isPlan && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          Plan
                        </span>
                      )}
                    </div>
                    <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800">
                      {group.releases.length} Release{group.releases.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cards Row */}
              <div className="flex gap-8">
                {groupedData.map((group) => (
                  <div key={group.monthKey} className="w-[340px] flex-shrink-0">
                    <div className="relative h-full">
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
