import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useFonts, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
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
  const [xong] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  if (!xong) return null;
  return (
    <SafeAreaProvider>
      <PhienProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }} />
      </PhienProvider>
    </SafeAreaProvider>
  );
}
