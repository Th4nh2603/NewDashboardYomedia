/**
 * Display Masthead (Billboard) (iTVC) — banner create defaults.
 * creative-demos value: display-masthead
 * Template ID: 5206c4076aaf4167a290292f0b2a1c0d
 */

import { mergeBannerFormatUserFields } from "./_mergeUserFields.js";

export const BANNER_FORMAT_DISPLAY_MASTHEAD = {
  id: "display-masthead",
  adView: "display",
  adViewLabel: "Display",
  templateId: "5206c4076aaf4167a290292f0b2a1c0d",
  templateLabel: "Display Masthead (Billboard) (iTVC) (VN)",
};

/** Chỉ các field chat setup hỏi user — các field khác lấy từ BANNER_DISPLAY_MASTHEAD_BASE. */
export const BANNER_SETUP_USER_FIELDS = [
  "banner_name",
  "advertiser",
  "advertiserLabel",
  "landing_page",
  "source",
];

/**
 * Giá trị cố định (giữ nguyên khi setup). Field user để trống — ghi đè khi hỏi.
 */
export const BANNER_DISPLAY_MASTHEAD_BASE = {
  banner_name: "",
  advertiser: "",
  advertiserLabel: "",
  market: "vn",
  marketLabel: "Viet Nam",
  landing_page: "",
  ad_view: BANNER_FORMAT_DISPLAY_MASTHEAD.adView,
  ad_viewLabel: BANNER_FORMAT_DISPLAY_MASTHEAD.adViewLabel,
  adunit: "4f346ff67b6042c68d78c15a8bf1ebaa",
  adunitLabel: "Inpage 970x250 (Billboard)",
  type: "template",
  typeLabel: "Template",
  template: BANNER_FORMAT_DISPLAY_MASTHEAD.templateId,
  templateLabel: BANNER_FORMAT_DISPLAY_MASTHEAD.templateLabel,
  source: "",
  width: "970",
  height: "250",
  banner_settings: {
    source: "",
    width: "970",
    height: "250",
    duration: "30",
    close_button: 0,
    logo: 1,
  },
  use_tag: "",
  use_tagLabel: "None",
  code_tag: "",
  notes: "",
  active: 1,
};

/** Ví dụ đã điền đủ (test / tham chiếu). */
export const BANNER_CREATE_EXAMPLE_DISPLAY_MASTHEAD = {
  ...BANNER_DISPLAY_MASTHEAD_BASE,
  banner_name: "Thanh - Test Banner - DO NOT TOUCH",
  advertiser: "604e5ef5e6744a3ba12e30cf9e102e1f",
  advertiserLabel: "Advertiser A",
  landing_page: "https://www.w3schools.com",
  source: "2024/05/bbhh/all/html/970x250/index.html",
  banner_settings: {
    ...BANNER_DISPLAY_MASTHEAD_BASE.banner_settings,
    source: "2024/05/bbhh/all/html/970x250/index.html",
  },
};

/** @param {typeof BANNER_DISPLAY_MASTHEAD_BASE} base @param {Partial<typeof BANNER_CREATE_EXAMPLE_DISPLAY_MASTHEAD>} userFields */
export function mergeDisplayMastheadUserFields(base, userFields) {
  return mergeBannerFormatUserFields(base, userFields);
}
