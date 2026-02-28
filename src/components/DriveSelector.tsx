import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { HardDrive, Usb, CheckCircle2, AlertTriangle, ChevronDown, Play, RefreshCw } from 'lucide-react';
import { DriveInfo } from '../types';

interface DriveSelectorProps {
  onStartTest: (drive: DriveInfo, method: 'quick' | 'deep') => void;
}

export function DriveSelector({ onStartTest }: DriveSelectorProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [testMethod, setTestMethod] = useState<'quick' | 'deep'>('quick');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load drives on mount
    loadDrives();

    // Start watching for drive changes
    window.electronAPI?.startDriveWatch();

    // Listen for drive updates
    window.electronAPI?.onDrivesUpdated((updatedDrives) => {
      setDrives(updatedDrives);
      setIsLoading(false);
      
      // If selected drive is no longer available, deselect it
      if (selectedDrive && !updatedDrives.find(d => d.id === selectedDrive.id)) {
        setSelectedDrive(null);
      }
    });

    return () => {
      window.electronAPI?.stopDriveWatch();
      window.electronAPI?.removeAllListeners('drives-updated');
    };
  }, []);

  const loadDrives = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const driveList = await window.electronAPI?.getDrives();
      if (driveList) {
        setDrives(driveList);
      }
    } catch (err) {
      setError('Failed to load drives. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDriveIcon = (type: DriveInfo['type']) => {
    switch (type) {
      case 'microsd':
      case 'sd':
        return <HardDrive className="w-6 h-6 text-[var(--color-primary)]" />;
      case 'usb':
        return <Usb className="w-6 h-6 text-[var(--color-primary)]" />;
      default:
        return <HardDrive className="w-6 h-6 text-[var(--color-primary)]" />;
    }
  };

  const getDriveTypeLabel = (type: DriveInfo['type']) => {
    switch (type) {
      case 'microsd':
        return 'MicroSD Card';
      case 'sd':
        return 'SD Card';
      case 'usb':
        return 'USB Drive';
      case 'hdd':
        return 'Hard Drive';
      case 'ssd':
        return 'SSD';
      default:
        return 'Storage Device';
    }
  };

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
            Choose the storage device you want to verify. We will perform a {testMethod === 'quick' ? 'quick spot check' : 'full write and read cycle'} to detect fake capacity or defective sectors.
          </p>
        </div>

        {/* Test Method Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
            Test Method
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTestMethod('quick')}
              className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
                testMethod === 'quick'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 glow-primary'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  testMethod === 'quick' ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-muted)]'
                }`}>
                  {testMethod === 'quick' && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                </div>
                <span className="font-semibold">Quick Scan</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Fast spot check (~2-5 min). Good for quick verification.
              </p>
            </button>
            <button
              onClick={() => setTestMethod('deep')}
              className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
                testMethod === 'deep'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 glow-primary'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  testMethod === 'deep' ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-muted)]'
                }`}>
                  {testMethod === 'deep' && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                </div>
                <span className="font-semibold">Deep Scan</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Full write/read test (10-60 min). Thorough verification.
              </p>
            </button>
          </div>
        </div>

        {/* Drive Selection Dropdown */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Target Drive
            </label>
            <button
              onClick={loadDrives}
              disabled={isLoading}
              className="text-xs text-[var(--color-primary)] hover:text-[#00cce6] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading || drives.length === 0}
            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
              isDropdownOpen
                ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)] glow-primary'
                : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
            } ${(isLoading || drives.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedDrive ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] flex items-center justify-center border border-[var(--color-border)]">
                  {getDriveIcon(selectedDrive.type)}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{selectedDrive.name}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] font-mono">
                    {selectedDrive.path} • {selectedDrive.capacity} GB • {getDriveTypeLabel(selectedDrive.type)}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-lg text-[var(--color-text-muted)] pl-2">
                {isLoading ? 'Scanning for drives...' : drives.length === 0 ? 'No drives detected' : 'Select a drive to test...'}
              </span>
            )}
            <ChevronDown
              className={`w-6 h-6 text-[var(--color-text-muted)] transition-transform duration-300 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && drives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 w-full mt-2 p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl z-20 max-h-64 overflow-y-auto"
            >
              {drives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => {
                    setSelectedDrive(drive);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center border border-[var(--color-border)]">
                    {getDriveIcon(drive.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{drive.name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">
                      {drive.path} • {drive.capacity} GB • {getDriveTypeLabel(drive.type)}
                    </p>
                  </div>
                  {drive.filesystem && (
                    <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] px-2 py-1 rounded">
                      {drive.filesystem}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

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
                  This test will write test patterns to all available free space. While the Quick Scan preserves your data, it's highly recommended to backup all important data before proceeding.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <button
          disabled={!selectedDrive || isLoading}
          onClick={() => selectedDrive && onStartTest(selectedDrive, testMethod)}
          className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg transition-all duration-300 ${
            selectedDrive
              ? 'bg-[var(--color-primary)] text-black hover:bg-[#00cce6] glow-primary cursor-pointer'
              : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)]'
          }`}
        >
          <Play className="w-6 h-6" fill="currentColor" />
          START {testMethod === 'quick' ? 'QUICK SCAN' : 'DEEP SCAN'}
        </button>
      </div>

      <div className="mt-8 flex gap-8 text-sm text-[var(--color-text-muted)] font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          <span>Spot Check Algorithm</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          <span>Fake Detection</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          <span>Speed Analysis</span>
        </div>
      </div>
    </motion.div>
  );
}
