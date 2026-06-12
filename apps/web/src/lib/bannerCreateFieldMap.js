/**
 * Map Create Banner UI → platform.yomedia.vn form fields (POST /banner/store).
 *
 * @see apps/server/tmp-banner-create.html (frmCreateBanner)
 * @see getBannerAdUnit / getBannerFormat in platform shell JS
 */

export const BANNER_CREATE_STORE_PATH = "/banner/store";

/** Main form fields (always on /banner/create). */
export const BANNER_CREATE_FIELD_MAP = {
  banner_name: {
    label: "Banner name",
    platformName: "banner_name",
    elementId: "txtBannerName",
    formGroupId: "banner_name",
    inputType: "text",
    inFormData: true,
    maxlength: 100,
  },
  advertiser: {
    label: "Advertiser",
    platformName: "advertiser",
    elementId: "optAccounts",
    formGroupId: "advertiser",
    inputType: "select",
    inFormData: true,
  },
  market: {
    label: "Market",
    platformName: "market",
    elementId: "optMarkets",
    formGroupId: "market",
    inputType: "select",
    inFormData: true,
    defaultValue: "vn",
  },
  landing_page: {
    label: "Landing page",
    platformName: "landing_page",
    elementId: "txtLandingPage",
    formGroupId: "landing_page",
    inputType: "text",
    inFormData: true,
  },
  ad_view: {
    label: "Ad View",
    platformName: "ad_view",
    elementId: "optAdViews",
    formGroupId: "ad_view",
    inputType: "select",
    inFormData: true,
    /** Reload dependents: Ad Unit + Template */
    reloads: ["adunit", "template"],
    listAdUnitsPath: (adView) => `/banner/listAdUnits/${encodeURIComponent(adView)}`,
    listFormatsPath: (market, adView) =>
      `/banner/listFormats/${encodeURIComponent(market)}?env=${encodeURIComponent(adView)}`,
  },
  adunit: {
    label: "Ad Unit",
    platformName: "adunit",
    elementId: "optAdUnits",
    formGroupId: "adunit",
    inputType: "select",
    inFormData: true,
    /** Option may include data-width / data-height → sync #txtWidth / #txtHeight */
    syncsSize: true,
  },
  size: {
    label: "Size",
    platformName: null,
    formGroupId: "size",
    inputType: "size",
    widthElementId: "txtWidth",
    heightElementId: "txtHeight",
    /** Appended on submit as `width` / `height` (not form name on inputs). */
    submitAs: { width: "width", height: "height" },
  },
  type: {
    label: "Type",
    platformName: "type",
    elementId: "optTypes",
    formGroupId: "banner_type",
    inputType: "select",
    inFormData: true,
    values: {
      html_code: "HTML Code",
      template: "Template",
      local_file: "Local file",
      external_file: "External file",
    },
  },
  template: {
    label: "Template",
    platformName: "template",
    elementId: "optTemplates",
    formGroupId: "template",
    inputType: "select",
    inFormData: true,
    /** Filtered by ad_view via listFormats; option has data-setting JSON schema */
    filteredByAdView: true,
    getSettingsPath: (formatId, type) =>
      `/banner/getSettings/${encodeURIComponent(formatId)}?type=${encodeURIComponent(type)}`,
  },
  source: {
    label: "Source",
    platformName: "source",
    /** Not a named input on form — appended on submit */
    elementIdByType: {
      template: "htmlSources",
      html_code: "htmlSources",
      local_file: "txtSources",
      external_file: "externalSources",
    },
    inputType: "text",
    inFormData: false,
    submitKey: "source",
  },
  use_tag: {
    label: "Use Tag",
    platformName: "use_tag",
    elementId: "optUseTag",
    formGroupId: "use_tag",
    inputType: "select",
    inFormData: true,
  },
  code_tag: {
    label: "Code",
    platformName: "code_tag",
    elementId: "txtCodeTag",
    formGroupId: "code_tag",
    inputType: "textarea",
    inFormData: true,
    visibleWhenUseTag: true,
  },
  notes: {
    label: "Notes",
    platformName: "notes",
    elementId: "txtNotes",
    formGroupId: "notes",
    inputType: "textarea",
    inFormData: true,
  },
  active: {
    label: "Active",
    platformName: "active",
    elementId: "chkActive",
    formGroupId: "active",
    inputType: "checkbox",
    inFormData: true,
    submitAsNumber: true,
  },
};

/**
 * Template settings (#settings) — keys vary per template `data-setting` on <option>.
 * Submitted as JSON string `banner_settings` + optional `setting_{key}` for files/checkboxes.
 */
export const BANNER_TEMPLATE_SETTING_MAP = {
  source: { label: "Source", inputType: "input", settingElementId: (k) => `setting_${k}` },
  duration: { label: "Duration", inputType: "number", settingElementId: (k) => `setting_${k}` },
  close_button: {
    label: "Close Button",
    inputType: "checkbox",
    settingElementId: (k) => `setting_${k}`,
    submitAsNumber: true,
  },
  logo: {
    label: "Logo",
    inputType: "checkbox",
    settingElementId: (k) => `setting_${k}`,
    submitAsNumber: true,
  },
  width: { label: "Width", inputType: "number", settingElementId: (k) => `setting_${k}` },
  height: { label: "Height", inputType: "number", settingElementId: (k) => `setting_${k}` },
  left_source: { label: "Left source", inputType: "input", settingElementId: (k) => `setting_${k}` },
  right_source: { label: "Right source", inputType: "input", settingElementId: (k) => `setting_${k}` },
  basic_source: { label: "Basic source", inputType: "input", settingElementId: (k) => `setting_${k}` },
  expand_source: { label: "Expand source", inputType: "input", settingElementId: (k) => `setting_${k}` },
};

