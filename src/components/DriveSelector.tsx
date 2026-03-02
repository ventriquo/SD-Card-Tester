import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, Usb, CheckCircle2, AlertTriangle, ChevronDown, Play, RefreshCw, Bug, Shield, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import { DriveInfo } from '../types';
import type { CIDInfo } from '../../electron/services/CIDReader';
import { useLanguage } from '../i18n/LanguageContext';
import { t, tFormat } from '../i18n';

interface DriveSelectorProps {
  onStartTest: (drive: DriveInfo, method: 'quick' | 'deep' | 'h2testw') => void;
  debugMode?: boolean;
  dummyDrive?: DriveInfo;
}

export function DriveSelector({ onStartTest, debugMode, dummyDrive }: DriveSelectorProps) {
  const { language } = useLanguage();
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [testMethod, setTestMethod] = useState<'quick' | 'deep' | 'h2testw'>('quick');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // CID state
  const [cidInfo, setCidInfo] = useState<CIDInfo | null>(null);
  const [cidWarning, setCidWarning] = useState<string | null>(null);
  const [isLoadingCID, setIsLoadingCID] = useState(false);
  
  // Safety confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const expectedConfirmText = language === 'id' ? 'HAPUS' : 'DELETE';
  
  // Update confirmation text requirement when language changes
  useEffect(() => {
    if (showConfirmDialog) {
      setConfirmText('');
    }
  }, [language]);

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

    // Listen for settings changes to reload drives
    const handleStorageChange = () => {
      console.log('DriveSelector: Settings changed, reloading drives...');
      loadDrives();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.electronAPI?.stopDriveWatch();
      window.electronAPI?.removeAllListeners('drives-updated');
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadDrives = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Read showAllDrives setting from localStorage
      const settings = localStorage.getItem('sd-card-tester-settings');
      const showAllDrives = settings ? JSON.parse(settings).showAllDrives : false;
      
      const driveList = await window.electronAPI?.getDrives(showAllDrives);
      if (driveList) {
        setDrives(driveList);
      }
    } catch (err) {
      setError('Failed to load drives. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCID = async (drive: DriveInfo) => {
    if (!drive?.path) return;
    
    setIsLoadingCID(true);
    setCidInfo(null);
    setCidWarning(null);
    
    try {
      const result = await window.electronAPI?.readCID?.(drive.path);
      if (result) {
        setCidInfo(result.cid);
        setCidWarning(result.warning || null);
      }
    } catch (err) {
      console.error('Failed to fetch CID:', err);
      setCidWarning('Unable to read card identification. Manufacturer verification unavailable.');
    } finally {
      setIsLoadingCID(false);
    }
  };

  const handleSelectDrive = (drive: DriveInfo) => {
    setSelectedDrive(drive);
    setIsDropdownOpen(false);
    fetchCID(drive);
  };
  
  const handleStartTestClick = () => {
    if (!selectedDrive) return;
    setShowConfirmDialog(true);
    setConfirmText('');
  };
  
  const handleConfirmStart = () => {
    if (confirmText === expectedConfirmText && selectedDrive) {
      setShowConfirmDialog(false);
      setConfirmText('');
      onStartTest(selectedDrive, testMethod);
    }
  };
  
  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setConfirmText('');
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
        return 'MicroSD / SD Card';
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
          <h2 className="text-3xl font-bold tracking-tight mb-3">{t('selectTargetDrive', language)}</h2>
          <p className="text-[var(--color-text-muted)] max-w-md mx-auto">
            {language === 'id' 
              ? `Pilih perangkat penyimpanan yang ingin Anda verifikasi. Kami akan melakukan ${testMethod === 'quick' ? 'pindai cepat' : 'pindai mendalam'} untuk mendeteksi kapasitas palsu atau sektor yang rusak.`
              : `Choose the storage device you want to verify. We will perform a ${testMethod === 'quick' ? 'quick spot check' : 'full write and read cycle'} to detect fake capacity or defective sectors.`}
          </p>
        </div>

        {/* Test Method Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
            {t('testMethod', language)}
          </label>
          <div className="grid grid-cols-3 gap-4">
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
                <span className="font-semibold">{t('quickScan', language)}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('quickScanDescription', language)}
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
                <span className="font-semibold">{t('deepScan', language)}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('deepScanDescription', language)}
              </p>
            </button>
            <button
              onClick={() => setTestMethod('h2testw')}
              className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
                testMethod === 'h2testw'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 glow-primary'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  testMethod === 'h2testw' ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-muted)]'
                }`}>
                  {testMethod === 'h2testw' && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                </div>
                <span className="font-semibold">H2testw</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {language === 'id' ? 'Standar industri, verifikasi byte-per-byte' : 'Industry standard, byte-by-byte verification'}
              </p>
            </button>
          </div>
        </div>

        {/* Drive Selection Dropdown */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('targetDrive', language)}
            </label>
            <button
              onClick={loadDrives}
              disabled={isLoading}
              className="text-xs text-[var(--color-primary)] hover:text-[#00cce6] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              {t('refresh', language)}
            </button>
          </div>
          
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading || (drives.length === 0 && !dummyDrive)}
            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
              isDropdownOpen
                ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)] glow-primary'
                : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
            } ${(isLoading || (drives.length === 0 && !dummyDrive)) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                {isLoading ? t('scanningDrives', language) : (drives.length === 0 && !dummyDrive) ? t('noDrivesDetected', language) : t('selectDriveToTest', language)}
              </span>
            )}
            <ChevronDown
              className={`w-6 h-6 text-[var(--color-text-muted)] transition-transform duration-300 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (drives.length > 0 || dummyDrive) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 w-full mt-2 p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl z-20 max-h-64 overflow-y-auto"
            >
              {/* Debug/Dummy Drive */}
              {dummyDrive && (
                <button
                  onClick={() => handleSelectDrive(dummyDrive)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--color-primary)]/10 transition-colors text-left border border-[var(--color-primary)]/30 mb-2"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center border border-[var(--color-primary)]/50">
                    <Bug className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--color-primary)]">{dummyDrive.name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">
                      {dummyDrive.path} • {dummyDrive.capacity} GB • Simulation Mode
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded">
                    DEBUG
                  </span>
                </button>
              )}
              
              {/* Real Drives */}
              {drives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => handleSelectDrive(drive)}
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

        {/* CID Info Display */}
        {selectedDrive && (
          <div className="mb-6">
            {isLoadingCID ? (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <div className="animate-spin w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                {language === 'id' ? 'Membaca info produsen...' : 'Reading manufacturer info...'}
              </div>
            ) : cidInfo ? (
              <div className={`p-4 rounded-2xl border ${
                cidInfo.isGenuine
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {cidInfo.isGenuine ? (
                    <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${cidInfo.isGenuine ? 'text-green-400' : 'text-amber-400'}`}>
                        {cidInfo.isGenuine ? t('verifiedManufacturer', language) : t('unknownManufacturer', language)}
                      </span>
                      {cidInfo.manufacturer && (
                        <span className="text-[var(--color-text)]">
                          {cidInfo.manufacturer.name}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cidInfo.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                        cidInfo.confidence === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {cidInfo.confidence === 'high' ? t('high', language) : cidInfo.confidence === 'medium' ? t('medium', language) : t('low', language)} {t('confidence', language)}
                      </span>
                    </div>
                    {cidInfo.pnm && cidInfo.pnm !== 'Unknown' && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {language === 'id' ? 'Model' : 'Model'}: {cidInfo.pnm}
                      </p>
                    )}
                    {cidInfo.mdt && cidInfo.mdt !== '????-??' && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {t('manufactured', language)}: {cidInfo.mdt}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : cidWarning ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">{t('limitedVerification', language)}</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{cidWarning}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

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
                <h4 className="font-semibold text-yellow-500 mb-1">{t('dataLossWarning', language)}</h4>
                <p className="text-sm text-yellow-500/80">
                  {t('testWillErase', language)}. {language === 'id' ? 'Sangat disarankan untuk mencadangkan semua data penting sebelum melanjutkan.' : 'It is highly recommended to backup all important data before proceeding.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <button
          disabled={!selectedDrive || isLoading}
          onClick={handleStartTestClick}
          className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg transition-all duration-300 ${
            selectedDrive
              ? 'bg-[var(--color-primary)] text-black hover:bg-[#00cce6] glow-primary cursor-pointer'
              : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)]'
          }`}
        >
          <Play className="w-6 h-6" fill="currentColor" />
          {t('startTest', language).toUpperCase()}
        </button>
      </div>

      {/* Safety Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && selectedDrive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCancelConfirm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md p-8 rounded-3xl bg-[var(--color-surface)] border border-red-500/30 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Warning Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-center mb-2 text-red-400">
                {t('safetyWarning', language)}
              </h3>

              {/* Warning Message */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                <p className="text-center text-red-300 font-semibold mb-2">
                  {t('dataWillBeLost', language)}
                </p>
                <p className="text-center text-[var(--color-text-muted)] text-sm">
                  {t('confirmErase', language)} <span className="text-white font-semibold">{selectedDrive.name}</span>
                </p>
              </div>

              {/* Checklist */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded border border-[var(--color-border)] flex items-center justify-center">
                    <span className="text-[var(--color-primary)]">✓</span>
                  </div>
                  <span className="text-[var(--color-text-muted)]">{t('backupReminder', language)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded border border-[var(--color-border)] flex items-center justify-center">
                    <span className="text-[var(--color-primary)]">✓</span>
                  </div>
                  <span className="text-[var(--color-text-muted)]">{t('thisIsPermanent', language)}</span>
                </div>
              </div>

              {/* Type Confirmation */}
              <div className="mb-6">
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                  {t('typeToConfirm', language)}
                  <span className="text-red-400 font-semibold ml-1">({language === 'id' ? 'HAPUS' : 'DELETE'})</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={language === 'id' ? t('typeToConfirmId', language) : t('typeToConfirm', language)}
                  className="w-full p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-white font-mono text-center tracking-widest uppercase focus:border-red-500 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="py-4 rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-text)] font-semibold hover:bg-[var(--color-border)] transition-colors"
                >
                  {t('cancel', language)}
                </button>
                <button
                  onClick={handleConfirmStart}
                  disabled={confirmText !== expectedConfirmText}
                  className={`py-4 rounded-xl font-semibold transition-all duration-300 ${
                    confirmText === expectedConfirmText
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25'
                      : 'bg-red-500/30 text-red-300 cursor-not-allowed'
                  }`}
                >
                  {t('proceed', language)}
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={handleCancelConfirm}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
