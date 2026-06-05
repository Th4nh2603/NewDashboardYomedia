import path from "node:path";
import type { ChatAttachmentMeta } from "../../core/types.js";
import type { BuildDemoToolInput } from "../types.js";
import { uploadSftpBuffer, writeSftpFile } from "../../../sftp/index.js";
import {
  DEMO_REMOTE_PREFIX,
  decodeAttachmentBuffer,
  isHtmlFile,
  isTextLikeFile,
  isVideoFile,
} from "./buildDemoCommon.js";
import {
  collectImageBase64Entries,
  isImageAttachment,
  prepareHtmlDemoTextForSftp,
} from "./buildDemoInlineImages.js";
import { VIDEO_DEMO_FIXED_REL_PATH, buildVideoMakeVastXml } from "./makeVastXml.js";
import { maybeCompressVideoUpload } from "../../../media/videoCompress.js";
import { badRequest } from "../../../http/errors.js";

export type CompressAndUploadResult = {
  uploaded: number;
  remoteBase: string;
  imagesInlined: number;
  videoCompressed?: boolean;
  videoFinalBytes?: number;
};

export async function executeCompressAndUpload(
  input: BuildDemoToolInput,
  relativePath: string,
  attachments: ChatAttachmentMeta[],
): Promise<CompressAndUploadResult> {
  const remoteBase = `${DEMO_REMOTE_PREFIX}/${relativePath}`.replace(
    /\/{2,}/g,
    "/",
  );

  if (input.demoFormat === "Video") {
    const videoAtt =
      attachments.find((a) => isVideoFile(a.name, a.mimeType)) ?? attachments[0];
    if (!videoAtt?.contentBase64) {
      throw badRequest("Thiếu file video (.mp4) để build demo Video.");
    }
    const videoBuffer = decodeAttachmentBuffer(videoAtt);
    if (videoBuffer.length === 0) throw badRequest("File video rỗng.");

    const compressed = await maybeCompressVideoUpload(videoBuffer, videoAtt.name);
    const uploadBuffer = compressed.buffer;

    const videoRemotePath = `${remoteBase}/${VIDEO_DEMO_FIXED_REL_PATH}`.replace(
      /\/{2,}/g,
      "/",
    );
    await uploadSftpBuffer(videoRemotePath, uploadBuffer);
    const xmlRemotePath = `${remoteBase}/make-vast.xml`.replace(/\/{2,}/g, "/");
    await writeSftpFile(xmlRemotePath, buildVideoMakeVastXml(relativePath));

    return {
      uploaded: 2,
      remoteBase,
      imagesInlined: 0,
      videoCompressed: compressed.videoCompressed,
      videoFinalBytes: compressed.compressedBytes,
    };
  }

  const imageEntries = collectImageBase64Entries(attachments);
  let indexHtmlUploaded = false;
  let uploaded = 0;

  for (const att of attachments) {
    if (isImageAttachment(att.name, att.mimeType)) continue;

    const buffer = decodeAttachmentBuffer(att);
    if (buffer.length === 0) continue;

    const rel = (att.relativePath || att.name)
      .replace(/\\+/g, "/")
      .replace(/^\/+/, "");
    const fileName = path.posix.basename(rel);
    const isHtml = isHtmlFile(att.name, att.mimeType);
    const finalName = isHtml && !indexHtmlUploaded ? "index.html" : fileName;
    if (isHtml && !indexHtmlUploaded) indexHtmlUploaded = true;
    const remoteFilePath = `${remoteBase}/${finalName}`.replace(/\/{2,}/g, "/");

    if (isTextLikeFile(att.name, att.mimeType) && !isVideoFile(att.name, att.mimeType)) {
      const converted = prepareHtmlDemoTextForSftp(
        buffer.toString("utf8"),
        imageEntries,
      );
      await writeSftpFile(remoteFilePath, converted);
    } else {
      await uploadSftpBuffer(remoteFilePath, buffer);
    }
    uploaded += 1;
  }

  if (uploaded === 0) {
    throw badRequest("Không có file hợp lệ để upload HTML demo.");
  }
  return { uploaded, remoteBase, imagesInlined: imageEntries.length };
}
