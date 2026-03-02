/**
 * Internationalization (i18n) Translations
 * 
 * Supports English and Indonesian (Bahasa Indonesia)
 * Indonesian translations target the Indonesian market where
 * fake SD cards are a common problem.
 */

export type Language = 'en' | 'id';

export interface Translations {
  // App
  appName: string;
  appSubtitle: string;
  
  // Header
  settings: string;
  history: string;
  systemOk: string;
  
  // Drive Selector
  selectTargetDrive: string;
  selectDriveDescription: string;
  testMethod: string;
  quickScan: string;
  quickScanDescription: string;
  deepScan: string;
  deepScanDescription: string;
  targetDrive: string;
  refresh: string;
  scanningDrives: string;
  noDrivesDetected: string;
  selectDriveToTest: string;
  startTest: string;
  testWillErase: string;
  dataLossWarning: string;
  
  // Safety Dialog
  safetyWarning: string;
  dataWillBeLost: string;
  confirmErase: string;
  typeToConfirm: string;
  typeToConfirmId: string;
  cancel: string;
  proceed: string;
  backupReminder: string;
  thisIsPermanent: string;
  
  // Test Progress
  testInProgress: string;
  preparing: string;
  writing: string;
  verifying: string;
  finalizing: string;
  stopTest: string;
  timeRemaining: string;
  writeSpeed: string;
  readSpeed: string;
  errors: string;
  
  // Test Results
  testComplete: string;
  genuineCard: string;
  fakeCard: string;
  suspiciousCard: string;
  capacity: string;
  actualCapacity: string;
  claimedCapacity: string;
  testDuration: string;
  averageWriteSpeed: string;
  averageReadSpeed: string;
  errorsFound: string;
  runAnotherTest: string;
  exportReport: string;
  
  // History
  testHistory: string;
  historyDescription: string;
  totalTests: string;
  passed: string;
  failed: string;
  fakeCardsDetected: string;
  searchHistory: string;
  exportJson: string;
  exportCsv: string;
  clearAll: string;
  noHistoryYet: string;
  runFirstTest: string;
  deleteEntry: string;
  
  // CID / Manufacturer
  manufacturer: string;
  verifiedManufacturer: string;
  unknownManufacturer: string;
  limitedVerification: string;
  confidence: string;
  high: string;
  medium: string;
  low: string;
  manufactured: string;
  
    // Settings
    settingsTitle: string;
    settingsDescription: string;
    language: string;
  english: string;
  indonesian: string;
  appearance: string;
  testOptions: string;
  defaultTestMode: string;
  testFileSize: string;
  dataPreservation: string;
  backupWarning: string;
  dangerZone: string;
  enableDebugMode: string;
  debugModeDescription: string;
  
  // Educational Tooltips
  whyTestSDCard: string;
  whyTestSDCardContent: string;
  whatIsFakeCard: string;
  whatIsFakeCardContent: string;
  howToSpotFake: string;
  howToSpotFakeContent: string;
  speedClasses: string;
  speedClassesContent: string;
  
  // Errors
  errorLoadingDrives: string;
  errorStartingTest: string;
  errorReadingCID: string;
  
  // Status
  genuine: string;
  fake: string;
  warning: string;
  cancelled: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // App
    appName: 'MicroSD Validator',
    appSubtitle: 'Professional Edition',
    
    // Header
    settings: 'Settings',
    history: 'History',
    systemOk: 'SYSTEM: OK',
    
    // Drive Selector
    selectTargetDrive: 'Select Target Drive',
    selectDriveDescription: 'Choose the storage device you want to verify. We will perform a {method} to detect fake capacity or defective sectors.',
    testMethod: 'Test Method',
    quickScan: 'Quick Scan',
    quickScanDescription: 'Fast spot check (~2-5 min). Good for quick verification.',
    deepScan: 'Deep Scan',
    deepScanDescription: 'Full write/read test (10-60 min). Thorough verification.',
    targetDrive: 'Target Drive',
    refresh: 'Refresh',
    scanningDrives: 'Scanning for drives...',
    noDrivesDetected: 'No drives detected',
    selectDriveToTest: 'Select a drive to test...',
    startTest: 'Start Test',
    testWillErase: 'This test will write data to the drive',
    dataLossWarning: 'All existing data will be erased. Make sure you have backed up important files.',
    
