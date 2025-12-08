import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';

interface ResultViewProps {
  markdown: string;
}

export const ResultView: React.FC<ResultViewProps> = ({ markdown }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!markdown) return null;

  return (
    <div className="flex flex-col h-full bg-obsidian-card rounded-xl border border-obsidian-muted/20 overflow-hidden shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-obsidian-sidebar border-b border-obsidian-muted/20">
        <div className="flex items-center text-gray-300">
          <FileText size={16} className="mr-2 text-obsidian-accent" />
          <span className="text-sm font-medium">Obsidian Note</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            copied
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-obsidian-bg hover:bg-gray-700 text-gray-300 border border-transparent'
          }`}
        >
          {copied ? (
            <>
              <Check size={14} className="mr-1.5" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} className="mr-1.5" />
              Copy Markdown
            </>
          )}
        </button>
      </div>
      
      <div className="flex-1 p-0 overflow-auto relative">
        <textarea
          readOnly
          value={markdown}
          className="w-full h-full p-6 bg-obsidian-card text-gray-300 font-mono text-sm resize-none focus:outline-none leading-relaxed selection:bg-obsidian-accent/30 selection:text-white"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
