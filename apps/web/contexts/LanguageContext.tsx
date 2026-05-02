
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppLocale = "en" | "vi";

const STORAGE_KEY = "nova-locale";

/** Replace `{foo}` placeholders in translated strings */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : "",
  );
}

const LAYOUT_MESSAGES: Record<
  AppLocale,
  {
    searchPlaceholder: string;
    languageMenu: string;
    expandSidebar: string;
    collapseSidebar: string;
    themeAriaUseLight: string;
    themeAriaUseDark: string;
  }
> = {
  en: {
    searchPlaceholder: "Search anything...",
    languageMenu: "Language",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    themeAriaUseLight: "Switch to light theme",
    themeAriaUseDark: "Switch to dark theme",
  },
  vi: {
    searchPlaceholder: "Tìm kiếm...",
    languageMenu: "Ngôn ngữ",
    expandSidebar: "Mở rộng menu",
    collapseSidebar: "Thu gọn menu",
    themeAriaUseLight: "Chuyển sang giao diện sáng",
    themeAriaUseDark: "Chuyển sang giao diện tối",
  },
};

const NAV_MESSAGES: Record<
  AppLocale,
  {
    sectionAiIntelligence: string;
    sectionTools: string;
    sectionDataManagement: string;
    sectionAdministration: string;
    navDashboard: string;
    navAiChat: string;
    navBuildDemo: string;
    navCreativeShowcase: string;
    navManageDemo: string;
    navUpload: string;
    navTestData: string;
    navDocumentation: string;
    navUserPermissions: string;
    navManageSftp: string;
    navSmtpMail: string;
    systemOnline: string;
  }
> = {
  en: {
    sectionAiIntelligence: "AI Intelligence",
    sectionTools: "Tools",
    sectionDataManagement: "Data Management",
    sectionAdministration: "Administration",
    navDashboard: "Dashboard",
    navAiChat: "AI Chat",
    navBuildDemo: "Build Demo",
    navCreativeShowcase: "Creative Showcase",
    navManageDemo: "Manage Demo",
    navUpload: "Upload",
    navTestData: "Test data",
    navDocumentation: "Documentation",
    navUserPermissions: "User & Permissions",
    navManageSftp: "SFTP",
    navSmtpMail: "SMTP",
    systemOnline: "System Online",
  },
  vi: {
    sectionAiIntelligence: "Trí tuệ AI",
    sectionTools: "Công cụ",
    sectionDataManagement: "Quản lý dữ liệu",
    sectionAdministration: "Quản trị",
    navDashboard: "Tổng quan",
    navAiChat: "AI Chat",
    navBuildDemo: "Build Demo",
    navCreativeShowcase: "Creative Showcase",
    navManageDemo: "Quản lý Demo",
    navUpload: "Tải lên",
    navTestData: "Dữ liệu test",
    navDocumentation: "Tài liệu",
    navUserPermissions: "Người dùng & quyền",
    navManageSftp: "SFTP",
    navSmtpMail: "SMTP",
    systemOnline: "Hệ thống hoạt động",
  },
};

const DASHBOARD_MESSAGES: Record<
  AppLocale,
  {
    workspaceBadge: string;
    heroTitleLead: string;
    heroTitleAccent: string;
    heroSubtitle: string;
    ctaChat: string;
    statCampaignsLabel: string;
    statCampaignsHint: string;
    statAssetsLabel: string;
    statAssetsHint: string;
    statBriefLabel: string;
    statBriefHint: string;
    statModelLabel: string;
    statModelHint: string;
    statModelValue: string;
    quickTitle: string;
    quickSubtitle: string;
    quickOpenTool: string;
    quickAiChatName: string;
    quickAiChatDesc: string;
    quickImageName: string;
    quickImageDesc: string;
    quickVisionName: string;
    quickVisionDesc: string;
    quickBuildDemoName: string;
    quickBuildDemoDesc: string;
    quickShowcaseName: string;
    quickShowcaseDesc: string;
    quickDocsName: string;
    quickDocsDesc: string;
    sftpTitle: string;
    sftpSubtitle: string;
    sftpRefresh: string;
    sftpSearchPlaceholder: string;
    sftpParent: string;
    sftpGoPath: string;
    sftpNoMatch: string;
    sftpLoadingList: string;
    sftpEmpty: string;
    fileLabel: string;
    errSftpList: string;
    errFolderSearch: string;
  }
