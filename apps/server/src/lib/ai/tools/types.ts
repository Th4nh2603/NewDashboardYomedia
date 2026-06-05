export type ActionTool =
  | "time_now"
  | "help"
  | "upload_sftp_demo"
  | "compress_demo_assets";

export type BuildDemoFormat = "HTML" | "Video";

export type BuildDemoToolInput = {
  brandId: string;
  demoFormat: BuildDemoFormat;
  folderName?: string;
  /** creative-demos.json `value` for demo.yomedia `f=` (e.g. mobile-interstitial-firstview). */
  formatValue?: string;
};
