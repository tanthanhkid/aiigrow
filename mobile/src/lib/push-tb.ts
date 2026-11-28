// Push thật cho app Ba Mẹ (#876): sau khi đăng nhập, xin quyền + lấy token gốc APNs / FCM + gửi máy chủ (POST thong-bao/push-token); bấm push ⇒ mở màn trong `data.den`.
// Chỉ native. Thiếu quyền / google-services.json ⇒ không lấy được token ⇒ bỏ qua im lặng (banner + dòng thông báo trong app vẫn chạy, không cần push).
import { Platform } from "react-native";
import { bm } from "./api";

let tokenDaDangKy: string | null = null;

/** Đường mở khi bấm push: chỉ nhận đường nội bộ của app. */
export const denTuPush = (data: unknown): string | null => {
  const den = (data as { den?: unknown } | null)?.den;
  return typeof den === "string" && /^\/[A-Za-z0-9/_-]*$/.test(den) ? den : null;
};

export async function dangKyPush(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const N = await import("expo-notifications");
    if (Platform.OS === "android") await N.setNotificationChannelAsync("gia_dinh", { name: "Thành viên gia đình", importance: N.AndroidImportance.HIGH });
    let { status } = await N.getPermissionsAsync();
    if (status !== "granted") status = (await N.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    // token GỐC của máy (không qua Expo): iOS = APNs device token, Android = FCM token; máy chủ gửi thẳng APNs / FCM (server/lib/push.ts)
    const { data } = await N.getDevicePushTokenAsync();
    if (typeof data !== "string" || data === tokenDaDangKy) return;
    // bản TestFlight / App Store dùng APNs production; bản dev chạy máy thật dùng sandbox
    await bm.goi("thong-bao/push-token", { token: data, loai: Platform.OS === "ios" ? "apns" : "fcm", moiTruong: __DEV__ ? "sandbox" : "production" });
    tokenDaDangKy = data;
  } catch { /* không có push cũng không sao */ }
}

/** Đăng xuất: máy này thôi nhận push của tài khoản (gọi TRƯỚC khi xoá phiên). */
export async function huyDangKyPush(): Promise<void> {
  const t = tokenDaDangKy;
  tokenDaDangKy = null;
  if (!t) return;
  try { await bm.goi("thong-bao/push-token/huy", { token: t }); } catch { /* tối đa còn một push thừa, máy chủ tự xoá token chết */ }
}

/** Bấm push (kể cả mở app nguội từ push) ⇒ `mo(đường)`. Trả hàm gỡ. */
export async function nghePushBam(mo: (den: string) => void): Promise<() => void> {
  if (Platform.OS === "web") return () => {};
  try {
    const N = await import("expo-notifications");
    N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
    const dau = await N.getLastNotificationResponseAsync();
    const d0 = denTuPush(dau?.notification.request.content.data);
    if (d0) mo(d0);
    const ng = N.addNotificationResponseReceivedListener((r) => { const d = denTuPush(r.notification.request.content.data); if (d) mo(d); });
    return () => ng.remove();
  } catch { return () => {}; }
}
