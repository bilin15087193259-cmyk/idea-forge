// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProcessedIdea } from "../types";

/** 读取前端变量（必须以 VITE_ 开头），未配置也不让页面崩 */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

/** 你看到 404 的根因：不同账号/地区，v1beta 可用模型集合不同 */
const PREFERRED_ORDER = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro",
];

/** 本地缓存键，避免每次都请求模型清单 */
const MODEL_CACHE_KEY = "idea-forge:gemini-model";

/** 公开 API：生成结构化笔记 */
export async function generateFormattedNote(text: string): Promise<ProcessedIdea> {
  if (!API_KEY) {
    return fallback(text, "Missing VITE_GEMINI_API_KEY");
  }

  // 1) 先拿到当前可用模型（缓存优先）
  const modelName = await resolveModelName(API_KEY);

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt =
      "请将下面内容整理为笔记，返回 JSON：{ title, summary, bullets }。\n\n" + text;

    const result = await model.generateContent([{ text: prompt }]);
    const raw = result.response.text();

    // 去掉可能的 ```json 包裹
    const json = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    try {
      const data = JSON.parse(json) as Partial<ProcessedIdea>;
      return {
        title: data.title ?? "Untitled",
        summary: data.summary ?? text.slice(0, 140),
        bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : ["（无要点）"],
      };
    } catch {
      // 返回非严格 JSON，就做降级渲染
      return {
        title: "Generated Note",
        summary: raw.slice(0, 200),
        bullets: raw.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 5),
      };
    }
  } catch (err: unknown) {
    // 2) 如果是 404（模型不支持 generateContent），清缓存换下一个模型再试一次
    const msg = String((err as any)?.message ?? err ?? "");
    const maybe404 =
      msg.includes("404") ||
      msg.includes("not found for API version v1beta") ||
      msg.includes("is not supported for generateContent");

    if (maybe404) {
      localStorage.removeItem(MODEL_CACHE_KEY);
      const next = await resolveModelName(API_KEY, /*forceRefresh*/ true);
      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: next });

        const prompt =
          "请将下面内容整理为笔记，返回 JSON：{ title, summary, bullets }。\n\n" + text;

        const r = await model.generateContent([{ text: prompt }]);
        const raw = r.response.text();
        const json = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

        try {
          const data = JSON.parse(json) as Partial<ProcessedIdea>;
          return {
            title: data.title ?? "Untitled",
            summary: data.summary ?? text.slice(0, 140),
            bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : ["（无要点）"],
          };
        } catch {
          return {
            title: "Generated Note",
            summary: raw.slice(0, 200),
            bullets: raw.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 5),
          };
        }
      } catch (_) {
        return fallback(text, "No supported model for your key (v1beta)");
      }
    }

    // 其它错误（401/403/429 等）
    return fallback(text, `Gemini error: ${msg || "unknown"}`);
  }
}

/** —— 工具函数区 —— */

/** 先用缓存；需要时调 v1beta ListModels，挑一个有 generateContent 的模型 */
async function resolveModelName(key: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = localStorage.getItem(MODEL_CACHE_KEY);
    if (cached) return cached;
  }

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models?key=" +
      encodeURIComponent(key);
    const res = await fetch(url);
    const data = (await res.json()) as { models?: any[] };

    const supported = (data.models ?? []).filter((m) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent")
    );

    // 按优先顺序挑第一个存在的
    for (const name of PREFERRED_ORDER) {
      if (supported.some((m) => m.name === `models/${name}`)) {
        localStorage.setItem(MODEL_CACHE_KEY, name);
        return name;
      }
    }

    // 没有命中优先表，就选第一个支持 generateContent 的
    if (supported.length) {
      const name = String(supported[0].name || "").replace(/^models\//, "");
      localStorage.setItem(MODEL_CACHE_KEY, name);
      return name;
    }
  } catch {
    // 忽略列表失败，走常见兜底
  }

  // 兜底顺序里最“兼容”的一个
  const fallbackName = "gemini-1.0-pro";
  localStorage.setItem(MODEL_CACHE_KEY, fallbackName);
  return fallbackName;
}

function fallback(text: string, why: string): ProcessedIdea {
  return {
    title: "Generated Note (fallback)",
    summary: `${why} | ${text.slice(0, 140) || "No input"}`,
    bullets: [
      "已使用本地兜底结果。",
      "如果一直 404：说明你的 Key 对应版本/地区暂不支持 1.5/某些模型。",
      "等可用后，上面的自动选择会优先用 1.5 系列。",
    ],
  };
}

/** 可手动在控制台调用，查看当前可用模型 */
export async function debugListModels(): Promise<void> {
  if (!API_KEY) return console.error("VITE_GEMINI_API_KEY is missing");
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models?key=" +
    encodeURIComponent(API_KEY);
  const res = await fetch(url);
  const data = await res.json();
  const usable = (data.models ?? []).filter((m: any) =>
    (m.supportedGenerationMethods ?? []).includes("generateContent")
  );
  console.table(
    usable.map((m: any) => ({
      name: m.name,
      displayName: m.displayName,
      methods: m.supportedGenerationMethods,
    }))
  );
}
