import {
  BANNER_DISPLAY_MASTHEAD_BASE,
  BANNER_FORMAT_DISPLAY_MASTHEAD,
  mergeDisplayMastheadUserFields,
} from "./bannerCreateExamples/display-masthead.js";
import {
  BANNER_BALLOON_ITVC_BASE,
  BANNER_FORMAT_BALLOON_ITVC,
  mergeBalloonItvcUserFields,
} from "./bannerCreateExamples/display-balloon-expandable-itvc.js";

export type AdvertiserOption = { value: string; label: string };

export type BannerFormatKey = "display-masthead" | "display-balloon-expandable-itvc";

export type BannerSetupStep =
  | "format"
  | "banner_name"
  | "advertiser"
  | "landing_page"
  | "source"
  | "confirm";

/** Draft shape shared by supported formats (user + fixed fields). */
export type BannerSetupDraft = {
  banner_name: string;
  advertiser: string;
  advertiserLabel: string;
  market: string;
  marketLabel: string;
  landing_page: string;
  ad_view: string;
  ad_viewLabel: string;
  adunit: string;
  adunitLabel: string;
  type: string;
  typeLabel: string;
  template: string;
  templateLabel: string;
  source: string;
  width: string;
  height: string;
  banner_settings: Record<string, string | number>;
  use_tag: string;
  use_tagLabel: string;
  code_tag: string;
  notes: string;
  active: number;
};

type FormatConfig = {
  templateLabel: string;
  base: BannerSetupDraft;
  merge: (
    base: BannerSetupDraft,
    userFields: Partial<BannerSetupDraft>,
  ) => BannerSetupDraft;
  aliases: string[];
};

export const BANNER_FORMAT_CHOICES: Array<{
  key: BannerFormatKey;
  optionLabel: string;
  aliases: string[];
}> = [
  {
    key: "display-masthead",
    optionLabel: "Display Masthead (Billboard) (iTVC)",
    aliases: ["masthead", "masthead itvc", "billboard", "display masthead"],
  },
  {
    key: "display-balloon-expandable-itvc",
    optionLabel: "Display Balloon Expandable (iTVC)",
    aliases: ["balloon", "balloon itvc", "balloon expandable", "display balloon"],
  },
];

const FORMAT_CONFIG: Record<BannerFormatKey, FormatConfig> = {
  "display-masthead": {
    templateLabel: BANNER_FORMAT_DISPLAY_MASTHEAD.templateLabel,
    base: BANNER_DISPLAY_MASTHEAD_BASE as BannerSetupDraft,
    merge: mergeDisplayMastheadUserFields as FormatConfig["merge"],
    aliases: BANNER_FORMAT_CHOICES[0].aliases,
  },
  "display-balloon-expandable-itvc": {
    templateLabel: BANNER_FORMAT_BALLOON_ITVC.templateLabel,
    base: BANNER_BALLOON_ITVC_BASE as BannerSetupDraft,
    merge: mergeBalloonItvcUserFields as FormatConfig["merge"],
    aliases: BANNER_FORMAT_CHOICES[1].aliases,
  },
};

export type BannerSetupSession = {
  tool: "banner_create_setup";
  step: BannerSetupStep;
  formatKey: BannerFormatKey | null;
  draft: BannerSetupDraft | null;
  pendingAdvertiserChoices?: AdvertiserOption[];
};

