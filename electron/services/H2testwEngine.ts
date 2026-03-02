/**
 * H2testw Algorithm Implementation
 * 
 * H2testw is the industry standard for detecting fake SD cards and USB drives.
 * It uses a deterministic pseudo-random pattern to fill the drive, then verifies
 * every byte to detect capacity fraud and data corruption.
 * 
 * Key Features:
 * - Linear Congruential Generator (LCG) for deterministic pseudo-random data
 * - File-based approach: 1.h2w, 2.h2w, etc. (typically 1GB each)
 * - Sequential byte-by-byte verification
 * - Accurate capacity detection and bad sector reporting
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import type { DriveInfo, TestProgress, TestResult } from '../../src/types';

// H2testw LCG Parameters (same as original H2testw)
const LCG_MULTIPLIER = 1103515245;
const LCG_INCREMENT = 12345;
const LCG_MODULUS = 0x7FFFFFFF; // 2^31 - 1

// File size for H2testw files (1 GB = 1073741824 bytes)
const H2TESTW_FILE_SIZE = 1024 * 1024 * 1024;

// Write buffer size (8 MB for efficiency)
const WRITE_BUFFER_SIZE = 8 * 1024 * 1024;

interface H2testwConfig {
  drive: DriveInfo;
  fileSize?: number; // Size of each .h2w file in bytes (default: 1GB)
}

interface BadSectorInfo {
  fileNumber: number;
  offset: number;
  expected: number;
  actual: number;
}

export class H2testwEngine extends EventEmitter {
  private state: 'idle' | 'writing' | 'verifying' | 'completed' | 'error' = 'idle';
  private config: H2testwConfig | null = null;
  private drive: DriveInfo | null = null;
  private startTime: number = 0;
  private abortController: AbortController | null = null;
  private progress: TestProgress = {
    phase: 'preparing',
    progress: 0,
    writeSpeed: 0,
    readSpeed: 0,
    bytesWritten: 0,
    bytesVerified: 0,
    errors: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    currentOperation: 'Initializing H2testw...',
    history: [],
  };
  private history: Array<{ timestamp: number; writeSpeed: number; readSpeed: number }> = [];
  private badSectors: BadSectorInfo[] = [];
  private writtenFiles: string[] = [];
  private actualCapacity: number = 0;

  constructor() {
    super();
  }

  /**
   * Initialize the LCG with a seed value
   * H2testw uses the byte offset as the seed for each byte position
   */
  private lcg(seed: number): number {
    return (seed * LCG_MULTIPLIER + LCG_INCREMENT) & LCG_MODULUS;
  }

  /**
   * Generate expected byte value at a specific global offset
   * This is deterministic - same offset always produces same byte
   */
  private getExpectedByte(globalOffset: number): number {
    // Use the offset itself as the initial seed
    let state = globalOffset;
    
    // Apply LCG once to get the pseudo-random value
    state = this.lcg(state);
    
    // Return the low byte (0-255)
    return state & 0xFF;
  }

  /**
   * Start the H2testw test
   */
  async startTest(config: H2testwConfig): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Test is already running');
    }

    this.config = config;
    this.drive = config.drive;
    this.state = 'writing';
    this.startTime = Date.now();
    this.abortController = new AbortController();
    this.badSectors = [];
    this.writtenFiles = [];
    this.actualCapacity = 0;
    this.history = [];

    // Reset progress
    this.progress = {
      phase: 'writing',
      progress: 0,
      writeSpeed: 0,
      readSpeed: 0,
      bytesWritten: 0,
      bytesVerified: 0,
      errors: 0,
      timeElapsed: 0,
      timeRemaining: this.estimateTime(),
      currentOperation: 'Starting H2testw write phase...',
      history: [],
    };

    this.emit('progress', this.progress);

    try {
      await this.runWritePhase();
      
      if (this.abortController?.signal.aborted) {
        throw new Error('AbortError');
      }

      await this.runVerifyPhase();
      
      this.completeTest(true);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.state = 'idle';
        return;
      }
      
      this.state = 'error';
      this.emit('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Stop the test
   */
  stopTest(): void {
    this.abortController?.abort();
    this.state = 'idle';
  }

  /**
   * H2testw Write Phase
   * Fills the drive with .h2w files containing deterministic pseudo-random data
   */
  private async runWritePhase(): Promise<void> {
    const drivePath = this.drive!.path;
    const fileSize = this.config?.fileSize || H2TESTW_FILE_SIZE;
    
    let fileNumber = 1;
    let globalOffset = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    this.progress.currentOperation = 'Writing H2testw files...';
    this.emit('progress', this.progress);

    while (consecutiveErrors < maxConsecutiveErrors) {
      if (this.abortController?.signal.aborted) {
        throw new Error('AbortError');
      }

      const fileName = `${fileNumber}.h2w`;
      const filePath = path.join(drivePath, fileName);

      try {
        const writeStart = Date.now();
        await this.writeH2testwFile(filePath, fileSize, globalOffset);
        const writeTime = Date.now() - writeStart;

        // Success - file written
        this.writtenFiles.push(filePath);
        this.actualCapacity += fileSize;
        globalOffset += fileSize;
        consecutiveErrors = 0;

        // Update progress
        const writeSpeed = fileSize / (writeTime / 1000) / (1024 * 1024); // MB/s
        this.progress.writeSpeed = writeSpeed;
        this.progress.bytesWritten = globalOffset;
        this.progress.timeElapsed = (Date.now() - this.startTime) / 1000;
        this.progress.currentOperation = `Writing ${fileName} (${(globalOffset / (1024 * 1024 * 1024)).toFixed(2)} GB written)`;
        
        // Add to history every file
        this.history.push({
          timestamp: Date.now(),
          writeSpeed,
          readSpeed: 0,
        });
        this.progress.history = [...this.history];
        
        this.emit('progress', this.progress);

        fileNumber++;
      } catch (error) {
        // Write failed - likely reached actual capacity
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          // Confirmed end of real capacity
          break;
        }
      }
    }

    if (this.writtenFiles.length === 0) {
      throw new Error('Could not write any test files. Drive may be full or inaccessible.');
    }

    this.progress.phase = 'verifying';
    this.progress.currentOperation = 'Write phase complete. Starting verification...';
    this.emit('progress', this.progress);
  }

  /**
   * Write a single .h2w file with deterministic pseudo-random data
   */
  private async writeH2testwFile(
    filePath: string,
    fileSize: number,
    globalOffset: number
  ): Promise<void> {
    const fileHandle = await fs.promises.open(filePath, 'w');
    
    try {
      let bytesWritten = 0;
      const buffer = Buffer.alloc(WRITE_BUFFER_SIZE);

      while (bytesWritten < fileSize) {
        if (this.abortController?.signal.aborted) {
          throw new Error('AbortError');
        }

        // Fill buffer with deterministic pseudo-random data
        const chunkSize = Math.min(WRITE_BUFFER_SIZE, fileSize - bytesWritten);
        
        for (let i = 0; i < chunkSize; i++) {
          buffer[i] = this.getExpectedByte(globalOffset + bytesWritten + i);
        }

        // Write chunk
        await fileHandle.write(buffer, 0, chunkSize, bytesWritten);
        bytesWritten += chunkSize;
      }

      // Sync to ensure data is written to disk
      await fileHandle.sync();
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * H2testw Verify Phase
   * Reads back every file and verifies each byte matches the expected pattern
   */
  private async runVerifyPhase(): Promise<void> {
    this.state = 'verifying';
    
    let globalOffset = 0;
    let totalVerifiedBytes = 0;
    const totalBytes = this.actualCapacity;

    this.progress.currentOperation = 'Verifying H2testw files...';
    this.emit('progress', this.progress);

    for (let i = 0; i < this.writtenFiles.length; i++) {
      if (this.abortController?.signal.aborted) {
        throw new Error('AbortError');
      }

      const filePath = this.writtenFiles[i];
      const fileName = path.basename(filePath);

      try {
        const readStart = Date.now();
        const { errors, bytesVerified } = await this.verifyH2testwFile(
          filePath,
          globalOffset
        );
        const readTime = Date.now() - readStart;

        totalVerifiedBytes += bytesVerified;

        // Update errors
        if (errors > 0) {
          this.progress.errors += errors;
        }

        // Update progress
        const readSpeed = bytesVerified / (readTime / 1000) / (1024 * 1024); // MB/s
        this.progress.readSpeed = readSpeed;
        this.progress.bytesVerified = totalVerifiedBytes;
        this.progress.progress = (totalVerifiedBytes / totalBytes) * 100;
        this.progress.timeElapsed = (Date.now() - this.startTime) / 1000;
        this.progress.timeRemaining = this.estimateRemaining(totalBytes, totalVerifiedBytes);
        this.progress.currentOperation = `Verifying ${fileName} (${(totalVerifiedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB verified)`;

        // Add to history
        this.history.push({
          timestamp: Date.now(),
          writeSpeed: 0,
          readSpeed,
        });
        this.progress.history = [...this.history];

        this.emit('progress', this.progress);

        // If we found errors in this file, we may have found the end of real capacity
        if (errors > 0 && this.badSectors.length > 1000) {
          // Too many errors - likely fake capacity
          this.actualCapacity = globalOffset;
          this.completeTest(false);
          return;
        }

        globalOffset += bytesVerified;
      } catch (error) {
        // File read error
        this.progress.errors++;
        this.actualCapacity = globalOffset;
        this.completeTest(false);
        return;
      }
    }

    this.progress.phase = 'finalizing';
    this.progress.currentOperation = 'H2testw verification complete';
    this.emit('progress', this.progress);
  }

  /**
   * Verify a single .h2w file byte-by-byte
   */
  private async verifyH2testwFile(
    filePath: string,
    globalOffset: number
  ): Promise<{ errors: number; bytesVerified: number }> {
    const fileHandle = await fs.promises.open(filePath, 'r');
    
    try {
      const stats = await fs.promises.stat(filePath);
      const fileSize = stats.size;
      
      let bytesVerified = 0;
      let errors = 0;
      const readBuffer = Buffer.alloc(WRITE_BUFFER_SIZE);

      while (bytesVerified < fileSize) {
        if (this.abortController?.signal.aborted) {
          throw new Error('AbortError');
        }

        const chunkSize = Math.min(WRITE_BUFFER_SIZE, fileSize - bytesVerified);
        const { bytesRead } = await fileHandle.read(
          readBuffer,
          0,
          chunkSize,
          bytesVerified
        );

        if (bytesRead !== chunkSize) {
          throw new Error('Unexpected end of file');
        }

        // Verify each byte
        for (let i = 0; i < chunkSize; i++) {
          const expected = this.getExpectedByte(globalOffset + bytesVerified + i);
          const actual = readBuffer[i];

          if (expected !== actual) {
            errors++;
            this.badSectors.push({
              fileNumber: Math.floor(globalOffset / H2TESTW_FILE_SIZE) + 1,
              offset: bytesVerified + i,
              expected,
              actual,
            });

            // Limit bad sector tracking to prevent memory issues
            if (this.badSectors.length > 10000) {
              return { errors, bytesVerified: bytesVerified + i };
            }
          }
        }

        bytesVerified += chunkSize;
      }

      return { errors, bytesVerified };
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Clean up test files
   */
  async cleanup(): Promise<void> {
    for (const filePath of this.writtenFiles) {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Complete the test and emit results
   */
  private completeTest(isGenuine: boolean): void {
    this.state = 'completed';

    const actualCapacityGB = this.actualCapacity / (1024 * 1024 * 1024);
    const claimedCapacityGB = this.drive!.capacity;

    const result: TestResult = {
      isGenuine: isGenuine && this.progress.errors === 0 && actualCapacityGB >= claimedCapacityGB * 0.95,
      actualCapacity: actualCapacityGB,
      claimedCapacity: claimedCapacityGB,
      errors: this.progress.errors,
      averageWriteSpeed: this.calculateAverageWriteSpeed(),
      averageReadSpeed: this.calculateAverageReadSpeed(),
      duration: (Date.now() - this.startTime) / 1000,
      testMethod: 'h2testw',
      timestamp: Date.now(),
      drive: this.drive!,
      details: {
        badSectors: this.badSectors.map(bs => ({
          position: bs.offset,
          expected: bs.expected,
          actual: bs.actual,
        })),
        firstFailureAt: this.badSectors.length > 0 ? this.badSectors[0].offset / (1024 * 1024 * 1024) : undefined,
        pattern: 'h2testw-lcg',
        filesCreated: this.writtenFiles.length,
      },
    };

    this.emit('completed', result);
  }

  private calculateAverageWriteSpeed(): number {
    const writePoints = this.history.filter(h => h.writeSpeed > 0);
    if (writePoints.length === 0) return 0;
    return writePoints.reduce((acc, h) => acc + h.writeSpeed, 0) / writePoints.length;
  }

  private calculateAverageReadSpeed(): number {
    const readPoints = this.history.filter(h => h.readSpeed > 0);
    if (readPoints.length === 0) return 0;
    return readPoints.reduce((acc, h) => acc + h.readSpeed, 0) / readPoints.length;
  }

  private estimateTime(): number {
    if (!this.drive) return 0;
    // H2testw takes approximately 30-60 minutes per 100GB depending on speed
    return this.drive.capacity * 36; // seconds
  }

  private estimateRemaining(totalBytes: number, completedBytes: number): number {
    if (completedBytes === 0) return this.estimateTime();
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = elapsed / completedBytes;
    const remaining = (totalBytes - completedBytes) * rate;
    return Math.max(0, Math.floor(remaining));
  }
}

export default H2testwEngine;
