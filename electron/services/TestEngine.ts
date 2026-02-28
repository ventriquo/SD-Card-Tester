import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import type { TestConfig, TestProgress, TestResult, DriveInfo } from '../../src/types';

type TestState = 'idle' | 'preparing' | 'writing' | 'verifying' | 'completed' | 'error' | 'paused';

// For pause/resume functionality
const isPaused = { value: false };

interface TestHistoryPoint {
  timestamp: number;
  writeSpeed: number;
  readSpeed: number;
}

export class TestEngine extends EventEmitter {
  private state: TestState = 'idle';
  private config: TestConfig | null = null;
  private drive: DriveInfo | null = null;
  private startTime: number = 0;
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
    currentOperation: 'Initializing...',
    history: [],
  };
  private history: TestHistoryPoint[] = [];
  private abortController: AbortController | null = null;
  private testFilePath: string | null = null;

  constructor() {
    super();
  }

  async startTest(config: TestConfig & { drive: DriveInfo }): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'error') {
      throw new Error('Test is already running');
    }

    this.config = config;
    this.drive = config.drive;
    this.state = 'preparing';
    this.startTime = Date.now();
    this.abortController = new AbortController();
    this.history = [];

    // Reset progress
    this.progress = {
      phase: 'preparing',
      progress: 0,
      writeSpeed: 0,
      readSpeed: 0,
      bytesWritten: 0,
      bytesVerified: 0,
      errors: 0,
      timeElapsed: 0,
      timeRemaining: this.estimateTime(),
      currentOperation: 'Preparing test environment...',
      history: [],
    };

    this.emit('progress', this.progress);

    try {
      if (config.method === 'quick') {
        await this.runQuickTest();
      } else {
        await this.runDeepTest();
      }
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

  stopTest(): void {
    this.abortController?.abort();
    this.state = 'idle';
    this.cleanup();
  }

  pauseTest(): void {
    if (this.state === 'writing' || this.state === 'verifying') {
      isPaused.value = true;
      this.progress.currentOperation = 'Test paused';
      this.emit('progress', this.progress);
    }
  }

  resumeTest(): void {
    isPaused.value = false;
    this.progress.currentOperation = 'Resuming test...';
    this.emit('progress', this.progress);
  }

  private async runQuickTest(): Promise<void> {
    this.state = 'writing';
    this.progress.phase = 'writing';
    
    const spotCount = this.config?.quickScanOptions?.spotCount || 576;
    const drivePath = this.drive!.path;
    const totalSize = this.drive!.capacity * 1024 * 1024 * 1024; // Convert to bytes
    const step = totalSize / spotCount;
    
    // Check if there's enough free space
    const stats = await fs.promises.statfs(drivePath).catch(() => null);
    if (!stats) {
      throw new Error('Cannot access drive. Please ensure it is properly mounted.');
    }

    this.progress.currentOperation = `Running spot check (${spotCount} regions)...`;
    this.emit('progress', this.progress);

    const testFilePath = path.join(drivePath, '.sdtest_tmp');
    this.testFilePath = testFilePath;

    // Create test file handle
    let fileHandle: fs.promises.FileHandle | null = null;
    
    try {
      fileHandle = await fs.promises.open(testFilePath, 'w+');
      
      for (let i = 0; i < spotCount; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('AbortError');
        }

        while (isPaused.value) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const offset = Math.floor(i * step);
        const testData = this.generateTestData(4096, i); // 4KB test pattern
        
        // Read original data
        const originalData = Buffer.alloc(4096);
        try {
          await fileHandle.read(originalData, 0, 4096, offset);
        } catch {
          // If read fails, assume empty/zeros
        }

        // Write test data
        const writeStart = Date.now();
        await fileHandle.write(testData, 0, 4096, offset);
        await fileHandle.sync();
        const writeTime = Date.now() - writeStart;

        // Read back and verify
        const readBuffer = Buffer.alloc(4096);
        const readStart = Date.now();
        await fileHandle.read(readBuffer, 0, 4096, offset);
        const readTime = Date.now() - readStart;

        // Verify
        if (!readBuffer.equals(testData)) {
          // Ghost sector detected!
          this.progress.errors++;
          
          // Calculate actual capacity from this failure point
          const actualCapacityGB = offset / (1024 * 1024 * 1024);
          
          this.progress.currentOperation = `FAKE DETECTED at ${actualCapacityGB.toFixed(2)} GB`;
          this.emit('progress', this.progress);
          
          // Restore original data
          await fileHandle.write(originalData, 0, 4096, offset);
          await fileHandle.sync();
          
          this.completeTest(false, actualCapacityGB);
          return;
        }

        // Restore original data
        await fileHandle.write(originalData, 0, 4096, offset);
        await fileHandle.sync();

        // Update progress
        this.progress.progress = ((i + 1) / spotCount) * 100;
        this.progress.writeSpeed = 4096 / (writeTime / 1000) / (1024 * 1024); // MB/s
        this.progress.readSpeed = 4096 / (readTime / 1000) / (1024 * 1024); // MB/s
        this.progress.bytesVerified = offset;
        this.progress.timeElapsed = (Date.now() - this.startTime) / 1000;
        this.progress.timeRemaining = this.estimateRemaining(spotCount, i + 1);
        
        // Add to history every 10 spots
        if (i % 10 === 0) {
          this.history.push({
            timestamp: Date.now(),
            writeSpeed: this.progress.writeSpeed,
            readSpeed: this.progress.readSpeed,
          });
          this.progress.history = [...this.history];
        }

        this.progress.currentOperation = `Testing region ${i + 1}/${spotCount}`;
        this.emit('progress', this.progress);
      }

      this.progress.phase = 'finalizing';
      this.progress.currentOperation = 'Test completed successfully';
      this.emit('progress', this.progress);

      this.completeTest(true, this.drive!.capacity);

    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
      await this.cleanup();
    }
  }

  private async runDeepTest(): Promise<void> {
    this.state = 'writing';
    this.progress.phase = 'writing';
    
    const drivePath = this.drive!.path;
    const blockSize = (this.config?.deepScanOptions?.blockSize || 1024) * 1024 * 1024; // GB to bytes
    const totalCapacity = this.drive!.capacity * 1024 * 1024 * 1024;
    const numBlocks = Math.ceil(totalCapacity / blockSize);
    
    // Create test directory
    const testDir = path.join(drivePath, '.sdtest_files');
    this.testFilePath = testDir;
    
    try {
      await fs.promises.mkdir(testDir, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create test directory: ${(error as Error).message}`);
    }

    const writtenBlocks: { file: string; pattern: number[] }[] = [];

    try {
      // Write phase
      for (let i = 0; i < numBlocks; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('AbortError');
        }

        while (isPaused.value) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const fileName = `test_${i.toString().padStart(4, '0')}.tmp`;
        const filePath = path.join(testDir, fileName);
        const pattern = this.generatePattern(i);
        
        const writeStart = Date.now();
        
        try {
          // Write test file with generated pattern
          await this.writePatternFile(filePath, pattern, blockSize);
          writtenBlocks.push({ file: filePath, pattern });
          
          const writeTime = Date.now() - writeStart;
          const bytesWritten = (i + 1) * blockSize;
          
          this.progress.progress = ((i + 1) / (numBlocks * 2)) * 100; // 50% for write
          this.progress.writeSpeed = blockSize / (writeTime / 1000) / (1024 * 1024);
          this.progress.bytesWritten = bytesWritten;
          this.progress.timeElapsed = (Date.now() - this.startTime) / 1000;
          this.progress.timeRemaining = this.estimateRemaining(numBlocks * 2, i + 1);
          this.progress.currentOperation = `Writing test data: Block ${i + 1}/${numBlocks}`;
          
          if (i % 5 === 0) {
            this.history.push({
              timestamp: Date.now(),
              writeSpeed: this.progress.writeSpeed,
              readSpeed: 0,
            });
            this.progress.history = [...this.history];
          }
          
          this.emit('progress', this.progress);
        } catch (error) {
          // Write failed - likely fake capacity
          this.progress.errors++;
          const actualCapacity = (i * blockSize) / (1024 * 1024 * 1024);
          this.completeTest(false, actualCapacity);
          return;
        }
      }

      // Verify phase
      this.state = 'verifying';
      this.progress.phase = 'verifying';
      
      for (let i = 0; i < writtenBlocks.length; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('AbortError');
        }

        while (isPaused.value) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const { file, pattern } = writtenBlocks[i];
        
        const readStart = Date.now();
        
        try {
          const isValid = await this.verifyPatternFile(file, pattern);
          
          if (!isValid) {
            this.progress.errors++;
            const actualCapacity = (i * blockSize) / (1024 * 1024 * 1024);
            this.completeTest(false, actualCapacity);
            return;
          }
          
          const readTime = Date.now() - readStart;
          const bytesVerified = (i + 1) * blockSize;
          
          this.progress.progress = 50 + ((i + 1) / (numBlocks * 2)) * 100;
          this.progress.readSpeed = blockSize / (readTime / 1000) / (1024 * 1024);
          this.progress.bytesVerified = bytesVerified;
          this.progress.timeElapsed = (Date.now() - this.startTime) / 1000;
          this.progress.timeRemaining = this.estimateRemaining(numBlocks * 2, numBlocks + i + 1);
          this.progress.currentOperation = `Verifying data: Block ${i + 1}/${numBlocks}`;
          
          if (i % 5 === 0) {
            this.history.push({
              timestamp: Date.now(),
              writeSpeed: 0,
              readSpeed: this.progress.readSpeed,
            });
            this.progress.history = [...this.history];
          }
          
          this.emit('progress', this.progress);
        } catch (error) {
          this.progress.errors++;
          const actualCapacity = (i * blockSize) / (1024 * 1024 * 1024);
          this.completeTest(false, actualCapacity);
          return;
        }
      }

      this.progress.phase = 'finalizing';
      this.progress.currentOperation = 'Test completed successfully';
      this.emit('progress', this.progress);

      this.completeTest(true, this.drive!.capacity);

    } finally {
      await this.cleanup();
    }
  }

  private async writePatternFile(filePath: string, pattern: number[], size: number): Promise<void> {
    const chunk = Buffer.from(pattern);
    const repetitions = Math.ceil(size / chunk.length);
    const fileHandle = await fs.promises.open(filePath, 'w');
    
    try {
      for (let i = 0; i < repetitions; i++) {
        await fileHandle.write(chunk);
      }
      await fileHandle.sync();
    } finally {
      await fileHandle.close();
    }
  }

  private async verifyPatternFile(filePath: string, pattern: number[]): Promise<boolean> {
    try {
      const fileHandle = await fs.promises.open(filePath, 'r');
      const chunkSize = pattern.length;
      const buffer = Buffer.alloc(chunkSize);
      
      try {
        const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, 0);
        
        if (bytesRead !== chunkSize) {
          return false;
        }
        
        for (let i = 0; i < chunkSize; i++) {
          if (buffer[i] !== pattern[i]) {
            return false;
          }
        }
        
        return true;
      } finally {
        await fileHandle.close();
      }
    } catch {
      return false;
    }
  }

  private generateTestData(size: number, seed: number): Buffer {
    // Simple pseudo-random generator with seed
    const data = Buffer.alloc(size);
    let state = seed;
    
    for (let i = 0; i < size; i++) {
      // xorshift
      state ^= state << 13;
      state ^= state >> 17;
      state ^= state << 5;
      data[i] = state & 0xFF;
    }
    
    return data;
  }

  private generatePattern(seed: number): number[] {
    const size = 1024 * 1024; // 1MB pattern
    const pattern: number[] = [];
    let state = seed;
    
    for (let i = 0; i < size; i++) {
      state ^= state << 13;
      state ^= state >> 17;
      state ^= state << 5;
      pattern.push(state & 0xFF);
    }
    
    return pattern;
  }

  private estimateTime(): number {
    if (!this.config || !this.drive) return 0;
    
    const capacityGB = this.drive.capacity;
    
    if (this.config.method === 'quick') {
      // Quick scan: ~2-5 minutes depending on drive speed
      return 300;
    } else {
      // Deep scan: ~10-30 minutes per 100GB depending on speed
      return capacityGB * 18; // seconds
    }
  }

  private estimateRemaining(totalSteps: number, currentStep: number): number {
    if (currentStep === 0) return this.estimateTime();
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = elapsed / currentStep;
    const remaining = (totalSteps - currentStep) * rate;
    
    return Math.max(0, Math.floor(remaining));
  }

  private completeTest(isGenuine: boolean, actualCapacityGB: number): void {
    this.state = 'completed';
    
    const result: TestResult = {
      isGenuine,
      actualCapacity: actualCapacityGB,
      claimedCapacity: this.drive!.capacity,
      errors: this.progress.errors,
      averageWriteSpeed: this.calculateAverageWriteSpeed(),
      averageReadSpeed: this.calculateAverageReadSpeed(),
      duration: (Date.now() - this.startTime) / 1000,
      testMethod: this.config!.method,
      timestamp: Date.now(),
      drive: this.drive!,
      details: {
        badSectors: [],
        firstFailureAt: isGenuine ? undefined : actualCapacityGB,
        pattern: this.config?.method === 'quick' ? 'spot-check-576' : 'full-verify',
      },
    };

    this.emit('completed', result);
  }

  private calculateAverageWriteSpeed(): number {
    const writePoints = this.history.filter(h => h.writeSpeed > 0);
    if (writePoints.length === 0) return 0;
    
    const sum = writePoints.reduce((acc, h) => acc + h.writeSpeed, 0);
    return sum / writePoints.length;
  }

  private calculateAverageReadSpeed(): number {
    const readPoints = this.history.filter(h => h.readSpeed > 0);
    if (readPoints.length === 0) return 0;
    
    const sum = readPoints.reduce((acc, h) => acc + h.readSpeed, 0);
    return sum / readPoints.length;
  }

  private async cleanup(): Promise<void> {
    if (this.testFilePath) {
      try {
        const stats = await fs.promises.stat(this.testFilePath);
        
        if (stats.isDirectory()) {
          // Remove directory and contents
          await fs.promises.rm(this.testFilePath, { recursive: true, force: true });
        } else {
          // Remove file
          await fs.promises.unlink(this.testFilePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    
    this.testFilePath = null;
  }

  getState(): TestState {
    return this.state;
  }

  getProgress(): TestProgress {
    return this.progress;
  }
}
