// Feature catalog from "Buddy Review Web Map" (code trace 3 Nov 2026).
// Login pages are left out on purpose: they are not features to report usage on.

export type FeatureStatus = 'active' | 'redirect' | 'maybe' | 'deprecated';

export interface Feature {
  id: string;
  name: string;
  path: string;
  status: FeatureStatus;
}

export interface FeatureGroup {
  name: string;
  features: Feature[];
}

export interface Website {
  key: string;
  name: string;
  url: string;
  color: string;
  groups: FeatureGroup[];
}

export const STATUS_LABEL: Record<FeatureStatus, { label: string; className: string }> = {
  active: { label: 'ใช้งาน', className: 'bg-emerald-50 text-emerald-700' },
  redirect: { label: 'Redirect', className: 'bg-blue-50 text-blue-700' },
  maybe: { label: 'น่าจะเลิกใช้', className: 'bg-amber-50 text-amber-700' },
  deprecated: { label: 'เลิกใช้แล้ว', className: 'bg-red-50 text-red-700' },
};

export const WEBSITES: Website[] = [
  {
    key: 'business',
    name: 'Business',
    url: 'business.buddyreview.co/app',
    color: '#2a78d6',
    groups: [
      {
        name: 'แคมเปญ',
        features: [
          { id: 'business.campaign-list', name: 'รายการแคมเปญ', path: '/', status: 'active' },
          { id: 'business.campaign-report', name: 'Campaign Task และ Report', path: '/campaignReport/:id → /report/:project/:campaign', status: 'active' },
          { id: 'business.campaign-create-old', name: 'สร้าง/แก้แคมเปญแบบเก่า', path: '/create', status: 'deprecated' },
          { id: 'business.campaign-preview-old', name: 'ลิงก์ preview แคมเปญแบบเก่า', path: '/campaignpreview/:id', status: 'redirect' },
        ],
      },
      {
        name: 'Project',
        features: [
          { id: 'business.project-report', name: 'Project Report', path: '/report/:projectId', status: 'active' },
          { id: 'business.project-list-old', name: 'รายการ Project แบบเก่า', path: '/projects', status: 'deprecated' },
          { id: 'business.project-create-old', name: 'สร้าง Project แบบเก่า', path: '/createproject', status: 'deprecated' },
        ],
      },
      {
        name: 'ค้นหาและโปรไฟล์นักรีวิว',
        features: [
          { id: 'business.discover', name: 'Discover', path: '/discover', status: 'active' },
          { id: 'business.influencer-detail', name: 'รายละเอียด Influencer', path: '/influencer/:id', status: 'active' },
          { id: 'business.external-profile', name: 'External Profile', path: '/externalProfile/:id, /createExternalProfile', status: 'active' },
          { id: 'business.manual-social-account', name: 'เพิ่ม social account เอง', path: '/addManualSocialAccountForm', status: 'active' },
          { id: 'business.user-search', name: 'User Search', path: '/usersearch', status: 'active' },
        ],
      },
      {
        name: 'Brief',
        features: [
          { id: 'business.brief-list', name: 'Brief List (ตาราง brief ตามประเทศ)', path: '/brieflist', status: 'maybe' },
          { id: 'business.brief-detail', name: 'Brief Detail (ดู brief, ช่องติดต่อ, comment log)', path: '/brief/:id', status: 'maybe' },
          { id: 'business.brief-old', name: 'หน้า Brief แบบเก่า', path: '/brief', status: 'maybe' },
        ],
      },
      {
        name: 'สัญญา (ย้ายไป Management แล้ว)',
        features: [
          { id: 'business.contract-view', name: 'ดูสัญญา', path: '/externalContract/:id', status: 'redirect' },
          { id: 'business.contract-create-old', name: 'สร้างสัญญาแบบเก่า', path: '/createExternalContract/:id', status: 'deprecated' },
          { id: 'business.contract-quotation-old', name: 'ใช้สัญญาเดิมกับ quotation', path: '/campaignRegistration/…/useExternalContractWithQuotation/…', status: 'deprecated' },
        ],
      },
      {
        name: 'เครื่องมือทีม Sale และของเก่า',
        features: [
          { id: 'business.sale-menu', name: 'หน้าเมนูทีม Sale', path: '/sale/navigationpage', status: 'maybe' },
          { id: 'business.package-calculator-sale', name: 'Package Calculator (Sale) และหน้าตัวอย่าง', path: '/packagecalculatorsale/*', status: 'maybe' },
          { id: 'business.exclusive-programs', name: 'Exclusive Programs', path: '/exclusiveprograms', status: 'maybe' },
          { id: 'business.package-calculator-old', name: 'Package Calculator (เก่า) และหน้าตั้งค่า', path: '/packagecalculator, /packagecalculator/configsetting', status: 'deprecated' },
          { id: 'business.buddyport', name: 'BuddyPort', path: '/buddyport', status: 'deprecated' },
        ],
      },
    ],
  },
  {
    key: 'management',
    name: 'Management',
    url: 'manage.buddyreview.co',
    color: '#eb6834',
    groups: [
      {
        name: 'Project',
        features: [
          { id: 'management.project-list', name: 'รายการ Project', path: '/project', status: 'active' },
          { id: 'management.project-create', name: 'สร้าง / แก้ Project', path: '/project/create', status: 'active' },
          { id: 'management.expense-report', name: 'Expense Report และเปลี่ยน Quotation', path: '/project/:id?tab=expenseReport', status: 'active' },
        ],
      },
      {
        name: 'Campaign',
        features: [
          { id: 'management.campaign-create', name: 'สร้าง / แก้ / Duplicate Campaign (4 ขั้น)', path: '/campaign/create', status: 'active' },
          { id: 'management.draft-review', name: 'ตรวจ Draft', path: '/campaign/:id/campaignTask', status: 'active' },
          { id: 'management.draft-create', name: 'สร้าง Draft แทนนักรีวิว', path: '/campaign/:id/draft/create', status: 'active' },
          { id: 'management.contract-report', name: 'Contract Report และ External Payment', path: '/campaign/:id?tab=…', status: 'active' },
        ],
      },
      {
        name: 'สัญญา',
        features: [
          { id: 'management.contract-create', name: 'สร้างสัญญาปกติ / ด่วน / Offline / Add-on', path: '/contract/create/*', status: 'active' },
          { id: 'management.contract-view', name: 'ดูสัญญา อนุมัติ ยกเลิก เปลี่ยนรอบจ่าย', path: '/contract/:id, /contract/:id/urgent', status: 'active' },
          { id: 'management.addon-approve', name: 'อนุมัติ Add-on', path: '/externalPayment/:id/addOn', status: 'active' },
        ],
      },
      {
        name: 'การเงิน (Admin)',
        features: [
          { id: 'management.admin-contract', name: 'สัญญาแยกประเภท', path: '/admin/contract', status: 'active' },
          { id: 'management.prepare-payment', name: 'Prepare Payment', path: '/admin/payment', status: 'active' },
          { id: 'management.payout', name: 'Payout: export ไฟล์โอน, import KBANK, Manual Paid', path: '/admin/payout', status: 'active' },
          { id: 'management.other-payment', name: 'Other Payment', path: '/payment/other', status: 'active' },
        ],
      },
      {
        name: 'Manager',
        features: [
          { id: 'management.manager-contract', name: 'อนุมัติสัญญา', path: '/manager/contract', status: 'active' },
          { id: 'management.manager-payment', name: 'Manager Payment', path: '/manager/payment', status: 'deprecated' },
        ],
      },
      {
        name: 'นักรีวิวและแพ็กเกจ',
        features: [
          { id: 'management.external-profiles', name: 'External Profiles และ Import Vendor ID', path: '/externalProfile', status: 'active' },
          { id: 'management.otp-history', name: 'ประวัติ OTP', path: '/otp/history', status: 'active' },
          { id: 'management.influencer-packages', name: 'แพ็กเกจทั้งหมด / รายการจอง', path: '/influencer-packages/*', status: 'active' },
        ],
      },
      {
        name: 'รายงานและอื่น ๆ',
        features: [
          { id: 'management.export-report', name: 'Export Report', path: '/report', status: 'maybe' },
          { id: 'management.expense-report-multi', name: 'Expense Report หลายแคมเปญ', path: '/report/expense', status: 'maybe' },
          { id: 'management.maintenance', name: 'หน้าแจ้งปิดปรับปรุง', path: '/maintenance', status: 'maybe' },
          { id: 'management.home-redirect', name: 'หน้าแรก / /admin / /manager', path: '/, /admin, /manager', status: 'redirect' },
        ],
      },
    ],
  },
  {
    key: 'influencer',
    name: 'Influencer',
    url: 'www.buddyreview.co',
    color: '#1baf7a',
    groups: [
      {
        name: 'โปรไฟล์และตั้งค่า',
        features: [
          { id: 'influencer.settings', name: 'กรอกโปรไฟล์ / ตั้งค่า / เชื่อม LINE OA', path: '/settings/*, /app/profile, /line/connect', status: 'active' },
        ],
      },
      {
        name: 'ช่องทาง Social และ Portfolio',
        features: [
          { id: 'influencer.social', name: 'เพิ่มช่องทาง social / portfolio', path: '/social/*', status: 'active' },
        ],
      },
      {
        name: 'หางานและสมัคร',
        features: [
          { id: 'influencer.new-campaigns', name: 'แคมเปญใหม่', path: '/app/new-campaigns', status: 'active' },
          { id: 'influencer.campaign-join', name: 'รายละเอียดและสมัครแคมเปญ', path: '/campaign/:id, /campaign/:id/join', status: 'active' },
        ],
      },
      {
        name: 'งานของฉัน',
        features: [
          { id: 'influencer.my-work', name: 'ส่ง Draft / ส่งโพสต์ / ดูผลตรวจ', path: '/campaign/:id/:registrationId, /queue/:id', status: 'active' },
        ],
      },
      {
        name: 'แต้มและแลกเงิน',
        features: [
          { id: 'influencer.points', name: 'แต้ม / แลกเงิน / ประวัติ', path: '/points, /reward, /reward/history', status: 'active' },
        ],
      },
      {
        name: 'External Contract',
        features: [
          { id: 'influencer.external', name: 'ยืนยันสัญญา / โปรไฟล์ / การจ่ายเงิน / Draft', path: '/external/*', status: 'active' },
          { id: 'influencer.external-draft-old', name: 'Draft แบบเก่า (ไม่มี registrationId)', path: '/external/profile/draft/:campaignId', status: 'maybe' },
          { id: 'influencer.external-video-comment', name: 'Video comment ฝั่ง External', path: '/external/profile/draft/…/videoComment', status: 'maybe' },
        ],
      },
      {
        name: 'หน้าเสริม',
        features: [
          { id: 'influencer.notification-link', name: 'ลิงก์แจ้งเตือน LINE / SMS / Email', path: '/l, /s, /e → /channel/…', status: 'active' },
          { id: 'influencer.line-notify', name: 'LINE Notify', path: '/app/line-notify/*', status: 'deprecated' },
          { id: 'influencer.compress-video', name: 'หน้าทดสอบบีบอัดวิดีโอ', path: '/compress-video', status: 'deprecated' },
          { id: 'influencer.api-hello', name: 'API ตัวอย่าง', path: '/api/hello', status: 'deprecated' },
          { id: 'influencer.maintenance-terms', name: 'ปิดปรับปรุง / Terms', path: '/maintenance, /terms', status: 'maybe' },
        ],
      },
    ],
  },
  {
    key: 'kol',
    name: 'KOL',
    url: 'KOL Warehouse (Vercel)',
    color: '#eda100',
    groups: [
      {
        name: 'ระบบ',
        features: [
          { id: 'kol.home', name: 'หน้าแรก', path: '/', status: 'redirect' },
        ],
      },
      {
        name: 'Overview',
        features: [
          { id: 'kol.overview', name: 'Dashboard (Metabase)', path: '/overview', status: 'active' },
        ],
      },
      {
        name: 'Discovery',
        features: [
          { id: 'kol.discovery', name: 'ค้นหานักรีวิว', path: '/kol', status: 'active' },
          { id: 'kol.insight', name: 'Insight รายคน', path: '/kol/insight/:profileId', status: 'active' },
          { id: 'kol.discovery-old', name: 'Discovery เวอร์ชันเก่า', path: '/kol-old, /kol-old/insight/:id', status: 'deprecated' },
        ],
      },
      {
        name: 'Explore',
        features: [
          { id: 'kol.explore', name: 'ค้นจาก TikTok', path: '/explore', status: 'active' },
        ],
      },
      {
        name: 'Brief / Example List',
        features: [
          { id: 'kol.brief-management', name: 'Brief Management', path: '/exampleList', status: 'active' },
          { id: 'kol.brief-detail', name: 'รายละเอียด Brief (4 ขั้น)', path: '/exampleList/brief/detail/:briefId', status: 'active' },
          { id: 'kol.example-list-old', name: 'Example List แบบเดิม', path: '/exampleList/:id', status: 'active' },
        ],
      },
      {
        name: 'Shortlist',
        features: [
          { id: 'kol.shortlist', name: 'รายการ / รายละเอียด Shortlist', path: '/shortlist, /shortlist/:id', status: 'active' },
        ],
      },
      {
        name: 'Audience Overlap',
        features: [
          { id: 'kol.audience', name: 'วิเคราะห์ผู้ติดตามซ้ำ', path: '/audience', status: 'active' },
        ],
      },
    ],
  },
  // Not in the Web Map; features follow the pageName values tracked in "BuddyRank Raw"
  {
    key: 'buddyrank',
    name: 'Buddy Rank',
    url: 'Buddy Rank (LINE)',
    color: '#e87ba4',
    groups: [
      {
        name: 'เริ่มใช้งาน',
        features: [
          { id: 'buddyrank.connect-line', name: 'เชื่อม LINE', path: 'connect_line', status: 'active' },
          { id: 'buddyrank.interest', name: 'เลือกหมวดหมู่ความสนใจ', path: 'category_selection', status: 'active' },
          { id: 'buddyrank.connect-tiktok', name: 'เชื่อม TikTok', path: 'connect_tiktok', status: 'active' },
        ],
      },
      {
        name: 'วิเคราะห์โปรไฟล์',
        features: [
          { id: 'buddyrank.analysis', name: 'ผลวิเคราะห์ / Rank', path: 'analysis', status: 'active' },
          { id: 'buddyrank.audience', name: 'Audience ของโปรไฟล์ / อัปโหลด Audience', path: 'profile_audience', status: 'active' },
          { id: 'buddyrank.benchmark', name: 'Benchmark เทียบกับคนอื่น', path: 'profile_benchmark', status: 'active' },
        ],
      },
      {
        name: 'Content Idea Co-pilot',
        features: [
          { id: 'buddyrank.content-generator', name: 'ไอเดียคอนเทนต์', path: 'content_generator', status: 'active' },
          { id: 'buddyrank.content-save', name: 'คอนเทนต์ที่บันทึกไว้', path: 'content_save', status: 'active' },
        ],
      },
    ],
  },
];
