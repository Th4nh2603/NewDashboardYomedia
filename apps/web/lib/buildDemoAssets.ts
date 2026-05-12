const S_ON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA2CAMAAAClUqpcAAAAP1BMVEX///8AAAD////////////////////////////////////////////////////////////////////////////NY5A9AAAAFHRSTlMzACXMChfymT9mWbJMv3+McuXYpbWoq14AAAHlSURBVEjHvZaJjoMwDES9gYSE+5j//9alpsaUhk1opbVUIIWn8Tgn/cSitEbC2jL6CcUgOoWxZRK0FA9zRimJKXoJlheIonHQUDLKM6hyKVEFlcsKewYN3SRJuXsk5XLe7xVS0FI65u61QJRZmAZoXkjKNNgDGI7J0pXg2PujPybrgyTFBX0HVNKo3cPfAhQHSYoKBgf9zLvN3wT0KkkRQb8AO6j+AjDvkiv4xtUzDmC7/oa1td4LYNxHAb1lWgECsr+BGGlYsttzJSv5hUcQERTcjbUsuTYcPeOHNoujA8cJZH3Xcv8PXNiwcXuiCy5A6vih5mvQPrJqLA5Klo6zPJhMgZJlAbDjOR/sWaYCiPF8MPDTf4Ljp+DCfdDxu/kOOAGjDBr5M9WPMnS4Nwu+NgI+NfsYKC8qxgduDDLkRLMpOM5gWO+z57ncslFZPc7T6gyODq7mAjX0wCepTWQiD+5lPjb1im9TpDqM8djS0XYHkGHHheV8xWJ8sQqTgML1JPlymKvl0VfQGeRnDFudnBfB6wW5LRBIyFHyFcE/twApvOa7kAqmNx3lGmnYG9ucn5UztzZWv3NUfruVc5SfHB5uaZbvJyubxyl4gzRXh0CTY+/7Y+f3B11NOI0peH0sN/HT/C/3pivwmDak6QAAAABJRU5ErkJggg==";
const S_OFF_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA2CAMAAAClUqpcAAAAP1BMVEUAAAD////////////////////////////////////////////////////////////////////////////NY5A9AAAAFHRSTlMzAJkmGWYOsj8H8thZf+W/jHJMzPy/nOYAAAFuSURBVEjHrdZZkoMwDATQJhIGk7CO7n/WgTKgYrxhMv2TBR4CF7aFKhTDTHuYTfAUH1om/AmxzUJGOGQ8mGNKo9AgHbJhyMjGBqDFnbBCdSVSIaFQQl2ZRHhc8iOEYgc6oUVZ+ICEwhgHDUJppzp5s4gUrAeRJVUSwYLtS9a8UiURKjgPkoawK/TLjSI5yBWM93SdXGEPveZ83iv4BFsW4CUKXf3mdG85rlKB3F8/+7ke3A40pxOp93E9ykkMfrpDfga9BjgNVernLajHmqsD3YDo3U91eahSXQF0QytdWwwb9/vdFkB1TpbASUdVJedhv4/LVfJecwlD5/TNUWmOmmMMNtd3tfu479608iCay+yYz2lVPZqPvEIOLzj5pcPAyzJmIEWXx3obwSkKTWJBnrp3vGByC6jbeMGnm86X21yxtA+3cvN186CyoJ7Cm89pn7VkFGkCLaUdP2w77f82uhpDPsu01mpZMSjczf8CCMYlsaG5I9IAAAAASUVORK5CYII=";
const BTN_REPLAY_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAAM1BMVEUAAAD///////////////////////////////////////////////////////////////+3leKCAAAAEHRSTlMAf+8/Dx8vv49vX9+fT6/P7uaPeAAAANZJREFUOMvtkd0SxBAMRiOon6rm/Z92TadEo2bc7MXO7LkThy8BfhebXDRr6oGU1lS7Ex5L5oZEatmMMkdfBHXR+qTBNCcxZys7IrRDTMNxtayyCA8sdhPsZbk9s5HFwOV8LxlFjO7KrRPOYIw4/5iFOoDxUjyIcTJo1mLmsqWpGBOprjwXNaQo3sy9Prcq289RyPeiriJuQ4yGHqzmXk3r7wJMfga9NiVf1aMHyL8e4VFklyNoQBJevQ1G/OglC29EFNcpmGB8r3XXjdjg8LJytPDnC3wA/ZYX0JaBReoAAAAASUVORK5CYII=";
const BTN_PLAY_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABOCAMAAABMilufAAAAVFBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////8wXzyWAAAAG3RSTlMADPUc33ftqifPtpVRQuZrODHVx7+djIRiWRRgp4d+AAABBklEQVRYw6TQyRWCQAAEUQYERxBZ3O3887QvvA6gKoB/qGasDU6aCjc0LNhw+4wNh7bo6FWogbZI6TJjw50rMbKFG7p9iJEtwMiWjhtq3wUY2QKMbFmJkS3EyBZquNMXG+6+EiNbuKG2L8DIFmBky4YN9+yIkS3Y8JYrNtxjI0a2ACNbiJEtxMgWbLjpxw0NPTeULSKNFRrZItiw2MDt/2bM5AagEASiEcMSDvjN96D9N2oRHmYa4EBglkcxw5Rgpxn4GzMl+Lk18RokSqDJa+I9SrThPfv/8BlGtOEz3Xu2rEOQtb3ju0dtgi7mHd9NaxN0dQ88u7BBwHIy8GzLBgHry3fmeAH5pBXvjExH/QAAAABJRU5ErkJggg==";
const BG_VIDEOS_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAAEOAQMAAABrVFYkAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAACZJREFUeNrtwQENAAAAwiD7p7bHBwwAAAAAAAAAAAAAAAAAAACIOkBWAAFeWY6hAAAAAElFTkSuQmCC";

