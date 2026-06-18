/** File `{value}.js` — `value` từ backend API removed */
export {
  BANNER_FORMAT_DISPLAY_MASTHEAD,
  BANNER_DISPLAY_MASTHEAD_BASE,
  BANNER_SETUP_USER_FIELDS as BANNER_SETUP_USER_FIELDS_MASTHEAD,
  BANNER_CREATE_EXAMPLE_DISPLAY_MASTHEAD,
  mergeDisplayMastheadUserFields,
} from "./display-masthead.js";

export {
  BANNER_FORMAT_BALLOON_ITVC,
  BANNER_BALLOON_ITVC_BASE,
  BANNER_SETUP_USER_FIELDS as BANNER_SETUP_USER_FIELDS_BALLOON_ITVC,
  BANNER_CREATE_EXAMPLE_BALLOON_ITVC,
  mergeBalloonItvcUserFields,
} from "./display-balloon-expandable-itvc.js";

export const BANNER_FORMAT_REGISTRY = {
  "display-masthead": {
    format: () =>
      import("./display-masthead.js").then((m) => ({
        id: m.BANNER_FORMAT_DISPLAY_MASTHEAD.id,
        label: m.BANNER_FORMAT_DISPLAY_MASTHEAD.templateLabel,
        base: m.BANNER_DISPLAY_MASTHEAD_BASE,
        example: m.BANNER_CREATE_EXAMPLE_DISPLAY_MASTHEAD,
        merge: m.mergeDisplayMastheadUserFields,
      })),
  },
  "display-balloon-expandable-itvc": {
    format: () =>
      import("./display-balloon-expandable-itvc.js").then((m) => ({
        id: m.BANNER_FORMAT_BALLOON_ITVC.id,
        label: m.BANNER_FORMAT_BALLOON_ITVC.templateLabel,
        base: m.BANNER_BALLOON_ITVC_BASE,
        example: m.BANNER_CREATE_EXAMPLE_BALLOON_ITVC,
        merge: m.mergeBalloonItvcUserFields,
      })),
  },
};
