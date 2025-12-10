// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const PREFERRED_ORDER = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro",
];

const MODEL_CACHE_KEY = "idea-forge:gemini-model";

type GenNote = {
  title?: string;
  idea?: string;
  why?: string;
  next?: string;
  category?: string[];   // 标签数组
  bullets?: string[];
};

export async function generateFormattedNote(input: string): Promise<string> {
  if (!API_KEY) return mdFromFallback(input, "Missing VITE_GEMINI_API_KEY");

  const modelName = await resolveModelName(API_KEY);

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      // 可微调风格：0.2 更稳，0.7 更有创造性
      generationConfig: { temperature: 0.4 },
    });

    // 显式 JSON 结构，减少跑偏
    const prompt = [
      "你是一个“想法整理助手”，请将用户输入的内容整理为结构化 JSON：",
      "",
      "输出必须是**纯 JSON**，不要任何多余文字或代码块标记，例如 ```json。",
      "JSON 结构如下：",
      "{",
      '  "title": string,',
      '  "idea": string,            // 对想法的清晰一句话描述',
      '  "why": string,             // 这个想法的意义/动机',
      '  "next": string,            // 下一步行动一句话',
      '  "category": string[],      // 分类/标签，如 ["#life","#work"]',
      '  "bullets": string[]        // 要点列表（2-6条）',
      "}",
      "",
      "要求：",
      "- 简洁、可读；中文输出；",
      "- 如果用户输入很短，也要尽量补全；",
      "- category 里用带 # 的短标签；",
      "- bullets 每条不超过 60 字。",
      "",
      "用户输入：\n" + input,
    ].join("\n");

    const res = await model.generateContent([{ text: prompt }]);
    const raw = res.response.text();
    const obj = safeParseJson(stripCodeFence(raw)) as GenNote | null;

    return obj ? toMarkdown(obj, input) : mdFromRaw(raw, input);
  } catch (e: unknown) {
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
        const model = genAI.getGenerativeModel({ model: next, generationConfig: { temperature: 0.4 } });
        const prompt = [
          "你是一个“想法整理助手”，请将用户输入的内容整理为结构化 JSON：",
          "",
          "输出必须是**纯 JSON**，不要任何多余文字或代码块标记，例如 ```json。",
          "JSON 结构如下：",
          "{",
          '  "title": string,',
          '  "idea": string,',
          '  "why": string,',
          '  "next": string,',
          '  "category": string[],',
          '  "bullets": string[]',
          "}",
          "",
          "要求：中文输出、简洁、可读；category 使用带 # 的短标签；bullets 2-6 条。",
          "",
          "用户输入：\n" + input,
        ].join("\n");
        const r2 = await model.generateContent([{ text: prompt }]);
        const raw2 = r2.response.text();
        const obj2 = safeParseJson(stripCodeFence(raw2)) as GenNote | null;
        return obj2 ? toMarkdown(obj2, input) : mdFromRaw(raw2, input);
      } catch {
        return mdFromFallback(input, "No supported model for your key (v1beta)");
      }
    }
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

function safeParseJson(s: string): any | null {
  try {
    const o = JSON.parse(s);
    if (o && typeof o === "object") return o;
  } catch {}
  return null;
}

function toMarkdown(n: GenNote, rawInput: string): string {
  const title = (n.title || "Idea — " + formatNow()).trim();
  const idea = (n.idea || "").trim();
  const why = (n.why || "").trim();
  const next = (n.next || "").trim();
  const category = Array.isArray(n.category) ? n.category.filter(Boolean) : [];
  const bullets = Array.isArray(n.bullets) && n.bullets.length ? n.bullets : [];

  const lines: string[] = [];
  lines.push(`# ${title}`, "");
  if (idea || why || next || category.length) {
    if (idea)   lines.push(`- **Idea:** ${idea}`);
    if (why)    lines.push(`- **Why:** ${why}`);
    if (next)   lines.push(`- **Next Step:** ${next}`);
    if (category.length) lines.push(`- **Category:** ${category.join(" ")}`);
    lines.push("");
  }
  lines.push("## Bullets");
  if (bullets.length) lines.push(...bullets.map((b) => `- ${b}`));
  else lines.push("- （无要点）");
  lines.push("", "---", "", "**Raw Input:**", rawInput.trim() || "（空）");

  return lines.join("\n");
}

function mdFromRaw(raw: string, input: string): string {
  return [
    `# Idea — ${formatNow()}`,
    "",
    "## Bullets",
    ...raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((b) => `- ${b}`),
    "",
    "---",
    "",
    "**Raw Input:**",
    input.trim() || "（空）",
  ].join("\n");
}

function mdFromFallback(input: string, why: string): string {
  return [
    `# Idea — ${formatNow()}`,
    "",
    `- **Why:** ${why}`,
    "",
    "## Bullets",
    "- 已使用本地兜底结果。",
    "",
    "---",
    "",
    "**Raw Input:**",
    input.trim() || "（空）",
  ].join("\n");
}

function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
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
  } catch {}
  const fallbackName = "gemini-1.0-pro";
  localStorage.setItem(MODEL_CACHE_KEY, fallbackName);
  return fallbackName;
}
