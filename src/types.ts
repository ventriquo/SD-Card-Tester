export type TestState = 'idle' | 'testing' | 'results';

export interface DriveInfo {
  id: string;
  name: string;
  capacity: number; // in GB (claimed)
  actualCapacity?: number; // in GB (detected, optional)
  type: 'microsd' | 'sd' | 'usb' | 'hdd' | 'ssd';
  path: string; // mount point (e.g., "E:\\" or "/Volumes/SD")
  physicalPath?: string; // raw device path (e.g., "\\\\.\\PhysicalDrive2" or "/dev/rdisk2")
  filesystem?: string; // NTFS, FAT32, exFAT, etc.
  isRemovable: boolean;
  isSystemDrive: boolean;
  serialNumber?: string;
  manufacturer?: string;
  // CID Register Data (if available)
  cid?: {
    mid: number; // Manufacturer ID
    oid: string; // OEM ID
    pnm: string; // Product Name
    prv: number; // Product Revision
    psn: number; // Product Serial Number
    mdt: string; // Manufacturing Date
  };
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
  testMethod: 'quick' | 'deep' | 'h2testw';
  timestamp: number;
  drive: DriveInfo;
  details?: {
    badSectors: Array<{ position: number; expected?: number; actual?: number }>;
    firstFailureAt?: number; // GB position where first error occurred
    pattern?: string;
    filesCreated?: number; // For H2testw
  };
}

// Test configuration
export interface TestConfig {
  driveId: string;
  drive: DriveInfo;
  method: 'quick' | 'deep' | 'h2testw';
  preserveData: boolean; // If true, test only empty space; if false, destructive test
  quickScanOptions?: {
    spotCount: number; // Number of spots to check (default: 576 like ValiDrive)
  };
  deepScanOptions?: {
    blockSize: number; // MB per block (default: 1024)
    resumeFrom?: number; // GB position to resume from (for interrupted tests)
  };
  h2testwOptions?: {
    fileSize: number; // MB per file (default: 1024 = 1GB)
  };
}

// Sector status for visual map
export type SectorStatus = 'pending' | 'writing' | 'verifying' | 'validated' | 'writeError' | 'readError' | 'corrupt' | 'noStorage';

export interface SectorMap {
  totalSectors: number;
  sectorSize: number; // bytes per sector
  sectors: SectorStatus[];
  lastUpdated: number;
}

// Real-time test progress
export interface TestProgress {
  phase: 'preparing' | 'writing' | 'verifying' | 'finalizing';
  progress: number; // 0-100
  writeSpeed: number; // MB/s
  readSpeed: number; // MB/s
  bytesWritten: number;
  bytesVerified: number;
  errors: number;
  timeElapsed: number; // seconds
  timeRemaining: number; // seconds
  currentOperation: string;
  history: {
    timestamp: number;
    writeSpeed: number;
    readSpeed: number;
  }[];
  // H2testw-style sector map
  sectorMap?: SectorMap;
  // H2testw-style file progress
  currentFile?: number;
  totalFiles?: number;
}

// Test history entry for database
export interface TestHistoryEntry extends TestResult {
  id: string;
  date: string;
}

// App settings
export interface AppSettings {
  defaultTestMethod: 'quick' | 'deep';
  autoStartDriveWatch: boolean;
  exportFormat: 'json' | 'txt' | 'csv';
  language: 'en' | 'id'; // English or Indonesian
  showCidWarning: boolean;
  enableSpeedGraph: boolean;
}
