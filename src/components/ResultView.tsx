// src/components/ResultView.tsx
import React, { useMemo, useState } from "react";
import { Copy, Check, FileText, Download } from "lucide-react";

type ResultViewProps = {
  markdown: string;
};

const ResultView: React.FC<ResultViewProps> = ({ markdown }) => {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => markdown ?? "", [markdown]);
  if (!text) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const handleDownload = () => {
    try {
      const filename = suggestFilename(text);
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-obsidian-card rounded-xl border border-obsidian-muted/20 overflow-hidden shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-obsidian-sidebar border-b border-obsidian-muted/20">
        <div className="flex items-center text-gray-300">
          <FileText className="h-5 w-5 text-obsidian-accent" />
          <span className="ml-2 font-medium">Obsidian Note</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
              copied
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "bg-obsidian/80 hover:bg-obsidian/60 text-gray-300 border border-obsidian-muted/40"
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Markdown"}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-white text-black hover:bg-gray-200 transition-all border border-transparent"
          >
            <Download className="h-4 w-4" />
            Download .md
          </button>
        </div>
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

export { ResultView };

/* ---------- helpers ---------- */

// why: 从第一行 '# 标题' 提取文件名；否则用时间戳；保证合法文件名
function suggestFilename(md: string): string {
  const firstLine = md.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const titleMatch = firstLine.match(/^\s*#\s+(.+?)\s*$/);
  const raw =
    (titleMatch?.[1] || "note-" + timeStamp())
      .replace(/[\\/:*?"<>|]/g, "") // 去除非法字符
      .trim() || "note";
  return `${raw}.md`;
}

function timeStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}
