import { motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, Download, HardDrive } from 'lucide-react';
import { DriveInfo, TestResult } from '../types';

interface TestResultsProps {
  drive: DriveInfo;
  result: TestResult;
  onReset: () => void;
}

export function TestResults({ drive, result, onReset }: TestResultsProps) {
  const isFake = !result.isGenuine;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-3xl mx-auto mt-12"
    >
      <div className={`p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
        isFake ? 'bg-red-950/20 border-red-500/30' : 'bg-[var(--color-surface)] border-[var(--color-border)]'
      }`}>
        {/* Glow background */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 blur-[120px] pointer-events-none ${
          isFake ? 'bg-red-500/10' : 'bg-[var(--color-success)]/10'
        }`} />

        <div className="text-center mb-10 relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 relative">
            <div className={`absolute inset-0 rounded-full opacity-20 blur-xl ${
              isFake ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-success)]'
            }`} />
            <div className={`w-full h-full rounded-full flex items-center justify-center border-2 ${
              isFake ? 'border-[var(--color-danger)] bg-red-950/50' : 'border-[var(--color-success)] bg-green-950/50'
            }`}>
              {isFake ? (
                <XCircle className="w-12 h-12 text-[var(--color-danger)]" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-[var(--color-success)]" />
              )}
            </div>
          </div>
          
          <h2 className={`text-4xl font-bold tracking-tight mb-3 ${
            isFake ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
          }`}>
            {isFake ? 'FAKE CAPACITY DETECTED' : 'DRIVE IS GENUINE'}
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-lg mx-auto">
            {isFake 
              ? `This drive claims to be ${result.claimedCapacity}GB, but only ${result.actualCapacity.toFixed(1)}GB is usable. Data written beyond this point will be lost or corrupted.`
              : `The drive successfully passed all read/write tests. The full capacity of ${result.claimedCapacity}GB is usable and healthy.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative z-10">
          <div className="p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-5 h-5 text-[var(--color-text-muted)]" />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-muted)]">Drive Info</h3>
            </div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Name:</span>
                <span className="text-right truncate max-w-[150px]">{drive.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Path:</span>
                <span>{drive.path}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Claimed Capacity:</span>
                <span>{result.claimedCapacity} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Actual Capacity:</span>
                <span className={isFake ? 'text-[var(--color-danger)] font-bold' : 'text-[var(--color-success)] font-bold'}>
                  {result.actualCapacity.toFixed(1)} GB
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-[var(--color-text-muted)]" />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-muted)]">Test Stats</h3>
            </div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Errors Found:</span>
                <span className={result.errors > 0 ? 'text-[var(--color-danger)] font-bold' : 'text-[var(--color-success)]'}>
                  {result.errors}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Avg Write Speed:</span>
                <span>{result.averageWriteSpeed.toFixed(1)} MB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Avg Read Speed:</span>
                <span>{result.averageReadSpeed.toFixed(1)} MB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Test Duration:</span>
                <span>{Math.floor(result.duration / 60)}m {result.duration % 60}s</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Test Another Drive
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold bg-[var(--color-primary)] text-black hover:bg-[#00cce6] glow-primary transition-all">
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}
