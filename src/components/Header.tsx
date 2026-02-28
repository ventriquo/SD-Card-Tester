import { Activity, Settings, HardDrive } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/30 glow-primary">
          <Activity className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">MicroSD Validator</h1>
          <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-wider">v2.4.1 // Professional Edition</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
          <HardDrive className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="text-xs font-mono text-[var(--color-text-muted)]">SYSTEM: OK</span>
        </div>
        <button className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)] hover:text-white">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
