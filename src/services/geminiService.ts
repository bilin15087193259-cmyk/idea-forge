// /src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProcessedIdea } from "../types";

// why: 前端只能读取以 VITE_ 开头的构建期变量
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is missing. Set it in Vercel → Project → Settings → Environment Variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);
// 你也可以换成你想要的模型
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateFormattedNote(text: string): Promise<ProcessedIdea> {
  const prompt = [
    "请将下面内容整理为一份简明的笔记，给出：标题、2~3句摘要、3~5条要点。",
    "用 JSON 返回：{ title, summary, bullets }。",
    "内容：",
    text
  ].join("\n\n");

  const result = await model.generateContent([{ text: prompt }]);
  const raw = result.response.text();

  // 简单兜底解析（考虑模型可能返回 markdown 代码块）
  const jsonText = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const data = JSON.parse(jsonText) as ProcessedIdea;
    return {
      title: data.title ?? "Untitled",
      summary: data.summary ?? text.slice(0, 120),
      bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : ["（无要点）"]
    };
  } catch {
    // why: 即使解析失败也返回一个可展示的结构，避免前端崩溃
    return {
      title: "Generated Note",
      summary: raw.slice(0, 200),
      bullets: raw.split(/\n+/).slice(0, 5).filter(Boolean)
    };
  }
}
