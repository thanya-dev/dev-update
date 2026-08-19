import React, { useState, useEffect, useMemo } from 'react';
import { SignJWT } from 'jose';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type AggregationLevel = 'Day' | 'Month' | 'Year';

interface UsageChartProps {
  releaseName?: string;
  releaseDate?: string;
}

export const UsageChart: React.FC<UsageChartProps> = ({ releaseName, releaseDate }) => {
  if (releaseName === 'Convert Manual post / Manual account') {
    return <MetabaseEmbed dashboardId={331} />;
  }
  if (releaseName === 'Schedule update post data') {
    return <MetabaseEmbed dashboardId={562} />;
  }

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggregation, setAggregation] = useState<AggregationLevel>('Month');

  useEffect(() => {
    let url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/projectReport';
    let dataKey = 'projectReport';

    if (releaseName === 'Search by Brief') {
      url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/searchByBrief';
      dataKey = 'searchByBrief';
    } else if (['Centralize Draft Submission', 'Draft improvement', 'Draft Improvement #2'].includes(releaseName || '')) {
      url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/draftSubmitted';
      dataKey = 'draftSubmitted';
    } else if (releaseName === 'Buddy Rank Content Idea Co-pilot') {
      url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/contentIdeaCoPilot';
      dataKey = 'contentIdeaCoPilot';
    } else if (releaseName === 'Buddy Ranks') {
      url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/buddyRankAudience';
      dataKey = 'buddyRankAudience';
    } else if (releaseName === 'Expense Report Bug, Evidence for Lotus Report') {
      url = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring/campaignReport';
      dataKey = 'campaignReport';
    }

    setLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        const dataArray = json[dataKey] || json[dataKey + 's'] || json[dataKey.replace(/s$/, '')];
        if (dataArray) {
          setData(dataArray);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [releaseName]);

  const { chartData, modeTotals, targetLabel } = useMemo(() => {
    // 1. Group data by aggregation level and mode/email
    const grouped: Record<string, Record<string, number>> = {};
    const modeTotalsRecord: Record<string, number> = {};
    const modes = new Set<string>();

    const isSearchByBrief = releaseName === 'Search by Brief';
    const isDraftSubmitted = ['Centralize Draft Submission', 'Draft improvement', 'Draft Improvement #2'].includes(releaseName || '');
    const isEventBased = releaseName === 'Buddy Rank Content Idea Co-pilot' || releaseName === 'Buddy Ranks';
    const isCampaignReport = releaseName === 'Expense Report Bug, Evidence for Lotus Report';

    let computedTargetLabel: string | null = null;
    if (releaseDate) {
      const rd = new Date(releaseDate);
      if (!isNaN(rd.getTime())) {
        if (aggregation === 'Day') {
          if (isDraftSubmitted) {
            computedTargetLabel = `${rd.getMonth() + 1}/${rd.getDate()}/${rd.getFullYear()}`;
          } else {
            const dd = String(rd.getDate()).padStart(2, '0');
            const mm = String(rd.getMonth() + 1).padStart(2, '0');
            computedTargetLabel = `${dd}/${mm}/${rd.getFullYear()}`;
          }
        } else if (aggregation === 'Month') {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          computedTargetLabel = `${monthNames[rd.getMonth()]} ${rd.getFullYear()}`;
        } else if (aggregation === 'Year') {
          computedTargetLabel = `${rd.getFullYear()}`;
        }
      }
    }

    if (computedTargetLabel && !grouped[computedTargetLabel]) {
      grouped[computedTargetLabel] = {};
    }

    data.forEach((item) => {
      // Date parsing based on format
      if (!item.date) return;
      
      let monthStr = '1', yearStr = '2026';
      
      if (item.date.includes('T') || item.date.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          monthStr = String(d.getMonth() + 1);
          yearStr = String(d.getFullYear());
        }
      } else {
        const parts = item.date.split(/[\/\-]/);
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            yearStr = parts[0];
            monthStr = parts[1];
          } else if (isDraftSubmitted) {
            // M/D/YYYY
            monthStr = parts[0];
            yearStr = parts[2].substring(0, 4);
          } else {
            // DD/MM/YYYY
            monthStr = parts[1];
            yearStr = parts[2].substring(0, 4);
          }
        }
      }

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

      let mode = 'unknown';
      let count = 0;

      if (isEventBased) {
        mode = item.event || 'unknown';
        count = item.countaOfEvent || 0;
      } else if (isCampaignReport) {
        mode = item.mode || 'unknown';
        count = item.countaOfEmail || 0;
      } else if (isSearchByBrief || isDraftSubmitted) {
        mode = item.email || 'unknown';
        count = item.countaOfEmail || 0;
      } else {
        mode = item.mode || 'unknown';
        count = item.countaOfProject || 0;
      }

      modes.add(mode);

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
      targetLabel: computedTargetLabel
    };
  }, [data, aggregation, releaseName, releaseDate]);

  const plugins = useMemo(() => {
    return [{
      id: 'releaseLine',
      afterDraw: (chart: any) => {
        if (!targetLabel) return;
        const xIndex = chart.data.labels.indexOf(targetLabel);
        if (xIndex === -1) return;

        const xAxis = chart.scales.x;
        const yAxis = chart.scales.y;
        
        const xPixel = xAxis.getPixelForTick(xIndex);

        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Release', xPixel, yAxis.top + 12);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(xPixel, yAxis.top + 20);
        ctx.lineTo(xPixel, yAxis.bottom);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#9ca3af'; // gray-400
        ctx.stroke();
        ctx.restore();
      }
    }];
  }, [targetLabel]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 0
      }
    },
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
        grace: '15%'
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
          <Bar data={chartData} options={options} plugins={plugins} />
        )}
      </div>
    </div>
  );
};

const MetabaseEmbed = ({ dashboardId }: { dashboardId: number }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const generateToken = async () => {
      try {
        const METABASE_SECRET_KEY = "06b25c18f312367f7ec027542d06aacf3a7f2d588ad44944679011b2b24a8f83";
        const secret = new TextEncoder().encode(METABASE_SECRET_KEY);
        const jwt = await new SignJWT({ resource: { dashboard: dashboardId }, params: {} })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('10m') // 10 minute expiration
          .sign(secret);
        setToken(jwt);
      } catch (err) {
        console.error('Failed to generate Metabase token', err);
      }
    };
    generateToken();
  }, []);

  if (!token) {
    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 shadow-sm p-6 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Usage Report (Metabase)</h3>
      </div>
      <div className="flex-1 w-full rounded-xl overflow-hidden min-h-[500px]">
        <metabase-dashboard
          token={token}
          with-title="true"
          with-downloads="true"
        ></metabase-dashboard>
      </div>
    </div>
  );
};
