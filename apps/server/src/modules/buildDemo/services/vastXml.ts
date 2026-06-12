/** Demo format Video: fixed relative path for tvc.mp4 (SFTP). */
export const VIDEO_DEMO_FIXED_REL_PATH = "tvc.mp4";

const DEMO_PUBLIC_VIDEO_ORIGIN = "https://demo.yomedia.vn";

function normalizeTargetDemoPath(targetDemoPath: string): string {
  return targetDemoPath
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function buildVideoMakeVastXml(targetDemoPath: string): string {
  const dir = normalizeTargetDemoPath(targetDemoPath);
  const mediaUrl = `${DEMO_PUBLIC_VIDEO_ORIGIN}/${dir}/${VIDEO_DEMO_FIXED_REL_PATH}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="2.0">
    <Ad id="239e6a5992e5442c836c1980894e8dc0">
        <InLine>
            <AdSystem>Yomedia</AdSystem>
            <AdTitle></AdTitle>
            <Description/>
            <Survey/>
            <Error></Error>
            <Impression><![CDATA[]]></Impression>
            <Creatives>
                <Creative sequence="1" AdID="">
                    <Linear skipoffset="00:00:05">
                        <Duration>00:00:15</Duration>
                        <TrackingEvents>
                            <Tracking event="start"><![CDATA[]]></Tracking>
                            <Tracking event="firstQuartile"><![CDATA[]]></Tracking>
                            <Tracking event="midpoint"><![CDATA[]]></Tracking>
                            <Tracking event="thirdQuartile"><![CDATA[]]></Tracking>
                            <Tracking event="complete"><![CDATA[]]></Tracking>
                            <Tracking event="mute"><![CDATA[]]></Tracking>
                            <Tracking event="unmute"><![CDATA[]]></Tracking>
                            <Tracking event="pause"><![CDATA[]]></Tracking>
                            <Tracking event="resume"><![CDATA[]]></Tracking>
                        </TrackingEvents>
                        <VideoClicks>
                            <ClickThrough><![CDATA[https://www.yomedia.vn/]]></ClickThrough>
                        </VideoClicks>
                        <MediaFiles>
                            <MediaFile bitrate="" delivery="progressive" height="" width="" maintainAspectRatio="true" scalable="true" type="video/mp4" minSuggestedDuration="Ads By Yomedia"><![CDATA[${mediaUrl}]]></MediaFile>
                        </MediaFiles>
                    </Linear>
                </Creative>
            </Creatives>
        </InLine>
    </Ad>
</VAST>
`;
}
