// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/genai";
import type { ProcessedIdea } from "../types";

// 前端读取以 VITE_ 开头的构建期变量
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is missing. Set it in Vercel → Project → Settings → Environment Variables.");
}

const genAI = new GoogleGenerativeAI({ apiKey });
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateFormattedNote(text: string): Promise<ProcessedIdea> {
  const prompt = [
    "请将下面内容整理为一份笔记，返回 JSON：{ title, summary, bullets }。",
    "内容：",
    text
  ].join("\n\n");

  const result = await model.generateContent([{ text: prompt }]);
  const raw = result.response.text();

  // 兜底解析（去掉可能的 ```json 包裹）
  const json = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    const data = JSON.parse(json) as Partial<ProcessedIdea>;
    return {
      title: data.title ?? "Untitled",
      summary: data.summary ?? text.slice(0, 120),
      bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : ["（无要点）"]
    };
  } catch {
    return {
      title: "Generated Note",
      summary: raw.slice(0, 200),
      bullets: raw.split(/\n+/).slice(0, 5).filter(Boolean)
    };
  }
}
