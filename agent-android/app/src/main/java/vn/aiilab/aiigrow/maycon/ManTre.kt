package vn.aiilab.aiigrow.maycon

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.core.content.FileProvider
import vn.aiilab.aiigrow.maycon.logic.cungMayChu
import vn.aiilab.aiigrow.maycon.logic.duongTre
import java.io.File
import java.net.URLEncoder

/**
 * Mở màn Con (Nhiệm vụ / Nộp bài / Quà / Chơi…) — mục 1 BANG-TINH-NANG-OS:
 *  • app AiiGrow (Expo, `mobile/`) có trên máy và nhận `aiigrow://tre/<đường>` ⇒ mở thẳng app đó;
 *  • không thì mở web `/tre/<đường>` của chính máy chủ đã ghép trong WebView riêng của AiiGrow Con, kèm phiên Con lấy bằng token máy
 *    (`phien-web`, như khung Kid của agent-win) ⇒ Con không phải chọn hồ sơ + PIN. WebView riêng: không phụ thuộc Chrome (có thể đang bị chặn)
 *    và chỉ đi trong đúng máy chủ AiiGrow — không thành trình duyệt vượt lọc web.
 */
class ManTre : Activity() {
    private var web: WebView? = null
    private var choTep: ValueCallback<Array<Uri>>? = null
    private var anhChup: Uri? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val duong = duongTre(intent?.getStringExtra(DUONG))
        val deep = Intent(Intent.ACTION_VIEW, Uri.parse("aiigrow://tre/$duong"))
        val app = packageManager.queryIntentActivities(deep, 0).firstOrNull { it.activityInfo.packageName != packageName }
        if (app != null) {
            try { startActivity(deep.setPackage(app.activityInfo.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); finish(); return } catch (_: Exception) {}
        }
        moWeb(duong)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun moWeb(duong: String) {
        val k = Kho(this)
        val goc = k.mayChu.trimEnd('/')
        val w = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setSupportMultipleWindows(false)
            settings.allowFileAccess = false
            webViewClient = object : WebViewClient() {
                // chỉ trong máy chủ AiiGrow; liên kết ra ngoài bị bỏ (Con dùng Chrome — nơi có lọc web)
                override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest) = !cungMayChu(r.url.toString(), goc)
                override fun onReceivedError(v: WebView, r: WebResourceRequest, e: WebResourceError) {
                    if (r.isForMainFrame) v.loadDataWithBaseURL(null, TRANG_LOI, "text/html", "utf-8", null)
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(v: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                    choTep?.onReceiveValue(null); choTep = cb
                    return try { startActivityForResult(yDinhChonAnh(p), CHON_TEP); true } catch (_: Exception) { choTep = null; false }
                }
            }
        }
        web = w
        setContentView(FrameLayout(this).apply {
            setBackgroundColor(Clay.NEN)
            addView(w, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            setOnApplyWindowInsetsListener { v, i -> @Suppress("DEPRECATION") v.setPadding(0, i.systemWindowInsetTop, 0, i.systemWindowInsetBottom); i }
        })
        Thread {
            // phiên Con 12 giờ (POST phien-web) — lỗi (mất mạng / máy dùng chung chưa chọn Con) ⇒ web tự hỏi hồ sơ + PIN
            val phien = if (k.token == null || k.cheDoThu) null else try { MayChu(goc, k.token).goi("phien-web", org.json.JSONObject()).optString("phienCon").ifBlank { null } } catch (_: Exception) { null }
            val url = "$goc/tre/$duong" + (phien?.let { "?phien=" + URLEncoder.encode(it, "UTF-8") } ?: "")
            runOnUiThread { if (!isFinishing) w.loadUrl(url) }
        }.start()
    }

    /** Ô chọn ảnh của web (nộp bài): chụp bằng camera (ảnh ghi vào cache của AiiGrow qua FileProvider) hoặc chọn ảnh có sẵn. */
    private fun yDinhChonAnh(p: WebChromeClient.FileChooserParams): Intent {
        val chon = p.createIntent()
        val tep = File(File(cacheDir, "anh").apply { mkdirs() }, "chup-${System.currentTimeMillis()}.jpg")
        val uri = FileProvider.getUriForFile(this, "$packageName.tep", tep)
        anhChup = uri
        val chup = Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, uri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val dsChup = if (chup.resolveActivity(packageManager) != null) arrayOf(chup) else emptyArray()
        return if (p.isCaptureEnabled && dsChup.isNotEmpty()) chup
        else Intent.createChooser(chon, "Chọn ảnh bài làm").putExtra(Intent.EXTRA_INITIAL_INTENTS, dsChup)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != CHON_TEP) return
        val kq: Array<Uri>? = when {
            resultCode != RESULT_OK -> null
            data?.data != null -> arrayOf(data.data!!)
            data?.clipData != null -> (0 until data.clipData!!.itemCount).map { data.clipData!!.getItemAt(it).uri }.toTypedArray()
            else -> anhChup?.let { u -> if ((File(File(cacheDir, "anh"), u.lastPathSegment ?: "").length()) > 0) arrayOf(u) else null }
        }
        choTep?.onReceiveValue(kq); choTep = null
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { val w = web; if (w != null && w.canGoBack()) w.goBack() else super.onBackPressed() }

    override fun onDestroy() { web?.let { it.stopLoading(); (it.parent as? ViewGroup)?.removeView(it); it.destroy() }; web = null; super.onDestroy() }

    companion object {
        const val DUONG = "duong"
        private const val CHON_TEP = 41
        private const val TRANG_LOI = "<html><body style='font-family:sans-serif;padding:32px;color:#1d2a26;background:#f4f3ee'>" +
            "<h2>Chưa mở được</h2><p>Cần mạng để xem nhiệm vụ, nộp bài và đổi quà. Con kiểm tra Wi‑Fi rồi thử lại nhé.</p></body></html>"

        fun mo(ctx: android.content.Context, duong: String) =
            ctx.startActivity(Intent(ctx, ManTre::class.java).putExtra(DUONG, duong).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
