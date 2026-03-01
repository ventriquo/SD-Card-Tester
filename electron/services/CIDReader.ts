/**
 * CID Reader Service
 * 
 * Reads the Card Identification (CID) register from SD cards.
 * The CID is a 128-bit unique identifier that contains manufacturer info.
 * 
 * Windows: Requires admin privileges and DeviceIoControl
 * macOS: Uses IOKit registry queries
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

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
  0x58: { name: 'Spectek', country: 'USA', trusted: false }, // Micron subsidiary, known for budget chips
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
}

export class CIDReader {
  /**
   * Parse a 128-bit CID from raw bytes
   */
  static parseCID(rawBytes: Buffer): CIDInfo {
    if (rawBytes.length < 16) {
      throw new Error('CID must be at least 16 bytes');
    }

    // CID Register Layout (SD Spec Part 1 Physical Layer Simplified Spec)
    // Bit positions (MSB first):
    // [127:120] - MID (Manufacturer ID)
    // [119:104] - OID (OEM/Application ID)
    // [103:64]  - PNM (Product Name)
    // [63:56]   - PRV (Product Revision)
    // [55:24]   - PSN (Serial Number)
    // [23:20]   - reserved
    // [19:12]   - MDT (Manufacturing Date)
    // [11:1]    - CRC7 checksum
    // [0]       - reserved (always 1)

    const mid = rawBytes[0];
    const oid = rawBytes.slice(1, 3).toString('ascii').replace(/\0/g, '');
    const pnm = rawBytes.slice(3, 8).toString('ascii').replace(/\0/g, '');
    const prvMajor = (rawBytes[8] >> 4) & 0x0F;
    const prvMinor = rawBytes[8] & 0x0F;
    const psn = rawBytes.readUInt32BE(9);
    // Bytes 13-14 contain MDT and CRC
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
    };
  }

  /**
   * Read CID from a drive path (Windows)
   * Note: Requires administrator privileges
   */
  static async readCIDWindows(drivePath: string): Promise<CIDInfo | null> {
    try {
      // On Windows, we need to use DeviceIoControl which requires native bindings
      // For now, we'll attempt to read via PowerShell WMI
      // Full implementation would require a native Node.js addon

      // Try to get storage info via PowerShell
      const { stdout } = await execAsync(
        `powershell.exe -Command "Get-PhysicalDisk | Where-Object { \$_.DeviceId -eq '${drivePath.replace('\\', '\\\\')}' } | Select-Object -Property * | ConvertTo-Json"`
      );

      const diskInfo = JSON.parse(stdout);
      
      // Check if we got any useful info
      if (!diskInfo) {
        console.log('No disk info available - CID reading requires admin privileges');
        return null;
      }

      // PhysicalDisk doesn't expose CID directly
      // We need to use IOCTL_SDCARD_GET_SD_STORAGE_INFO or similar
      // This is a placeholder for the full implementation

      return null;
    } catch (error) {
      console.error('Failed to read CID on Windows:', error);
      return null;
    }
  }

  /**
   * Read CID from a drive path (macOS)
   * Uses IOKit to query device properties
   */
  static async readCIDMacOS(drivePath: string): Promise<CIDInfo | null> {
    try {
      // Get the BSD disk name from path (e.g., /Volumes/SDCARD -> disk2)
      const { stdout: diskName } = await execAsync(
        `diskutil info "${drivePath}" | grep "Device Identifier" | awk '{print $3}'`
      );
      const bsdName = diskName.trim();

      if (!bsdName) {
        return null;
      }

      // Query IOKit registry for SD card info
      // The CID may be available in the IORegistry under IOStorageCharacteristics
      const { stdout } = await execAsync(
        `ioreg -l -w0 -r -c IOBlockStorageDevice | grep -A 50 "BSD Name" | grep -A 50 "${bsdName}"`
      );

      // Parse the output for SD card specific properties
      // This is a simplified approach - full implementation would parse the binary plist

      // Look for SD Card specific identifiers
      if (stdout.includes('SD') || stdout.includes('Card')) {
        // Try to extract CID if available
        // macOS may expose it as "Card ID" or in IOStorageCharacteristics
        const cidMatch = stdout.match(/"CID"\s*=\s*<([0-9a-fA-F]+)>/);
        
        if (cidMatch) {
          const cidBytes = Buffer.from(cidMatch[1], 'hex');
          return this.parseCID(cidBytes);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to read CID on macOS:', error);
      return null;
    }
  }

  /**
   * Read CID from a drive (cross-platform)
   */
  static async readCID(drivePath: string): Promise<CIDInfo | null> {
    const platform = os.platform();

    if (platform === 'win32') {
      return this.readCIDWindows(drivePath);
    } else if (platform === 'darwin') {
      return this.readCIDMacOS(drivePath);
    } else {
      console.log('CID reading not implemented for platform:', platform);
      return null;
    }
  }

  /**
   * Check if running with admin/root privileges
   */
  static async hasAdminPrivileges(): Promise<boolean> {
    try {
      if (os.platform() === 'win32') {
        // On Windows, try to access a restricted resource
        await execAsync('net session');
        return true;
      } else {
        // On Unix-like systems, check UID
        return process.getuid?.() === 0;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get CID reading instructions for the user
   */
  static getCIDInstructions(): string {
    const platform = os.platform();

    if (platform === 'win32') {
      return 'CID reading on Windows requires administrator privileges. ' +
             'Please restart the application as Administrator to enable this feature. ' +
             'Right-click the app and select "Run as administrator".';
    } else if (platform === 'darwin') {
      return 'CID reading on macOS may require granting Full Disk Access permissions ' +
             'in System Preferences > Security & Privacy > Privacy > Full Disk Access.';
    }

    return 'CID reading is not available on this platform.';
  }
}

export default CIDReader;
