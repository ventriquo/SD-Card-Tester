/**
 * CID Reader Service
 * 
 * Reads the Card Identification (CID) register from SD cards.
 * The CID is a 128-bit unique identifier that contains manufacturer info.
 * 
 * Windows: Requires admin privileges for full CID. Falls back to WMI hints.
 * macOS: Uses IOKit registry queries. May need Full Disk Access.
 * 
 * Note: Full CID reading requires native addons. This implementation
 * uses best-effort methods available without compiled binaries.
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

// Known Manufacturer IDs
export const MANUFACTURER_DATABASE: Record<number, { name: string; country: string; trusted: boolean }> = {
  0x01: { name: 'Panasonic', country: 'Japan', trusted: true },
  0x02: { name: 'Toshiba', country: 'Japan', trusted: true },
  0x03: { name: 'SanDisk', country: 'USA', trusted: true },
  0x06: { name: 'Renesas', country: 'Japan', trusted: true },
  0x11: { name: 'Phison', country: 'Taiwan', trusted: true },
  0x13: { name: 'Samsung', country: 'South Korea', trusted: true },
  0x15: { name: 'SK Hynix', country: 'South Korea', trusted: true },
  0x1B: { name: 'Samsung', country: 'South Korea', trusted: true },
  0x1C: { name: 'Transcend', country: 'Taiwan', trusted: true },
  0x1D: { name: 'ADATA', country: 'Taiwan', trusted: true },
  0x1E: { name: 'Lite-On', country: 'Taiwan', trusted: true },
  0x27: { name: 'Sony', country: 'Japan', trusted: true },
  0x28: { name: 'Lexar', country: 'USA', trusted: true },
  0x30: { name: 'Silicon Power', country: 'Taiwan', trusted: true },
  0x31: { name: 'PNY', country: 'USA', trusted: true },
  0x41: { name: 'Kingston', country: 'USA', trusted: true },
  0x44: { name: 'Transcend', country: 'Taiwan', trusted: true },
  0x58: { name: 'Spectek', country: 'USA', trusted: false },
  0x5A: { name: 'Kingmax', country: 'Taiwan', trusted: true },
  0x70: { name: 'Integral', country: 'UK', trusted: true },
  0x74: { name: 'Transcend', country: 'Taiwan', trusted: true },
  0x76: { name: 'Patriot', country: 'USA', trusted: true },
  0x82: { name: 'G.Skill', country: 'Taiwan', trusted: true },
  0x89: { name: 'Team Group', country: 'Taiwan', trusted: true },
  0x9C: { name: 'HyperX (Kingston)', country: 'USA', trusted: true },
};

export interface CIDInfo {
  mid: number;           // Manufacturer ID
  oid: string;           // OEM/Application ID (2 ASCII chars)
  pnm: string;           // Product Name (5 ASCII chars)
  prv: string;           // Product Revision (BCD: 0x10 = 1.0)
  psn: number;           // Serial Number
  mdt: string;           // Manufacturing Date (YYYY-MM)
  crc: number;           // CRC7 checksum
  raw: string;           // Raw 128-bit CID as hex string
  manufacturer?: {       // Lookup from database
    name: string;
    country: string;
    trusted: boolean;
  };
  isGenuine: boolean;    // Based on manufacturer verification
  confidence: 'high' | 'medium' | 'low' | 'none'; // How reliable is this data
  source: string;        // How was this CID obtained
}

export interface CIDReadingResult {
  cid: CIDInfo | null;
  warning?: string;
  requiresAdmin: boolean;
  canElevate: boolean;
}

export class CIDReader {
  /**
   * Parse a 128-bit CID from raw bytes
   */
  static parseCID(rawBytes: Buffer): CIDInfo {
    if (rawBytes.length < 16) {
      throw new Error('CID must be at least 16 bytes');
    }

    const mid = rawBytes[0];
    const oid = rawBytes.slice(1, 3).toString('ascii').replace(/\0/g, '');
    const pnm = rawBytes.slice(3, 8).toString('ascii').replace(/\0/g, '');
    const prvMajor = (rawBytes[8] >> 4) & 0x0F;
    const prvMinor = rawBytes[8] & 0x0F;
    const psn = rawBytes.readUInt32BE(9);
    const mdtRaw = ((rawBytes[13] & 0x0F) << 4) | ((rawBytes[14] >> 4) & 0x0F);
    const year = 2000 + ((mdtRaw >> 4) & 0xFF);
    const month = mdtRaw & 0x0F;
    const crc = rawBytes[15] >> 1;

    const manufacturer = MANUFACTURER_DATABASE[mid];

    return {
      mid,
      oid,
      pnm,
      prv: `${prvMajor}.${prvMinor}`,
      psn,
      mdt: `${year}-${month.toString().padStart(2, '0')}`,
      crc,
      raw: rawBytes.toString('hex').toUpperCase(),
      manufacturer,
      isGenuine: !!manufacturer && manufacturer.trusted,
      confidence: 'high',
      source: 'raw-cid',
    };
  }

  /**
   * Check if running with admin/root privileges
   */
  static async hasAdminPrivileges(): Promise<boolean> {
    try {
      if (os.platform() === 'win32') {
        // On Windows, try to access a restricted resource
        try {
          execSync('net session', { stdio: 'ignore' });
          return true;
        } catch {
          return false;
        }
      } else {
        // On Unix-like systems, check UID
        return process.getuid?.() === 0;
      }
    } catch {
      return false;
    }
  }

  /**
   * Read CID from a drive path (Windows)
   * Attempts multiple methods, from most reliable to fallback
   */
  static async readCIDWindows(drivePath: string): Promise<CIDReadingResult> {
    const isAdmin = await this.hasAdminPrivileges();
    
    // Method 1: Try WMI extended properties (requires admin for full info)
    try {
      const wmiResult = await this.tryWMIWindows(drivePath);
      if (wmiResult) {
        return {
          cid: wmiResult,
          requiresAdmin: false,
          canElevate: false,
        };
      }
    } catch (error) {
      console.log('WMI method failed:', error);
    }

    // Method 2: Try to get any identifying info from DeviceID
    try {
      const deviceInfo = await this.getDeviceInfoWindows(drivePath);
      if (deviceInfo?.mid) {
        const manufacturer = MANUFACTURER_DATABASE[deviceInfo.mid];
        return {
          cid: {
            mid: deviceInfo.mid,
            oid: '??',
            pnm: deviceInfo.model || 'Unknown',
            prv: '?.?',
            psn: 0,
            mdt: '????-??',
            crc: 0,
            raw: 'UNKNOWN',
            manufacturer,
            isGenuine: !!manufacturer && manufacturer.trusted,
            confidence: 'low',
            source: 'wmi-inferred',
          },
          requiresAdmin: !isAdmin,
          canElevate: !isAdmin,
        };
      }
    } catch (error) {
      console.log('Device info method failed:', error);
    }

    // Method 3: Check for known manufacturer strings in drive info
    try {
      const inferredInfo = await this.inferFromDriveInfoWindows(drivePath);
      if (inferredInfo) {
        return {
          cid: inferredInfo,
          warning: isAdmin ? undefined : 'Limited verification. Run as administrator for full CID reading.',
          requiresAdmin: !isAdmin,
          canElevate: !isAdmin,
        };
      }
    } catch (error) {
      console.log('Inference method failed:', error);
    }

    // No CID available
    return {
      cid: null,
      warning: isAdmin 
        ? 'Unable to read CID from this device. It may not be an SD card.' 
        : 'Cannot read CID without administrator privileges. Right-click and "Run as administrator".',
      requiresAdmin: !isAdmin,
      canElevate: !isAdmin,
    };
  }

  /**
   * Try WMI to get SD card info on Windows
   */
  private static async tryWMIWindows(drivePath: string): Promise<CIDInfo | null> {
    try {
      // Get physical disk index from drive path
      const diskNumber = await this.getDiskNumberWindows(drivePath);
      if (diskNumber === null) return null;

      // Query WMI for disk info
      const { stdout } = await execAsync(
        `powershell.exe -Command "Get-CimInstance Win32_DiskDrive | Where-Object { \$_.Index -eq ${diskNumber} } | Select-Object -Property * | ConvertTo-Json"`
      );

      const diskInfo = JSON.parse(stdout);
      
      // Check if it's a removable disk (SD cards are removable)
      if (diskInfo.MediaType !== 'Removable media' && !diskInfo.Model?.toLowerCase().includes('sd')) {
        return null;
      }

      // Try to extract any CID-like info from SerialNumber
      // Some SD card readers expose partial CID in serial number
      if (diskInfo.SerialNumber && diskInfo.SerialNumber.length >= 16) {
        try {
          const cidBytes = Buffer.from(diskInfo.SerialNumber.slice(0, 32), 'hex');
          if (cidBytes.length >= 16) {
            return this.parseCID(cidBytes);
          }
        } catch {
          // Serial number is not valid CID hex
        }
      }

      return null;
    } catch (error) {
      console.error('WMI CID read failed:', error);
      return null;
    }
  }

  /**
   * Get Windows disk number from drive path
   */
  private static async getDiskNumberWindows(drivePath: string): Promise<number | null> {
    try {
      // Extract drive letter (e.g., "E:\" -> "E")
      const driveLetter = drivePath.charAt(0);
      
      const { stdout } = await execAsync(
        `powershell.exe -Command "(Get-Partition -DriveLetter '${driveLetter}').DiskNumber"`
      );
      
      const diskNumber = parseInt(stdout.trim(), 10);
      return isNaN(diskNumber) ? null : diskNumber;
    } catch {
      return null;
    }
  }

  /**
   * Get device info that might hint at manufacturer
   */
  private static async getDeviceInfoWindows(drivePath: string): Promise<{ mid: number; model?: string } | null> {
    try {
      const diskNumber = await this.getDiskNumberWindows(drivePath);
      if (diskNumber === null) return null;

      const { stdout } = await execAsync(
        `powershell.exe -Command "Get-PhysicalDisk | Where-Object { \$_.DeviceId -eq '${diskNumber}' } | Select-Object FriendlyName, Manufacturer | ConvertTo-Json"`
      );

      const info = JSON.parse(stdout);
      const model = info.FriendlyName || '';
      
      // Try to infer manufacturer from model name
      const modelLower = model.toLowerCase();
      for (const [mid, data] of Object.entries(MANUFACTURER_DATABASE)) {
        if (modelLower.includes(data.name.toLowerCase())) {
          return { mid: parseInt(mid, 10), model };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Infer CID info from drive properties
   */
  private static async inferFromDriveInfoWindows(drivePath: string): Promise<CIDInfo | null> {
    try {
      const diskNumber = await this.getDiskNumberWindows(drivePath);
      if (diskNumber === null) return null;

      const { stdout } = await execAsync(
        `powershell.exe -Command "Get-CimInstance Win32_DiskDrive | Where-Object { \$_.Index -eq ${diskNumber} } | Select-Object Model, Size, MediaType | ConvertTo-Json"`
      );

      const info = JSON.parse(stdout);
      const model = info.Model || 'Unknown';
      const modelLower = model.toLowerCase();

      // Try to find manufacturer match
      let matchedMid = 0;
      let manufacturerName = 'Unknown';
      
      for (const [mid, data] of Object.entries(MANUFACTURER_DATABASE)) {
        if (modelLower.includes(data.name.toLowerCase())) {
          matchedMid = parseInt(mid, 10);
          manufacturerName = data.name;
          break;
        }
      }

      // Check for common SD card indicators
      const isSD = info.MediaType === 'Removable media' || 
                   modelLower.includes('sd') || 
                   modelLower.includes('card');

      if (!isSD && matchedMid === 0) {
        return null;
      }

      return {
        mid: matchedMid,
        oid: '??',
        pnm: model.slice(0, 5),
        prv: '?.?',
        psn: 0,
        mdt: '????-??',
        crc: 0,
        raw: 'INFERRED',
        manufacturer: matchedMid ? MANUFACTURER_DATABASE[matchedMid] : undefined,
        isGenuine: matchedMid !== 0,
        confidence: 'low',
        source: 'model-inference',
      };
    } catch {
      return null;
    }
  }

  /**
   * Read CID from a drive path (macOS)
   * Uses IOKit to query device properties
   */
  static async readCIDMacOS(drivePath: string): Promise<CIDReadingResult> {
    try {
      // Get the BSD disk name from path
      const { stdout: diskName } = await execAsync(
        `diskutil info "${drivePath}" | grep "Device Identifier" | awk '{print $3}'`
      );
      const bsdName = diskName.trim();

      if (!bsdName) {
        return {
          cid: null,
          warning: 'Could not identify disk device',
          requiresAdmin: false,
          canElevate: false,
        };
      }

      // Query IOKit registry for SD card info
      const { stdout } = await execAsync(
        `ioreg -l -w0 -r -c IOBlockStorageDevice | grep -B5 -A30 "BSD Name = \\"${bsdName}\\""`
      );

      // Look for SD Card specific identifiers
      if (stdout.includes('SD') || stdout.includes('Card') || stdout.includes('Removable')) {
        // Try to extract CID if available
        const cidMatch = stdout.match(/"CID"\s*=\s*<([0-9a-fA-F]+)>/);
        
        if (cidMatch) {
          const cidBytes = Buffer.from(cidMatch[1], 'hex');
          return {
            cid: this.parseCID(cidBytes),
            requiresAdmin: false,
            canElevate: false,
          };
        }

        // Try to get manufacturer from device info
        const vendorMatch = stdout.match(/"Vendor Name"\s*=\s*"([^"]+)"/);
        const productMatch = stdout.match(/"Product Name"\s*=\s*"([^"]+)"/);
        
        if (vendorMatch || productMatch) {
          const vendor = vendorMatch?.[1] || '';
          const product = productMatch?.[1] || '';
          
          // Try to match vendor to manufacturer database
          const vendorLower = vendor.toLowerCase();
          let matchedMid = 0;
          
          for (const [mid, data] of Object.entries(MANUFACTURER_DATABASE)) {
            if (vendorLower.includes(data.name.toLowerCase())) {
              matchedMid = parseInt(mid, 10);
              break;
            }
          }

          return {
            cid: {
              mid: matchedMid,
              oid: '??',
              pnm: product.slice(0, 5) || 'Unknown',
              prv: '?.?',
              psn: 0,
              mdt: '????-??',
              crc: 0,
              raw: 'INFERRED',
              manufacturer: matchedMid ? MANUFACTURER_DATABASE[matchedMid] : undefined,
              isGenuine: matchedMid !== 0,
              confidence: 'medium',
              source: 'iokit-inferred',
            },
            requiresAdmin: false,
            canElevate: false,
          };
        }
      }

      return {
        cid: null,
        warning: 'Could not read CID from this device. It may not be an SD card, or Full Disk Access may be required.',
        requiresAdmin: false,
        canElevate: false,
      };
    } catch (error) {
      console.error('macOS CID read failed:', error);
      return {
        cid: null,
        warning: 'Error reading CID: ' + (error as Error).message,
        requiresAdmin: false,
        canElevate: false,
      };
    }
  }

  /**
   * Read CID from a drive (cross-platform)
   */
  static async readCID(drivePath: string): Promise<CIDReadingResult> {
    const platform = os.platform();

    if (platform === 'win32') {
      return this.readCIDWindows(drivePath);
    } else if (platform === 'darwin') {
      return this.readCIDMacOS(drivePath);
    } else {
      return {
        cid: null,
        warning: 'CID reading not supported on this platform (' + platform + ')',
        requiresAdmin: false,
        canElevate: false,
      };
    }
  }

  /**
   * Get CID reading instructions for the user
   */
  static getCIDInstructions(): string {
    const platform = os.platform();

    if (platform === 'win32') {
      return 'CID reading on Windows works best with administrator privileges. ' +
             'If you see "Limited verification", right-click the app and select "Run as administrator" ' +
             'for full manufacturer verification.';
    } else if (platform === 'darwin') {
      return 'CID reading on macOS may require Full Disk Access. ' +
             'Go to System Preferences > Security & Privacy > Privacy > Full Disk Access ' +
             'and add this application.';
    }

    return 'CID reading is not available on this platform.';
  }
}

export default CIDReader;
