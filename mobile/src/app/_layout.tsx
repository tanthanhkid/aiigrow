import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { M } from "@/lib/mau";
import { PhienProvider } from "@/lib/phien";

export default function Goc() {
  // Bản web không dùng service worker: máy nào còn service worker cũ của tên miền (cache bản cũ ⇒ màn trắng sau deploy) thì gỡ + xoá cache.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    globalThis.navigator?.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    globalThis.caches?.keys?.().then((ks) => ks.forEach((k) => globalThis.caches.delete(k))).catch(() => {});
  }, []);
  const [xong, loi] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  // Web KHÔNG chờ font: trên Safari/iOS (WebKit) useFonts không bao giờ báo xong dù font đã tải ⇒ layout trả null ⇒ màn trắng.
  // Trên web trình duyệt tự đổi sang Inter khi tải xong (@font-face), nên vẽ ngay.
  if (!xong && !loi && Platform.OS !== "web") return null;
  return (
    <SafeAreaProvider>
      <PhienProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }} />
      </PhienProvider>
    </SafeAreaProvider>
  );
}
