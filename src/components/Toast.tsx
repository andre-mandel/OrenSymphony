import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  tone: ToastTone;
}

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
};

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'border-border text-text-main',
  success: 'border-emerald-500/50 text-emerald-300',
  error: 'border-red-500/50 text-red-300',
};

function ToastItem({ id, text, tone, onDismiss }: ToastMessage & { onDismiss: (id: string) => void }) {
  const Icon = ICONS[tone];
  useEffect(() => {
    const handle = setTimeout(() => onDismiss(id), tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(handle);
  }, [id, tone, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-surface border rounded-lg px-4 py-3 shadow-xl max-w-sm pointer-events-auto',
        TONE_CLASS[tone],
      )}
      role="status"
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="text-xs leading-relaxed flex-1 break-words">{text}</div>
      <button
        onClick={() => onDismiss(id)}
        className="text-text-dim hover:text-text-main"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}>
          <ToastItem id={t.id} text={t.text} tone={t.tone} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
