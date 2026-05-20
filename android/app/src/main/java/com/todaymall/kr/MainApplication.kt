package com.todayggigu.kr

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    val packages = PackageList(this).packages.apply {
      // Packages that cannot be autolinked yet can be added manually here, for example:
      // add(MyReactNativePackage())
    }
    
    // jsBundleAssetPath must match android/app/build.gradle `bundleAssetName` (default fallback
    // when Metro is unreachable uses assets://…, not "index").
    DefaultReactHost.getDefaultReactHost(
        context = applicationContext,
        packageList = packages,
        jsMainModulePath = "index",
        jsBundleAssetPath = "index.android.bundle",
        isHermesEnabled = true,
        useDevSupport = BuildConfig.DEBUG,
    )
  }

  override val reactNativeHost: ReactNativeHost by lazy {
    object : ReactNativeHost(this) {
      override fun getPackages(): List<com.facebook.react.ReactPackage> {
        return PackageList(this@MainApplication).packages
      }

      override fun getJSMainModuleName(): String {
        return "index"
      }

      override fun getUseDeveloperSupport(): Boolean {
        return BuildConfig.DEBUG // Only enable dev support in debug builds
      }

      override fun getJSBundleFile(): String? {
        // Return null to let React Native automatically find the bundle in assets
        // In debug, it will use Metro bundler. In release, it will use the embedded bundle
        return null
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    OkHttpClientProvider.setOkHttpClientFactory(StripSecureCookieClientFactory())
    loadReactNative(this)
  }
}

private class StripSecureCookieClientFactory : OkHttpClientFactory {
  override fun createNewNetworkModuleClient(): OkHttpClient {
    return OkHttpClientProvider.createClientBuilder()
      .addNetworkInterceptor { chain ->
        val response = chain.proceed(chain.request())
        val rewritten = response.headers("Set-Cookie").map { value ->
          value.split(";")
            .filter { it.trim().lowercase() != "secure" }
            .joinToString(";")
        }
        val builder = response.newBuilder().removeHeader("Set-Cookie")
        rewritten.forEach { builder.addHeader("Set-Cookie", it) }
        builder.build()
      }
      .build()
  }
}
