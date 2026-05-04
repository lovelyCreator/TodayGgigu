# How to View Console Logs in React Native CLI

## Method 1: Using React Native Log Commands (Recommended for CLI)

### For Android:
```bash
npx react-native log-android
```

### For iOS:
```bash
npx react-native log-ios
```

These commands will show all console logs directly in your terminal.

## Method 2: Using Metro Bundler Terminal

When you run your React Native app, the Metro bundler terminal shows all console logs:

```bash
# Start the app
npm start
# or
npx react-native start

# In another terminal, run:
npx react-native run-android
# or
npx react-native run-ios
```

All `console.log()`, `console.error()`, `console.warn()` statements will appear in the Metro bundler terminal.

## Method 2: Using React Native Debugger

1. Shake your device/emulator (or press `Cmd+D` on iOS simulator, `Cmd+M` on Android emulator)
2. Select "Debug" or "Open Debugger"
3. This opens Chrome DevTools where you can see console logs

## Method 3: Using Android Logcat (Android Only)

```bash
# View all logs
adb logcat

# Filter for React Native logs only
adb logcat *:S ReactNative:V ReactNativeJS:V

# Filter for specific tags (our ImageSearch logs)
adb logcat | grep -i "ImageSearch"
```

## Method 4: Using iOS Console (iOS Only)

```bash
# View device logs
xcrun simctl spawn booted log stream --level=debug

# Or use Console.app on Mac
# Open Console.app and select your device/simulator
```

## Method 5: Using Flipper (Recommended for Development)

1. Install Flipper: https://fbflipper.com/
2. Connect your device/emulator
3. Open Flipper and go to "Logs" tab
4. All console logs will appear there

## Filtering Console Logs

To see only ImageSearch related logs, look for logs with these prefixes:
- `🔍 [ImageSearchScreen]` - Main image search logs
- `🔍 [1688 ImageSearch API]` - 1688 API specific logs
- `🔍 [ImageSearch API]` - Taobao API specific logs
- `✅` - Success logs
- `❌` - Error logs
- `⚠️` - Warning logs

## Example Console Output

When you perform an image search, you'll see logs like:

```
🔍 [ImageSearchScreen] Calling 1688 API with: { platform: '1688', selectedCompany: '1688', ... }
🔍 [1688 ImageSearch API] Request: { url: '...', base64Length: 1234567, ... }
🔍 [1688 ImageSearch API] Response: { status: 200, hasProducts: true, productsCount: 10, ... }
🔍 [ImageSearchScreen] 1688 API Response: { success: true, productsCount: 10, ... }
✅ [ImageSearchScreen] Products received: { count: 10, sampleProducts: [...] }
✅ [ImageSearchScreen] Successfully loaded and mapped products: { totalCount: 10, ... }
```

## Tips

1. **Use emojis in logs** - Makes it easier to spot important logs (✅ ❌ ⚠️ 🔍)
2. **Use consistent prefixes** - Makes filtering easier
3. **Log important data** - API responses, product counts, prices, etc.
4. **Use console.error for errors** - Shows up in red in most terminals
5. **Use console.warn for warnings** - Shows up in yellow

## Quick Commands

```bash
# React Native CLI Commands (Easiest)
npx react-native log-android    # View Android logs
npx react-native log-ios         # View iOS logs

# Android - Filter for ImageSearch logs
adb logcat | grep "ImageSearch"
# Or filter for React Native logs only
adb logcat | grep -E "ReactNative|ReactNativeJS|ImageSearch"

# iOS - View logs in real-time
xcrun simctl spawn booted log stream --predicate 'processImage == "your-app-name"'

# Metro bundler - Already shows all logs by default
npm start
# or
npx react-native start
```

## Most Common Usage

**For Android:**
```bash
# Open a terminal and run:
npx react-native log-android

# This will show all console.log() statements in real-time
```

**For iOS:**
```bash
# Open a terminal and run:
npx react-native log-ios

# This will show all console.log() statements in real-time
```

