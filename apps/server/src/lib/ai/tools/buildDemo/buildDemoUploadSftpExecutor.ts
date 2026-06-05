import path from "node:path";
import type { ChatAttachmentMeta } from "../../core/types.js";
import type { BuildDemoToolInput } from "../types.js";
import { uploadSftpBuffer, writeSftpFile } from "../../../sftp/index.js";
import {
  DEMO_REMOTE_PREFIX,
  decodeAttachmentBuffer,
  isHtmlFile,
  isVideoFile,
} from "./buildDemoCommon.js";
import { VIDEO_DEMO_FIXED_REL_PATH, buildVideoMakeVastXml } from "./makeVastXml.js";
import { maybeCompressVideoUpload } from "../../../media/videoCompress.js";
import { badRequest } from "../../../http/errors.js";

export type UploadDemoResult = {
  uploaded: number;
  remoteBase: string;
  imagesInlined: number;
  videoCompressed?: boolean;
  videoFinalBytes?: number;
};

export async function executeUploadSftp(
  _input: BuildDemoToolInput,
  relativePath: string,
  attachments: ChatAttachmentMeta[],
): Promise<UploadDemoResult> {
  const remoteBase = `${DEMO_REMOTE_PREFIX}/${relativePath}`.replace(
    /\/{2,}/g,
    "/",
  );

  if (_input.demoFormat === "Video") {
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

  let indexHtmlUploaded = false;
  let uploaded = 0;
  for (const att of attachments) {
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
    await uploadSftpBuffer(remoteFilePath, buffer);
    uploaded += 1;
  }

  if (uploaded === 0) {
    throw badRequest("Không có file hợp lệ để upload HTML demo.");
  }
  return { uploaded, remoteBase, imagesInlined: 0 };
}
