import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ProjectReport } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type AggregationLevel = 'Day' | 'Month' | 'Year';

export const UsageChart: React.FC = () => {
  const [data, setData] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggregation, setAggregation] = useState<AggregationLevel>('Month');

  useEffect(() => {
    const url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/projectReport';
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.projectReport) {
          setData(json.projectReport);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const { chartData, modeTotals } = useMemo(() => {
    // 1. Group data by aggregation level and mode
    const grouped: Record<string, Record<string, number>> = {};
    const modeTotalsRecord: Record<string, number> = {};
    const modes = new Set<string>();

    data.forEach((item) => {
      // Date format is DD/MM/YYYY
      if (!item.date) return;
      const [dayStr, monthStr, yearStr] = item.date.split('/');
      let key = item.date; // default Day
      
      if (aggregation === 'Month') {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const m = parseInt(monthStr, 10);
        key = `${monthNames[m - 1]} ${yearStr}`;
      } else if (aggregation === 'Year') {
        key = yearStr;
      }

      if (!grouped[key]) {
        grouped[key] = {};
      }
      
      const mode = item.mode || 'unknown';
      modes.add(mode);
      
      // Handle the field name from Sheety (might be countaOfProject or similar)
      const count = item.countaOfProject || 0;
      grouped[key][mode] = (grouped[key][mode] || 0) + count;
      
      // Calculate overall totals
      modeTotalsRecord[mode] = (modeTotalsRecord[mode] || 0) + count;
    });

    // 2. Prepare chart data
    const labels = Object.keys(grouped).sort((a, b) => {
      // Simple string sort won't be perfectly chronological for Month/Day, but for Year it's fine.
      if (aggregation === 'Day') {
        const [d1, m1, y1] = a.split('/');
        const [d2, m2, y2] = b.split('/');
        return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
      } else if (aggregation === 'Month') {
         return new Date(a).getTime() - new Date(b).getTime();
      }
      return a.localeCompare(b);
    });

    const ArrayOfModes = Array.from(modes);
    
    // Color palette for modes
    const colors = [
      'rgba(59, 130, 246, 0.8)',  // blue
      'rgba(168, 85, 247, 0.8)',  // purple
      'rgba(236, 72, 153, 0.8)',  // pink
      'rgba(34, 197, 94, 0.8)',   // green
      'rgba(245, 158, 11, 0.8)',  // amber
      'rgba(239, 68, 68, 0.8)',   // red
    ];

    const datasets = ArrayOfModes.map((mode, index) => {
      return {
        label: mode,
        data: labels.map(label => grouped[label][mode] || 0),
        backgroundColor: colors[index % colors.length],
      };
    });

    return {
      chartData: {
        labels,
        datasets,
      },
      modeTotals: modeTotalsRecord,
    };
  }, [data, aggregation]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false }
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Usage Report</h3>
        <select
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-primary-500 focus:border-primary-500"
          value={aggregation}
          onChange={(e) => setAggregation(e.target.value as AggregationLevel)}
        >
          <option value="Day">Day</option>
          <option value="Month">Month</option>
          <option value="Year">Year</option>
        </select>
      </div>

      {!loading && data.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {Object.entries(modeTotals).map(([mode, total]) => (
            <div key={mode} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg flex flex-col min-w-[120px]">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{mode}</span>
              <span className="text-2xl font-bold text-gray-900">{total}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-[400px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No usage data available.
          </div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
