import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, HardDrive, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DriveInfo, TestStats } from '../types';

interface TestProgressProps {
  drive: DriveInfo;
  onComplete: (result: any) => void;
}

export function TestProgress({ drive, onComplete }: TestProgressProps) {
  const [stats, setStats] = useState<TestStats>({
    progress: 0,
    writeSpeed: 0,
    readSpeed: 0,
    written: 0,
    verified: 0,
    errors: 0,
    timeRemaining: drive.capacity * 10, // rough estimate
  });

  const [history, setHistory] = useState<{ time: string; write: number; read: number }[]>([]);
  const [phase, setPhase] = useState<'writing' | 'reading' | 'finalizing'>('writing');

  useEffect(() => {
    let interval: number;
    let currentProgress = 0;
    let currentWritten = 0;
    let currentVerified = 0;
    let currentErrors = 0;

    const simulateTest = () => {
      interval = window.setInterval(() => {
        setStats((prev) => {
          const newProgress = prev.progress + (Math.random() * 0.5 + 0.1);
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              onComplete({
                isGenuine: currentErrors === 0 && currentVerified > drive.capacity * 0.9,
                actualCapacity: currentVerified,
                claimedCapacity: drive.capacity,
                errors: currentErrors,
                averageWriteSpeed: 45.2,
                averageReadSpeed: 85.4,
                duration: 300,
              });
            }, 1000);
            return { ...prev, progress: 100, timeRemaining: 0 };
          }

          const isWriting = newProgress < 50;
          if (isWriting && phase !== 'writing') setPhase('writing');
          if (!isWriting && phase !== 'reading') setPhase('reading');

          const baseSpeed = isWriting ? 45 : 85;
          const fluctuation = (Math.random() - 0.5) * 10;
          const currentSpeed = Math.max(0, baseSpeed + fluctuation);

          if (isWriting) {
            currentWritten = (newProgress / 50) * drive.capacity;
          } else {
            currentVerified = ((newProgress - 50) / 50) * drive.capacity;
            // Simulate fake drive errors if capacity > 32GB (just for demo)
            if (drive.capacity > 32 && currentVerified > 32 && Math.random() > 0.95) {
              currentErrors += Math.floor(Math.random() * 5) + 1;
            }
          }

          const newHistoryPoint = {
            time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
            write: isWriting ? currentSpeed : 0,
            read: !isWriting ? currentSpeed : 0,
          };

          setHistory((h) => {
            const newH = [...h, newHistoryPoint];
            if (newH.length > 30) newH.shift();
            return newH;
          });

          return {
            progress: newProgress,
            writeSpeed: isWriting ? currentSpeed : 0,
            readSpeed: !isWriting ? currentSpeed : 0,
            written: currentWritten,
            verified: currentVerified,
            errors: currentErrors,
            timeRemaining: Math.max(0, Math.floor((100 - newProgress) * 3)),
          };
        });
      }, 500);
    };

    simulateTest();
    return () => clearInterval(interval);
  }, [drive, onComplete, phase]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
                phase === 'writing' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-success)]'
              }`}
              style={{ width: `${stats.progress}%` }}
            />
          </div>

          <h3 className="text-lg font-semibold mb-8 text-[var(--color-text-muted)] uppercase tracking-widest">
            {phase === 'writing' ? 'Writing Data' : 'Verifying Data'}
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
                stroke={phase === 'writing' ? 'var(--color-primary)' : 'var(--color-success)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * stats.progress) / 100}
                className={phase === 'writing' ? 'drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]' : 'drop-shadow-[0_0_8px_rgba(0,255,102,0.5)]'}
              />
            </svg>
            <div className="text-center">
              <span className="text-4xl font-bold font-mono">{stats.progress.toFixed(1)}</span>
              <span className="text-xl text-[var(--color-text-muted)]">%</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">WRITTEN</p>
              <p className="font-semibold">{stats.written.toFixed(2)} GB</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">VERIFIED</p>
              <p className="font-semibold">{stats.verified.toFixed(2)} GB</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center">
            <Clock className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)] font-mono">EST. TIME REMAINING</p>
            <p className="text-2xl font-bold font-mono">{formatTime(stats.timeRemaining)}</p>
          </div>
        </div>
      </div>

      {/* Right Column: Graph & Stats */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-primary)]" />
              Performance Monitor
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] glow-primary" />
                <span className="text-sm font-mono">Write: {stats.writeSpeed.toFixed(1)} MB/s</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-success)] glow-success" />
                <span className="text-sm font-mono">Read: {stats.readSpeed.toFixed(1)} MB/s</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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

        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] font-mono uppercase">Target Drive</p>
              <p className="font-semibold truncate max-w-[150px]">{drive.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">{drive.path}</p>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xl flex items-center gap-4 transition-colors ${
            stats.errors > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--color-surface)] border-[var(--color-border)]'
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              stats.errors > 0 ? 'bg-red-500/20' : 'bg-[var(--color-surface-hover)]'
            }`}>
              {stats.errors > 0 ? (
                <AlertCircle className="w-6 h-6 text-[var(--color-danger)]" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-[var(--color-success)]" />
              )}
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] font-mono uppercase">Errors Found</p>
              <p className={`text-2xl font-bold font-mono ${stats.errors > 0 ? 'text-[var(--color-danger)]' : ''}`}>
                {stats.errors}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
