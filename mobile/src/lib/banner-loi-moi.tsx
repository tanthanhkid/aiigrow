// Banner «<Người mời> mời bạn vào nhà <tên nhà>» (#876): người đang đăng nhập mà có lời mời chờ gửi tới đúng SĐT / email của mình ⇒ nổi trên đầu màn
// (iOS / Android / web), nút «Xem lời mời» ⇒ /moi/vao. Hỏi lại (GET moi/cho-toi) khi app mở / về foreground / tab web hiện lại / đổi màn — không cần đăng xuất.
// Không hiện ở màn đăng nhập, thiết lập, và chính màn lời mời. «Để sau» ẩn tới lần mở app kế (nhớ trong bộ nhớ, không lưu máy).
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bm } from "./api";
import { usePhien } from "./phien";
import { dangKyPush, nghePushBam } from "./push-tb";
import { KHOI } from "./clay";
import { F, M } from "./mau";

type LoiMoi = { id: string; tenGiaDinh: string; nguoiMoi: string | null };
const AN_O = /^\/(moi|tre|chao|dang-nhap|dang-ky|otp|dat-mat-khau|quen-mat-khau|tao-tai-khoan|thiet-lap|oauthredirect|authorize)(\/|$)/;
const CACH_TOI_THIEU_MS = 15_000;

/** Câu trên banner / dòng thông báo — một chỗ cho cả hai. */
export const cauMoi = (m: Pick<LoiMoi, "tenGiaDinh" | "nguoiMoi">) => `${m.nguoiMoi ?? "Người nhà"} mời bạn vào nhà ${m.tenGiaDinh} trên AiiGrow`;

/** Gắn `key` theo phiên: đăng xuất / đổi tài khoản ⇒ dựng lại, danh sách + «Để sau» của người trước không lọt sang người sau. */
export function BannerLoiMoi() {
  const { co } = usePhien();
  return <BannerTrong key={co ? "co" : "khong"} co={co} />;
}

function BannerTrong({ co }: { co: boolean }) {
  const duong = usePathname();
  const { top } = useSafeAreaInsets();
  const [ds, setDs] = useState<LoiMoi[]>([]);
  const [da, setDa] = useState<Set<string>>(new Set());
  const lanCuoi = useRef(0);
  const hoi = useCallback((ep = false) => {
    if (!co) return;
    if (!ep && Date.now() - lanCuoi.current < CACH_TOI_THIEU_MS) return;
    lanCuoi.current = Date.now();
    bm.goi<{ ds: LoiMoi[] }>("moi/cho-toi").then((r) => setDs(r.ds ?? [])).catch(() => {});
  }, [co]);
  useEffect(() => { if (!co) return; hoi(true); void dangKyPush(); }, [co, hoi]);   // hết phiên: banner ẩn theo `co`, danh sách cũ bị thay ở lần hỏi sau
  const duongTruoc = useRef(duong);
  useEffect(() => {                                              // đổi màn ⇒ hỏi lại (chặn 15 giây); rời màn /moi (vừa nhận / bỏ lời mời) ⇒ hỏi ngay
    const tuMoi = /^\/moi(\/|$)/.test(duongTruoc.current);
    duongTruoc.current = duong;
    hoi(tuMoi);
  }, [duong, hoi]);
  useEffect(() => {
    if (!co) return;
    if (Platform.OS === "web") {
      const f = () => { if (globalThis.document?.visibilityState === "visible") hoi(true); };
      globalThis.document?.addEventListener("visibilitychange", f);
      return () => globalThis.document?.removeEventListener("visibilitychange", f);
    }
    const s = AppState.addEventListener("change", (t) => { if (t === "active") hoi(true); });
    return () => s.remove();
  }, [co, hoi]);
  useEffect(() => {
    if (!co) return;
    let go: (() => void) | undefined, huy = false;
    nghePushBam((den) => router.push(den as never)).then((f) => { if (huy) f(); else go = f; });
    return () => { huy = true; go?.(); };
  }, [co]);

  const m = ds.find((x) => !da.has(x.id));
  if (!co || !m || AN_O.test(duong)) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: top + 8, paddingHorizontal: 16, zIndex: 50 }}>
      <View accessibilityRole="alert" style={[{ borderRadius: 24, backgroundColor: M.the, padding: 14, gap: 10 }, KHOI.the]}>
        <Text style={{ fontFamily: F.dam, fontSize: 15, lineHeight: 21, color: M.chu }}>{cauMoi(m)}</Text>
        <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          <Pressable accessibilityRole="button" onPress={() => setDa((s) => new Set(s).add(m.id))} hitSlop={8} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
            <Text style={{ fontFamily: F.dam, fontSize: 14, color: M.chu3 }}>Để sau</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/moi/vao")} style={{ minHeight: 44, borderRadius: 22, backgroundColor: M.nut, paddingHorizontal: 18, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.dam, fontSize: 14, color: "#fff" }}>Xem lời mời</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
