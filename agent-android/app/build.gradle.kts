plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Khoá phát hành: ~/.aiigrow-android/aiigrow-con-release.jks (tạo 25/10/2026, Thanh duyệt), mật khẩu ở ~/.aiigrow-android/ky.env.
// Đọc từ biến môi trường hoặc gradle property cùng tên. Thiếu ⇒ bản debug build như cũ, còn đóng gói release thì DỪNG (không ra APK chưa ký).
fun bien(ten: String): String? = (System.getenv(ten) ?: project.findProperty(ten) as String?)?.takeIf { it.isNotBlank() }
// Đủ cả tệp khoá lẫn mật khẩu mới có cấu hình ký; thiếu một trong hai ⇒ coi như không có khoá (debug vẫn build, release dừng).
val tepKhoa = bien("AIIGROW_CON_KEYSTORE")?.takeIf { bien("AIIGROW_CON_KEYSTORE_PASSWORD") != null }

android {
    namespace = "vn.aiilab.aiigrow.maycon"   // thư mục mã không được tên «con» (tên cấm trên Windows, CI checkout hỏng); applicationId giữ nguyên
    compileSdk = 35

    defaultConfig {
        // App Ba Mẹ (Expo, mobile/) đã dùng vn.aiilab.aiigrow — tác tử máy Con là gói riêng.
        applicationId = "vn.aiilab.aiigrow.con"
        minSdk = 26
        targetSdk = 35
        versionCode = 5
        versionName = "0.2.3"
        buildConfigField("String", "MAY_CHU_MAC_DINH", "\"https://aiigrow.aiilab.vn\"")
    }

    if (tepKhoa != null) {
        signingConfigs {
            create("phatHanh") {
                storeFile = file(tepKhoa)
                storePassword = bien("AIIGROW_CON_KEYSTORE_PASSWORD")
                keyAlias = bien("AIIGROW_CON_KEY_ALIAS") ?: "aiigrow-con"
                keyPassword = bien("AIIGROW_CON_KEY_PASSWORD") ?: storePassword
                enableV3Signing = true   // v3 ⇒ sau này xoay khoá được (proof-of-rotation) mà không phải khôi phục gốc máy Device Owner
            }
        }
    }

    buildTypes {
        debug {
            // Chế độ thử cục bộ (đọc chính sách giả từ tệp, không gọi máy chủ) chỉ có ở bản debug.
            buildConfigField("boolean", "CHO_PHEP_THU", "true")
            // tự cập nhật: cho http tới máy chủ thử (10.0.2.2 / localhost — src/debug/res/xml/mang_thu.xml)
            buildConfigField("boolean", "CHO_PHEP_HTTP", "true")
        }
        release {
            isMinifyEnabled = false
            buildConfigField("boolean", "CHO_PHEP_THU", "false")
            buildConfigField("boolean", "CHO_PHEP_HTTP", "false")
            if (tepKhoa != null) signingConfig = signingConfigs.getByName("phatHanh")
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

if (tepKhoa == null) tasks.matching { it.name == "packageRelease" || it.name == "signReleaseBundle" }.configureEach {
    doFirst { throw GradleException("Bản release phải ký khoá phát hành: nạp ~/.aiigrow-android/ky.env (cần AIIGROW_CON_KEYSTORE + AIIGROW_CON_KEYSTORE_PASSWORD; agent-android/README.md)") }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
