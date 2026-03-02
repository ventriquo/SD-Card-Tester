import { Activity, Settings, HardDrive, Bug, History } from 'lucide-react';
import { getSettings } from './Settings';
import { useLanguage } from '../i18n/LanguageContext';
import { t } from '../i18n';

interface HeaderProps {
  onSettingsClick: () => void;
  onHistoryClick: () => void;
}

export function Header({ onSettingsClick, onHistoryClick }: HeaderProps) {
  const settings = getSettings();
  const { language } = useLanguage();
  
  return (
    <header className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/30 glow-primary">
          <Activity className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('appName', language)}</h1>
          <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
            v2.4.1 // {t('appSubtitle', language)}
            {settings.debugMode && (
              <span className="ml-2 text-[var(--color-primary)]">[DEBUG MODE]</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {settings.debugMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
            <Bug className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs font-mono text-[var(--color-primary)]">SIMULATION</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
          <HardDrive className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="text-xs font-mono text-[var(--color-text-muted)]">{t('systemOk', language)}</span>
        </div>
        <button
          onClick={onHistoryClick}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)] hover:text-white"
          title={t('history', language)}
        >
          <History className="w-5 h-5" />
        </button>
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)] hover:text-white"
          title={t('settings', language)}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
