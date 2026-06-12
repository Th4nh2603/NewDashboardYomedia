/**

 * Ghi đè chỉ field user (non-empty); mọi field khác giữ từ `base`.

 * Khi có `source`, parse WxH trong path → cập nhật banner_settings.

 * @param {Record<string, unknown>} base

 * @param {Record<string, unknown>} userFields

 */

import {

  applyBalloonSizeToBannerRecord,

  applyMastheadSizeToBannerRecord,

} from "./bannerSourceSize";



export function mergeBannerFormatUserFields(base, userFields) {

  const next = structuredClone(base);

  if (userFields.banner_name != null && userFields.banner_name !== "") {

    next.banner_name = userFields.banner_name;

  }

  if (userFields.advertiser != null && userFields.advertiser !== "") {

    next.advertiser = userFields.advertiser;

  }

  if (userFields.advertiserLabel != null && userFields.advertiserLabel !== "") {

    next.advertiserLabel = userFields.advertiserLabel;

  }

  if (userFields.landing_page != null && userFields.landing_page !== "") {

    next.landing_page = userFields.landing_page;

  }

  if (userFields.source != null && userFields.source !== "") {

    next.source = userFields.source;

    if (next.banner_settings && typeof next.banner_settings === "object") {

      next.banner_settings = {

        ...next.banner_settings,

        source: userFields.source,

      };

    }

    const settings = next.banner_settings;

    if (settings && typeof settings === "object" && "max_width" in settings) {

      applyBalloonSizeToBannerRecord(next);

    } else {

      applyMastheadSizeToBannerRecord(next);

    }

  }

  return next;

}

