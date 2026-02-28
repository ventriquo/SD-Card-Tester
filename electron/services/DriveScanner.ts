import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { DriveInfo } from '../../src/types';

const execAsync = promisify(exec);

export class DriveScanner extends EventEmitter {
  private watchInterval: NodeJS.Timeout | null = null;
  private lastDrives: DriveInfo[] = [];

  constructor() {
    super();
  }

  async getDrives(): Promise<DriveInfo[]> {
    const platform = process.platform;
    
    try {
      if (platform === 'win32') {
        return await this.getWindowsDrives();
      } else if (platform === 'darwin') {
        return await this.getMacDrives();
      } else if (platform === 'linux') {
        return await this.getLinuxDrives();
      }
    } catch (error) {
      console.error('Error scanning drives:', error);
    }
    
    return [];
  }

  private async getWindowsDrives(): Promise<DriveInfo[]> {
    // Simpler PowerShell command that's more reliable
    const psCommand = `
      Get-CimInstance Win32_LogicalDisk | 
      Where-Object { $_.DriveType -eq 2 -or ($_.DriveType -eq 3 -and $_.DeviceID -ne 'C:') } |
      Select-Object DeviceID, VolumeName, Size, DriveType, FileSystem, VolumeSerialNumber |
      ConvertTo-Json -AsArray
    `;

    try {
      const { stdout, stderr } = await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, {
        timeout: 10000
      });
      
      if (stderr) {
        console.error('PowerShell stderr:', stderr);
      }
      
      if (!stdout || stdout.trim() === '') {
        console.log('No drives found or empty response');
        return [];
      }
      
      const data = JSON.parse(stdout);
      const drives = Array.isArray(data) ? data : [data];
      
      return drives
        .filter((d: any) => d && d.DeviceID)
        .map((drive: any) => this.parseWindowsDrive(drive));
    } catch (error) {
      console.error('Error getting Windows drives:', error);
      // Return empty array on error so UI can show "no drives" state
      return [];
    }
  }

  private parseWindowsDrive(drive: any): DriveInfo {
    const deviceId = drive.DeviceID; // e.g., "E:"
    const volumeName = drive.VolumeName || 'Unknown Drive';
    const driveType = drive.DriveType;
    const isRemovable = driveType === 2; // 2 = Removable
    
    // Determine drive type based on characteristics
    let type: DriveInfo['type'] = 'usb';
    if (volumeName.toLowerCase().includes('sd') || volumeName.toLowerCase().includes('card')) {
      type = 'microsd';
    } else if (isRemovable) {
      type = 'usb'; // Could be USB drive or SD card
    }

    // Convert size from bytes to GB
    const capacityGB = drive.Size ? Math.round(drive.Size / (1024 ** 3)) : 0;

    return {
      id: `${deviceId}-${drive.VolumeSerialNumber || Date.now()}`,
      name: volumeName,
      capacity: capacityGB,
      type,
      path: `${deviceId}\\`,
      physicalPath: undefined, // Will be populated later for raw access
      filesystem: drive.FileSystem || 'Unknown',
      isRemovable,
      isSystemDrive: false,
      serialNumber: drive.VolumeSerialNumber,
    };
  }

  private async getMacDrives(): Promise<DriveInfo[]> {
    try {
      // Use diskutil to get external drives
      const { stdout } = await execAsync('diskutil list -plist external');
      
      // Parse plist output (simplified - in production use plist parser)
      // For now, use a simpler approach with df and system_profiler
      const { stdout: dfOutput } = await execAsync('df -h | grep -E "^/dev/disk"');
      const { stdout: diskInfo } = await execAsync('diskutil list | grep -E "(disk|Windows|Windows_FAT)"');
      
      const drives: DriveInfo[] = [];
      const lines = dfOutput.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          const device = parts[0]; // /dev/disk2s1
          const size = parts[1]; // Size
          const mounted = parts[8]; // Mount point
          
          // Skip system drives
          if (mounted === '/' || mounted.startsWith('/System')) continue;
          
          const physicalDevice = device.replace(/s\d+$/, ''); // /dev/disk2
          const capacity = this.parseSize(size);
          
          drives.push({
            id: `${device}-${Date.now()}`,
            name: path.basename(mounted) || 'Unknown',
            capacity,
            type: 'usb',
            path: mounted,
            physicalPath: physicalDevice.replace('/dev/', '/dev/r'),
            filesystem: parts[2],
            isRemovable: true,
            isSystemDrive: false,
          });
        }
      }
      
      return drives;
    } catch (error) {
      console.error('Error getting Mac drives:', error);
      return [];
    }
  }

  private async getLinuxDrives(): Promise<DriveInfo[]> {
    try {
      const { stdout } = await execAsync('lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL,VENDOR,TRAN');
      const data = JSON.parse(stdout);
      const drives: DriveInfo[] = [];
      
      for (const device of data.blockdevices || []) {
        // Look for removable devices (USB, SD cards)
        if (device.children) {
          for (const child of device.children) {
            if (child.mountpoint && !child.mountpoint.startsWith('/boot')) {
              const capacity = this.parseSize(child.size);
              
              drives.push({
                id: `${child.name}-${Date.now()}`,
                name: device.model || child.name,
                capacity,
                type: device.tran === 'usb' ? 'usb' : 'microsd',
                path: child.mountpoint,
                physicalPath: `/dev/${child.name}`,
                filesystem: 'unknown',
                isRemovable: device.type === 'disk',
                isSystemDrive: child.mountpoint === '/',
              });
            }
          }
        }
      }
      
      return drives;
    } catch (error) {
      console.error('Error getting Linux drives:', error);
      return [];
    }
  }

  private parseSize(sizeStr: string): number {
    // Convert size strings like "29G", "1.9T" to GB
    const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?)$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
      case 'K': return value / 1024 / 1024;
      case 'M': return value / 1024;
      case 'G': return value;
      case 'T': return value * 1024;
      default: return value;
    }
  }

  startWatching(): void {
    if (this.watchInterval) return;
    
    this.watchInterval = setInterval(async () => {
      const currentDrives = await this.getDrives();
      
      // Compare with last drives
      if (JSON.stringify(currentDrives) !== JSON.stringify(this.lastDrives)) {
        this.lastDrives = currentDrives;
        this.emit('drivesUpdated', currentDrives);
      }
    }, 2000); // Check every 2 seconds
  }

  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }
}
