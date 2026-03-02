import { contextBridge, ipcRenderer } from 'electron';
import type { DriveInfo, TestConfig, TestProgress, TestResult } from '../src/types';
import type { HistoryEntry, HistoryStats } from './services/HistoryStore';
import type { CIDInfo } from './services/CIDReader';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Drive operations
  getDrives: (showAllDrives?: boolean): Promise<DriveInfo[]> => ipcRenderer.invoke('get-drives', showAllDrives),
  getRawDrives: (): Promise<any[]> => ipcRenderer.invoke('get-raw-drives'),
  startDriveWatch: (): Promise<void> => ipcRenderer.invoke('start-drive-watch'),
  stopDriveWatch: (): Promise<void> => ipcRenderer.invoke('stop-drive-watch'),

  // Test operations
  startTest: (config: TestConfig): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('start-test', config),
  stopTest: (): Promise<{ success: boolean }> => ipcRenderer.invoke('stop-test'),
  pauseTest: (): Promise<{ success: boolean }> => ipcRenderer.invoke('pause-test'),
  resumeTest: (): Promise<{ success: boolean }> => ipcRenderer.invoke('resume-test'),

  // Export
  exportReport: (report: TestResult): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('export-report', report),

  // History operations
  getHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke('get-history'),
  getHistoryStats: (): Promise<HistoryStats | null> => ipcRenderer.invoke('get-history-stats'),
  searchHistory: (query: string): Promise<HistoryEntry[]> => ipcRenderer.invoke('search-history', query),
  exportHistory: (format: 'json' | 'csv'): Promise<string | null> => ipcRenderer.invoke('export-history', format),
  deleteHistoryEntry: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-history-entry', id),
  clearHistory: (): Promise<void> => ipcRenderer.invoke('clear-history'),
  saveTestResult: (data: {
    results: TestResult;
    driveInfo: { name: string; label?: string; capacity: number };
    testType: 'quick' | 'deep' | 'h2testw';
    manufacturer?: string;
    model?: string;
    notes?: string;
  }): Promise<HistoryEntry> => ipcRenderer.invoke('save-test-result', data),

  // CID operations
  readCID: (drivePath: string): Promise<{ cid: CIDInfo | null; warning?: string }> =>
    ipcRenderer.invoke('read-cid', drivePath),

  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),

  // Event listeners
  onDrivesUpdated: (callback: (drives: DriveInfo[]) => void) => {
    ipcRenderer.on('drives-updated', (_, drives) => callback(drives));
  },
  onTestProgress: (callback: (data: TestProgress) => void) => {
    ipcRenderer.on('test-progress', (_, data) => callback(data));
  },
  onTestCompleted: (callback: (result: TestResult) => void) => {
    ipcRenderer.on('test-completed', (_, result) => callback(result));
  },
  onTestError: (callback: (error: string) => void) => {
    ipcRenderer.on('test-error', (_, error) => callback(error));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getDrives: (showAllDrives?: boolean) => Promise<DriveInfo[]>;
      startDriveWatch: () => Promise<void>;
      stopDriveWatch: () => Promise<void>;
      startTest: (config: TestConfig) => Promise<{ success: boolean; error?: string }>;
      stopTest: () => Promise<{ success: boolean }>;
      pauseTest: () => Promise<{ success: boolean }>;
      resumeTest: () => Promise<{ success: boolean }>;
      exportReport: (report: TestResult) => Promise<{ success: boolean; path?: string }>;
      getVersion: () => Promise<string>;
      // History
      getHistory: () => Promise<HistoryEntry[]>;
      getHistoryStats: () => Promise<HistoryStats | null>;
      searchHistory: (query: string) => Promise<HistoryEntry[]>;
      exportHistory: (format: 'json' | 'csv') => Promise<string | null>;
      deleteHistoryEntry: (id: string) => Promise<boolean>;
      clearHistory: () => Promise<void>;
      saveTestResult: (data: {
        results: TestResult;
        driveInfo: { name: string; label?: string; capacity: number };
        testType: 'quick' | 'deep' | 'h2testw';
        manufacturer?: string;
        model?: string;
        notes?: string;
      }) => Promise<HistoryEntry>;
      // CID
      readCID: (drivePath: string) => Promise<{ cid: CIDInfo | null; warning?: string }>;
      // Event listeners
      onDrivesUpdated: (callback: (drives: DriveInfo[]) => void) => void;
      onTestProgress: (callback: (data: TestProgress) => void) => void;
      onTestCompleted: (callback: (result: TestResult) => void) => void;
      onTestError: (callback: (error: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
