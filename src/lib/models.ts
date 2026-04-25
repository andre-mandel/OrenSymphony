import { BrainCircuit, Code, Database, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ModelDescriptor {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  /** True when calls are routed natively (Gemini family); false models get a Gemini fallback. */
  native: boolean;
}

export const AVAILABLE_MODELS: ModelDescriptor[] = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Google • Reasoning', icon: BrainCircuit, native: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Google • Fast', icon: Sparkles, native: true },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini Image', desc: 'Google • Image gen', icon: ImageIcon, native: true },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', desc: 'Anthropic • Logic (proxied)', icon: BrainCircuit, native: false },
  { id: 'cursor-ai', name: 'Cursor AI', desc: 'Cursor • Code (proxied)', icon: Code, native: false },
  { id: 'jules-ai', name: 'Jules AI', desc: 'Jules • Data (proxied)', icon: Database, native: false },
];

export const MODEL_BY_ID: Record<string, ModelDescriptor> = Object.fromEntries(
  AVAILABLE_MODELS.map(m => [m.id, m]),
);
