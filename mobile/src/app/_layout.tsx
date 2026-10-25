import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { M } from "@/lib/mau";
import { PhienProvider } from "@/lib/phien";
import { useNapPhongChu } from "@/lib/phong-chu";

export default function Goc() {
  // Bản web không dùng service worker: máy nào còn service worker cũ của tên miền (cache bản cũ ⇒ màn trắng sau deploy) thì gỡ + xoá cache.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    globalThis.navigator?.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    globalThis.caches?.keys?.().then((ks) => ks.forEach((k) => globalThis.caches.delete(k))).catch(() => {});
  }, []);
  // Inter: native nhúng sẵn lúc build (app.json › expo-font) nên không chờ tải; web nạp @font-face, không chờ (phong-chu.web.ts).
  useNapPhongChu();
  return (
    <SafeAreaProvider>
      <PhienProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }} />
      </PhienProvider>
    </SafeAreaProvider>
  );
}
