export type TestState = 'idle' | 'testing' | 'results';

export interface DriveInfo {
  id: string;
  name: string;
  capacity: number; // in GB
  type: 'microsd' | 'usb' | 'hdd' | 'ssd';
  path: string;
}

export interface TestStats {
  progress: number; // 0-100
  writeSpeed: number; // MB/s
  readSpeed: number; // MB/s
  written: number; // GB
  verified: number; // GB
  errors: number;
  timeRemaining: number; // seconds
}

export interface TestResult {
  isGenuine: boolean;
  actualCapacity: number; // GB
  claimedCapacity: number; // GB
  errors: number;
  averageWriteSpeed: number;
  averageReadSpeed: number;
  duration: number; // seconds
}