    // Safety Dialog
    safetyWarning: 'SAFETY WARNING',
    dataWillBeLost: 'ALL DATA WILL BE PERMANENTLY DELETED',
    confirmErase: 'This test will completely erase ALL data on',
    typeToConfirm: 'Type DELETE to confirm',
    typeToConfirmId: 'Ketik HAPUS untuk konfirmasi',
    cancel: 'Cancel',
    proceed: 'Proceed',
    backupReminder: 'Have you backed up your important data?',
    thisIsPermanent: 'This action cannot be undone.',
    
    // Test Progress
    testInProgress: 'Test in Progress',
    preparing: 'Preparing',
    writing: 'Writing',
    verifying: 'Verifying',
    finalizing: 'Finalizing',
    stopTest: 'Stop Test',
    timeRemaining: 'Time Remaining',
    writeSpeed: 'Write Speed',
    readSpeed: 'Read Speed',
    errors: 'Errors',
    
    // Test Results
    testComplete: 'Test Complete',
    genuineCard: '✓ Genuine Card',
    fakeCard: '✗ Fake Card Detected',
    suspiciousCard: '⚠ Suspicious Card',
    capacity: 'Capacity',
    actualCapacity: 'Actual Capacity',
    claimedCapacity: 'Claimed Capacity',
    testDuration: 'Test Duration',
    averageWriteSpeed: 'Average Write Speed',
    averageReadSpeed: 'Average Read Speed',
    errorsFound: 'Errors Found',
    runAnotherTest: 'Run Another Test',
    exportReport: 'Export Report',
    
    // History
    testHistory: 'Test History',
    historyDescription: 'View and manage your previous SD card tests',
    totalTests: 'Total Tests',
    passed: 'Passed',
    failed: 'Failed',
    fakeCardsDetected: 'Fake Cards',
    searchHistory: 'Search by drive, manufacturer, or notes...',
    exportJson: 'Export JSON',
    exportCsv: 'Export CSV',
    clearAll: 'Clear All',
    noHistoryYet: 'No test history yet',
    runFirstTest: 'Run your first test to see results here',
    deleteEntry: 'Delete entry',
    
    // CID / Manufacturer
    manufacturer: 'Manufacturer',
    verifiedManufacturer: 'Verified Manufacturer',
    unknownManufacturer: 'Unknown Manufacturer',
    limitedVerification: 'Limited Verification',
    confidence: 'confidence',
    high: 'high',
    medium: 'medium',
    low: 'low',
    manufactured: 'Manufactured',
    
    // Settings
    settingsTitle: 'Settings',
    settingsDescription: 'Configure app behavior',
    language: 'Language',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
    appearance: 'Appearance',
    testOptions: 'Test Options',
    defaultTestMode: 'Default Test Mode',
    testFileSize: 'Test File Size',
    dataPreservation: 'Data Preservation',
    backupWarning: 'Backup Warning',
    dangerZone: 'Danger Zone',
    enableDebugMode: 'Enable Simulation Mode',
    debugModeDescription: 'Test the UI without a real SD card',
    
    // Educational Tooltips
    whyTestSDCard: 'Why should I test my SD card?',
    whyTestSDCardContent: 'Fake SD cards are common in many markets. They claim to have high capacity (e.g., 1TB) but actually have much less (e.g., 8GB). When you exceed the real capacity, your data becomes corrupted and you lose your files. Testing verifies the actual capacity and speed.',
    whatIsFakeCard: 'What is a fake SD card?',
    whatIsFakeCardContent: 'A fake SD card has been modified to report a higher capacity than it actually has. Scammers reprogram the controller to lie about its size. It may show as 1TB in your computer but only have 8GB of actual storage. Once you write more than 8GB, your data is lost.',
    howToSpotFake: 'How can I spot a fake?',
    howToSpotFakeContent: '1. Price too good to be true\n2. No brand name or suspicious branding\n3. Missing security features\n4. Slow write speeds\n5. Capacity shows wrong size\n\nAlways test with this tool before using!',
    speedClasses: 'What are speed classes?',
    speedClassesContent: 'SD cards have speed class ratings:\n\n• Class 10: 10 MB/s minimum (good for photos)\n• UHS-I U3: 30 MB/s (good for 4K video)\n• V30: 30 MB/s video speed class\n• V60: 60 MB/s (professional 4K)\n• V90: 90 MB/s (8K video)\n\nFake cards often have fake speed class markings.',
    
