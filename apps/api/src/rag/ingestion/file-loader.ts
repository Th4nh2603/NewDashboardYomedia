import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export async function loadPdfText(filePath: string): Promise<string> {
  const parser = new PDFParse({ data: await readFile(filePath) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export const fileLoader = {
  loadPdfText,
};