const BUNDLED_DEMO_ASSET_IMAGE_BASENAMES = new Set(
  ["s_on copy.png", "s_off copy.png", "preplaytvc0001.png", "playbtn0001.png", "htt.png"].map((s) =>
    s.toLowerCase(),
  ),
);

const DEMO_MANIFEST_JQUERY_SRC =
  "https://media.yomedia.vn/createjs/jquery-2022.min.js?1726036079413";
const DEMO_MANIFEST_ANWIDGET_SRC =
  "https://demo.yomedia.vn/yomedia/components/sdk/anwidget.js?1726036079413";
const DEMO_MANIFEST_VIDEO_JS_SRC =
  "https://demo.yomedia.vn/yomedia/components/video/src/video.js?1726036079413";
const DEMO_MANIFEST_UI_IMAGE_JS_SRC =
  "https://demo.yomedia.vn/yomedia/components/ui/src/image.js?1726036079413";

export const VIDEO_DEMO_FIXED_REL_PATH = "tvc.mp4";
const DEMO_PUBLIC_VIDEO_ORIGIN = "https://demo.yomedia.vn";

export type ImageBase64Entry = {
  name: string;
  base64: string;
};

function isBundledDemoAssetImageName(name: string): boolean {
  const leaf = (name.split(/[/\\]/).pop() ?? name).trim().toLowerCase();
  return BUNDLED_DEMO_ASSET_IMAGE_BASENAMES.has(leaf);
}

