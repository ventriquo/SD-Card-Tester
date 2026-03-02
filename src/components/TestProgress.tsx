import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, HardDrive, Clock, AlertCircle, CheckCircle2, Square, Pause, Play, File } from 'lucide-react';
import { DriveInfo, TestProgress as TestProgressType } from '../types';
import { SectorMap } from './SectorMap';
import { t } from '../i18n';
import { useLanguage } from '../i18n/LanguageContext';

interface TestProgressProps {
  drive: DriveInfo;
  method: 'quick' | 'deep' | 'h2testw';
  progress: TestProgressType | null;
  error: string | null;
  onStop: () => void;
  onComplete: (result: any) => void;
}

export function TestProgress({ drive, method, progress, error, onStop }: TestProgressProps) {
  const { language } = useLanguage();
  const [isPaused, setIsPaused] = useState(false);
  const [localHistory, setLocalHistory] = useState<{ time: string; write: number; read: number }[]>([]);

  // DEBUG: Log progress updates
  useEffect(() => {
    if (progress) {
      console.log('TestProgress: Progress update', {
        phase: progress.phase,
        progress: progress.progress?.toFixed(1) + '%',
        writeSpeed: progress.writeSpeed?.toFixed(2) + ' MB/s',
        readSpeed: progress.readSpeed?.toFixed(2) + ' MB/s',
        operation: progress.currentOperation
      });
    }
  }, [progress?.progress, progress?.phase, progress?.writeSpeed, progress?.readSpeed]);

  // Update local history when progress changes
  useEffect(() => {
    if (progress?.history && progress.history.length > 0) {
      const formatted = progress.history.slice(-30).map((h) => ({
        time: new Date(h.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
        write: h.writeSpeed,
        read: h.readSpeed,
      }));
      setLocalHistory(formatted);
    }
  }, [progress?.history]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'preparing':
        return `${t('preparing', language)}...`;
      case 'writing':
        return method === 'quick' ? t('quickScan', language) : t('writing', language);
      case 'verifying':
        return t('verifying', language);
      case 'finalizing':
        return `${t('finalizing', language)}...`;
      default:
        return t('testInProgress', language);
    }
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      await window.electronAPI?.resumeTest();
    } else {
      await window.electronAPI?.pauseTest();
    }
    setIsPaused(!isPaused);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-4xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Left Column: Progress Ring & Status */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-surface-hover)]">
            <div
              className={`h-full transition-all duration-300 ${
                progress?.phase === 'writing' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-success)]'
              }`}
              style={{ width: `${progress?.progress || 0}%` }}
            />
          </div>

          <div className="w-full flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
              method === 'quick' 
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' 
                : 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
            }`}>
              {method === 'quick' ? t('quickScan', language) : t('deepScan', language)}
            </span>
            {error && (
              <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-red-500/20 text-red-400">
                {t('fake', language)}
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold mb-8 text-[var(--color-text-muted)] uppercase tracking-widest text-center">
            {getPhaseLabel(progress?.phase || 'preparing')}
          </h3>

          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-surface-hover)"
                strokeWidth="4"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={progress?.phase === 'writing' || progress?.phase === 'preparing' ? 'var(--color-primary)' : 'var(--color-success)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * (progress?.progress || 0)) / 100}
                className={progress?.phase === 'writing' || progress?.phase === 'preparing' ? 'drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]' : 'drop-shadow-[0_0_8px_rgba(0,255,102,0.5)]'}
              />
            </svg>
            <div className="text-center">
              <span className="text-4xl font-bold font-mono">{(progress?.progress || 0).toFixed(1)}</span>
              <span className="text-xl text-[var(--color-text-muted)]">%</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">{t('writeSpeed', language)}</p>
              <p className="font-semibold">{(progress?.writeSpeed || 0).toFixed(2)} MB/s</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">{t('readSpeed', language)}</p>
              <p className="font-semibold">{(progress?.readSpeed || 0).toFixed(2)} MB/s</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 w-full">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center">
            <Clock className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)] font-mono uppercase">{t('timeRemaining', language)}</p>
            <p className="text-2xl font-bold font-mono">{formatTime(progress?.timeRemaining || 0)}</p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handlePauseResume}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={onStop}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Square className="w-4 h-4" fill="currentColor" />
            {t('stopTest', language)}
          </button>
        </div>
      </div>

      {/* Right Column: Graph & Stats */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-primary)]" />
              {t('testInProgress', language)}
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] glow-primary" />
                <span className="text-sm font-mono">{t('writeSpeed', language)}: {(progress?.writeSpeed || 0).toFixed(1)} MB/s</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-success)] glow-success" />
                <span className="text-sm font-mono">{t('readSpeed', language)}: {(progress?.readSpeed || 0).toFixed(1)} MB/s</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={localHistory} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWrite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="var(--color-border)" tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'monospace' }} />
                <YAxis stroke="var(--color-border)" tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontFamily: 'monospace' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Area type="monotone" dataKey="write" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorWrite)" isAnimationActive={false} />
                <Area type="monotone" dataKey="read" stroke="var(--color-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorRead)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Map Visualization */}
        <SectorMap sectorMap={progress?.sectorMap} />

        {/* H2testw-style File Progress */}
        {progress?.totalFiles && progress.totalFiles > 0 && (
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-mono">{t('testFileSize', language)}</span>
              </div>
              <span className="text-sm font-mono text-[var(--color-text-muted)]">
                {progress.currentFile || 0} / {progress.totalFiles}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--color-surface-hover)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--color-primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${((progress.currentFile || 0) / progress.totalFiles) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] font-mono uppercase">{t('targetDrive', language)}</p>
              <p className="font-semibold truncate max-w-[150px]">{drive.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">{drive.path}</p>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xl flex items-center gap-4 transition-colors ${
            (progress?.errors || 0) > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--color-surface)] border-[var(--color-border)]'
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              (progress?.errors || 0) > 0 ? 'bg-red-500/20' : 'bg-[var(--color-surface-hover)]'
            }`}>
              {(progress?.errors || 0) > 0 ? (
                <AlertCircle className="w-6 h-6 text-[var(--color-danger)]" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-[var(--color-success)]" />
              )}
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] font-mono uppercase">{t('errors', language)}</p>
              <p className={`text-2xl font-bold font-mono ${
                (progress?.errors || 0) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
              }`}>
                {progress?.errors || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