> = {
  en: {
    workspaceBadge: "Demo workspace",
    heroTitleLead: "Command center for ",
    heroTitleAccent: "creative AI",
    heroSubtitle:
      "A focused, rhythmic hub: jump to tools, skim activity, and browse demo SFTP — clear in light or dark mode.",
    ctaChat: "Start with AI Chat",
    statCampaignsLabel: "Active campaigns",
    statCampaignsHint: "+3 this week",
    statAssetsLabel: "AI assets (month)",
    statAssetsHint: "image · video · copy",
    statBriefLabel: "Brief SLA hit rate",
    statBriefHint: "internal SLA",
    statModelLabel: "Model stack",
    statModelHint: "multi-pipeline",
    statModelValue: "Gemini · Veo",
    quickTitle: "Creative shortcuts",
    quickSubtitle: "Common flows — hover to lift the card.",
    quickOpenTool: "Open tool",
    quickAiChatName: "AI Chat",
    quickAiChatDesc: "Q&A and content strategy",
    quickImageName: "Image generation",
    quickImageDesc: "Brief to imagery in seconds",
    quickVisionName: "Vision AI",
    quickVisionDesc: "Visual analysis & moodboards",
    quickBuildDemoName: "Build Demo",
    quickBuildDemoDesc: "Structured creative demos",
    quickShowcaseName: "Creative Showcase",
    quickShowcaseDesc: "Library & internal showcase",
    quickDocsName: "Documentation",
    quickDocsDesc: "Guides, flows, checklists",
    sftpTitle: "Demo SFTP browser",
    sftpSubtitle: "Browse script/demo folders in the workspace.",
    sftpRefresh: "Refresh",
    sftpSearchPlaceholder:
      "Filter by name or recursive search (2+ characters)...",
    sftpParent: "Up one level",
    sftpGoPath: "Go to path",
    sftpNoMatch: 'No folders match "{query}".',
    sftpLoadingList: "Loading listing…",
    sftpEmpty: "Folder is empty or nothing matches the filter.",
    fileLabel: "file",
    errSftpList: "SFTP list failed",
    errFolderSearch: "Folder search failed",
  },
  vi: {
    workspaceBadge: "Không gian demo",
    heroTitleLead: "Bộ điều khiển ",
    heroTitleAccent: "creative AI",
    heroSubtitle:
      "Một không gian gọn và đầy nhịp: truy cập công cụ, theo dõi hoạt động và duyệt file demo SFTP — sáng, tối đều dễ đọc.",
    ctaChat: "Bắt đầu với AI Chat",
    statCampaignsLabel: "Campaign đang chạy",
    statCampaignsHint: "+3 tuần này",
    statAssetsLabel: "Assets AI (tháng)",
    statAssetsHint: "ảnh · video · copy",
    statBriefLabel: "Hiệu suất brief",
    statBriefHint: "đúng SLA nội bộ",
    statModelLabel: "Model stack",
    statModelHint: "đa pipeline",
    statModelValue: "Gemini · Veo",
    quickTitle: "Lối tắt creative",
    quickSubtitle: "Các luồng hay dùng — hover để “nổi” card.",
    quickOpenTool: "Mở công cụ",
    quickAiChatName: "AI Chat",
    quickAiChatDesc: "Hỏi đáp & chiến lược nội dung",
    quickImageName: "Tạo ảnh",
    quickImageDesc: "Brief → hình ảnh trong vài giây",
    quickVisionName: "Vision AI",
    quickVisionDesc: "Phân tích visual & moodboard",
    quickBuildDemoName: "Build Demo",
    quickBuildDemoDesc: "Dựng demo sáng tạo có cấu trúc",
    quickShowcaseName: "Creative Showcase",
    quickShowcaseDesc: "Thư viện & showcase nội bộ",
    quickDocsName: "Tài liệu",
    quickDocsDesc: "HDSD, flow và checklist",
    sftpTitle: "Trình duyệt SFTP demo",
    sftpSubtitle: "Duyệt thư mục script/demo trực tiếp trong workspace.",
    sftpRefresh: "Làm mới",
    sftpSearchPlaceholder:
      "Lọc tên trong thư mục hoặc tìm đệ quy (≥2 ký tự)...",
    sftpParent: "Lên cấp",
    sftpGoPath: "Đi tới path",
    sftpNoMatch: "Không có thư mục khớp “{query}”.",
    sftpLoadingList: "Đang tải danh sách…",
    sftpEmpty: "Thư mục trống hoặc không có mục khớp bộ lọc.",
    fileLabel: "file",
    errSftpList: "Không đọc được danh sách SFTP",
    errFolderSearch: "Tìm thư mục thất bại",
  },
};

