import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { HistoryEntry, HistoryStats } from '../../electron/services/HistoryStore';
import { t } from '../i18n';
import { useLanguage } from '../i18n/LanguageContext';

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function History({ isOpen, onClose }: HistoryProps) {
  const { language } = useLanguage();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Load from main process via IPC
      const historyData = await window.electronAPI?.getHistory?.() || [];
      const statsData = await window.electronAPI?.getHistoryStats?.() || null;
      setEntries(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }
    try {
      const results = await window.electronAPI?.searchHistory?.(searchQuery) || [];
      setEntries(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const path = await window.electronAPI?.exportHistory?.(format);
      if (path) {
        alert(`History exported to: ${path}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export history');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteEntry', language))) return;
    try {
      await window.electronAPI?.deleteHistoryEntry?.(id);
      loadHistory();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`${t('clearAll', language)}?`)) return;
    try {
      await window.electronAPI?.clearHistory?.();
      loadHistory();
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass': return 'text-green-500 bg-green-500/10';
      case 'fail': return 'text-red-500 bg-red-500/10';
      case 'warning': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass': return '✓';
      case 'fail': return '✗';
      case 'warning': return '⚠';
      default: return '-';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">{t('testHistory', language)}</h2>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">
                {t('historyDescription', language)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats Overview */}
          {stats && stats.totalTests > 0 && (
            <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
                  <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">{t('totalTests', language)}</p>
                  <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{stats.totalTests}</p>
                </div>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
                  <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">{t('passed', language)}</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{stats.passedTests}</p>
                </div>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
                  <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">{t('failed', language)}</p>
                  <p className="text-2xl font-bold text-red-500 mt-1">{stats.failedTests}</p>
                </div>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
                  <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">{t('fakeCardsDetected', language)}</p>
                  <p className="text-2xl font-bold text-amber-500 mt-1">{stats.fakeCardsDetected}</p>
                </div>
              </div>

              {stats.averageWriteSpeed > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--color-text-muted)]">{t('averageWriteSpeed', language)}:</span>
                    <span className="font-semibold text-[var(--color-text)]">{stats.averageWriteSpeed} MB/s</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--color-text-muted)]">{t('averageReadSpeed', language)}:</span>
                    <span className="font-semibold text-[var(--color-text)]">{stats.averageReadSpeed} MB/s</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search & Actions */}
          <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('searchHistory', language)}
                className="w-full px-4 py-2 pl-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {t('searchHistory', language).split(' ')[0]}
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {t('exportJson', language)}
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {t('exportCsv', language)}
            </button>
            {entries.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 hover:bg-red-500/20 transition-colors"
              >
                {t('clearAll', language)}
              </button>
            )}
          </div>

          {/* History List */}
          <div className="overflow-y-auto max-h-[50vh]">
            {loading ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
                {t('historyDescription', language)}...
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">{t('noHistoryYet', language)}</p>
                <p className="text-sm mt-1">{t('runFirstTest', language)}</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer group"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${getResultColor(entry.result)}`}>
                            {getResultIcon(entry.result)}
                          </span>
                          <h3 className="font-semibold text-[var(--color-text)]">
                            {entry.driveLabel || entry.driveName}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                            {entry.testType}
                          </span>
                          {entry.fakeProbability > 50 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/30">
                              {entry.fakeProbability}% Fake
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
                          <span>{formatDate(entry.timestamp)}</span>
                          <span>•</span>
                          <span>{formatBytes(entry.capacity)}</span>
                          <span>•</span>
                          <span>{Math.round(entry.duration)}s</span>
                          {entry.writeSpeed > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-[var(--color-primary)]">↑ {entry.writeSpeed.toFixed(1)} MB/s</span>
                            </>
                          )}
                          {entry.readSpeed > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-green-500">↓ {entry.readSpeed.toFixed(1)} MB/s</span>
                            </>
                          )}
                          {entry.manufacturer && (
                            <>
                              <span>•</span>
                              <span>{entry.manufacturer}</span>
                            </>
                          )}
                          {entry.model && (
                            <span className="text-[var(--color-text)]">{entry.model}</span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="mt-2 text-sm text-[var(--color-text-muted)] italic">
                            "{entry.notes}"
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title={t('deleteEntry', language)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Entry Detail Modal */}
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[var(--color-text)]">{t('testHistory', language)}</h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('testComplete', language)}</p>
                    <p className={`font-semibold ${selectedEntry.result === 'pass' ? 'text-green-500' : selectedEntry.result === 'fail' ? 'text-red-500' : 'text-amber-500'}`}>
                      {selectedEntry.result.toUpperCase()}
                    </p>
                  </div>
                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('testMethod', language)}</p>
                    <p className="font-semibold text-[var(--color-text)]">{selectedEntry.testType}</p>
                  </div>
                </div>

                <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('testDuration', language)}</p>
                  <p className="font-semibold text-[var(--color-text)]">{formatDate(selectedEntry.timestamp)}</p>
                </div>

                <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('targetDrive', language)}</p>
                  <p className="font-semibold text-[var(--color-text)]">{selectedEntry.driveLabel || selectedEntry.driveName}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{formatBytes(selectedEntry.capacity)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('writeSpeed', language)}</p>
                    <p className="font-semibold text-[var(--color-primary)]">{selectedEntry.writeSpeed.toFixed(1)} MB/s</p>
                  </div>
                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('readSpeed', language)}</p>
                    <p className="font-semibold text-green-500">{selectedEntry.readSpeed.toFixed(1)} MB/s</p>
                  </div>
                </div>

                {selectedEntry.manufacturer && (
                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase">{t('manufacturer', language)}</p>
                    <p className="font-semibold text-[var(--color-text)]">{selectedEntry.manufacturer}</p>
                    {selectedEntry.model && (
                      <p className="text-sm text-[var(--color-text-muted)]">{selectedEntry.model}</p>
                    )}
                  </div>
                )}

                {selectedEntry.notes && (
                  <div className="bg-[var(--color-surface-hover)] rounded-lg p-3">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase">Notes</p>
                    <p className="text-[var(--color-text)] italic">"{selectedEntry.notes}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
