import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { DriveSelector } from './components/DriveSelector';
import { TestProgress } from './components/TestProgress';
import { TestResults } from './components/TestResults';
import { DriveInfo, TestResult, TestState, TestProgress as TestProgressType } from './types';

export default function App() {
  const [testState, setTestState] = useState<TestState>('idle');
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [testMethod, setTestMethod] = useState<'quick' | 'deep'>('quick');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgressType | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Listen for test events from main process
  useEffect(() => {
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
  }, []);

  const handleStartTest = useCallback(async (drive: DriveInfo, method: 'quick' | 'deep') => {
    setSelectedDrive(drive);
    setTestMethod(method);
    setTestError(null);
    setTestState('testing');

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
  }, []);

  const handleStopTest = useCallback(async () => {
    await window.electronAPI?.stopTest();
    setTestState('idle');
    setTestProgress(null);
  }, []);

  const handleTestComplete = useCallback((result: TestResult) => {
    setTestResult(result);
    setTestState('results');
    setTestProgress(null);
  }, []);

  const handleReset = useCallback(() => {
    setTestState('idle');
    setSelectedDrive(null);
    setTestResult(null);
    setTestProgress(null);
    setTestError(null);
  }, []);

  const handleExportReport = useCallback(async () => {
    if (testResult) {
      const result = await window.electronAPI?.exportReport(testResult);
      if (result?.success) {
        // Could show a toast notification here
        console.log('Report exported to:', result.path);
      }
    }
  }, [testResult]);

  return (
    <div className="min-h-screen bg-grid flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-0">
        <AnimatePresence mode="wait">
          {testState === 'idle' && (
            <motion.div key="idle" className="w-full flex justify-center">
              <DriveSelector onStartTest={handleStartTest} />
            </motion.div>
          )}
          
          {testState === 'testing' && selectedDrive && (
            <motion.div key="testing" className="w-full flex justify-center">
              <TestProgress 
                drive={selectedDrive} 
                method={testMethod}
                progress={testProgress}
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

      {/* Ambient background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/5 rounded-full blur-[150px] pointer-events-none -z-10" />
    </div>
  );
}
