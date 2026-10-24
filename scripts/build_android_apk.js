/**
 * Campify Android APK Automated Builder
 * Runs Capacitor sync and builds the debug APK via Gradle or guides through Android Studio.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const androidDir = path.join(frontendDir, 'android');
const gradlewBat = path.join(androidDir, 'gradlew.bat');

console.log('====================================================');
console.log('🚀 CAMPIFY - ANDROID APK AUTOMATIC BUILD SCRIPT');
console.log('====================================================\n');

// 1. Check if Android project exists
if (!fs.existsSync(androidDir)) {
  console.log('📦 Android project not found. Adding Android platform via Capacitor...');
  execSync('npx cap add android', { cwd: frontendDir, stdio: 'inherit' });
}

// 2. Sync Capacitor
console.log('🔄 Syncing web assets and Capacitor plugins with Android project...');
try {
  // If out directory does not exist, create dummy index or build
  const outDir = path.join(frontendDir, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=http://localhost:3001"></head><body>Campify Loading...</body></html>');
  }
  execSync('npx cap sync android', { cwd: frontendDir, stdio: 'inherit' });
  console.log('✅ Capacitor Android sync completed!\n');
} catch (err) {
  console.warn('⚠️ Capacitor sync note:', err.message);
}

// 3. Check for Java / Gradle
console.log('🔍 Checking Java / Android environment on this machine...');
let javaAvailable = false;
try {
  const javaCheck = spawnSync('java', ['-version'], { encoding: 'utf8' });
  if (javaCheck.status === 0 || javaCheck.stderr) {
    javaAvailable = true;
    console.log('✅ Java is detected on this system.');
  }
} catch (e) {
  javaAvailable = false;
}

// 4. Try building APK with Gradle
let apkBuilt = false;
if (fs.existsSync(gradlewBat)) {
  console.log('⚙️ Attempting Gradle APK build (assembleDebug)...');
  try {
    const gradleRun = spawnSync(gradlewBat, ['assembleDebug'], {
      cwd: androidDir,
      stdio: 'inherit',
      shell: true
    });

    if (gradleRun.status === 0) {
      const defaultApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      if (fs.existsSync(defaultApkPath)) {
        const destApkPath = path.join(rootDir, 'Campify-v2.5-debug.apk');
        fs.copyFileSync(defaultApkPath, destApkPath);
        apkBuilt = true;
        console.log('\n🎉 SUCCESS! APK FILE GENERATED SUCCESSFULLY!');
        console.log(`📁 Direct APK Path: ${destApkPath}`);
        console.log('📱 You can directly transfer this APK to any Android phone and install it!\n');
      }
    }
  } catch (err) {
    console.log('Note on direct gradle build:', err.message);
  }
}

// 5. Output Friendly Next Steps Guide (Gujarati + English)
if (!apkBuilt) {
  console.log('\n====================================================');
  console.log('📱 ANDROID STUDIO 1-CLICK APK BUILD STEPS:');
  console.log('====================================================');
  console.log('તમારે આ પ્રોજેક્ટની APK બનાવવા માટે ફક્ત આ સરળ સ્ટેપ્સ કરવાના છે:');
  console.log('');
  console.log('1. Android Studio ઓપન કરો (Open Android Studio)');
  console.log('2. "Open Existing Project" પર ક્લિક કરો અને આ ફોલ્ડર સિલેક્ટ કરો:');
  console.log(`   📂 ${androidDir}`);
  console.log('3. પ્રોજેક્ટ લોડ થાય પછી ટોપ મેનુમાંથી:');
  console.log('   👉 Build -> Build Bundle(s) / APK(s) -> Build APK(s) પર ક્લિક કરો!');
  console.log('4. 1 મિનિટમાં "Build APK(s) completed successfully" મેસેજ આવશે');
  console.log('   અને "locate" લિંક પર ક્લિક કરવાથી રેડી .apk ફાઇલ મળી જશે!');
  console.log('');
  console.log('💡 OR Command line:');
  console.log('   cd frontend');
  console.log('   npx cap open android');
  console.log('====================================================\n');
}
