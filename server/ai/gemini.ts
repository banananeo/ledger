import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt, buildUserMessage, type AIContext } from "./prompts.js";

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function isGeminiConfigured(): boolean {
  return !!getApiKey();
}

export async function generateAIResponse(opts: {
  message: string;
  context: AIContext;
  model?: string;
  stream?: boolean;
  onChunk?: (text: string) => void;
}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured on server. Set GEMINI_API_KEY in .env or Vercel env.");
  }
  const model = opts.model || process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = buildSystemPrompt(opts.context);
  const userText = buildUserMessage(opts.message, opts.context);

  // Try streaming if requested
  if (opts.stream && opts.onChunk) {
    const stream = await ai.models.generateContentStream({
      model,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });
    let full = "";
    for await (const chunk of stream) {
      const text = (chunk as any).text ?? "";
      if (text) {
        full += text;
        opts.onChunk(text);
      }
    }
    return full || "No response from AI.";
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    config: {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 800,
    },
  });

  const text = (response as any).text ?? "";
  if (!text) throw new Error("Empty response from Gemini.");
  return text;
}

export async function generateSummary(context: AIContext): Promise<string> {
  return generateAIResponse({
    message: "Give me a concise health summary: overall attendance, at-risk courses, marks highlights, and 3 next actions. Be brief.",
    context,
  });
}
