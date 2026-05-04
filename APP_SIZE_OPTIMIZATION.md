# Android App Size Optimization Guide

## Changes Applied

### 1. ✅ Enabled ProGuard/R8 Code Shrinking
- **Before**: `enableProguardInReleaseBuilds = false`
- **After**: `enableProguardInReleaseBuilds = true`
- **Impact**: Reduces code size by 30-50% by removing unused code

### 2. ✅ Enabled Resource Shrinking
- Added `shrinkResources true` in release build
- **Impact**: Removes unused resources (images, layouts, etc.)

### 3. ✅ Optimized ProGuard Configuration
- Switched to `proguard-android-optimize.txt` (more aggressive optimization)
- Added React Native specific ProGuard rules
- **Impact**: Better code optimization and obfuscation

### 4. ✅ Enabled ABI Splitting
- Split APKs by architecture (armeabi-v7a, arm64-v8a, x86, x86_64)
- **Impact**: Each APK only contains code for one architecture, reducing size by ~60-70%

### 5. ✅ Hermes Already Enabled
- Hermes is already enabled (good for performance and size)

## Expected Size Reduction

- **Before**: ~100MB+ (universal APK)
- **After**: 
  - Individual APKs: ~25-40MB each (architecture-specific)
  - Universal APK: Still large, but optimized
  - **Total reduction**: 60-75% smaller per APK

## Additional Optimization Tips

### 1. ✅ Removed Unused Dependencies
The following packages have been removed:
- ✅ `react-native-web` - Removed (not building for web)
- ✅ `react-dom` - Removed (not using web)
- ✅ `react-native-audio-recorder-player` - Removed (audio features not needed)

### 2. Optimize Images
- Use WebP format instead of PNG where possible
- Compress images before adding to assets
- Use vector drawables for simple icons
- Consider using image optimization tools

### 3. ✅ Removed Custom Fonts
The following font files have been removed (now using system fonts):
- ✅ NotoSans-Bold.ttf - Removed
- ✅ NotoSans-Light.ttf - Removed
- ✅ NotoSans-Medium.ttf - Removed
- ✅ NotoSans-Regular.ttf - Removed
- **Impact**: ~2-5MB size reduction, using system default fonts (Roboto on Android, San Francisco on iOS)

### 4. Enable Bundle Analyzer
Run to see what's taking up space:
```bash
npx react-native-bundle-visualizer
```

### 5. Use App Bundle (AAB) Instead of APK
For Play Store distribution, use AAB format which is more optimized:
```bash
cd android && ./gradlew bundleRelease
```

### 6. Remove Debug Code
Ensure no debug code or console.logs in production builds

### 7. Lazy Load Heavy Components
Use React.lazy() for screens/components that aren't immediately needed

## Building Optimized APKs

### Build individual architecture APKs:
```bash
cd android
./gradlew assembleRelease
```

### Build App Bundle (recommended for Play Store):
```bash
cd android
./gradlew bundleRelease
```

### Build specific architecture:
```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## Verifying Size Reduction

After building, check APK sizes:
```bash
ls -lh android/app/build/outputs/apk/release/
```

## Troubleshooting

If you encounter issues after enabling ProGuard:

1. Check ProGuard rules in `android/app/proguard-rules.pro`
2. Test the release build thoroughly
3. Add keep rules for any classes that are incorrectly removed
4. Check logs for ProGuard warnings

## Notes

- ABI splitting means you'll have multiple APKs (one per architecture)
- For Play Store, use AAB format which handles architecture splitting automatically
- Test release builds thoroughly as ProGuard can sometimes remove needed code
- Keep ProGuard rules updated when adding new native modules