    // Errors
    errorLoadingDrives: 'Failed to load drives. Please try again.',
    errorStartingTest: 'Failed to start test',
    errorReadingCID: 'Unable to read card identification',
    
    // Status
    genuine: 'Genuine',
    fake: 'Fake',
    warning: 'Warning',
    cancelled: 'Cancelled',
  },
  
  id: {
    // App
    appName: 'Validator MicroSD',
    appSubtitle: 'Edisi Profesional',
    
    // Header
    settings: 'Pengaturan',
    history: 'Riwayat',
    systemOk: 'SISTEM: OK',
    
    // Drive Selector
    selectTargetDrive: 'Pilih Drive Target',
    selectDriveDescription: 'Pilih perangkat penyimpanan yang ingin Anda verifikasi. Kami akan melakukan {method} untuk mendeteksi kapasitas palsu atau sektor yang rusak.',
    testMethod: 'Metode Pengujian',
    quickScan: 'Pindai Cepat',
    quickScanDescription: 'Pemeriksaan cepat (~2-5 menit). Baik untuk verifikasi cepat.',
    deepScan: 'Pindai Mendalam',
    deepScanDescription: 'Tulis/baca penuh (10-60 menit). Verifikasi menyeluruh.',
    targetDrive: 'Drive Target',
    refresh: 'Segarkan',
    scanningDrives: 'Memindai drive...',
    noDrivesDetected: 'Tidak ada drive terdeteksi',
    selectDriveToTest: 'Pilih drive untuk diuji...',
    startTest: 'Mulai Pengujian',
    testWillErase: 'Pengujian ini akan menulis data ke drive',
    dataLossWarning: 'Semua data yang ada akan dihapus. Pastikan Anda telah mencadangkan file penting.',
    
    // Safety Dialog
    safetyWarning: 'PERINGATAN KEAMANAN',
    dataWillBeLost: 'SEMUA DATA AKAN DIHAPUS PERMANEN',
    confirmErase: 'Pengujian ini akan menghapus SEMUA data di',
    typeToConfirm: 'Type DELETE to confirm',
    typeToConfirmId: 'Ketik HAPUS untuk konfirmasi',
    cancel: 'Batal',
    proceed: 'Lanjutkan',
    backupReminder: 'Apakah Anda sudah mencadangkan data penting?',
    thisIsPermanent: 'Tindakan ini tidak dapat dibatalkan.',
    
    // Test Progress
    testInProgress: 'Pengujian Berlangsung',
    preparing: 'Mempersiapkan',
    writing: 'Menulis',
    verifying: 'Memverifikasi',
    finalizing: 'Menyelesaikan',
    stopTest: 'Hentikan Pengujian',
    timeRemaining: 'Waktu Tersisa',
    writeSpeed: 'Kecepatan Tulis',
    readSpeed: 'Kecepatan Baca',
    errors: 'Kesalahan',
    
    // Test Results
    testComplete: 'Pengujian Selesai',
    genuineCard: '✓ Kartu Asli',
    fakeCard: '✗ Kartu Palsu Terdeteksi',
    suspiciousCard: '⚠ Kartu Mencurigakan',
    capacity: 'Kapasitas',
    actualCapacity: 'Kapasitas Aktual',
    claimedCapacity: 'Kapasitas yang Diklaim',
    testDuration: 'Durasi Pengujian',
    averageWriteSpeed: 'Kecepatan Tulis Rata-rata',
    averageReadSpeed: 'Kecepatan Baca Rata-rata',
    errorsFound: 'Kesalahan Ditemukan',
    runAnotherTest: 'Jalankan Pengujian Lain',
    exportReport: 'Ekspor Laporan',
    
    // History
    testHistory: 'Riwayat Pengujian',
    historyDescription: 'Lihat dan kelola pengujian kartu SD Anda sebelumnya',
    totalTests: 'Total Pengujian',
    passed: 'Lulus',
    failed: 'Gagal',
    fakeCardsDetected: 'Kartu Palsu',
    searchHistory: 'Cari berdasarkan drive, produsen, atau catatan...',
    exportJson: 'Ekspor JSON',
    exportCsv: 'Ekspor CSV',
    clearAll: 'Hapus Semua',
    noHistoryYet: 'Belum ada riwayat pengujian',
    runFirstTest: 'Jalankan pengujian pertama Anda untuk melihat hasil di sini',
    deleteEntry: 'Hapus entri',
    
    // CID / Manufacturer
    manufacturer: 'Produsen',
    verifiedManufacturer: 'Produsen Terverifikasi',
    unknownManufacturer: 'Produsen Tidak Dikenal',
    limitedVerification: 'Verifikasi Terbatas',
    confidence: 'kepercayaan',
    high: 'tinggi',
    medium: 'sedang',
    low: 'rendah',
    manufactured: 'Diproduksi',
    
    // Settings
    settingsTitle: 'Pengaturan',
    settingsDescription: 'Konfigurasi perilaku aplikasi',
    language: 'Bahasa',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
    appearance: 'Tampilan',
    testOptions: 'Opsi Pengujian',
    defaultTestMode: 'Mode Pengujian Default',
    testFileSize: 'Ukuran File Pengujian',
    dataPreservation: 'Pelestarian Data',
    backupWarning: 'Peringatan Cadangan',
    dangerZone: 'Zona Berbahaya',
    enableDebugMode: 'Aktifkan Mode Simulasi',
    debugModeDescription: 'Uji UI tanpa kartu SD yang sebenarnya',
    
    // Educational Tooltips
    whyTestSDCard: 'Mengapa saya harus menguji kartu SD saya?',
    whyTestSDCardContent: 'Kartu SD palsu umum di banyak pasar. Mereka mengklaim memiliki kapasitas tinggi (misalnya 1TB) tetapi sebenarnya jauh lebih kecil (misalnya 8GB). Ketika Anda melebihi kapasitas sebenarnya, data Anda menjadi rusak dan Anda kehilangan file. Pengujian memverifikasi kapasitas dan kecepatan aktual.',
    whatIsFakeCard: 'Apa itu kartu SD palsu?',
    whatIsFakeCardContent: 'Kartu SD palsu telah dimodifikasi untuk melaporkan kapasitas lebih tinggi dari yang sebenarnya. Penipu memprogram ulang pengontrol untuk berbohong tentang ukurannya. Mungkin menunjukkan 1TB di komputer Anda tetapi hanya memiliki 8GB penyimpanan aktual. Setelah Anda menulis lebih dari 8GB, data Anda hilang.',
    howToSpotFake: 'Bagaimana cara mengenali kartu palsu?',
    howToSpotFakeContent: '1. Harga terlalu bagus untuk menjadi kenyataan\n2. Tidak ada nama merek atau merek mencurigakan\n3. Fitur keamanan hilang\n4. Kecepatan tulis lambat\n5. Kapasitas menunjukkan ukuran yang salah\n\nSelalu uji dengan alat ini sebelum menggunakan!',
    speedClasses: 'Apa itu kelas kecepatan?',
    speedClassesContent: 'Kartu SD memiliki peringkat kelas kecepatan:\n\n• Class 10: Minimal 10 MB/s (baik untuk foto)\n• UHS-I U3: 30 MB/s (baik untuk video 4K)\n• V30: Kelas kecepatan video 30 MB/s\n• V60: 60 MB/s (4K profesional)\n• V90: 90 MB/s (video 8K)\n\nKartu palsu sering memiliki tanda kelas kecepatan palsu.',
    
    // Errors
    errorLoadingDrives: 'Gagal memuat drive. Silakan coba lagi.',
    errorStartingTest: 'Gagal memulai pengujian',
    errorReadingCID: 'Tidak dapat membaca identifikasi kartu',
    
    // Status
    genuine: 'Asli',
    fake: 'Palsu',
    warning: 'Peringatan',
    cancelled: 'Dibatalkan',
  },
};

// Helper function to get translation
export function t(key: keyof Translations, lang: Language = 'en'): string {
  return translations[lang][key] || translations.en[key] || key;
}

// Helper to format template strings
export function tFormat(
  key: keyof Translations,
  values: Record<string, string>,
  lang: Language = 'en'
): string {
  let text = t(key, lang);
  Object.entries(values).forEach(([key, value]) => {
    text = text.replace(`{${key}}`, value);
  });
  return text;
}

export default translations;
