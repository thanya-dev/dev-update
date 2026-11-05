import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  format, parseISO, isValid, endOfDay,
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, subYears,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { Info, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, EyeOff } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { WEBSITES } from '../features';
import type { Website } from '../features';
import { USAGE_SOURCES, TRACKED_FEATURE_IDS, sheetUrl, rowCount } from '../usageSources';
import type { RawEventRow } from '../usageSources';
import { FeatureHeatmapTable } from './FeatureHeatmapTable';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type RangeKey = '30d' | '90d' | '12m' | 'ytd';
type Period = 'Day' | 'Week' | 'Month';

const RANGES: Record<RangeKey, { label: string; period: Period; compare: string }> = {
  '30d': { label: '30 วัน', period: 'Day', compare: 'เทียบ 30 วันก่อนหน้า' },
  '90d': { label: '90 วัน', period: 'Week', compare: 'เทียบ 90 วันก่อนหน้า' },
  '12m': { label: '12 เดือน', period: 'Month', compare: 'เทียบ 12 เดือนก่อนหน้า' },
  ytd: { label: 'ปีนี้', period: 'Month', compare: 'เทียบช่วงเดียวกันปีที่แล้ว' },
};

const ALL_FEATURES = WEBSITES.flatMap((w) => w.groups.flatMap((g) => g.features.map((f) => ({ ...f, site: w }))));

// Sheet dates come as "25/03/2026", "21/5/26" or "16/10/2026 11:55:14"
const parseDate = (value: string): Date | null => {
  const [d, m, y] = value.split(' ')[0].split('/').map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y < 100 ? 2000 + y : y, m - 1, d);
  return isValid(date) ? date : null;
};

const periodStart = (d: Date, period: Period) =>
  period === 'Day' ? startOfDay(d) : period === 'Week' ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d);

const periodKey = (d: Date, period: Period) => format(periodStart(d, period), 'yyyy-MM-dd');

const periodLabel = (key: string, period: Period) => {
  const d = parseISO(key);
  if (period === 'Day') return format(d, 'd MMM', { locale: th });
  if (period === 'Week') return format(d, 'd MMM', { locale: th });
  return format(d, 'MMM yy', { locale: th });
};

const getWindow = (range: RangeKey, now: Date) => {
  const start =
    range === '30d' ? startOfDay(subDays(now, 29))
    : range === '90d' ? startOfWeek(subWeeks(now, 12), { weekStartsOn: 1 })
    : range === '12m' ? startOfMonth(subMonths(now, 11))
    : startOfYear(now);
  const prevStart = range === 'ytd' ? subYears(start, 1) : new Date(start.getTime() - (now.getTime() - start.getTime()));
  const prevEnd = range === 'ytd' ? subYears(now, 1) : start;
  return { start, prevStart, prevEnd };
};

const buildPeriods = (start: Date, now: Date, period: Period) => {
  const step = period === 'Day' ? addDays : period === 'Week' ? addWeeks : addMonths;
  const keys: string[] = [];
  for (let d = periodStart(start, period); d <= now; d = step(d, 1)) keys.push(format(d, 'yyyy-MM-dd'));
  return keys;
};

const pctChange = (current: number, previous: number) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString();

const Delta = ({ current, previous }: { current: number; previous: number }) => {
  const change = pctChange(current, previous);
  if (change === null) {
    return <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Minus className="w-3 h-3" />{current > 0 ? 'ไม่มีข้อมูลช่วงก่อน' : '–'}</span>;
  }
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${up ? 'text-emerald-700' : 'text-red-700'}`}>
      <Icon className="w-3.5 h-3.5" />
      {up ? '+' : ''}{change.toFixed(0)}%
    </span>
  );
};

const Card = ({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) => (
  <section className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col ${className}`}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const EmptyChart = () => (
  <div className="flex-1 min-h-[160px] flex items-center justify-center text-sm text-gray-400">ยังไม่มีข้อมูลในช่วงนี้</div>
);

