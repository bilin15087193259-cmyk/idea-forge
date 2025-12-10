// src/components/ResultView.tsx
import React, { useMemo, useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import type { ProcessedIdea } from "../types";
import { toMarkdown } from "../utils/formatNote";

/** 兼容两种用法：要么传 markdown 字符串，要么传结果对象 */
type ResultViewProps =
  | { markdown: string; result?: never }
  | { result: ProcessedIdea | null; markdown?: never };

const ResultView: React.FC<ResultViewProps> = (props) => {
  const [copied, setCopied] = useState(false);

  // 统一得到要展示/复制的纯文本
  const text = useMemo(() => {
    if ("markdown" in props && typeof props.markdown === "string") return props.markdown;
    if ("result" in props && props.result) return toMarkdown(props.result);
    return "";
  }, [props]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  if (!text) return null;

  return (
    <div className="flex flex-col h-full bg-obsidian-card rounded-xl border border-obsidian-muted/20 overflow-hidden shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-obsidian-sidebar border-b border-obsidian-muted/20">
        <div className="flex items-center text-gray-300">
          <FileText className="h-5 w-5 text-obsidian-accent" />
          <span className="ml-2 font-medium">Obsidian Note</span>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
            copied
              ? "bg-green-500/20 text-green-300 border-green-500/30"
              : "bg-obsidian/80 hover:bg-obsidian/60 text-gray-300 border border-obsidian-muted/40"
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Markdown"}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-auto relative">
        <textarea
          readOnly
          value={text}
          className="w-full h-full p-0 bg-obsidian-card text-gray-300 font-mono text-sm resize-none focus:outline-none leading-relaxed selection:bg-obsidian-accent/30 selection:text-white"
        />
      </div>
    </div>
  );
};

export default ResultView;
