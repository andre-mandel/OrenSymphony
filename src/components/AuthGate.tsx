import React, { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text-dim text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (state.status === 'setup_required') return <SetupForm />;
  if (state.status === 'login_required') return <LoginForm />;
  return <>{children}</>;
}

function SetupForm() {
  const { setup } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) { setErr('At least 8 characters.'); return; }
    if (pwd !== pwd2) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try { await setup(pwd); } catch (e) {
      setErr(e instanceof Error ? e.message : 'Setup failed.');
    } finally { setBusy(false); }
  };

  return (
    <Shell title="First-run setup" subtitle="Create a master password. It guards every provider key, MCP server, and model in this OrenSymphony deployment.">
      <form onSubmit={submit} className="space-y-3">
        <PwdField value={pwd} onChange={setPwd} label="Master password" autoFocus />
        <PwdField value={pwd2} onChange={setPwd2} label="Confirm password" />
        {err && <div className="text-xs text-red-400">{err}</div>}
        <button type="submit" disabled={busy} className="w-full bg-accent text-bg font-bold text-sm py-2.5 rounded transition-all disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Create vault
        </button>
      </form>
    </Shell>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try { await login(pwd); } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login failed.');
    } finally { setBusy(false); }
  };

  return (
    <Shell title="OrenSymphony" subtitle="Enter master password to unlock the vault.">
      <form onSubmit={submit} className="space-y-3">
        <PwdField value={pwd} onChange={setPwd} label="Master password" autoFocus />
        {err && <div className="text-xs text-red-400">{err}</div>}
        <button type="submit" disabled={busy} className="w-full bg-accent text-bg font-bold text-sm py-2.5 rounded transition-all disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Unlock
        </button>
      </form>
    </Shell>
  );
}

function PwdField({ value, onChange, label, autoFocus }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">{label}</div>
      <input
        type="password"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-accent"
      />
    </label>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center h-screen bg-bg text-text-main">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-2xl">
        <div className="text-2xl font-black tracking-tighter uppercase mb-1">
          Oren<span className="text-accent">Symphony</span>
        </div>
        <div className="text-[11px] uppercase tracking-widest text-text-dim mb-6">{title}</div>
        <p className="text-xs text-text-dim mb-6 leading-relaxed">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
