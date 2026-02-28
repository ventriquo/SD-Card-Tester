import { useState } from 'react';
import { motion } from 'motion/react';
import { HardDrive, Usb, CheckCircle2, AlertTriangle, ChevronDown, Play } from 'lucide-react';
import { DriveInfo } from '../types';

interface DriveSelectorProps {
  onStartTest: (drive: DriveInfo) => void;
}

const mockDrives: DriveInfo[] = [
  { id: '1', name: 'SanDisk Extreme Pro', capacity: 256, type: 'microsd', path: 'E:\\' },
  { id: '2', name: 'Generic USB Drive', capacity: 1024, type: 'usb', path: 'F:\\' },
  { id: '3', name: 'Samsung EVO Plus', capacity: 128, type: 'microsd', path: 'G:\\' },
];

export function DriveSelector({ onStartTest }: DriveSelectorProps) {
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto mt-12"
    >
      <div className="w-full p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-[var(--color-primary)]/5 blur-[100px] pointer-events-none" />

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Select Target Drive</h2>
          <p className="text-[var(--color-text-muted)] max-w-md mx-auto">
            Choose the storage device you want to verify. We will perform a full write and read cycle to detect fake capacity or defective sectors.
          </p>
        </div>

        <div className="relative mb-8">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
              isDropdownOpen
                ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)] glow-primary'
                : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            {selectedDrive ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] flex items-center justify-center border border-[var(--color-border)]">
                  {selectedDrive.type === 'microsd' ? (
                    <HardDrive className="w-6 h-6 text-[var(--color-primary)]" />
                  ) : (
                    <Usb className="w-6 h-6 text-[var(--color-primary)]" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{selectedDrive.name}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] font-mono">
                    {selectedDrive.path} • {selectedDrive.capacity} GB
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-lg text-[var(--color-text-muted)] pl-2">Select a drive to test...</span>
            )}
            <ChevronDown
              className={`w-6 h-6 text-[var(--color-text-muted)] transition-transform duration-300 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 w-full mt-2 p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl z-20"
            >
              {mockDrives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => {
                    setSelectedDrive(drive);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center border border-[var(--color-border)]">
                    {drive.type === 'microsd' ? (
                      <HardDrive className="w-5 h-5 text-[var(--color-text-muted)]" />
                    ) : (
                      <Usb className="w-5 h-5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{drive.name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">
                      {drive.path} • {drive.capacity} GB
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {selectedDrive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20"
          >
            <div className="flex gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-500 mb-1">Warning: Data Loss</h4>
                <p className="text-sm text-yellow-500/80">
                  This test will write test patterns to all available free space. While it does not format the drive, it is highly recommended to backup all important data before proceeding.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <button
          disabled={!selectedDrive}
          onClick={() => selectedDrive && onStartTest(selectedDrive)}
          className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg transition-all duration-300 ${
            selectedDrive
              ? 'bg-[var(--color-primary)] text-black hover:bg-[#00cce6] glow-primary cursor-pointer'
              : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)]'
          }`}
        >
          <Play className="w-6 h-6" fill="currentColor" />
          START VERIFICATION
        </button>
      </div>

      <div className="mt-8 flex gap-8 text-sm text-[var(--color-text-muted)] font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          <span>H2testw Algorithm</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          <span>Fast Read/Write</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          <span>Sector Analysis</span>
        </div>
      </div>
    </motion.div>
  );
}