export function normalizeBannerSetupKey(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201C\u201D`"']/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function detectBannerSetupStart(input: string): boolean {
  const text = normalizeBannerSetupKey(input);
  return (
    /^setup\s+banner\.?$/.test(text) ||
    /^banner\s+setup\.?$/.test(text) ||
    /^(tao|tao moi|create)\s+banner\.?$/.test(text) ||
    text === "setup banner"
  );
}

export function detectBannerSetupCancel(input: string): boolean {
  const text = normalizeBannerSetupKey(input);
  return /^(huy|cancel|stop|exit|thoat|dung)\.?$/.test(text);
}

export function detectBannerSetupConfirm(input: string): boolean {
  const text = normalizeBannerSetupKey(input);
  return (
    /^(yes|y|ok|dong y|dongy|confirm|submit|tao|tao banner|go)\.?$/.test(text) ||
    text === "đồng ý"
  );
}

export function resolveBannerFormatKey(input: string): BannerFormatKey | null {
  const text = normalizeBannerSetupKey(input);
  if (text === "1") return "display-masthead";
  if (text === "2") return "display-balloon-expandable-itvc";
  for (const choice of BANNER_FORMAT_CHOICES) {
    if (choice.aliases.some((a) => text === a || text.includes(a))) {
      return choice.key;
    }
  }
  if (text.includes("masthead")) return "display-masthead";
  if (text.includes("balloon")) return "display-balloon-expandable-itvc";
  return null;
}

export function createBannerSetupSession(): BannerSetupSession {
  return {
    tool: "banner_create_setup",
    step: "format",
    formatKey: null,
    draft: null,
  };
}

function getFormatConfig(formatKey: BannerFormatKey): FormatConfig {
  return FORMAT_CONFIG[formatKey];
}

function patchUserFields(
  formatKey: BannerFormatKey,
  draft: BannerSetupDraft,
  updates: Partial<BannerSetupDraft>,
): BannerSetupDraft {
  const cfg = getFormatConfig(formatKey);
  return cfg.merge(cfg.base, {
    banner_name: updates.banner_name ?? draft.banner_name,
    advertiser: updates.advertiser ?? draft.advertiser,
    advertiserLabel: updates.advertiserLabel ?? draft.advertiserLabel,
    landing_page: updates.landing_page ?? draft.landing_page,
    source: updates.source ?? draft.source,
  });
}

export function searchAdvertiserOptions(
  query: string,
  options: AdvertiserOption[],
): AdvertiserOption[] {
  const q = normalizeBannerSetupKey(query);
  if (!q) return [];
  const scored = options
    .map((opt) => {
      const label = normalizeBannerSetupKey(opt.label);
      const value = normalizeBannerSetupKey(opt.value);
      let score = 0;
      if (label === q || value === q) score = 100;
      else if (label.startsWith(q)) score = 80;
      else if (label.includes(q)) score = 60;
      else if (q.split(" ").every((w) => label.includes(w))) score = 50;
      return { opt, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map((x) => x.opt);
}

function pickAdvertiserByIndex(
  input: string,
  choices: AdvertiserOption[],
): AdvertiserOption | null {
  const m = input.trim().match(/^(\d{1,2})$/);
  if (!m) return null;
  const idx = Number(m[1]) - 1;
  if (idx < 0 || idx >= choices.length) return null;
  return choices[idx] ?? null;
}

function applyAdvertiser(
  formatKey: BannerFormatKey,
  draft: BannerSetupDraft,
  opt: AdvertiserOption,
): BannerSetupDraft {
  return patchUserFields(formatKey, draft, {
    advertiser: opt.value,
    advertiserLabel: opt.label,
  });
}

function applySource(
  formatKey: BannerFormatKey,
  draft: BannerSetupDraft,
  source: string,
): BannerSetupDraft {
  return patchUserFields(formatKey, draft, { source: source.trim() });
}

export function buildBannerFormatChoiceMessage(): string {
  const lines = BANNER_FORMAT_CHOICES.map(
    (c, i) => `${i + 1}. **${c.optionLabel}** (gõ \`${c.aliases[0]}\` hoặc số **${i + 1}**)`,
  );
  return lines.join("\n");
}

export function buildBannerSetupSummary(
  draft: BannerSetupDraft,
  formatKey: BannerFormatKey,
): string {
  const cfg = getFormatConfig(formatKey);
  const s = draft.banner_settings;
  const lines = [
    `**Tóm tắt banner** — ${cfg.templateLabel}`,
    "",
    `- **Banner name:** ${draft.banner_name}`,
    `- **Advertiser:** ${draft.advertiserLabel} (\`${draft.advertiser}\`)`,
    `- **Market:** ${draft.marketLabel}`,
    `- **Landing page:** ${draft.landing_page}`,
    `- **Ad View:** ${draft.ad_viewLabel}`,
    `- **Ad Unit:** ${draft.adunitLabel}`,
    `- **Template:** ${draft.templateLabel}`,
    `- **Source:** ${draft.source}`,
    `- **Form size:** ${draft.width}×${draft.height}`,
  ];

  if (formatKey === "display-masthead") {
    lines.push(
      `- **Duration:** ${s.duration}`,
      `- **Close Button:** ${s.close_button ? "ON" : "OFF"}`,
      `- **Logo:** ${s.logo ? "ON" : "OFF"}`,
    );
  } else if (formatKey === "display-balloon-expandable-itvc") {
    lines.push(
      `- **Max size:** ${s.max_width}×${s.max_height}`,
      `- **Min size:** ${s.min_width}×${s.min_height}`,
      `- **Bar height:** ${s.bar_height}`,
      `- **Duration:** ${s.duration}`,
    );
  }

  lines.push(
    `- **Active:** ${draft.active ? "ON" : "OFF"}`,
    "",
    "Gõ **đồng ý** (hoặc `yes`) để tạo banner trên platform.",
    "Gõ **hủy** để hủy setup.",
  );
  return lines.join("\n");
}

export type BannerSetupTurnResult = {
  session: BannerSetupSession;
  reply: string;
  readyToSubmit?: boolean;
};

