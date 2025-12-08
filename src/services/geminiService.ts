// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProcessedIdea } from "../types";

// 前端读取以 VITE_ 开头的构建期变量
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is missing");

// 官方 SDK 用法：构造函数直接传字符串 key（不是对象）
const genAI = new GoogleGenerativeAI(apiKey);
// src/services/geminiService.ts 仅需改这一行
const model = genAI.getGenerativeModel({ model: "gemini-pro" });


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
// ✅ 把这段加到 /src/services/geminiService.ts 末尾（不影响现有功能）
// 用你现有的 @google/generative-ai + VITE_GEMINI_API_KEY

export async function debugListModels(): Promise<void> {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) {
    console.error("VITE_GEMINI_API_KEY is missing");
    return;
  }
  try {
    // v1beta 列表；你的 SDK 报错里就是 v1beta，所以用它来对齐
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      key
    )}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      console.error("ListModels failed:", res.status, txt);
      return;
    }
    const data = await res.json();
    // 只保留支持 generateContent 的模型
    const usable = (data.models ?? []).filter((m: any) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent")
    );
    console.table(
      usable.map((m: any) => ({
        name: m.name, // 例如 "models/gemini-pro" 或 "models/gemini-1.5-flash"
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      }))
    );
  } catch (e) {
    console.error("ListModels error:", e);
  }
}

