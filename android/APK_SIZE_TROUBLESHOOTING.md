# APK Size Troubleshooting Guide

## Current Issue: Split APK Not Working or Size Still >50MB

### Step 1: Verify You're Building Release Variant

**CRITICAL:** Make sure you're building the **release** variant, not debug:

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

**NOT:**
```bash
./gradlew assembleDebug  # This will be large and not optimized!
```

### Step 2: Check What's Actually Built

After building, check the output:
```powershell
Get-ChildItem android/app/build/outputs/apk/release/*.apk | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
```

You should see:
- `todayGgigu-1.0-armeabi-v7a-release.apk` (~20-35MB)
- `todayGgigu-1.0-arm64-v8a-release.apk` (~20-35MB)

### Step 3: Verify Split Configuration

Check `android/app/build.gradle`:
- `splits.abi.enable` should be `true`
- `splits.abi.universalApk` should be `false`
- `splits.abi.include` should list architectures

### Step 4: Check for Large Dependencies

Your app has several heavy dependencies that can increase size:

1. **react-native-image-crop-picker** (~10-15MB)
   - Consider: Only include if absolutely needed
   - Alternative: Use `react-native-image-picker` alone

2. **react-native-image-picker** (~5-10MB)
   - Consider: Keep if needed for image selection

3. **react-native-webview** (~10-20MB)
   - Consider: Only include if using WebView features
   - Alternative: Use in-app browser or deep linking

4. **react-native-reanimated** (~5-10MB)
   - Consider: Keep if using animations
   - This is likely needed for your app

5. **react-native-vector-icons** (~2-5MB)
   - Consider: Already optimized, but check if all icon sets are needed

### Step 5: Optimize Heavy Dependencies

#### Option A: Remove Unused Dependencies

If you're not using all features, consider removing:
- `react-native-image-crop-picker` (if not cropping images)
- `react-native-webview` (if not showing web content)

#### Option B: Use ProGuard Rules for Specific Libraries

Add to `android/app/proguard-rules.pro`:
```proguard
# Optimize image libraries
-keep class com.imagepicker.** { *; }
-assumenosideeffects class com.imagepicker.** {
    public static void log(...);
}
```

### Step 6: Check Image Assets

You have 31 PNG files in `src/assets/icons/`. Consider:

1. **Convert to WebP** (30-50% smaller):
   ```bash
   # Use online tool or ImageMagick
   # Convert PNG to WebP format
   ```

2. **Compress images** before adding to assets

3. **Remove unused images**

### Step 7: Verify ProGuard is Running

Check build logs for:
```
> Task :app:minifyReleaseWithR8
```

If you don't see this, ProGuard isn't running.

### Step 8: Build AAB Instead of APK

AAB (App Bundle) is more optimized:
```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 9: Check Build Type

Make sure you're not accidentally building debug:
- Debug builds are 2-3x larger
- Debug builds don't use ProGuard
- Debug builds include debug symbols

### Step 10: Verify Installation

When installing split APK:
1. **Check device architecture:**
   ```bash
   adb shell getprop ro.product.cpu.abi
   ```
   - Most devices: `arm64-v8a`
   - Older devices: `armeabi-v7a`

2. **Install matching APK:**
   ```bash
   adb install android/app/build/outputs/apk/release/todaymall-1.0-arm64-v8a-release.apk
   ```

## Expected Results

After all optimizations:
- **armeabi-v7a APK**: 20-30MB
- **arm64-v8a APK**: 20-35MB
- **AAB file**: 25-40MB

If still >50MB:
1. Check if building release (not debug)
2. Verify ProGuard is running
3. Check for large image assets
4. Consider removing heavy dependencies
5. Use AAB format instead of APK

## Quick Test

Run this to see what's taking space:
```bash
cd android
./gradlew assembleRelease --info 2>&1 | Select-String -Pattern "size|MB|KB" | Select-Object -First 20
```

## Common Mistakes

1. **Building debug instead of release** - Most common issue!
2. **Installing wrong architecture APK** - Check device architecture first
3. **Not cleaning before build** - Always run `./gradlew clean` first
4. **Universal APK instead of split** - Make sure `universalApk false`