function replaceBundledDemoStaticImages(content: string): string {
  let c = content;
  const sq = [
    [`'id': 's_on', 'src':'images/s_on%20copy.png'`, `'id': 's_on',\n            'src': '${S_ON_DATA_URL}'`],
    [`'id': 's_on', 'src':'images/s_on copy.png'`, `'id': 's_on',\n            'src': '${S_ON_DATA_URL}'`],
    [`'id': 's_off', 'src':'images/s_off%20copy.png'`, `'id': 's_off',\n            'src': '${S_OFF_DATA_URL}'`],
    [`'id': 's_off', 'src':'images/s_off copy.png'`, `'id': 's_off',\n            'src': '${S_OFF_DATA_URL}'`],
    [`'id': 'btn_replay', 'src':'images/preplaytvc0001.png'`, `'id': 'btn_replay',\n            'src': '${BTN_REPLAY_DATA_URL}'`],
    [`'id': 'btn_play', 'src':'images/playBtn0001.png'`, `'id': 'btn_play',\n            'src': '${BTN_PLAY_DATA_URL}'`],
    [`'id': 'bg_videos', 'src':'images/htt.png'`, `'id': 'bg_videos',\n            'src': '${BG_VIDEOS_DATA_URL}'`],
  ] as const;
  for (const [from, to] of sq) c = c.replaceAll(from, to);

  const dqOn = `"id": "s_on",\n            "src": "${S_ON_DATA_URL}"`;
  const dqOff = `"id": "s_off",\n            "src": "${S_OFF_DATA_URL}"`;
  const dqReplay = `"id": "btn_replay",\n            "src": "${BTN_REPLAY_DATA_URL}"`;
  const dqPlay = `"id": "btn_play",\n            "src": "${BTN_PLAY_DATA_URL}"`;
  const dqBg = `"id": "bg_videos",\n            "src": "${BG_VIDEOS_DATA_URL}"`;
  for (const [from, to] of [
    [`"id": "s_on", "src": "images/s_on%20copy.png"`, dqOn],
    [`"id": "s_on", "src":"images/s_on%20copy.png"`, dqOn],
    [`"id": "s_on", "src": "images/s_on copy.png"`, dqOn],
    [`"id": "s_on", "src":"images/s_on copy.png"`, dqOn],
    [`"id": "s_off", "src": "images/s_off%20copy.png"`, dqOff],
    [`"id": "s_off", "src":"images/s_off%20copy.png"`, dqOff],
    [`"id": "s_off", "src": "images/s_off copy.png"`, dqOff],
    [`"id": "s_off", "src":"images/s_off copy.png"`, dqOff],
    [`"id": "btn_replay", "src": "images/preplaytvc0001.png"`, dqReplay],
    [`"id": "btn_replay", "src":"images/preplaytvc0001.png"`, dqReplay],
    [`"id": "btn_play", "src": "images/playBtn0001.png"`, dqPlay],
    [`"id": "btn_play", "src":"images/playBtn0001.png"`, dqPlay],
    [`"id": "bg_videos", "src": "images/htt.png"`, dqBg],
    [`"id": "bg_videos", "src":"images/htt.png"`, dqBg],
  ] as const) {
    c = c.replaceAll(from, to);
  }
  c = c.replace(
    /(id\s*:\s*["']s_on["'][\s\S]*?src\s*:\s*["'])images\/s_on(?:%20| )copy\.png(["'])/g,
    `$1${S_ON_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']s_off["'][\s\S]*?src\s*:\s*["'])images\/s_off(?:%20| )copy\.png(["'])/g,
    `$1${S_OFF_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']btn_replay["'][\s\S]*?src\s*:\s*["'])images\/preplaytvc0001\.png(["'])/g,
    `$1${BTN_REPLAY_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']btn_play["'][\s\S]*?src\s*:\s*["'])images\/playBtn0001\.png(["'])/g,
    `$1${BTN_PLAY_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']bg_videos["'][\s\S]*?src\s*:\s*["'])images\/htt\.png(["'])/g,
    `$1${BG_VIDEOS_DATA_URL}$2`,
  );
  return c;
}

function replaceDemoManifestScriptUrls(content: string): string {
  let c = content;
  c = c.replace(
    /src:\s*"https:\/\/code\.jquery\.com\/jquery-3\.4\.1\.min\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_JQUERY_SRC}"`,
  );
  c = c.replace(
    /src:\s*'https:\/\/code\.jquery\.com\/jquery-3\.4\.1\.min\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_JQUERY_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/sdk\/anwidget\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_ANWIDGET_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/sdk\/anwidget\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_ANWIDGET_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/video\/src\/video\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_VIDEO_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/video\/src\/video\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_VIDEO_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/ui\/src\/image\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_UI_IMAGE_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/ui\/src\/image\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_UI_IMAGE_JS_SRC}"`,
  );
  return c;
}

export function replaceImagesToBase64(
  content: string,
  images: ImageBase64Entry[],
): string {
  let output = replaceDemoManifestScriptUrls(content);
  output = replaceBundledDemoStaticImages(output);
  if (images.length === 0) return output;

  const lines = output.split(/\r?\n/);
  for (const img of images) {
    if (isBundledDemoAssetImageName(img.name)) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(img.name)) continue;
      const idx = line.indexOf(img.name);
      if (idx === -1) continue;
      const afterNameIndex = idx + img.name.length;
      const nextDoubleQuoteIndex = line.indexOf('"', afterNameIndex);
      const nextSingleQuoteIndex = line.indexOf("'", afterNameIndex);
      const nextQuoteIndex =
        nextDoubleQuoteIndex === -1
          ? nextSingleQuoteIndex
          : nextSingleQuoteIndex === -1
            ? nextDoubleQuoteIndex
            : Math.min(nextDoubleQuoteIndex, nextSingleQuoteIndex);
      const quoteChar =
        nextQuoteIndex === -1
          ? '"'
          : nextQuoteIndex === nextSingleQuoteIndex
            ? "'"
            : '"';
      const suffixAfterQuote =
        nextQuoteIndex === -1
          ? line.slice(afterNameIndex)
          : line.slice(nextQuoteIndex + 1);
      const leadingWs = line.match(/^\s*/)?.[0] ?? "";
      lines[i] = `${leadingWs}{type:createjs.AbstractLoader.IMAGE, src:${quoteChar}${img.base64}${quoteChar}${suffixAfterQuote}`;
      break;
    }
  }
  return lines.join("\n");
}

export function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .replace(/[<>:"|?*/\\]/g, "_")
    .replace(/\s+/g, "_");
}

export function buildVideoMakeVastXml(targetDemoPath: string): string {
  const dir = targetDemoPath
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("/");
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
                    <Linear skipoffset="00:00:07">
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