export function processBannerSetupTurn(
  session: BannerSetupSession,
  input: string,
  advertiserOptions: AdvertiserOption[],
): BannerSetupTurnResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { session, reply: "Vui lòng nhập nội dung." };
  }

  if (session.step === "format") {
    const formatKey = resolveBannerFormatKey(trimmed);
    if (!formatKey) {
      return {
        session,
        reply: `Không nhận diện format "${trimmed}".\n\n${buildBannerFormatChoiceMessage()}`,
      };
    }
    const cfg = getFormatConfig(formatKey);
    const draft = structuredClone(cfg.base) as BannerSetupDraft;
    return {
      session: {
        tool: "banner_create_setup",
        step: "banner_name",
        formatKey,
        draft,
      },
      reply: [
        `Format: **${cfg.templateLabel}**`,
        "",
        "Banner name là gì?",
      ].join("\n"),
    };
  }

  const formatKey = session.formatKey;
  const draft = session.draft;
  if (!formatKey || !draft) {
    return {
      session: createBannerSetupSession(),
      reply: `Phiên setup chưa chọn format.\n\n${bannerSetupStartMessage()}`,
    };
  }

  if (session.step === "confirm") {
    if (detectBannerSetupConfirm(trimmed)) {
      return {
        session,
        reply: "Đang tạo banner trên platform…",
        readyToSubmit: true,
      };
    }
    return {
      session,
      reply:
        "Chưa nhận xác nhận. Gõ **đồng ý** hoặc **yes** để submit, **hủy** để thoát.",
    };
  }

  if (session.step === "banner_name") {
    const nextDraft = patchUserFields(formatKey, draft, {
      banner_name: trimmed,
    });
    return {
      session: {
        ...session,
        step: "advertiser",
        draft: nextDraft,
        pendingAdvertiserChoices: undefined,
      },
      reply: `Đã lưu banner name: **${trimmed}**\n\nBrand (Advertiser) là gì? (gõ tên brand để tìm trong danh sách Advertiser)`,
    };
  }

  if (session.step === "advertiser") {
    const choices = session.pendingAdvertiserChoices;
    if (choices?.length) {
      const picked = pickAdvertiserByIndex(trimmed, choices);
      if (!picked) {
        const list = choices.map((c, i) => `${i + 1}. ${c.label}`).join("\n");
        return {
          session,
          reply: `Chọn số từ 1 đến ${choices.length}:\n${list}`,
        };
      }
      const nextDraft = applyAdvertiser(formatKey, draft, picked);
      return {
        session: {
          tool: "banner_create_setup",
          formatKey,
          step: "landing_page",
          draft: nextDraft,
          pendingAdvertiserChoices: undefined,
        },
        reply: `Advertiser: **${picked.label}**\n\nLanding page URL là gì?`,
      };
    }

    const matches = searchAdvertiserOptions(trimmed, advertiserOptions);
    if (matches.length === 0) {
      return {
        session,
        reply: `Không tìm thấy Advertiser khớp "${trimmed}". Thử tên khác.`,
      };
    }
    if (matches.length === 1) {
      const nextDraft = applyAdvertiser(formatKey, draft, matches[0]);
      return {
        session: {
          tool: "banner_create_setup",
          formatKey,
          step: "landing_page",
          draft: nextDraft,
        },
        reply: `Advertiser: **${matches[0].label}**\n\nLanding page URL là gì?`,
      };
    }
    const list = matches.map((c, i) => `${i + 1}. ${c.label}`).join("\n");
    return {
      session: { ...session, pendingAdvertiserChoices: matches },
      reply: `Có ${matches.length} Advertiser khớp. Chọn số:\n${list}`,
    };
  }

  if (session.step === "landing_page") {
    const nextDraft = patchUserFields(formatKey, draft, {
      landing_page: trimmed,
    });
    return {
      session: {
        tool: "banner_create_setup",
        formatKey,
        step: "source",
        draft: nextDraft,
      },
      reply: `Landing page: ${trimmed}\n\n**Source** path là gì?`,
    };
  }

  if (session.step === "source") {
    const nextDraft = applySource(formatKey, draft, trimmed);
    return {
      session: {
        tool: "banner_create_setup",
        formatKey,
        step: "confirm",
        draft: nextDraft,
      },
      reply: buildBannerSetupSummary(nextDraft, formatKey),
    };
  }

  return { session, reply: "Bước setup không hợp lệ." };
}

export function buildBannerCreatePayloadFromDraft(draft: BannerSetupDraft) {
  return {
    banner_name: draft.banner_name,
    advertiser: draft.advertiser,
    market: draft.market,
    landing_page: draft.landing_page,
    ad_view: draft.ad_view,
    adunit: draft.adunit,
    type: draft.type,
    template: draft.template,
    use_tag: draft.use_tag ?? "",
    code_tag: draft.code_tag ?? "",
    notes: draft.notes ?? "",
    width: String(draft.width),
    height: String(draft.height),
    active: draft.active ? 1 : 0,
    source: draft.source,
    banner_settings: draft.banner_settings,
  };
}

export function bannerSetupStartMessage(): string {
  return [
    "**Setup banner** — chọn format trước:",
    "",
    buildBannerFormatChoiceMessage(),
    "",
    "(Gõ **hủy** bất cứ lúc nào để thoát.)",
  ].join("\n");
}
