// Đích quay về của đăng nhập Google / Facebook (docs/OAUTH.md): web = popup …/oauthredirect, Android/iOS = vn.aiilab.aiigrow:/oauthredirect.
// Thư viện (expo-auth-session) đọc kết quả từ URL; màn này chỉ để link không rơi vào «không thấy trang» — đóng popup / quay lại màn trước.
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { M } from "@/lib/mau";

export default function OauthRedirect() {
  useEffect(() => {
    // web trong popup: _layout đã gọi maybeCompleteAuthSession ⇒ thư viện tự đóng cửa sổ, ở yên
    if (Platform.OS === "web" && (globalThis as { opener?: unknown }).opener) { WebBrowser.maybeCompleteAuthSession(); return; }
    // Android: link quay về cũng mở màn này trên ngăn xếp ⇒ trả về màn trước NGAY (màn Đăng nhập tự đi tiếp khi máy chủ trả phiên)
    if (router.canGoBack()) router.back(); else router.replace("/");
  }, []);
  return <View style={{ flex: 1, backgroundColor: M.nen }} />;
}
