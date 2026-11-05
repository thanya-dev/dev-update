// Maps raw tracking rows in the "18082026 Product Monitoring" sheet to feature ids in features.ts.
// A row counts as one usage event unless the sheet already aggregates it (`count`).

export interface RawEventRow {
  date: string;
  event: string;
  pageName?: string;
  mode?: string;
  count?: number | string;
}

interface UsageSource {
  sheet: string;
  // Monthly sources only hold one row per month, so they can't be split into days or weeks
  monthly?: boolean;
  resolve: (row: RawEventRow) => string | null;
}

const SHEETY_BASE = 'https://api.sheety.co/2190eabca081d57822fbb85c130c4908/18082026ProductMonitoring';

// Buddy Rank actions are logged without pageName; attach them to the page they happen on
const BUDDY_RANK_PAGES: Record<string, string> = {
  connect_line: 'buddyrank.connect-line',
  category_selection: 'buddyrank.interest',
  connect_tiktok: 'buddyrank.connect-tiktok',
  analysis: 'buddyrank.analysis',
  profile_audience: 'buddyrank.audience',
  profile_benchmark: 'buddyrank.benchmark',
  content_generator: 'buddyrank.content-generator',
  content_save: 'buddyrank.content-save',
};

const BUDDY_RANK_EVENTS: Record<string, string> = {
  connect_line_success: 'buddyrank.connect-line',
  select_interest: 'buddyrank.interest',
  deselect_interest: 'buddyrank.interest',
  click_connect_tiktok: 'buddyrank.connect-tiktok',
  connect_tiktok_success: 'buddyrank.connect-tiktok',
  connect_tiktok_fail: 'buddyrank.connect-tiktok',
  click_upload_audience: 'buddyrank.audience',
  click_content_card: 'buddyrank.content-generator',
  click_view_more_posts: 'buddyrank.content-generator',
};

// "Influencer Raw" is GA4 page views per month, with PageName already set to a feature id
const INFLUENCER_FEATURES = [
  'influencer.settings', 'influencer.social', 'influencer.new-campaigns', 'influencer.campaign-join',
  'influencer.my-work', 'influencer.points', 'influencer.external', 'influencer.external-draft-old',
  'influencer.notification-link', 'influencer.line-notify', 'influencer.maintenance-terms',
];

const KOL_EVENTS: Record<string, string> = {
  view_influencer: 'kol.insight',
  add_to_shortlist: 'kol.shortlist',
};

export const USAGE_SOURCES: UsageSource[] = [
  {
    sheet: 'kolRaw',
    resolve: (r) => (r.pageName === 'discovery' ? KOL_EVENTS[r.event] || 'kol.discovery' : null),
  },
  {
    sheet: 'buddyReviewRaw',
    resolve: (r) => (r.pageName === 'draft' ? 'management.draft-review' : null),
  },
  {
    sheet: 'exportReportLogRaw',
    resolve: (r) => (r.event === 'exportReport' ? 'business.campaign-report' : null),
  },
  {
    sheet: 'influencerRaw',
    monthly: true,
    resolve: (r) => (r.pageName && INFLUENCER_FEATURES.includes(r.pageName) ? r.pageName : null),
  },
  {
    sheet: 'buddyRankRaw',
    resolve: (r) => (r.pageName ? BUDDY_RANK_PAGES[r.pageName] : BUDDY_RANK_EVENTS[r.event]) || null,
  },
];

export const sheetUrl = (sheet: string) => `${SHEETY_BASE}/${sheet}`;

// Feature ids that have tracking; anything else has no data source yet
export const TRACKED_FEATURE_IDS = new Set([
  'kol.discovery', ...Object.values(KOL_EVENTS),
  'management.draft-review',
  'business.campaign-report',
  ...Object.values(BUDDY_RANK_PAGES),
  ...INFLUENCER_FEATURES,
]);

export const rowCount = (row: RawEventRow) => {
  if (row.count === undefined || row.count === '') return 1;
  return Number(String(row.count).replace(/,/g, '')) || 0;
};
