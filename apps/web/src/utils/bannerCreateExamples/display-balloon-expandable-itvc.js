/**
 * Display Balloon Expandable (iTVC) (VN) — banner create defaults.
 * creative-demos value: display-balloon-expandable-itvc
 * Template ID: bd068606cdd04d78a0d3a1ac666cc501
 */

import { mergeBannerFormatUserFields } from "./_mergeUserFields.js";
import { BALLOON_EXPANDABLE_ITVC_SETTINGS_DEFAULTS } from "./bannerSourceSize.js";

export const BANNER_FORMAT_BALLOON_ITVC = {
  id: "display-balloon-expandable-itvc",
  adView: "display",
  adViewLabel: "Display",
  templateId: "bd068606cdd04d78a0d3a1ac666cc501",
  templateLabel: "Display Balloon Expandable (iTVC) (VN)",
};

export { BALLOON_EXPANDABLE_ITVC_SETTINGS_DEFAULTS as BANNER_BALLOON_ITVC_DEFAULT_DIMENSIONS };

/** Field chat setup hỏi user — còn lại lấy từ BANNER_BALLOON_ITVC_BASE. */
export const BANNER_SETUP_USER_FIELDS = [
  "banner_name",
  "advertiser",
  "advertiserLabel",
  "landing_page",
  "source",
];

/**
 * Giá trị cố định cho format Balloon Expandable iTVC.
 * `width` / `height` form: theo Ad Unit Balloon (1×1); kích thước thật nằm trong banner_settings.
 */
export const BANNER_BALLOON_ITVC_BASE = {
  banner_name: "",
  advertiser: "",
  advertiserLabel: "",
  market: "vn",
  marketLabel: "Viet Nam",
  landing_page: "",
  ad_view: BANNER_FORMAT_BALLOON_ITVC.adView,
  ad_viewLabel: BANNER_FORMAT_BALLOON_ITVC.adViewLabel,
  adunit: "aa2361742a3b4285998c958ecfe80968",
  adunitLabel: "Balloon",
  type: "template",
  typeLabel: "Template",
  template: BANNER_FORMAT_BALLOON_ITVC.templateId,
  templateLabel: BANNER_FORMAT_BALLOON_ITVC.templateLabel,
  source: "",
  width: "1",
  height: "1",
  banner_settings: {
    source: "",
    ...BALLOON_EXPANDABLE_ITVC_SETTINGS_DEFAULTS,
  },
  use_tag: "",
  use_tagLabel: "None",
  code_tag: "",
  notes: "",
  active: 1,
};

/** Ví dụ từ platform (Wipro / Enchanteur / Balloon Expandable iTVC). */
export const BANNER_CREATE_EXAMPLE_BALLOON_ITVC = {
  ...BANNER_BALLOON_ITVC_BASE,
  banner_name:
    "Wipro ENC Crosscate Q1 2026 - Naturelle (Shower & Scrub) - F18+ - Balloon Expandable iTVC 20s",
  advertiser: "cdc813a4f4ec4a06beacefb5974bc792",
  advertiserLabel: "Enchanteur",
  landing_page:
    "https://shopee.vn/universal-link/collections/5338038?deep_and_web=1&utm_campaign=s140594869_ss_vn_adnw_naturelle&utm_source=adnetwork&utm_medium=sellc",
  source: "2026/04/enchanteur/crosscate/475x325/index.html",
  banner_settings: {
    ...BANNER_BALLOON_ITVC_BASE.banner_settings,
    source: "2026/04/enchanteur/crosscate/475x325/index.html",
  },
};

export function mergeBalloonItvcUserFields(base, userFields) {
  return mergeBannerFormatUserFields(base, userFields);
}
