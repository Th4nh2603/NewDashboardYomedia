import React from "react";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import Button from "./Button";
import { openYomediaDemoPreview } from "../lib/buildDemo/previewUrl";

export {
  buildDemoRemoteRelativePath,
  getYomediaDemoPreviewUrl,
  openYomediaDemoPreview,
  splitRelativeDemoPath,
  type OpenYomediaDemoPreviewParams,
} from "../lib/buildDemo/previewUrl";

type OpenDemoButtonProps = {
  /**
   * Relative path under demo root: folder or `folder/file.ext` (e.g. `2026/01/cj/tvc/make-vast.xml`).
   */
  remotePath: string;
  instreamVideo?: boolean;
  /** Pass through `b=` query if you already have it */
  bannerPath?: string;
  /** Pass through `f=` query if you already have it */
  formatValue?: string;
  /** Force preview site: `pc` -> idpc, `mb` -> idmb */
  forceDevice?: "pc" | "mb";
  previewHostTemplate?: "default" | "eva" | "tuoitre";
  baseRemotePath?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
};

const OpenDemoButton: React.FC<OpenDemoButtonProps> = ({
  remotePath,
  instreamVideo,
  bannerPath,
  formatValue,
  forceDevice,
  previewHostTemplate,
  baseRemotePath = "/script/demo",
  className = "px-4 py-2.5 rounded-2xl bg-[#4cceac] text-[#020617] text-xs font-semibold uppercase tracking-widest hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed",
  label = "demo",
  disabled = false,
}) => {
  const serverApiUrl = serverApiOrigin();

  const handleOpenDemo = React.useCallback(async () => {
    const hasPath = Boolean((bannerPath ?? remotePath).trim());
    if (disabled || !hasPath) return;

    await openYomediaDemoPreview({
      remotePath: remotePath.trim(),
      instreamVideo,
      bannerPath,
      formatValue,
      forceDevice,
      previewHostTemplate,
      baseRemotePath,
      serverApiUrl,
    });
  }, [
    disabled,
    bannerPath,
    instreamVideo,
    forceDevice,
    previewHostTemplate,
    formatValue,
    remotePath,
    baseRemotePath,
    serverApiUrl,
  ]);

  return (
    <Button
      type="button"
      onClick={handleOpenDemo}
      disabled={disabled || !(bannerPath ?? remotePath).trim()}
      className={className}
    >
      {label}
    </Button>
  );
};

export default OpenDemoButton;
