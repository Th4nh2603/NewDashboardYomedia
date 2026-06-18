import React from "react";
import { getYomediaDemoPreviewUrl } from "@/components/dashboard/OpenDemo";
import type { CreativeDemoItem } from "@/data/creativeDemos";

type UseDemoPreviewUrlParams = {
  remotePath: string;
  formatValue?: string;
  category: "Mobile" | "Display" | "Video";
  listingHasMakeVastXml: boolean;
  demosCatalogReady: boolean;
  activeDemos: CreativeDemoItem[];
  baseRemotePath?: string;
  serverApiUrl: string;
};

export function useDemoPreviewUrl(params: UseDemoPreviewUrlParams) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resolvingPreview, setResolvingPreview] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setResolvingPreview(true);
      void (async () => {
        try {
          const fv = params.formatValue?.trim();
          const catalogRow =
            fv && params.demosCatalogReady
              ? params.activeDemos.find((d) => String(d.value ?? "").trim() === fv)
              : undefined;
          /** idvd+VAST only for catalog `Video` rows; Mobile in-page MP4 uses idmb despite make-vast.xml. */
          const instreamVideo = catalogRow
            ? params.listingHasMakeVastXml &&
              params.category === "Video" &&
              catalogRow.category === "Video"
            : params.listingHasMakeVastXml && params.category === "Video";

          const url = await getYomediaDemoPreviewUrl({
            remotePath: params.remotePath,
            formatValue: params.formatValue || undefined,
            baseRemotePath: params.baseRemotePath ?? "/script/demo",
            instreamVideo,
            forceDevice: params.category === "Display" ? "pc" : "mb",
            serverApiUrl: params.serverApiUrl,
            ...(params.demosCatalogReady
              ? { creativeDemosForPreview: params.activeDemos }
              : {}),
          });

          if (cancelled) return;
          if (!url) {
            setPreviewUrl(null);
            return;
          }
          try {
            const parsed = new URL(url);
            parsed.searchParams.set("qr", "false");
            setPreviewUrl(parsed.toString());
          } catch {
            setPreviewUrl(url.includes("?") ? `${url}&qr=false` : `${url}?qr=false`);
          }
        } catch {
          if (!cancelled) setPreviewUrl(null);
        } finally {
          if (!cancelled) setResolvingPreview(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    params.remotePath,
    params.formatValue,
    params.category,
    params.listingHasMakeVastXml,
    params.demosCatalogReady,
    params.activeDemos,
    params.baseRemotePath,
    params.serverApiUrl,
  ]);

  return { previewUrl, resolvingPreview };
}