const HISTORY_MESSAGES: Record<
  AppLocale,
  {
    badge: string;
    title: string;
    description: string;
    highlightVault: string;
    highlightWeek: string;
    highlightProcessing: string;
    tableType: string;
    tableCampaign: string;
    tableModel: string;
    tableDate: string;
    tableStatus: string;
    recentTitle: string;
    searchPlaceholder: string;
    filter: string;
    pagination: string;
    prev: string;
    next: string;
    typeStrategy: string;
    typeGraphics: string;
    typeVideoAd: string;
    typeCopywriting: string;
    statusFinalized: string;
    statusRendered: string;
    statusProcessing: string;
    statusFailed: string;
  }
> = {
  en: {
    badge: "Campaign archive",
    title: "History & assets",
    description:
      "Review every asset you generated — re-download creatives or copy strategies for the next flight.",
    highlightVault: "In vault",
    highlightWeek: "Done in 7d",
    highlightProcessing: "In progress",
    tableType: "Type",
    tableCampaign: "Campaign item",
    tableModel: "AI model",
    tableDate: "Date created",
    tableStatus: "Status",
    recentTitle: "Recent campaign assets",
    searchPlaceholder: "Search assets...",
    filter: "Filter",
    pagination: "Showing {shown} of {total} campaign items",
    prev: "Prev",
    next: "Next",
    typeStrategy: "Strategy",
    typeGraphics: "Graphics",
    typeVideoAd: "Video ad",
    typeCopywriting: "Copywriting",
    statusFinalized: "Finalized",
    statusRendered: "Rendered",
    statusProcessing: "Processing",
    statusFailed: "Failed",
  },
  vi: {
    badge: "Lưu trữ chiến dịch",
    title: "Lịch sử và tài sản",
    description:
      "Xem lại mọi nội dung marketing đã tạo — tải lại visual, hoặc copy chiến lược cho chiến dịch kế tiếp.",
    highlightVault: "Trong kho",
    highlightWeek: "Hoàn thành 7 ngày",
    highlightProcessing: "Đang xử lý",
    tableType: "Loại",
    tableCampaign: "Hạng mục",
    tableModel: "Model AI",
    tableDate: "Ngày tạo",
    tableStatus: "Trạng thái",
    recentTitle: "Tài sản chiến dịch gần đây",
    searchPlaceholder: "Tìm tài sản...",
    filter: "Lọc",
    pagination: "Hiển thị {shown} / {total} mục",
    prev: "Trước",
    next: "Sau",
    typeStrategy: "Chiến lược",
    typeGraphics: "Đồ họa",
    typeVideoAd: "Quảng cáo video",
    typeCopywriting: "Copywriting",
    statusFinalized: "Hoàn tất",
    statusRendered: "Đã render",
    statusProcessing: "Đang xử lý",
    statusFailed: "Thất bại",
  },
};

export type LayoutMessageKey = keyof (typeof LAYOUT_MESSAGES)["en"];
export type NavMessageKey = keyof (typeof NAV_MESSAGES)["en"];
export type DashboardMessageKey = keyof (typeof DASHBOARD_MESSAGES)["en"];
export type HistoryMessageKey = keyof (typeof HISTORY_MESSAGES)["en"];

interface LanguageContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  tLayout: (key: LayoutMessageKey) => string;
  tNav: (key: NavMessageKey) => string;
  tDashboard: (key: DashboardMessageKey) => string;
  tHistory: (key: HistoryMessageKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "vi" || saved === "en") return saved;
    const nav = navigator.language?.toLowerCase() ?? "";
    return nav.startsWith("vi") ? "vi" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = locale === "vi" ? "vi" : "en";
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => setLocaleState(next), []);

  const tLayout = useCallback(
    (key: LayoutMessageKey) => LAYOUT_MESSAGES[locale][key],
    [locale],
  );

  const tNav = useCallback(
    (key: NavMessageKey) => NAV_MESSAGES[locale][key],
    [locale],
  );

  const tDashboard = useCallback(
    (key: DashboardMessageKey) => DASHBOARD_MESSAGES[locale][key],
    [locale],
  );

  const tHistory = useCallback(
    (key: HistoryMessageKey) => HISTORY_MESSAGES[locale][key],
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      tLayout,
      tNav,
      tDashboard,
      tHistory,
    }),
    [locale, setLocale, tLayout, tNav, tDashboard, tHistory],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
