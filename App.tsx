import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, History, Plus, Menu, X, ArrowRight, BrainCircuit, Save } from 'lucide-react';
import { generateFormattedNote } from './services/geminiService';
import { ProcessedIdea, ProcessingState } from './types';
import { HistoryItem } from './components/HistoryItem';
import { ResultView } from './components/ResultView';

const MAX_HISTORY = 20;

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ProcessedIdea[]>([]);
  const [currentResult, setCurrentResult] = useState<ProcessedIdea | null>(null);
  const [status, setStatus] = useState<ProcessingState>({ status: 'idle' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('idea-forge-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem('idea-forge-history', JSON.stringify(history));
  }, [history]);

  const handleProcess = async () => {
    if (!input.trim()) return;

    setStatus({ status: 'loading' });
    
    try {
      const markdown = await generateFormattedNote(input);
      
      const newIdea: ProcessedIdea = {
        id: crypto.randomUUID(),
        original: input,
        markdown: markdown,
        timestamp: Date.now(),
        preview: input.slice(0, 40) + (input.length > 40 ? '...' : '')
      };

      setCurrentResult(newIdea);
      setHistory(prev => [newIdea, ...prev].slice(0, MAX_HISTORY));
      setStatus({ status: 'success' });
      // Keep input for reference or clear? Let's clear to encourage next idea.
      // But maybe user wants to edit... let's keep it until they explicitly clear or new one.
      setInput(''); 
    } catch (error) {
      setStatus({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
  };

  // --- Added for iOS Shortcut integration ---
  const handleSaveToObsidian = () => {
    if (!currentResult?.markdown) return;
    
    // Encode the markdown content for URL
    const encodedMarkdown = encodeURIComponent(currentResult.markdown);
    
    // Construct the iOS Shortcut URL
    // This assumes a shortcut named "SaveToObsidian" exists and accepts input
    const url = `shortcuts://run-shortcut?name=SaveToObsidian&input=${encodedMarkdown}`;
    
    // Trigger the shortcut
    window.location.href = url;
  };

  const handleSelectHistory = (item: ProcessedIdea) => {
    setCurrentResult(item);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
  };

  const handleNew = () => {
    setCurrentResult(null);
    setInput('');
    setStatus({ status: 'idle' });
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-obsidian-bg text-gray-200 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - History */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-obsidian-sidebar border-r border-obsidian-muted/20 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-obsidian-muted/20 flex items-center justify-between">
            <div className="flex items-center text-obsidian-text font-semibold tracking-wide">
              <BrainCircuit className="w-5 h-5 mr-2 text-obsidian-accent" />
              Idea Forge
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="lg:hidden p-1 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-3">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-obsidian-accent hover:bg-violet-700 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-violet-900/20"
            >
              <Plus size={16} />
              <span>New Idea</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
              <History size={12} className="mr-1.5" />
              Recent Forges
            </div>
            {history.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm italic">
                No ideas yet.
                <br />Start forging!
              </div>
            ) : (
              history.map(item => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onSelect={handleSelectHistory}
                  onDelete={handleDeleteHistory}
                  isActive={currentResult?.id === item.id}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="h-14 border-b border-obsidian-muted/20 flex items-center justify-between px-4 lg:px-8 bg-obsidian-bg/50 backdrop-blur supports-[backdrop-filter]:bg-obsidian-bg/50">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 mr-2 -ml-2 text-gray-400 hover:text-white rounded-md"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm lg:text-base font-medium text-gray-400">
              {currentResult ? 'Forged Result' : 'Input Idea'}
            </h1>
          </div>
          {status.status === 'loading' && (
            <div className="flex items-center text-obsidian-accent text-sm animate-pulse">
              <Sparkles size={16} className="mr-2" />
              Processing...
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
            
            {/* If we have a result, show split view or full view depending on state */}
            {currentResult ? (
              <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <ResultView markdown={currentResult.markdown} />
                 
                 <div className="mt-6 flex flex-col items-center gap-4">
                    {/* --- Added for iOS Shortcut integration --- */}
                    <button
                      onClick={handleSaveToObsidian}
                      className="flex items-center px-6 py-3 bg-obsidian-accent hover:bg-violet-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-violet-900/20 hover:scale-105 active:scale-95"
                    >
                      <Save size={18} className="mr-2" />
                      Save to Obsidian
                    </button>

                    <button 
                        onClick={handleNew}
                        className="text-sm text-gray-500 hover:text-obsidian-accent flex items-center transition-colors"
                    >
                        <Plus size={14} className="mr-1" /> Draft another idea
                    </button>
                 </div>
              </div>
            ) : (
              /* Input View */
              <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
                <div className="mb-6 text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Capture your thoughts</h2>
                  <p className="text-gray-400">
                    Pour your messy ideas below. We'll organize them for Obsidian.
                  </p>
                </div>

                <div className="bg-obsidian-card rounded-xl border border-obsidian-muted/30 p-1 shadow-2xl focus-within:ring-2 focus-within:ring-obsidian-accent/50 transition-all duration-300">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="E.g., I need to remember to buy milk and maybe start that blog post about React hooks because they are confusing but powerful..."
                    className="w-full h-48 bg-transparent p-4 text-gray-200 placeholder-gray-600 resize-none focus:outline-none text-base leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleProcess();
                      }
                    }}
                  />
                  <div className="px-2 pb-2 flex justify-between items-center border-t border-obsidian-muted/10 pt-2">
                     <span className="text-xs text-gray-600 pl-2">
                        {input.length} chars
                     </span>
                     <button
                        onClick={handleProcess}
                        disabled={status.status === 'loading' || !input.trim()}
                        className={`flex items-center px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                          status.status === 'loading' || !input.trim()
                            ? 'bg-obsidian-muted/20 text-gray-500 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-gray-200 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {status.status === 'loading' ? (
                          <>Processing...</>
                        ) : (
                          <>
                            Forge Note <ArrowRight size={16} className="ml-2" />
                          </>
                        )}
                      </button>
                  </div>
                </div>

                {status.status === 'error' && (
                   <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg text-sm text-center">
                      {status.error}
                   </div>
                )}
                
                <div className="mt-6 text-center text-xs text-gray-600">
                    <p>Tip: Press <kbd className="font-mono bg-obsidian-sidebar px-1 rounded text-gray-400">Cmd + Enter</kbd> to submit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;