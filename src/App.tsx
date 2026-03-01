import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { DriveSelector } from './components/DriveSelector';
import { TestProgress } from './components/TestProgress';
import { TestResults } from './components/TestResults';
import { Settings, getSettings } from './components/Settings';
import { DriveInfo, TestResult, TestState, TestProgress as TestProgressType, SectorStatus } from './types';

// Dummy drive for debug mode
const DUMMY_DRIVE: DriveInfo = {
  id: 'DUMMY-TEST-DRIVE',
  name: '[DEBUG] Dummy Test Drive',
  capacity: 64, // 64 GB
  type: 'microsd',
  path: 'DUMMY:\\',
  filesystem: 'exFAT',
  isRemovable: true,
  isSystemDrive: false,
  serialNumber: 'DEBUG123456',
};

export default function App() {
  const [testState, setTestState] = useState<TestState>('idle');
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [testMethod, setTestMethod] = useState<'quick' | 'deep'>('quick');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgressType | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState<TestProgressType | null>(null);

  // Load debug mode setting on mount
  useEffect(() => {
    const settings = getSettings();
    setDebugMode(settings.debugMode);
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent) => {
      setDebugMode(e.detail.debugMode);
    };
    window.addEventListener('settings-changed', handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
    };
  }, []);

  // Simulation mode effect
  useEffect(() => {
    if (!debugMode || testState !== 'testing' || !selectedDrive) return;

    // Run simulation
    const simulationDuration = testMethod === 'quick' ? 10000 : 30000; // 10s for quick, 30s for deep
    const updateInterval = 200; // Update every 200ms
    let currentProgress = 0;
    let elapsed = 0;

    // Initialize sector map
    const totalSectors = 512;
    const sectors: SectorStatus[] = new Array(totalSectors).fill('pending');

    const interval = setInterval(() => {
      elapsed += updateInterval;
      currentProgress = Math.min((elapsed / simulationDuration) * 100, 100);

      // Update sector map - simulate sectors being tested
      const sectorsToUpdate = Math.floor((currentProgress / 100) * totalSectors);
      for (let i = 0; i < sectorsToUpdate; i++) {
        if (sectors[i] === 'pending') {
          // Simulate some random errors (5% chance)
          if (Math.random() < 0.05) {
            sectors[i] = Math.random() < 0.5 ? 'writeError' : 'readError';
          } else {
            sectors[i] = 'validated';
          }
        }
      }

      // Current sector being written (if not complete)
      if (sectorsToUpdate < totalSectors) {
        sectors[sectorsToUpdate] = 'writing';
      }

      const progress: TestProgressType = {
        phase: currentProgress < 50 ? 'writing' : 'verifying',
        progress: currentProgress,
        writeSpeed: 15 + Math.random() * 10, // Simulated 15-25 MB/s
        readSpeed: 20 + Math.random() * 15,  // Simulated 20-35 MB/s
        bytesWritten: Math.floor((currentProgress / 100) * selectedDrive.capacity * 1024 * 1024 * 1024 * 0.5),
        bytesVerified: currentProgress > 50 ? Math.floor(((currentProgress - 50) / 50) * selectedDrive.capacity * 1024 * 1024 * 1024 * 0.5) : 0,
        errors: sectors.filter(s => s === 'writeError' || s === 'readError').length,
        timeElapsed: elapsed / 1000,
        timeRemaining: Math.max(0, (simulationDuration - elapsed) / 1000),
        currentOperation: currentProgress < 50 ? `Writing test data...` : `Verifying data...`,
        history: Array.from({ length: 20 }, (_, i) => ({
          timestamp: Date.now() - (20 - i) * 1000,
          writeSpeed: 15 + Math.random() * 10,
          readSpeed: 20 + Math.random() * 15,
        })),
        sectorMap: {
          totalSectors,
          sectorSize: (selectedDrive.capacity * 1024 * 1024 * 1024) / totalSectors,
          sectors: [...sectors],
          lastUpdated: Date.now(),
        },
        currentFile: Math.floor((currentProgress / 100) * 10) + 1,
        totalFiles: 10,
      };

      setSimulationProgress(progress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        // Complete simulation
        const errorCount = sectors.filter(s => s === 'writeError' || s === 'readError').length;
        const result: TestResult = {
          isGenuine: errorCount === 0,
          actualCapacity: errorCount > 0 ? selectedDrive.capacity * 0.8 : selectedDrive.capacity,
          claimedCapacity: selectedDrive.capacity,
          errors: errorCount,
          averageWriteSpeed: 20,
          averageReadSpeed: 28,
          duration: simulationDuration / 1000,
          testMethod,
          timestamp: Date.now(),
          drive: selectedDrive,
          details: {
            badSectors: sectors.map((s, i) => s === 'writeError' || s === 'readError' ? i : -1).filter(i => i !== -1),
            firstFailureAt: errorCount > 0 ? selectedDrive.capacity * 0.8 : undefined,
            pattern: testMethod === 'quick' ? 'spot-check-576' : 'full-verify',
          },
        };
        setTestResult(result);
        setTestState('results');
        setSimulationProgress(null);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [debugMode, testState, selectedDrive, testMethod]);

  // Listen for test events from main process (only in non-debug mode)
  useEffect(() => {
    if (debugMode) return;

    const handleTestProgress = (data: TestProgressType) => {
      setTestProgress(data);
    };

    const handleTestCompleted = (result: TestResult) => {
      setTestResult(result);
      setTestState('results');
      setTestProgress(null);
    };

    const handleTestError = (error: string) => {
      setTestError(error);
      setTestState('idle');
      setTestProgress(null);
    };

    window.electronAPI?.onTestProgress(handleTestProgress);
    window.electronAPI?.onTestCompleted(handleTestCompleted);
    window.electronAPI?.onTestError(handleTestError);

    return () => {
      window.electronAPI?.removeAllListeners('test-progress');
      window.electronAPI?.removeAllListeners('test-completed');
      window.electronAPI?.removeAllListeners('test-error');
    };
  }, [debugMode]);

  const handleStartTest = useCallback(async (drive: DriveInfo, method: 'quick' | 'deep') => {
    setSelectedDrive(drive);
    setTestMethod(method);
    setTestError(null);
    setTestState('testing');

    // In debug mode, the simulation effect will handle the testing
    if (debugMode) {
      return;
    }

    // Real testing mode
    try {
      const result = await window.electronAPI?.startTest({
        driveId: drive.id,
        method,
        preserveData: true,
        quickScanOptions: method === 'quick' ? { spotCount: 576 } : undefined,
        deepScanOptions: method === 'deep' ? { blockSize: 1024 } : undefined,
        drive,
      });

      if (!result?.success) {
        setTestError(result?.error || 'Failed to start test');
        setTestState('idle');
      }
    } catch (error) {
      setTestError((error as Error).message);
      setTestState('idle');
    }
  }, [debugMode]);

  const handleStopTest = useCallback(async () => {
    if (!debugMode) {
      await window.electronAPI?.stopTest();
    }
    setTestState('idle');
    setTestProgress(null);
    setSimulationProgress(null);
  }, [debugMode]);

  const handleTestComplete = useCallback((result: TestResult) => {
    setTestResult(result);
    setTestState('results');
    setTestProgress(null);
    setSimulationProgress(null);
  }, []);

  const handleReset = useCallback(() => {
    setTestState('idle');
    setSelectedDrive(null);
    setTestResult(null);
    setTestProgress(null);
    setSimulationProgress(null);
    setTestError(null);
  }, []);

  const handleExportReport = useCallback(async () => {
    if (testResult) {
      const result = await window.electronAPI?.exportReport(testResult);
      if (result?.success) {
        console.log('Report exported to:', result.path);
      }
    }
  }, [testResult]);

  // Use simulation progress in debug mode, real progress otherwise
  const currentProgress = debugMode ? simulationProgress : testProgress;

  return (
    <div className="min-h-screen bg-grid flex flex-col">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-0">
        <AnimatePresence mode="wait">
          {testState === 'idle' && (
            <motion.div key="idle" className="w-full flex justify-center">
              <DriveSelector 
                onStartTest={handleStartTest} 
                debugMode={debugMode}
                dummyDrive={debugMode ? DUMMY_DRIVE : undefined}
              />
            </motion.div>
          )}
          
          {testState === 'testing' && selectedDrive && (
            <motion.div key="testing" className="w-full flex justify-center">
              <TestProgress 
                drive={selectedDrive} 
                method={testMethod}
                progress={currentProgress}
                error={testError}
                onStop={handleStopTest}
                onComplete={handleTestComplete}
              />
            </motion.div>
          )}
          
          {testState === 'results' && selectedDrive && testResult && (
            <motion.div key="results" className="w-full flex justify-center">
              <TestResults 
                drive={selectedDrive} 
                result={testResult} 
                onReset={handleReset}
                onExport={handleExportReport}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Ambient background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/5 rounded-full blur-[150px] pointer-events-none -z-10" />
    </div>
  );
}