export {
  BANNER_FORMAT_DISPLAY_MASTHEAD,
  BANNER_DISPLAY_MASTHEAD_BASE,
  BANNER_SETUP_USER_FIELDS,
  BANNER_CREATE_EXAMPLE_DISPLAY_MASTHEAD,
  BANNER_CREATE_EXAMPLE_DISPLAY_MASTHEAD as BANNER_CREATE_EXAMPLE,
  mergeDisplayMastheadUserFields,
} from "./bannerCreateExamples/display-masthead";

export {
  BANNER_FORMAT_BALLOON_ITVC,
  BANNER_BALLOON_ITVC_BASE,
  BANNER_CREATE_EXAMPLE_BALLOON_ITVC,
  mergeBalloonItvcUserFields,
} from "./bannerCreateExamples/display-balloon-expandable-itvc";

export { BANNER_FORMAT_REGISTRY } from "./bannerCreateExamples/index";

/**
 * @param {Array<{ id: string, name: string, type: string, value?: string, checked?: boolean, width?: string, height?: string, options?: Array<{ value: string, label: string }> }>} formFields
 * @param {{ bannerSettings?: Record<string, string | number>, source?: string, token?: string }} [options]
 */
export function mapFormFieldsToPayload(formFields, options = {}) {
  const byId = Object.fromEntries(formFields.map((f) => [f.id, f]));
  const byName = Object.fromEntries(formFields.map((f) => [f.name, f]));
  const field = (key) => byId[key] ?? byName[key];

  const typeField = field("banner_type") ?? field("type");
  const type = typeField?.value ?? "template";
  const sizeField = field("size");
  const activeField = field("active");

  const payload = {
    banner_name: field("banner_name")?.value ?? "",
    advertiser: field("advertiser")?.value ?? "",
    market: field("market")?.value ?? "vn",
    landing_page: field("landing_page")?.value ?? "",
    ad_view: field("ad_view")?.value ?? "",
    adunit: field("adunit")?.value ?? "",
    type,
    template: field("template")?.value ?? "",
    use_tag: field("use_tag")?.value ?? "",
    code_tag: field("code_tag")?.value ?? "",
    notes: field("notes")?.value ?? "",
    width: sizeField?.width ?? "",
    height: sizeField?.height ?? "",
    active: activeField?.checked ? 1 : 0,
  };

  const settings = options.bannerSettings ?? {};
  if (type !== "html_code" && Object.keys(settings).length > 0) {
    payload.banner_settings = normalizeBannerSettings(settings);
    payload.source =
      options.source ??
      settings.source ??
      settings.htmlSources ??
      "";
  } else if (type === "html_code") {
    payload.source = options.source ?? field("code_tag")?.value ?? "";
    payload.banner_settings = "{}";
  } else {
    payload.source = options.source ?? "";
    payload.banner_settings = "{}";
  }

  if (options.token) {
    payload._token = options.token;
  }

  return payload;
}

/**
 * @param {Record<string, string | number | boolean>} settings
 */
export function normalizeBannerSettings(settings) {
  const out = {};
  for (const [key, raw] of Object.entries(settings)) {
    const meta = BANNER_TEMPLATE_SETTING_MAP[key];
    if (meta?.inputType === "checkbox") {
      out[key] = raw === true || raw === 1 || raw === "1" ? 1 : 0;
    } else {
      out[key] = raw == null ? "" : String(raw);
    }
  }
  return out;
}

/**
 * Build FormData for POST /banner/store (matches platform jQuery submit).
 *
 * @param {ReturnType<typeof mapFormFieldsToPayload>} payload
 */
export function buildBannerCreateFormData(payload) {
  const fd = new FormData();
  const formKeys = [
    "banner_name",
    "advertiser",
    "market",
    "landing_page",
    "adunit",
    "type",
    "template",
    "use_tag",
    "code_tag",
    "notes",
  ];
  for (const key of formKeys) {
    if (payload[key] != null) fd.append(key, String(payload[key]));
  }
  if (payload._token) fd.append("_token", payload._token);
  fd.append("ad_view", String(payload.ad_view ?? ""));
  fd.append("width", String(payload.width ?? ""));
  fd.append("height", String(payload.height ?? ""));
  fd.append("active", String(payload.active ?? 0));
  fd.append("source", String(payload.source ?? ""));
  fd.append(
    "banner_settings",
    typeof payload.banner_settings === "string"
      ? payload.banner_settings
      : JSON.stringify(payload.banner_settings ?? {}),
  );
  return fd;
}

/**
 * Map example / payload keys → human labels (for display or logs).
 */
export function labelForPayloadKey(key) {
  const main = BANNER_CREATE_FIELD_MAP[key];
  if (main?.label) return main.label;
  const setting = BANNER_TEMPLATE_SETTING_MAP[key];
  if (setting?.label) return setting.label;
  if (key === "width" || key === "height") return key === "width" ? "Width" : "Height";
  if (key === "banner_settings") return "Banner settings (JSON)";
  if (key === "source") return "Source";
  return key;
}

/**
 * Flatten payload + banner_settings for a single key-value view.
 */
export function flattenBannerPayload(payload) {
  const flat = { ...payload };
  const settings =
    typeof payload.banner_settings === "string"
      ? JSON.parse(payload.banner_settings || "{}")
      : payload.banner_settings ?? {};
  delete flat.banner_settings;
  for (const [k, v] of Object.entries(settings)) {
    flat[`settings.${k}`] = v;
  }
  return flat;
}
