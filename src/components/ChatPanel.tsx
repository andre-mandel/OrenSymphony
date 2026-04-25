import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { executeText, pickRoute } from '../lib/calls';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

const SYSTEM = 'You are OrenSymphony, an advanced AI orchestrator assistant. Help users build and debug AI pipelines. Be concise and actionable.';

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Hello! I am OrenSymphony. Ask me how to wire up a pipeline, or use the prompt at the top to auto-orchestrate one.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: `${Date.now()}-u`, role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const decision = await pickRoute(userMsg.text);
      if (!decision.model_id) throw new Error('No models registered. Open Settings to add one.');
      const transcript = [...messages, userMsg]
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n\n');
      const result = await executeText({
        modelId: decision.model_id,
        systemInstruction: SYSTEM,
        prompt: '',
        inputData: transcript,
      });
      setMessages(prev => [...prev, { id: `${Date.now()}-m`, role: 'model', text: result.text || '(empty response)', modelUsed: result.modelUsed }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [...prev, { id: `${Date.now()}-e`, role: 'model', text: `Error: ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex flex-col gap-1 text-sm', msg.role === 'user' ? 'items-end' : 'items-start')}>
            <div className="text-[10px] uppercase text-text-dim font-bold tracking-wider">
              {msg.role === 'user' ? 'You' : msg.modelUsed ? `OrenSymphony · ${msg.modelUsed}` : 'OrenSymphony'}
            </div>
            <div className={cn(
              'px-3 py-2 rounded max-w-[90%] whitespace-pre-wrap break-words',
              msg.role === 'user' ? 'bg-accent text-bg' : 'bg-surface border border-border text-text-main',
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col gap-1 text-sm items-start">
            <div className="text-[10px] uppercase text-text-dim font-bold tracking-wider">OrenSymphony</div>
            <div className="px-3 py-2 rounded bg-surface border border-border text-text-dim flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Routing & thinking…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask OrenSymphony…"
          className="w-full bg-surface border border-border rounded pl-3 pr-10 py-2 text-sm text-text-main placeholder:text-text-dim focus:outline-none focus:border-accent transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-accent disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
