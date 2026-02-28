import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { DriveSelector } from './components/DriveSelector';
import { TestProgress } from './components/TestProgress';
import { TestResults } from './components/TestResults';
import { DriveInfo, TestResult, TestState } from './types';

export default function App() {
  const [testState, setTestState] = useState<TestState>('idle');
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleStartTest = (drive: DriveInfo) => {
    setSelectedDrive(drive);
    setTestState('testing');
  };

  const handleTestComplete = (result: TestResult) => {
    setTestResult(result);
    setTestState('results');
  };

  const handleReset = () => {
    setTestState('idle');
    setSelectedDrive(null);
    setTestResult(null);
  };

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
              <TestProgress drive={selectedDrive} onComplete={handleTestComplete} />
            </motion.div>
          )}
          
          {testState === 'results' && selectedDrive && testResult && (
            <motion.div key="results" className="w-full flex justify-center">
              <TestResults drive={selectedDrive} result={testResult} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Ambient background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/5 rounded-full blur-[150px] pointer-events-none -z-10" />
    </div>
  );
}

