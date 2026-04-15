import React, { useState } from 'react';
import { Network, Wand2, Play, Loader2 } from 'lucide-react';

interface TopBarProps {
  onAutoOrchestrate: (prompt: string) => void;
  isGenerating: boolean;
  onRunPipeline: () => void;
  isRunning: boolean;
}

export function TopBar({ onAutoOrchestrate, isGenerating, onRunPipeline, isRunning }: TopBarProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onAutoOrchestrate(prompt);
      setPrompt('');
    }
  };

  return (
    <header className="h-20 border-b border-border bg-bg flex items-center justify-between px-10 z-10 relative">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-black tracking-tighter uppercase">
          Oren<span className="text-accent">Symphony</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-8">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative flex items-center">
            <Wand2 className="absolute left-4 w-4 h-4 text-text-dim" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe a task to auto-orchestrate..."
              className="w-full bg-surface border border-border rounded pl-11 pr-32 py-2.5 text-sm text-text-main placeholder:text-text-dim focus:outline-none focus:border-accent transition-all"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-border hover:bg-text-dim text-text-main text-xs font-bold rounded transition-colors disabled:opacity-50 flex items-center gap-2 uppercase"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <SparklesIcon />}
              Generate
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-[10px] uppercase tracking-widest bg-surface px-3 py-1.5 border border-border rounded text-accent">
          ● System Evolving
        </div>
        <button
          onClick={onRunPipeline}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2 bg-accent text-bg font-bold text-sm rounded transition-all disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Pipeline
        </button>
      </div>
    </header>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
