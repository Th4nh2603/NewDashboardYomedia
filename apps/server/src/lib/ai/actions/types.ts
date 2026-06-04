export type ActionTool = "time_now" | "help" | "build_demo";

export type BuildDemoFormat = "HTML" | "Video";

export type BuildDemoToolInput = {
  brandId: string;
  productCateId: string;
  demoFormat: BuildDemoFormat;
  folderName?: string;
  /** creative-demos.json `value` for demo.yomedia `f=` (e.g. mobile-interstitial-firstview). */
  formatValue?: string;
};
