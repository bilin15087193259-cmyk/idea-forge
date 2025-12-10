// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

/** 从环境变量读取（前端变量必须以 VITE_ 开头） */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

/** 按优先顺序尝试的模型，结合 v1beta 列表做自动回退 */
const PREFERRED_ORDER = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro",
];

const MODEL_CACHE_KEY = "idea-forge:gemini-model";

/** 对外：返回 Markdown 字符串 */
export async function generateFormattedNote(input: string): Promise<string> {
  if (!API_KEY) {
    return mdFromFallback(input, "Missing VITE_GEMINI_API_KEY");
  }

  // 1) 选模型（缓存优先，必要时调用 v1beta 列表）
  const modelName = await resolveModelName(API_KEY);

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt =
      "请将下面内容整理为笔记，返回 JSON：{ title, summary, bullets }。\n\n" + input;

    const res = await model.generateContent([{ text: prompt }]);
    const raw = res.response.text();

    const obj = safeParseJson(stripCodeFence(raw));
    return obj ? toMarkdown(obj, input) : mdFromRaw(raw, input);
  } catch (e: unknown) {
    // 2) 如果是典型 404（当前版本不支持该模型方法），清缓存换下一个再试一次
    const msg = String((e as any)?.message ?? e ?? "");
    const maybe404 =
      msg.includes("404") ||
      msg.includes("not found for API version v1beta") ||
      msg.includes("is not supported for generateContent");

    if (maybe404) {
      localStorage.removeItem(MODEL_CACHE_KEY);
      const next = await resolveModelName(API_KEY, true);
      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: next });

        const prompt =
          "请将下面内容整理为笔记，返回 JSON：{ title, summary, bullets }。\n\n" + input;

        const r2 = await model.generateContent([{ text: prompt }]);
        const raw2 = r2.response.text();
        const obj2 = safeParseJson(stripCodeFence(raw2));
        return obj2 ? toMarkdown(obj2, input) : mdFromRaw(raw2, input);
      } catch {
        return mdFromFallback(input, "No supported model for your key (v1beta)");
      }
    }

    // 其它错误：401/403/429/网络等
    return mdFromFallback(input, `Gemini error: ${msg || "unknown"}`);
  }
}

/* ---------- helpers ---------- */

function stripCodeFence(s: string): string {
  return s
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeParseJson(s: string): { title?: string; summary?: string; bullets?: string[] } | null {
  try {
    const o = JSON.parse(s);
    if (o && typeof o === "object") return o as any;
  } catch {}
  return null;
}

function toMarkdown(
  n: { title?: string; summary?: string; bullets?: string[] },
  fallbackInput: string
): string {
  const title = (n.title || "Untitled").trim();
  const summary = (n.summary || fallbackInput.slice(0, 140)).trim();
  const bullets = Array.isArray(n.bullets) && n.bullets.length ? n.bullets : ["（无要点）"];
  return [
    `# ${title}`,
    "",
    summary,
    "",
    "## Bullets",
    ...bullets.map((b) => `- ${b}`),
  ].join("\n");
}

function mdFromRaw(raw: string, input: string): string {
  return [
    `# Generated Note`,
    "",
    raw.slice(0, 200),
    "",
    "## Bullets",
    ...raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((b) => `- ${b}`),
  ].join("\n");
}

function mdFromFallback(input: string, why: string): string {
  return [
    `# Generated Note (fallback)`,
    "",
    `${why} | ${(input || "").slice(0, 140) || "No input"}`,
    "",
    "## Bullets",
    "- 已使用本地兜底，未调用远端 API。",
    "- 若一直 404：你的 Key 在该版本/地区暂不支持对应模型。",
    "- 日后开通后，此函数会自动优先使用 1.5 系列。",
  ].join("\n");
}

async function resolveModelName(key: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = localStorage.getItem(MODEL_CACHE_KEY);
    if (cached) return cached;
  }
  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key);
    const res = await fetch(url);
    const data = (await res.json()) as { models?: any[] };

    const supported = (data.models ?? []).filter((m) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent")
    );

    for (const name of PREFERRED_ORDER) {
      if (supported.some((m) => m.name === `models/${name}`)) {
        localStorage.setItem(MODEL_CACHE_KEY, name);
        return name;
      }
    }

    if (supported.length) {
      const name = String(supported[0].name || "").replace(/^models\//, "");
      localStorage.setItem(MODEL_CACHE_KEY, name);
      return name;
    }
  } catch {
    // 静默：列表失败就用兜底
  }
  const fallbackName = "gemini-1.0-pro";
  localStorage.setItem(MODEL_CACHE_KEY, fallbackName);
  return fallbackName;
}
