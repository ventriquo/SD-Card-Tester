import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Bug, Database, Languages, HardDrive } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppSettings {
  debugMode: boolean;
  defaultTestMethod: 'quick' | 'deep' | 'h2testw';
  language: 'en' | 'id';
  showDriveLabels: boolean;
}

const defaultSettings: AppSettings = {
  debugMode: false,
  defaultTestMethod: 'quick',
  language: 'en',
  showDriveLabels: true,
};

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sd-card-tester-settings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        console.error('Failed to parse settings');
      }
    }
  }, []);

  // Save settings when they change
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('sd-card-tester-settings', JSON.stringify(newSettings));
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('settings-changed', { detail: newSettings }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-full max-w-lg mx-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Settings</h2>
                    <p className="text-sm text-[var(--color-text-muted)]">Configure app behavior</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Settings Content */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Debug Mode Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <Bug className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Debug Mode</h3>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.debugMode}
                        onChange={(e) => updateSetting('debugMode', e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <div>
                        <p className="font-medium">Enable Simulation Mode</p>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">
                          When enabled, a dummy test drive will appear and tests will run in simulation mode 
                          without writing to actual disks. Perfect for UI testing and development.
                        </p>
                        {settings.debugMode && (
                          <div className="mt-3 p-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                            <p className="text-sm text-[var(--color-primary)]">
                              <strong>Debug Active:</strong> Look for "DUMMY-TEST-DRIVE" in the drive list
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Test Method Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--color-success)]">
                    <Database className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Default Test Method</h3>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <div className="space-y-2">
                      {[
                        { value: 'quick', label: 'Quick Scan', desc: 'Fast spot check (2-5 min)' },
                        { value: 'deep', label: 'Deep Scan', desc: 'Full capacity test' },
                        { value: 'h2testw', label: 'H2testw Style', desc: 'Industry standard verification' },
                      ].map((method) => (
                        <label key={method.value} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors">
                          <input
                            type="radio"
                            name="testMethod"
                            value={method.value}
                            checked={settings.defaultTestMethod === method.value}
                            onChange={(e) => updateSetting('defaultTestMethod', e.target.value as any)}
                            className="w-4 h-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                          />
                          <div>
                            <p className="font-medium">{method.label}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">{method.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Language Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Languages className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Language</h3>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <div className="flex gap-2">
                      {[
                        { value: 'en', label: 'English' },
                        { value: 'id', label: 'Bahasa Indonesia' },
                      ].map((lang) => (
                        <button
                          key={lang.value}
                          onClick={() => updateSetting('language', lang.value as any)}
                          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                            settings.language === lang.value
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)]'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Display Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <HardDrive className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Display</h3>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Show drive labels</span>
                      <input
                        type="checkbox"
                        checked={settings.showDriveLabels}
                        onChange={(e) => updateSetting('showDriveLabels', e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary)]/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export settings helper
export function getSettings(): AppSettings {
  const saved = localStorage.getItem('sd-card-tester-settings');
  if (saved) {
    try {
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export type { AppSettings };
