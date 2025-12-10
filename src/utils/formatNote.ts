// src/utils/formatNote.ts
import type { ProcessedIdea } from "../types";

/** 把生成的对象转成 Obsidian 友好的 Markdown 文本 */
export function toMarkdown(n: ProcessedIdea): string {
  const title = (n.title || "Untitled").trim();
  const summary = (n.summary || "").trim();
  const bullets = Array.isArray(n.bullets) ? n.bullets.filter(Boolean) : [];

  const lines: string[] = [
    `# ${title}`,
    "",
    summary,
    "",
    "## Bullets",
    ...(bullets.length ? bullets.map(b => `- ${b}`) : ["- （无要点）"]),
  ];

  return lines.join("\n");
}

