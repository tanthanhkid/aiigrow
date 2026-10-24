plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "vn.aiilab.aiigrow.con"
    compileSdk = 35

    defaultConfig {
        // App Ba Mẹ (Expo, mobile/) đã dùng vn.aiilab.aiigrow — tác tử máy Con là gói riêng.
        applicationId = "vn.aiilab.aiigrow.con"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "MAY_CHU_MAC_DINH", "\"https://aiigrow.aiilab.vn\"")
    }

    buildTypes {
        debug {
            // Chế độ thử cục bộ (đọc chính sách giả từ tệp, không gọi máy chủ) chỉ có ở bản debug.
            buildConfigField("boolean", "CHO_PHEP_THU", "true")
        }
        release {
            isMinifyEnabled = false
            buildConfigField("boolean", "CHO_PHEP_THU", "false")
            // Chưa có keystore phát hành (luật: không tự tạo khoá) — bản release ký sau.
        }
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    testOptions { unitTests.isReturnDefaultValues = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
