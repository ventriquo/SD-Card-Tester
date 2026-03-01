# CID Register Reading Research

## Overview
The CID (Card Identification) Register is a 128-bit read-only register that contains manufacturer information about SD cards. Reading it is the ONLY reliable way to verify a card's authenticity.

## CID Register Structure
```
Bit Range   Field   Description
[127:120]   MID     Manufacturer ID (8 bits)
[119:104]   OID     OEM/Application ID (16 bits)
[103:64]    PNM     Product Name (40 bits, 5 ASCII chars)
[63:56]     PRV     Product Revision (8 bits)
[55:24]     PSN     Serial Number (32 bits)
[23:20]     reserved
[19:12]     MDT     Manufacturing Date (12 bits)
[11:1]      CRC     CRC7 Checksum (7 bits)
[0]         reserved (always 1)
```

## Platform-Specific Approaches

### Windows

#### Option 1: DeviceIoControl (Recommended)
Requires administrator privileges and a native Node.js addon.

**IOCTL Codes:**
- `IOCTL_SDCARD_GET_SD_STORAGE_INFO` (0x002D2004) - Windows 8+
- `IOCTL_STORAGE_QUERY_PROPERTY` with `StorageAdapterProperty` or `StorageDeviceProperty`

**Process:**
1. Open physical drive handle with `CreateFileW` (\\.\PhysicalDriveN)
2. Send IOCTL using `DeviceIoControl`
3. Parse the returned `SDCARD_INFORMATION` structure
4. Extract CID from the response

**Required Privileges:**
- Administrator (for raw disk access)
- SeManageVolumePrivilege (optional but recommended)

**Implementation:**
```c
// C++ native addon pseudocode
HANDLE hDevice = CreateFileW(
    L"\\\\.\\PhysicalDrive2",
    GENERIC_READ | GENERIC_WRITE,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    NULL,
    OPEN_EXISTING,
    0,
    NULL
);

SDCARD_INFORMATION info;
DWORD bytesReturned;
DeviceIoControl(
    hDevice,
    IOCTL_SDCARD_GET_SD_STORAGE_INFO,
    NULL,
    0,
    &info,
    sizeof(info),
    &bytesReturned,
    NULL
);
// CID is in info.CID
```

#### Option 2: WMI/CIM (Limited)
Does NOT provide CID directly, but can detect if a device is an SD card.

```powershell
Get-CimInstance Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'SD' }
```

**Limitation:** Only identifies SD vs other storage, no CID data.

#### Option 3: Smartmontools (Third-party)
Use `smartctl` from smartmontools package which can read SD card registers.

```cmd
smartctl -a /dev/sdX  (shows some SD info)
```

**Limitation:** Requires installing smartmontools, doesn't always show CID.

---

### macOS

#### Option 1: IOKit Framework (Recommended)
Use IOKit to query the IORegistry for SD card properties.

**Approach:**
1. Use `IOServiceGetMatchingService` to find storage devices
2. Match BSD name with the mounted drive
3. Query `kIOPropertyMatchKey` for SD characteristics
4. Look for `CID` property in the registry

**Command Line Test:**
```bash
# Get BSD name from mount point
diskutil info /Volumes/SDCARD | grep "Device Identifier"

# Query IORegistry for that BSD device
ioreg -l -w0 -r -c IOBlockStorageDevice | grep -A 50 "BSD Name"

# Look for SD-specific keys
ioreg -l | grep -i "card"
```

**Implementation:**
```objc
// Objective-C pseudocode
io_service_t service = IOServiceGetMatchingService(
    kIOMainPortDefault,
    IOBSDNameMatching(kIOMainPortDefault, 0, "disk2")
);

CFMutableDictionaryRef properties;
IORegistryEntryCreateCFProperties(service, &properties, NULL, 0);

// Look for CID in properties
CFDataRef cidData = CFDictionaryGetValue(properties, CFSTR("CID"));
```

#### Option 2: system_profiler
```bash
system_profiler SPStorageDataType
```

**Limitation:** Generic storage info, no CID.

---

## Current Implementation Strategy

Since building native addons requires complex setup (node-gyp, Visual Studio/Xcode), we'll implement a **hybrid approach**:

### Phase 1: Detection & Warning (Implemented)
- Detect if running with admin privileges
- Show warning if not elevated
- Provide instructions for users

### Phase 2: Best-Effort Reading (Next)
**Windows:**
- Try WMI first (no admin needed, limited data)
- If admin, attempt PowerShell with `Get-PhysicalDisk` extended properties
- Document that full CID requires native addon

**macOS:**
- Use `ioreg` to query for any available SD info
- Parse output for manufacturer hints

### Phase 3: Native Addon (Future)
- Build proper Node.js native addon for Windows (using node-addon-api)
- Build native addon for macOS (Objective-C++)
- Provide pre-built binaries for common platforms

## Security Considerations

1. **Admin Privileges Required** - Raw disk access requires elevation
2. **UAC Prompt** - Windows will show UAC dialog
3. **Code Signing** - Helps avoid "Unknown Publisher" warnings
4. **User Consent** - Always inform users why admin is needed

## User Experience

### When CID is Available:
- Show green checkmark with manufacturer name
- Display: "Genuine Samsung Card"
- Show detailed CID info (MID, OID, PNM, MDT)

### When CID is Unavailable:
- Show yellow warning icon
- Message: "Cannot verify manufacturer (run as administrator for full verification)"
- Still allow testing, just note the limitation

### When CID is Suspicious:
- Show red warning
- Message: "Unknown manufacturer ID - possible counterfeit"
- Recommend not using the card for important data

## References

- [SD Specifications Part 1 Physical Layer Simplified Specification](https://www.sdcard.org/downloads/pls/)
- [Microsoft IOCTL_SDCARD_GET_SD_STORAGE_INFO](https://docs.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddsd/)
- [Apple IOKit Documentation](https://developer.apple.com/documentation/iokit)
- [Linux MMC CID Documentation](https://www.kernel.org/doc/Documentation/mmc/mmc-dev-attrs.txt)
