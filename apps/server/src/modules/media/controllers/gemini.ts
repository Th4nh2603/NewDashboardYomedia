import { GoogleGenAI } from "@google/genai";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler, badRequest, serviceUnavailable } from "../../../lib/http/errors.js";
import { requireClerkAuth } from "../../auth/lib/clerkAuth.js";

const router = Router();
router.use(requireClerkAuth);

const imageInputSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  model: z
    .enum(["gemini-2.5-flash-image", "gemini-3-pro-image-preview"])
    .default("gemini-2.5-flash-image"),
  aspectRatio: z.enum(["1:1", "4:3", "16:9"]).default("1:1"),
  imageSize: z.enum(["1K", "2K"]).optional(),
});

const videoInputSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  model: z.enum(["veo-3.1-fast-generate-preview"]).default("veo-3.1-fast-generate-preview"),
  resolution: z.enum(["720p", "1080p"]).default("720p"),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
});

function getGeminiClient(): { ai: GoogleGenAI; apiKey: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw serviceUnavailable("GEMINI_API_KEY is missing");
  }
  return { ai: new GoogleGenAI({ apiKey }), apiKey };
}

router.post(
  "/image",
  asyncHandler(async (req: Request, res: Response) => {
    const input = imageInputSchema.parse(req.body);
    const { ai } = getGeminiClient();
    const response = await ai.models.generateContent({
      model: input.model,
      contents: {
        parts: [{ text: input.prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: input.aspectRatio,
          ...(input.imageSize ? { imageSize: input.imageSize } : {}),
        },
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => !!part.inlineData?.data,
    );
    const data = imagePart?.inlineData?.data;
    const mimeType = imagePart?.inlineData?.mimeType || "image/png";
    if (!data) {
      throw badRequest("No image was returned by the model");
    }

    res.json({
      ok: true,
      imageDataUrl: `data:${mimeType};base64,${data}`,
      mimeType,
    });
  }),
);

router.post(
  "/video",
  asyncHandler(async (req: Request, res: Response) => {
    const input = videoInputSchema.parse(req.body);
    const { ai, apiKey } = getGeminiClient();
    let operation = await ai.models.generateVideos({
      model: input.model,
      prompt: input.prompt,
      config: {
        numberOfVideos: 1,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
      },
    });

    const deadline = Date.now() + 5 * 60 * 1000;
    while (!operation.done) {
      if (Date.now() > deadline) {
        throw serviceUnavailable("Video generation timed out");
      }
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw badRequest("No video was returned by the model");
    }

    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!videoResponse.ok) {
      throw serviceUnavailable("Failed to fetch the generated video file");
    }
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    const mimeType = videoResponse.headers.get("content-type") || "video/mp4";
    res.json({
      ok: true,
      videoDataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      mimeType,
    });
  }),
);

export const geminiRouter = router;
