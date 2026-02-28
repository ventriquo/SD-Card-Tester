<div align="center">
<h1>SD Card Tester</h1>
<p><strong>Detect fake SD cards and verify storage capacity</strong></p>
<p>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/electron-34.5.0-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/react-19-61DAFB?logo=react" alt="React">
</p>
</div>

---

## 🎯 Overview

SD Card Tester is a desktop application built with Electron and React that helps you verify whether your SD cards and microSD cards are genuine or counterfeit. The app detects fake capacity drives that report more storage than they actually have - a common scam in many markets.

### Why This Matters

Counterfeit SD cards are prevalent in many regions, especially Indonesia and other Southeast Asian markets. These fake cards:
- Report fake capacities (e.g., shows 128GB but only has 8GB actual storage)
- Cause data loss when files exceed the real capacity
- Often have extremely slow write speeds
- May loop data, overwriting existing files

## ✨ Features

### Core Testing Methods

1. **Quick Scan (Spot Check)**
   - Fast preliminary test (~2-5 minutes)
   - Samples 576 strategic regions across the drive
   - Read-Write-Verify-Restore pattern at each spot
   - Detects "ghost" sectors (looping fake drives)
   - Early termination when fake is detected

2. **Deep Scan (Full Capacity Test)**
   - Comprehensive verification (~time depends on drive size)
   - Fills entire drive with test patterns
   - Reads back and verifies every sector
   - Calculates actual usable capacity
   - Tracks bad sectors and corruption errors

### Additional Features

- 🔌 **Real-time drive detection** - Automatically detects when SD cards are inserted/removed
- 📊 **Live progress tracking** with speed metrics and estimated time remaining
- 📈 **Speed performance graph** showing read/write speeds over time
- 🚫 **Capacity mismatch detection** - Identifies fake capacity drives
- ⚠️ **Visual indicators** - Color-coded results (green = genuine, red = fake, yellow = suspicious)
- 📄 **Export test reports** - Save results as JSON or TXT
- 🖥️ **Cross-platform** - Windows (primary) and macOS support

### Upcoming Features

- 🆔 **CID Register reading** - Verify manufacturer authenticity (requires admin privileges)
- 🌐 **Indonesian language support**
- 🔄 **Auto-updater** via electron-updater
- 📱 **Speed class verification** (V30, U3, etc. for photography/videography)

## 🚀 Installation

### Download Pre-built Binaries

> ⚠️ **Note:** Release binaries coming soon. For now, please build from source.

### Build from Source

**Prerequisites:**
- Node.js 20 or higher
- Windows: PowerShell (for drive detection)
- macOS: Xcode Command Line Tools (optional, for code signing)

**Steps:**

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/SD-Card-Tester.git
cd SD-Card-Tester

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Create installer
npm run dist
```

**Build Outputs:**
- Windows: `release/SD Card Tester Setup.exe` (installer) + `release/win-unpacked/` (portable)
- macOS: `release/SD Card Tester.dmg`

## 📖 Usage

1. **Launch the app**
2. **Insert your SD card** into the card reader
3. **Select the drive** from the detected drives list
4. **Choose test mode:**
   - Quick Scan: Fast check for obvious fakes
   - Deep Scan: Full capacity verification (takes longer but more thorough)
5. **Click "Start Test"**
6. **Wait for results** - The app will show progress, speed, and estimated time
7. **Review the report** - Pass (genuine), Fail (fake), or detailed findings

### Understanding Results

- ✅ **PASS (Genuine)** - Drive passed all tests, capacity is real
- ❌ **FAIL (Fake)** - Fake capacity detected, likely counterfeit
- ⚠️ **Suspicious** - Some anomalies detected, use caution
- 📊 **Actual Capacity** - Shows real vs claimed capacity

## 🛠️ Development

### Project Structure

```
SD-Card-Tester/
├── electron/               # Electron main process
│   ├── main.ts            # Main entry point
│   ├── preload.ts         # Preload script (IPC bridge)
│   └── services/
│       ├── DriveScanner.ts    # Drive detection service
│       └── TestEngine.ts      # Testing logic
├── src/                   # React frontend
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   ├── types.ts          # TypeScript types
│   ├── components/       # UI components
│   │   ├── DriveSelector.tsx
│   │   ├── TestProgress.tsx
│   │   └── TestResults.tsx
│   └── index.css         # Tailwind styles
├── index.html            # HTML template
├── package.json          # Dependencies & scripts
├── electron.vite.config.ts   # Electron-Vite config
└── README.md
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run in development mode with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run dist` | Create distributable packages |
| `npm run build:win` | Build for Windows only |
| `npm run build:mac` | Build for macOS only |
| `npm run typecheck` | Run TypeScript type checking |

### Technologies Used

- **Electron** - Desktop app framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Vite** - Build tooling
- **electron-vite** - Electron + Vite integration
- **electron-builder** - Packaging and distribution

## ⚠️ Important Notes

### Data Warning
**Testing will erase all data on the SD card!** The app writes test patterns across the entire drive. Always backup important data before testing.

### Windows Permissions
Reading CID registers requires administrator privileges (future feature). For now, the app works with standard user permissions.

### Speed Testing
Speed measurements depend on:
- USB card reader quality
- USB port type (2.0 vs 3.0)
- System load
- Drive actual performance

## 🐛 Troubleshooting

### App shows "No drives detected"
- Make sure the SD card is properly inserted
- Try a different USB port or card reader
- Check if Windows/macOS recognizes the drive in File Explorer/Finder

### Test fails immediately
- The drive may be write-protected (check physical lock switch on SD card)
- Insufficient permissions (try running as administrator)
- Corrupted or damaged drive

### Slow test speeds
- Use a USB 3.0 port (blue connector)
- Close other applications using the drive
- Use a high-quality card reader

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [H2testw](https://www.heise.de/download/product/h2testw-50539) - The gold standard for SD card testing
- [MediaTester](https://github.com/dkrahmer/MediaTester) - Alternative testing approach
- [F3](https://github.com/AltraMayor/f3) - Fight Flash Fraud (Linux/macOS)
- Created with [Google AI Studio](https://ai.studio) initial UI design

## 📞 Contact

For questions, issues, or feature requests, please open an issue on GitHub.

---

<div align="center">
<p><strong>Made with ❤️ to fight counterfeit SD cards</strong></p>
</div>
