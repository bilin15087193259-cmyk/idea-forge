// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProcessedIdea } from "../types";

// 前端读取以 VITE_ 开头的构建期变量
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is missing");

// 官方 SDK 用法：构造函数直接传字符串 key（不是对象）
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

export async function generateFormattedNote(text: string): Promise<ProcessedIdea> {
  const prompt =
    "请将下面内容整理为笔记，返回 JSON：{ title, summary, bullets }。\n\n" + text;

  const result = await model.generateContent([{ text: prompt }]);
  const raw = result.response.text();

  // 去掉可能的 ```json 包裹后再解析
  const json = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    const data = JSON.parse(json) as Partial<ProcessedIdea>;
    return {
      title: data.title ?? "Untitled",
      summary: data.summary ?? text.slice(0, 120),
      bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : ["（无要点）"]
    };
  } catch {
    // 兜底：解析失败也给出可显示结果
    return {
      title: "Generated Note",
      summary: raw.slice(0, 200),
      bullets: raw.split(/\n+/).slice(0, 5).filter(Boolean)
    };
  }
}
