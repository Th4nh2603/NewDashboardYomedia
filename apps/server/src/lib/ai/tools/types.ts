export type ActionTool =
  | "time_now"
  | "help"
  | "upload_sftp_demo"
  | "compress_demo_assets";

export type {
  BuildDemoFormat,
  BuildDemoInput as BuildDemoToolInput,
} from "../../../shared/schemas/buildDemo.schema.js";
