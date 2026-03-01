import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DriveScanner } from './services/DriveScanner';
import { TestEngine } from './services/TestEngine';
import { HistoryStore } from './services/HistoryStore';
import { CIDReader } from './services/CIDReader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let driveScanner: DriveScanner | null = null;
let testEngine: TestEngine | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/preload.mjs');
  console.log('Preload path:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Allow native module loading for disk access
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Open DevTools with F12 in development
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F12' && !input.control && !input.meta) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  // Load the app
  // In development, electron-vite sets this URL
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  // Check if we're in development mode (NODE_ENV or presence of dev server)
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;

  if (isDev) {
    console.log('Loading from dev server:', devServerUrl);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('Failed to load dev server:', err);
      // Fallback to file if dev server fails
      const indexPath = path.join(__dirname, '../dist/index.html');
      console.log('Falling back to file:', indexPath);
      return mainWindow.loadFile(indexPath);
    });
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading from file:', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load file:', err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow?.show();
  });

  // Handle loading failures
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    driveScanner?.stopWatching();
  });
}

// Initialize services
function initializeServices() {
  driveScanner = new DriveScanner();
  testEngine = new TestEngine();

  // Drive scanner events
  driveScanner.on('drivesUpdated', (drives) => {
    mainWindow?.webContents.send('drives-updated', drives);
  });

  // Test engine events
  testEngine.on('progress', (data) => {
    mainWindow?.webContents.send('test-progress', data);
  });

  testEngine.on('completed', (result) => {
    mainWindow?.webContents.send('test-completed', result);
  });

  testEngine.on('error', (error) => {
    mainWindow?.webContents.send('test-error', error);
  });
}

// IPC Handlers
function setupIpcHandlers() {
  // Get available drives
  ipcMain.handle('get-drives', async () => {
    return driveScanner?.getDrives() || [];
  });

  // Start watching for drive changes
  ipcMain.handle('start-drive-watch', () => {
    driveScanner?.startWatching();
  });

  // Stop watching for drive changes
  ipcMain.handle('stop-drive-watch', () => {
    driveScanner?.stopWatching();
  });

  // Start test
  ipcMain.handle('start-test', async (_, config) => {
    try {
      await testEngine?.startTest(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Stop test
  ipcMain.handle('stop-test', () => {
    testEngine?.stopTest();
    return { success: true };
  });

  // Pause test
  ipcMain.handle('pause-test', () => {
    testEngine?.pauseTest();
    return { success: true };
  });

  // Resume test
  ipcMain.handle('resume-test', () => {
    testEngine?.resumeTest();
    return { success: true };
  });

  // Export report
  ipcMain.handle('export-report', async (_, report) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `sd-test-report-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });

    if (filePath) {
      const fs = await import('fs');
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  // Get app version
  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  // History handlers
  ipcMain.handle('get-history', async () => {
    return HistoryStore.loadHistory();
  });

  ipcMain.handle('get-history-stats', async () => {
    return HistoryStore.getStats();
  });

  ipcMain.handle('search-history', async (_, query: string) => {
    return HistoryStore.search(query);
  });

  ipcMain.handle('export-history', async (_, format: 'json' | 'csv') => {
    return HistoryStore.exportHistory(format);
  });

  ipcMain.handle('delete-history-entry', async (_, id: string) => {
    return HistoryStore.deleteEntry(id);
  });

  ipcMain.handle('clear-history', async () => {
    return HistoryStore.clearHistory();
  });

  // CID handler
  ipcMain.handle('read-cid', async (_, drivePath: string) => {
    const result = await CIDReader.readCID(drivePath);
    return {
      cid: result.cid,
      warning: result.warning,
    };
  });
}

// App event handlers
app.whenReady().then(() => {
  initializeServices();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  driveScanner?.stopWatching();
  testEngine?.stopTest();
});
