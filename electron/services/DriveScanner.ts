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

  async getDrives(showAllDrives: boolean = false): Promise<DriveInfo[]> {
    const platform = process.platform;
    
    try {
      let drives: DriveInfo[] = [];
      
      if (platform === 'win32') {
        drives = await this.getWindowsDrives();
      } else if (platform === 'darwin') {
        drives = await this.getMacDrives();
      } else if (platform === 'linux') {
        drives = await this.getLinuxDrives();
      }
      
      // Filter to only removable drives unless showAllDrives is true
      if (!showAllDrives) {
        drives = drives.filter(drive => drive.isRemovable);
        console.log(`DriveScanner: Filtered to ${drives.length} removable drives`);
      }
      
      return drives;
    } catch (error) {
      console.error('Error scanning drives:', error);
    }
    
    return [];
  }

  private async getWindowsDrives(): Promise<DriveInfo[]> {
    console.log('DriveScanner: Scanning for Windows drives...');
    
    const drives: DriveInfo[] = [];
    
    // Method 1: Use WMIC (more reliable than PowerShell in Electron)
    console.log('DriveScanner: Trying WMIC method...');
    try {
      const { stdout: wmicOutput } = await execAsync('wmic logicaldisk get DeviceID,VolumeName,Size,DriveType,FileSystem,VolumeSerialNumber,Description /format:csv', {
        timeout: 10000
      });
      
      console.log('DriveScanner: WMIC output received, length:', wmicOutput?.length);
      console.log('DriveScanner: WMIC raw output:', wmicOutput?.substring(0, 1000));
      
      if (wmicOutput && wmicOutput.trim()) {
        const lines = wmicOutput.trim().split('\n').filter(line => line.trim());
        // Skip header lines
        for (let i = 2; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 6) {
            // CSV format: Node,DeviceID,Description,DriveType,FileSystem,Size,VolumeName,VolumeSerialNumber
            const deviceId = parts[1]?.trim();
            const description = parts[2]?.trim() || '';
            const driveType = parseInt(parts[3]) || 0;
            const filesystem = parts[4]?.trim() || 'Unknown';
            const size = parts[5]?.trim() ? parseInt(parts[5]) : 0;
            const volumeName = parts[6]?.trim() || 'Unknown Drive';
            const serialNumber = parts[7]?.trim();
            
            if (deviceId && deviceId.includes(':')) {
              const driveData = {
                DeviceID: deviceId,
                VolumeName: volumeName,
                Size: size,
                DriveType: driveType,
                FileSystem: filesystem,
                VolumeSerialNumber: serialNumber,
                Description: description,
                MediaType: ''
              };
              
              const driveInfo = this.parseWindowsDrive(driveData);
              console.log(`DriveScanner: Found drive ${deviceId} - Type: ${driveType}, Name: "${volumeName}", Removable: ${driveInfo.isRemovable}`);
              
              // Include removable drives and non-system fixed drives
              if (driveInfo.isRemovable || (driveType === 3 && !deviceId.toLowerCase().startsWith('c:'))) {
                drives.push(driveInfo);
              }
            }
          }
        }
      }
    } catch (wmicError) {
      console.error('DriveScanner: WMIC failed:', wmicError);
    }
    
    // Method 2: Fallback to PowerShell if WMIC returns nothing
    if (drives.length === 0) {
      console.log('DriveScanner: Trying PowerShell fallback...');
      // Use @() to force array output instead of -AsArray (not available in older PowerShell)
      const psCommand = `@(Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,VolumeName,Size,DriveType,FileSystem,VolumeSerialNumber,Description) | ConvertTo-Json`;
      
      try {
        const { stdout } = await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, {
          timeout: 10000
        });
        
        if (stdout && stdout.trim()) {
          let data = JSON.parse(stdout);
          // Handle both single object and array
          const allDrives = Array.isArray(data) ? data : [data];
          console.log('DriveScanner: PowerShell found', allDrives.length, 'drives');
          
          for (const drive of allDrives) {
            if (!drive || !drive.DeviceID) continue;
            const driveInfo = this.parseWindowsDrive(drive);
            if (driveInfo.isRemovable || (drive.DriveType === 3 && !drive.DeviceID.toLowerCase().startsWith('c:'))) {
              drives.push(driveInfo);
            }
          }
        }
      } catch (psError) {
        console.error('DriveScanner: PowerShell fallback failed:', psError);
      }
    }
    
      console.log(`DriveScanner: Returning ${drives.length} drives for selection`);
    
    // Method 3: Always check drive letters directly to catch drives WMI misses
    // This catches SD cards that don't appear in Win32_LogicalDisk
    console.log('DriveScanner: Trying direct drive letter check...');
    const driveLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const existingLetters = new Set(drives.map(d => d.path.charAt(0).toUpperCase()));
    
    for (const letter of driveLetters) {
      // Skip if we already found this drive
      if (existingLetters.has(letter)) continue;
      
      try {
        // Use vol command to check if drive exists
        const { stdout } = await execAsync(`vol ${letter}: 2>nul`, { timeout: 1000 });
        if (stdout && stdout.includes('is')) {
          // Extract volume name from output like " Volume in drive E is SDXC Card"
          const volMatch = stdout.match(/Volume in drive \w is (.+)/i);
          const volumeName = volMatch ? volMatch[1].trim() : `${letter} Drive`;
          
          console.log(`DriveScanner: Found drive ${letter}: - "${volumeName}" via vol command`);
          
          // Create drive info - assume removable for non-C drives
          const driveInfo: DriveInfo = {
            id: `${letter}:-${Date.now()}`,
            name: volumeName,
            capacity: 0, // Will be determined during test
            type: volumeName.toLowerCase().includes('sd') ? 'microsd' : 'usb',
            path: `${letter}:\\`,
            physicalPath: undefined,
            filesystem: 'Unknown',
            isRemovable: true,
            isSystemDrive: false,
          };
          drives.push(driveInfo);
        }
      } catch {
        // Drive doesn't exist, skip
      }
    }
    
    // Method 4: Check for SD cards via physical disk drive query
    // Some SD card readers don't expose the drive via logicaldisk but show up as disk drives
    if (drives.length === 0 || !drives.some(d => d.type === 'microsd')) {
      console.log('DriveScanner: Trying physical disk drive detection...');
      try {
        const { stdout: diskOutput } = await execAsync('wmic diskdrive get Index,Model,MediaType,Size,InterfaceType /format:csv', {
          timeout: 10000
        });
        
        console.log('DriveScanner: DiskDrive output:', diskOutput?.substring(0, 500));
        
        if (diskOutput && diskOutput.trim()) {
          const lines = diskOutput.trim().split('\n').filter(line => line.trim());
          for (let i = 2; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length >= 4) {
              const model = parts[2]?.trim() || '';
              const mediaType = parts[3]?.trim() || '';
              const size = parts[4]?.trim() ? parseInt(parts[4]) : 0;
              
              console.log(`DriveScanner: Physical disk - Model: "${model}", MediaType: "${mediaType}"`);
              
              // Check if this looks like an SD card
              const modelLower = model.toLowerCase();
              const mediaLower = mediaType.toLowerCase();
              
              if (modelLower.includes('sd') || 
                  modelLower.includes('card') ||
                  mediaLower.includes('removable') ||
                  modelLower.includes('usb')) {
                
                // Try to find the drive letter for this disk
                // Map disk index to logical drive
                const diskIndex = parts[1]?.trim();
                try {
                  const { stdout: partitionOutput } = await execAsync(`wmic path win32_logicaldisktoPartition get Antecedent,Dependent /format:csv`, {
                    timeout: 5000
                  });
                  
                  if (partitionOutput) {
                    const partLines = partitionOutput.split('\n');
                    for (const partLine of partLines) {
                      if (partLine.includes(`Disk #${diskIndex}`)) {
                        const match = partLine.match(/([A-Z]:)/);
                        if (match) {
                          const driveLetter = match[1];
                          const existingDrive = drives.find(d => d.path.startsWith(driveLetter));
                          
                          if (!existingDrive) {
                            // Add this SD card
                            const capacityGB = size ? Math.round(size / (1024 ** 3)) : 0;
                            drives.push({
                              id: `${driveLetter}-${Date.now()}`,
                              name: model || 'SD Card',
                              capacity: capacityGB,
                              type: 'microsd',
                              path: `${driveLetter}\\`,
                              physicalPath: undefined,
                              filesystem: 'Unknown',
                              isRemovable: true,
                              isSystemDrive: false,
                            });
                            console.log(`DriveScanner: Added SD card at ${driveLetter} from physical disk query`);
                          }
                        }
                      }
                    }
                  }
                } catch (partitionError) {
                  console.error('DriveScanner: Error getting partition info:', partitionError);
                }
              }
            }
          }
        }
      } catch (diskError) {
        console.error('DriveScanner: Physical disk query failed:', diskError);
      }
    }
    
    return drives;
  }

  private parseWindowsDrive(drive: any): DriveInfo {
    const deviceId = drive.DeviceID; // e.g., "E:"
    const volumeName = drive.VolumeName || 'Unknown Drive';
    const driveType = drive.DriveType;
    const description = drive.Description || '';
    const mediaType = drive.MediaType || '';
    
    // DriveType: 2 = Removable, 3 = Fixed
    // SD cards can show as either Removable OR Fixed depending on the reader
    const isRemovable = driveType === 2 || 
                        description.toLowerCase().includes('removable') ||
                        mediaType.toLowerCase().includes('removable');
    
    // Determine drive type based on multiple factors
    let type: DriveInfo['type'] = 'usb';
    const volLower = volumeName.toLowerCase();
    const descLower = description.toLowerCase();
    const mediaLower = mediaType.toLowerCase();
    
    // Check for SD card indicators - support both SD and MicroSD
    if (volLower.includes('sd') || 
        volLower.includes('card') ||
        descLower.includes('sd card') ||
        descLower.includes('secure digital') ||
        descLower.includes('sdxc') ||
        descLower.includes('sdhc') ||
        mediaLower.includes('sd') ||
        mediaLower.includes('memory card')) {
      type = 'microsd';
    } else if (isRemovable) {
      // Could be USB drive or SD card - default to usb for unknown removable
      type = 'usb';
    }

    // Convert size from bytes to GB
    const capacityGB = drive.Size ? Math.round(drive.Size / (1024 ** 3)) : 0;

    console.log(`DriveScanner: Parsing ${deviceId} - Name: "${volumeName}", Type: ${type}, isRemovable: ${isRemovable}`);

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

  // Get raw Windows drive info for debugging
  async getRawWindowsDrives(): Promise<any[]> {
    if (process.platform !== 'win32') return [];
    
    try {
      const { stdout } = await execAsync('wmic logicaldisk get DeviceID,VolumeName,Size,DriveType,FileSystem,VolumeSerialNumber,Description /format:csv', {
        timeout: 10000
      });
      
      if (!stdout || !stdout.trim()) {
        return [];
      }
      
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const drives = [];
      for (let i = 2; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 6) {
          drives.push({
            DeviceID: parts[1]?.trim(),
            Description: parts[2]?.trim(),
            DriveType: parseInt(parts[3]),
            FileSystem: parts[4]?.trim(),
            Size: parts[5]?.trim(),
            VolumeName: parts[6]?.trim(),
            VolumeSerialNumber: parts[7]?.trim()
          });
        }
      }
      return drives;
    } catch (error) {
      console.error('Error getting raw Windows drives:', error);
      return [];
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
