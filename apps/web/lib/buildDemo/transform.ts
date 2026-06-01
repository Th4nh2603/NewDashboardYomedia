import {
  replaceImagesToBase64,
  type ImageBase64Entry,
} from "../buildDemoAssets";

export async function convertTextFileWithBase64Images(
  file: File,
  imageByName: Map<string, string>,
): Promise<string> {
  const content = await file.text();
  const images: ImageBase64Entry[] = Array.from(imageByName.entries()).map(
    ([name, base64]) => ({ name, base64 }),
  );
  return replaceImagesToBase64(content, images);
}

export type { ImageBase64Entry };
