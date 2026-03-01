/**
 * History Store Service
 * 
 * Manages storage and retrieval of test results history.
 * Uses JSON file storage for simplicity.
 * 
 * Future enhancement: Could migrate to SQLite for better performance
 * with large history datasets.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { TestResult } from '../../src/types';

export interface HistoryEntry {
  id: string;                    // Unique identifier (timestamp + random)
  timestamp: number;             // Unix timestamp
  date: string;                  // ISO date string
  driveName: string;             // Drive letter/path
  driveLabel?: string;           // Volume label
  capacity: number;              // Reported capacity in bytes
  testType: 'quick' | 'deep' | 'h2testw';
  duration: number;              // Test duration in seconds
  writeSpeed: number;            // Average write speed MB/s
  readSpeed: number;             // Average read speed MB/s
  writeSpeedPeak: number;        // Peak write speed MB/s
  readSpeedPeak: number;         // Peak read speed MB/s
  result: 'pass' | 'fail' | 'warning' | 'cancelled';
  fakeProbability: number;       // 0-100
  errorsFound: number;           // Number of bad sectors/errors
  actualCapacity?: number;       // Detected actual capacity (for fakes)
  manufacturer?: string;         // Detected manufacturer (if CID available)
  model?: string;                // Product name (if CID available)
  notes?: string;                // User-added notes
  exportedReport?: string;       // Path to exported report file
}

export interface HistoryStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  fakeCardsDetected: number;
  averageWriteSpeed: number;
  averageReadSpeed: number;
  fastestCard?: HistoryEntry;
  slowestCard?: HistoryEntry;
  mostRecentTest?: HistoryEntry;
}

export class HistoryStore {
  private static storageDir: string;
  private static historyFile: string;
  private static initialized = false;

  /**
   * Initialize the history store
   */
  static initialize(): void {
    if (this.initialized) return;

    // Use app.getPath to get appropriate storage location
    const userDataPath = app.getPath('userData');
    this.storageDir = path.join(userDataPath, 'history');
    this.historyFile = path.join(this.storageDir, 'test-history.json');

    // Ensure directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    this.initialized = true;
  }

  /**
   * Get the full path to the history file
   */
  static getHistoryFilePath(): string {
    this.initialize();
    return this.historyFile;
  }

  /**
   * Get the storage directory path
   */
  static getStorageDir(): string {
    this.initialize();
    return this.storageDir;
  }

  /**
   * Load all history entries
   */
  static async loadHistory(): Promise<HistoryEntry[]> {
    this.initialize();

    try {
      if (!fs.existsSync(this.historyFile)) {
        return [];
      }

      const data = await fs.promises.readFile(this.historyFile, 'utf-8');
      const history: HistoryEntry[] = JSON.parse(data);
      
      // Sort by timestamp (newest first)
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Save a new test result to history
   */
  static async saveTestResult(
    results: TestResult,
    driveInfo: {
      name: string;
      label?: string;
      capacity: number;
    },
    testType: 'quick' | 'deep' | 'h2testw',
    manufacturer?: string,
    model?: string,
    notes?: string
  ): Promise<HistoryEntry> {
    this.initialize();

    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      date: new Date().toISOString(),
      driveName: driveInfo.name,
      driveLabel: driveInfo.label,
      capacity: driveInfo.capacity,
      testType,
      duration: results.duration || 0,
      writeSpeed: results.averageWriteSpeed || 0,
      readSpeed: results.averageReadSpeed || 0,
      writeSpeedPeak: results.averageWriteSpeed || 0,
      readSpeedPeak: results.averageReadSpeed || 0,
      result: results.isGenuine ? 'pass' : 'fail',
      fakeProbability: results.isGenuine ? 0 : 75,
      errorsFound: results.errors || 0,
      actualCapacity: results.actualCapacity,
      manufacturer,
      model,
      notes,
    };

    // Load existing history
    const history = await this.loadHistory();
    
    // Add new entry
    history.unshift(entry);
    
    // Limit to 1000 entries to prevent file bloat
    const trimmedHistory = history.slice(0, 1000);
    
    // Save back to file
    await fs.promises.writeFile(
      this.historyFile,
      JSON.stringify(trimmedHistory, null, 2),
      'utf-8'
    );

    return entry;
  }

  /**
   * Delete a history entry
   */
  static async deleteEntry(id: string): Promise<boolean> {
    this.initialize();

    try {
      const history = await this.loadHistory();
      const filtered = history.filter(entry => entry.id !== id);
      
      await fs.promises.writeFile(
        this.historyFile,
        JSON.stringify(filtered, null, 2),
        'utf-8'
      );

      return filtered.length < history.length;
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      return false;
    }
  }

  /**
   * Clear all history
   */
  static async clearHistory(): Promise<void> {
    this.initialize();

    try {
      if (fs.existsSync(this.historyFile)) {
        await fs.promises.unlink(this.historyFile);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  }

  /**
   * Export history to a file
   */
  static async exportHistory(format: 'json' | 'csv'): Promise<string> {
    this.initialize();

    const history = await this.loadHistory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'json') {
      const exportPath = path.join(this.storageDir, `history-export-${timestamp}.json`);
      await fs.promises.writeFile(
        exportPath,
        JSON.stringify(history, null, 2),
        'utf-8'
      );
      return exportPath;
    } else {
      // CSV format
      const exportPath = path.join(this.storageDir, `history-export-${timestamp}.csv`);
      const csv = this.convertToCSV(history);
      await fs.promises.writeFile(exportPath, csv, 'utf-8');
      return exportPath;
    }
  }

  /**
   * Get statistics from history
   */
  static async getStats(): Promise<HistoryStats> {
    this.initialize();

    const history = await this.loadHistory();
    
    if (history.length === 0) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warningTests: 0,
        fakeCardsDetected: 0,
        averageWriteSpeed: 0,
        averageReadSpeed: 0,
      };
    }

    const passedTests = history.filter(h => h.result === 'pass').length;
    const failedTests = history.filter(h => h.result === 'fail').length;
    const warningTests = history.filter(h => h.result === 'warning').length;
    const fakeCards = history.filter(h => h.fakeProbability > 50).length;

    const avgWriteSpeed = history.reduce((sum, h) => sum + h.writeSpeed, 0) / history.length;
    const avgReadSpeed = history.reduce((sum, h) => sum + h.readSpeed, 0) / history.length;

    // Find fastest and slowest cards
    const sortedByWrite = [...history].sort((a, b) => b.writeSpeed - a.writeSpeed);
    const fastestCard = sortedByWrite[0];
    const slowestCard = sortedByWrite[sortedByWrite.length - 1];

    return {
      totalTests: history.length,
      passedTests,
      failedTests,
      warningTests,
      fakeCardsDetected: fakeCards,
      averageWriteSpeed: Math.round(avgWriteSpeed * 10) / 10,
      averageReadSpeed: Math.round(avgReadSpeed * 10) / 10,
      fastestCard,
      slowestCard,
      mostRecentTest: history[0],
    };
  }

  /**
   * Search history
   */
  static async search(query: string): Promise<HistoryEntry[]> {
    const history = await this.loadHistory();
    const lowerQuery = query.toLowerCase();

    return history.filter(entry => 
      entry.driveName.toLowerCase().includes(lowerQuery) ||
      entry.driveLabel?.toLowerCase().includes(lowerQuery) ||
      entry.manufacturer?.toLowerCase().includes(lowerQuery) ||
      entry.model?.toLowerCase().includes(lowerQuery) ||
      entry.notes?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Update notes for a history entry
   */
  static async updateNotes(id: string, notes: string): Promise<boolean> {
    this.initialize();

    try {
      const history = await this.loadHistory();
      const entry = history.find(h => h.id === id);
      
      if (!entry) return false;

      entry.notes = notes;
      
      await fs.promises.writeFile(
        this.historyFile,
        JSON.stringify(history, null, 2),
        'utf-8'
      );

      return true;
    } catch (error) {
      console.error('Failed to update notes:', error);
      return false;
    }
  }

  // Private helper methods

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static mapResultStatus(status: string): 'pass' | 'fail' | 'warning' | 'cancelled' {
    switch (status) {
      case 'pass':
      case 'completed':
        return 'pass';
      case 'fail':
      case 'error':
        return 'fail';
      case 'warning':
        return 'warning';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'warning';
    }
  }

  private static convertToCSV(history: HistoryEntry[]): string {
    const headers = [
      'Date',
      'Drive',
      'Label',
      'Capacity (GB)',
      'Test Type',
      'Duration (s)',
      'Write Speed (MB/s)',
      'Read Speed (MB/s)',
      'Result',
      'Fake Probability',
      'Errors',
      'Manufacturer',
      'Model',
      'Notes',
    ];

    const rows = history.map(entry => [
      entry.date,
      entry.driveName,
      entry.driveLabel || '',
      (entry.capacity / 1e9).toFixed(2),
      entry.testType,
      entry.duration.toFixed(1),
      entry.writeSpeed.toFixed(2),
      entry.readSpeed.toFixed(2),
      entry.result,
      entry.fakeProbability,
      entry.errorsFound,
      entry.manufacturer || '',
      entry.model || '',
      entry.notes || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export default HistoryStore;
