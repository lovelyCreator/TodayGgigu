# Building Optimized APKs

## Important: Use AAB (App Bundle) for Best Results

**For Play Store distribution, always use AAB format** - it's more optimized and Google Play handles architecture splitting automatically.

## Build Commands

### 1. Build App Bundle (AAB) - RECOMMENDED
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`
- Single file, Google Play handles architecture splitting
- Smaller download size for users
- Best optimization

### 2. Build Split APKs (for direct installation)
```bash
cd android
./gradlew assembleRelease
```
Output: Multiple APKs in `android/app/build/outputs/apk/release/`:
- `todayGgigu-1.0-armeabi-v7a-release.apk` (~20-30MB)
- `todayGgigu-1.0-arm64-v8a-release.apk` (~20-30MB)
- `todayGgigu-1.0-x86-release.apk` (~20-30MB)
- `todayGgigu-1.0-x86_64-release.apk` (~20-30MB)

**Note:** Install the APK that matches your device's architecture:
- Most modern devices: `arm64-v8a`
- Older devices: `armeabi-v7a`
- Emulators: `x86` or `x86_64`

### 3. Build Single Architecture (for testing)
```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## Verifying APK Size

After building, check sizes:
```bash
# Windows PowerShell
Get-ChildItem android/app/build/outputs/apk/release/*.apk | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}

# Linux/Mac
ls -lh android/app/build/outputs/apk/release/
```

## Troubleshooting Split APKs

### If split APKs don't work:

1. **Check you're building release variant:**
   ```bash
   ./gradlew assembleRelease
   ```

2. **Clean build:**
   ```bash
   ./gradlew clean
   ./gradlew assembleRelease
   ```

3. **Verify splits are enabled:**
   - Check `android/app/build.gradle` - `splits.abi.enable` should be `true`

4. **Install correct architecture:**
   - Check device architecture: `adb shell getprop ro.product.cpu.abi`
   - Install matching APK

### If APK size is still >50MB:

1. **Check for large assets:**
   - Images should be optimized (WebP format)
   - Remove unused images
   - Compress images before adding

2. **Verify ProGuard is working:**
   - Check build logs for ProGuard warnings
   - Ensure `minifyEnabled true` in release build

3. **Check dependencies:**
   - Remove unused npm packages
   - Use `npx react-native-bundle-visualizer` to see bundle size

4. **Use AAB instead of APK:**
   - AAB format is more optimized
   - Google Play handles optimization automatically

## Expected Sizes

After optimizations:
- **Individual split APKs:** 20-35MB each
- **AAB file:** 25-40MB (Google Play optimizes further)
- **Universal APK:** 60-80MB (not recommended)

If your APK is still >50MB, check:
1. Are you building release variant? (not debug)
2. Are ProGuard and resource shrinking enabled?
3. Are there large image assets?
4. Are you using the split APK for the correct architecture?