export const FeatureUsageView = () => {
  const [parsedRows, setParsedRows] = useState<{ featureId: string; siteKey: string; date: Date; count: number; monthly: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('12m');
  const [siteKey, setSiteKey] = useState(WEBSITES[0].key);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    const siteOf: Record<string, string> = Object.fromEntries(ALL_FEATURES.map((f) => [f.id, f.site.key]));
    Promise.all(
      USAGE_SOURCES.map((source) =>
        fetch(sheetUrl(source.sheet))
          .then((res) => res.json())
          .then((json) => {
            // Resolve each raw event row to a feature id once
            const rows: RawEventRow[] = json[source.sheet] || [];
            return rows.flatMap((row) => {
              const featureId = source.resolve(row);
              const date = parseDate(String(row.date ?? ''));
              return featureId && date
                ? [{ featureId, siteKey: siteOf[featureId], date, count: rowCount(row), monthly: !!source.monthly }]
                : [];
            });
          })
          .catch((err) => {
            console.error(err);
            return [];
          })
      )
    ).then((results) => {
      setParsedRows(results.flat());
      setLoading(false);
    });
  }, []);

  // Windows end at the latest tracked day so a lagging sheet doesn't read as a drop
  const latestDate = useMemo(
    () => parsedRows.reduce<Date | null>((max, r) => (!max || r.date > max ? r.date : max), null),
    [parsedRows]
  );

  const { period } = RANGES[range];

  const stats = useMemo(() => {
    const now = endOfDay(latestDate || new Date());
    const { start, prevStart, prevEnd } = getWindow(range, now);
    const periods = buildPeriods(start, now, period);

    const usage: Record<string, Record<string, number>> = {}; // featureId -> period -> count
    const byFeature: Record<string, number> = {};
    const bySite: Record<string, number> = {};
    const prevBySite: Record<string, number> = {};
    const siteByPeriod: Record<string, Record<string, number>> = {};

    let skippedMonthly = false;
    parsedRows.forEach(({ featureId, siteKey, date, count, monthly }) => {
      if (monthly && period !== 'Month') {
        skippedMonthly = true;
        return;
      }
      if (date >= start && date <= now) {
        const key = periodKey(date, period);
        usage[featureId] = usage[featureId] || {};
        usage[featureId][key] = (usage[featureId][key] || 0) + count;
        byFeature[featureId] = (byFeature[featureId] || 0) + count;
        bySite[siteKey] = (bySite[siteKey] || 0) + count;
        siteByPeriod[siteKey] = siteByPeriod[siteKey] || {};
        siteByPeriod[siteKey][key] = (siteByPeriod[siteKey][key] || 0) + count;
      } else if (date >= prevStart && date < prevEnd) {
        prevBySite[siteKey] = (prevBySite[siteKey] || 0) + count;
      }
    });

    const total = Object.values(bySite).reduce((a, b) => a + b, 0);
    const prevTotal = Object.values(prevBySite).reduce((a, b) => a + b, 0);
    const activeFeatures = ALL_FEATURES.filter((f) => f.status === 'active');
    const trackedActive = activeFeatures.filter((f) => TRACKED_FEATURE_IDS.has(f.id));
    const usedActive = trackedActive.filter((f) => byFeature[f.id] > 0);
    const unusedActive = trackedActive.filter((f) => !byFeature[f.id]);
    const untracked = activeFeatures.filter((f) => !TRACKED_FEATURE_IDS.has(f.id));
    const topFeatures = ALL_FEATURES.filter((f) => byFeature[f.id] > 0)
      .sort((a, b) => byFeature[b.id] - byFeature[a.id])
      .slice(0, 10);
    const topSite = [...WEBSITES].sort((a, b) => (bySite[b.key] || 0) - (bySite[a.key] || 0))[0];

    return {
      periods, usage, byFeature, bySite, prevBySite, siteByPeriod,
      start, now, skippedMonthly, total, prevTotal, activeFeatures, trackedActive, usedActive, unusedActive, untracked, topFeatures, topSite,
    };
  }, [parsedRows, latestDate, range, period]);

  const hasData = stats.total > 0;
  const label = (key: string) => periodLabel(key, period);

  const trendData = {
    // Latest period is still in progress; mark it so a short bar isn't read as a drop
    labels: stats.periods.map((p, i) => (i === stats.periods.length - 1 ? `${label(p)}*` : label(p))),
    datasets: WEBSITES.map((w) => ({
      label: w.name,
      data: stats.periods.map((p) => stats.siteByPeriod[w.key]?.[p] || 0),
      backgroundColor: w.color,
      borderColor: '#ffffff',
      borderWidth: { top: 2 },
      borderRadius: 3,
      borderSkipped: false as const,
      maxBarThickness: 28,
    })),
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 8, boxHeight: 8, color: '#52514e', font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          footer: (items: { parsed: { y: number | null } }[]) =>
            `รวม ${items.reduce((sum, i) => sum + (i.parsed.y ?? 0), 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 } },
      y: { stacked: true, beginAtZero: true, border: { display: false }, grid: { color: '#f1f1ef' }, ticks: { color: '#6b7280', font: { size: 11 } } },
    },
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const site: Website = WEBSITES.find((w) => w.key === siteKey) || WEBSITES[0];
  const topMax = stats.topFeatures.length ? stats.byFeature[stats.topFeatures[0].id] : 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-16 lg:px-24 py-8 space-y-6">
        {/* Title + time range */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Feature Usage</h2>
            <p className="text-sm text-gray-500 mt-1">
              การใช้งาน feature ของทั้ง {WEBSITES.length} เว็บ · {format(stats.start, 'd MMM yyyy', { locale: th })} – {format(stats.now, 'd MMM yyyy', { locale: th })}
              {latestDate && <span className="text-gray-400"> (ข้อมูลล่าสุดใน sheet)</span>}
            </p>
          </div>
          <div className="flex bg-white border border-gray-200 p-1 rounded-lg self-start md:self-auto">
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${range === key ? 'bg-[#01082F] text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {RANGES[key].label}
              </button>
            ))}
          </div>
        </div>

        {parsedRows.length === 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>โหลดข้อมูลจาก sheet 18082026 Product Monitoring ไม่สำเร็จ ลองรีเฟรชอีกครั้ง</div>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <div>
            Influencer นับเป็น page view จาก GA4 ส่วนเว็บอื่นนับเป็น event จากระบบ tracking จึงเทียบตัวเลขข้ามเว็บได้แค่คร่าว ๆ
            {stats.skippedMonthly && <span className="font-semibold text-gray-700"> · Influencer มีข้อมูลรายเดือนเท่านั้น ดูได้ในมุมมอง 12 เดือน / ปีนี้</span>}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-medium text-gray-500">การใช้งานทั้งหมด</div>
            <div className="text-5xl font-semibold text-gray-900 mt-2 tabular-nums tracking-tight">{hasData ? compact(stats.total) : '–'}</div>
            <div className="mt-2 flex items-center gap-2">
              <Delta current={stats.total} previous={stats.prevTotal} />
              <span className="text-xs text-gray-400">{RANGES[range].compare}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-medium text-gray-500">Feature ที่มีคนใช้</div>
            <div className="mt-2 flex items-baseline gap-1 tabular-nums">
              <span className="text-4xl font-semibold text-gray-900">{stats.usedActive.length}</span>
              <span className="text-lg text-gray-400">/ {stats.trackedActive.length}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-[#01082F] rounded-full" style={{ width: `${stats.trackedActive.length ? (stats.usedActive.length / stats.trackedActive.length) * 100 : 0}%` }} />
            </div>
            <div className="text-xs text-gray-400 mt-2">จาก feature ที่มี tracking ({stats.trackedActive.length} จาก {stats.activeFeatures.length} feature ที่เปิดอยู่)</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-medium text-gray-500">เว็บที่ใช้มากที่สุด</div>
            {hasData ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stats.topSite.color }} />
                  <span className="text-2xl font-semibold text-gray-900">{stats.topSite.name}</span>
                </div>
                <div className="text-sm text-gray-500 mt-2 tabular-nums">
                  {((stats.bySite[stats.topSite.key] / stats.total) * 100).toFixed(0)}% ของการใช้งานทั้งหมด
                </div>
              </>
            ) : <div className="text-2xl font-semibold text-gray-300 mt-2">–</div>}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-medium text-gray-500">Feature ยอดนิยม</div>
            {stats.topFeatures[0] ? (
              <>
                <div className="text-lg font-semibold text-gray-900 mt-2 leading-snug line-clamp-2">{stats.topFeatures[0].name}</div>
                <div className="text-sm text-gray-500 mt-1 tabular-nums">
                  {stats.topFeatures[0].site.name} · {stats.byFeature[stats.topFeatures[0].id].toLocaleString()} {stats.topFeatures[0].site.key === 'influencer' ? 'page view' : 'event'}
                </div>
              </>
            ) : <div className="text-2xl font-semibold text-gray-300 mt-2">–</div>}
          </div>
        </div>

        {/* Trend + website breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card
            title="แนวโน้มการใช้งานแยกตามเว็บ"
            subtitle={`จำนวนการใช้งานต่อ${period === 'Day' ? 'วัน' : period === 'Week' ? 'สัปดาห์' : 'เดือน'} · * ช่วงล่าสุดยังไม่ครบ`}
            className="xl:col-span-2"
          >
            {hasData ? (
              <div className="h-[300px]"><Bar data={trendData} options={trendOptions} /></div>
            ) : <EmptyChart />}
          </Card>

          <Card title="สัดส่วนแยกตามเว็บ" subtitle={RANGES[range].compare}>
            <div className="space-y-4">
              {WEBSITES.map((w) => {
                const value = stats.bySite[w.key] || 0;
                const share = stats.total ? (value / stats.total) * 100 : 0;
                const features = w.groups.flatMap((g) => g.features).filter((f) => f.status === 'active');
                const tracked = features.filter((f) => TRACKED_FEATURE_IDS.has(f.id)).length;
                return (
                  <button key={w.key} onClick={() => setSiteKey(w.key)} className="block w-full text-left group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: w.color }} />
                        <span className="text-sm font-semibold text-gray-900 group-hover:underline">{w.name}</span>
                        <span className="text-xs text-gray-400 truncate">{tracked ? `tracking ${tracked}/${features.length} feature` : 'ยังไม่มี tracking'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{value ? value.toLocaleString() : '–'}</span>
                        <Delta current={value} previous={stats.prevBySite[w.key] || 0} />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: w.color }} />
                      </div>
                      <span className="w-9 text-right text-xs text-gray-500 tabular-nums">{share.toFixed(0)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Top features + attention */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card title="Top 10 Feature" subtitle="feature ที่ถูกใช้มากที่สุดจากทุกเว็บ" className="xl:col-span-2">
            {stats.topFeatures.length ? (
              <ol className="space-y-2.5">
                {stats.topFeatures.map((f, i) => {
                  const value = stats.byFeature[f.id];
                  return (
                    <li key={f.id} className="grid grid-cols-[20px_minmax(0,220px)_1fr_64px] items-center gap-3" title={`${f.name} (${f.site.name}): ${value.toLocaleString()}`}>
                      <span className="text-xs text-gray-400 tabular-nums">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">{f.name}</div>
                        <div className="text-[11px] text-gray-500">{f.site.name}</div>
                      </div>
                      <div className="h-3 rounded bg-gray-50">
                        <div className="h-full rounded" style={{ width: `${(value / topMax) * 100}%`, backgroundColor: f.site.color }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 text-right tabular-nums">{compact(value)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : <EmptyChart />}
          </Card>

          <Card title="จุดที่ควรติดตาม" subtitle="ใช้ตัดสินใจเรื่องปรับปรุง เก็บกวาด หรือเพิ่ม tracking">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  มี tracking แต่ไม่มีคนใช้ในช่วงนี้
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 tabular-nums">{stats.unusedActive.length}</span>
                </div>
                {stats.unusedActive.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {stats.unusedActive.slice(0, 5).map((f) => (
                      <li key={f.id} className="flex justify-between gap-2"><span className="truncate">{f.name}</span><span className="text-xs text-gray-400 flex-shrink-0">{f.site.name}</span></li>
                    ))}
                    {stats.unusedActive.length > 5 && <li className="text-xs text-gray-400">และอีก {stats.unusedActive.length - 5} feature</li>}
                  </ul>
                ) : <p className="mt-2 text-xs text-gray-400">ไม่มี — ทุก feature ที่มี tracking ถูกใช้งาน</p>}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <EyeOff className="w-4 h-4 text-gray-500" />
                  Feature ที่ยังไม่มี tracking
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 tabular-nums">{stats.untracked.length}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">ยังวัดการใช้งานไม่ได้ ตัวเลขด้านบนจึงยังไม่รวม feature เหล่านี้</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  {WEBSITES.map((w) => {
                    const count = stats.untracked.filter((f) => f.site.key === w.key).length;
                    return count ? (
                      <li key={w.key} className="flex justify-between gap-2">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: w.color }} />{w.name}</span>
                        <span className="text-xs text-gray-500 tabular-nums">{count} feature</span>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Drill-down */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">รายละเอียดราย Feature</h3>
              <p className="text-xs text-gray-500 mt-0.5">เลือกเว็บเพื่อดูการใช้งานของแต่ละ feature ในแต่ละช่วงเวลา</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {WEBSITES.map((w) => (
                  <button
                    key={w.key}
                    onClick={() => setSiteKey(w.key)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md transition-colors ${w.key === siteKey ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: w.color }} />
                    {w.name}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
                แสดงหน้าที่เลิกใช้ / Redirect
              </label>
            </div>
          </div>
          <FeatureHeatmapTable site={site} periods={stats.periods} periodLabel={label} usage={stats.usage} showInactive={showInactive} trackedIds={TRACKED_FEATURE_IDS} />
        </section>
      </div>
    </div>
  );
};
