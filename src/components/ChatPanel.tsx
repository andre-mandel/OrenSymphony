import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { chat } from '../lib/gemini';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Hello! I am OrenSymphony. How can I help you orchestrate your AI tasks today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const responseText = await chat(history, userMsg.text);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: responseText
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'Sorry, I encountered an error processing your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-[280px] border-l border-border bg-[#080808] flex flex-col h-full py-8 px-5">
      <div className="text-[11px] uppercase text-text-dim mb-5 tracking-widest font-bold">
        OrenSymphony Details
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col gap-1 text-sm", msg.role === 'user' ? "items-end" : "items-start")}>
            <div className="text-[10px] uppercase text-text-dim font-bold tracking-wider">
              {msg.role === 'user' ? 'You' : 'OrenSymphony'}
            </div>
            <div className={cn(
              "px-3 py-2 rounded max-w-[90%]",
              msg.role === 'user' 
                ? "bg-accent text-bg" 
                : "bg-surface border border-border text-text-main"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col gap-1 text-sm items-start">
            <div className="text-[10px] uppercase text-text-dim font-bold tracking-wider">
              OrenSymphony
            </div>
            <div className="px-3 py-2 rounded bg-surface border border-border text-text-dim flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask OrenSymphony..."
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
    </aside>
  );
}
