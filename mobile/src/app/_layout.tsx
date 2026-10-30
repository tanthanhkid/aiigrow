import { useEffect } from "react";
import { Platform, Pressable, Text, useColorScheme } from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { M } from "@/lib/mau";
import { C } from "@/lib/ob";
import { PhienProvider } from "@/lib/phien";
import { useNapPhongChu } from "@/lib/phong-chu";

// Luồng bắt đầu (biến thể appllama): header NATIVE (tiêu đề + nút lùi + vuốt mép của hệ điều hành), nền màu ngữ nghĩa (sáng/tối).
// Header native nhận CHUỖI màu (màu động PlatformColor ở headerStyle bị chốt theo chế độ lúc dựng ⇒ thanh sáng giữa màn tối — vòng 4 bắt được).
function useOb() {
  const toi = useColorScheme() === "dark";
  const tint = toi ? "#4cc9b5" : "#0f6b5c";
  const OB = { headerShown: true, headerShadowVisible: false, headerBackButtonDisplayMode: "minimal", headerStyle: { backgroundColor: toi ? "#000000" : "#f2f2f7" },
    headerTintColor: tint, headerTitleStyle: { color: toi ? "#ffffff" : "#000000" }, contentStyle: { backgroundColor: C.nen } } as const;
  /** Đăng nhập / Mã mời: việc tự đứng một mình ⇒ trình bày dạng modal (thẻ trượt lên, vuốt xuống để huỷ) có nút Huỷ riêng. */
  const huy = () => (
    <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}>
      <Text style={{ fontSize: 17, color: tint }}>Huỷ</Text>
    </Pressable>
  );
  const MODAL = { ...OB, presentation: "modal", headerLeft: huy, headerStyle: { backgroundColor: toi ? "#1c1c1e" : "#f2f2f7" } } as const;
  return { OB, MODAL };
}

export default function Goc() {
  // Bản web không dùng service worker: máy nào còn service worker cũ của tên miền (cache bản cũ ⇒ màn trắng sau deploy) thì gỡ + xoá cache.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    globalThis.navigator?.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    globalThis.caches?.keys?.().then((ks) => ks.forEach((k) => globalThis.caches.delete(k))).catch(() => {});
  }, []);
  // Inter: native nhúng sẵn lúc build (app.json › expo-font) nên không chờ tải; web nạp @font-face, không chờ (phong-chu.web.ts).
  useNapPhongChu();
  const { OB, MODAL } = useOb();
  return (
    <SafeAreaProvider>
      <PhienProvider>
        {/* các màn ngoài luồng bắt đầu vẫn là bảng màu sáng cố định ⇒ chữ thanh trạng thái tối; màn luồng bắt đầu tự đặt «auto» */}
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }}>
          <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: C.nen } }} />
          <Stack.Screen name="chao" options={{ contentStyle: { backgroundColor: C.nen } }} />
          <Stack.Screen name="dang-ky" options={{ ...OB, title: "Tạo tài khoản" }} />
          <Stack.Screen name="otp" options={{ ...OB, title: "Xác thực" }} />
          <Stack.Screen name="dang-nhap" options={{ ...MODAL, title: "Đăng nhập" }} />
          <Stack.Screen name="moi" options={{ ...MODAL, title: "Mã mời" }} />
          <Stack.Screen name="thiet-lap/ten-con" options={{ ...OB, title: "Hồ sơ Con", headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="thiet-lap/may" options={{ ...OB, title: "Thiết bị", headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="thiet-lap/ghep" options={{ ...OB, title: "Ghép máy" }} />
          <Stack.Screen name="thiet-lap/mau" options={{ ...OB, title: "Nhiệm vụ & quà" }} />
          <Stack.Screen name="thiet-lap/gio" options={{ ...OB, title: "Giờ chơi", headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="thiet-lap/xong" options={{ contentStyle: { backgroundColor: C.nen }, gestureEnabled: false }} />
        </Stack>
      </PhienProvider>
    </SafeAreaProvider>
  );
}
