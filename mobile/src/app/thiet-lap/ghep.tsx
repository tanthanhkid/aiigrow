// bm-ob-ghep (bước 3/5): QR + mã 6 số (hạn 15 phút); app tự theo dõi máy đã nhận mã + mức bảo vệ (BRD 6.1 bước 4).
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { MaQr } from "@/lib/qr";
import { BaoLoi, Buoc, Chu, M, Man, Nut, The, TickDong, useLam } from "@/lib/ui";

const TEN_NEN = { windows: "laptop Windows", mac: "máy Mac", ios: "iPad / iPhone", android: "máy Android" } as const;

export default function ObGhep() {
  const tl = layTl();
  const [ma, setMa] = useState<string | null>(null);
  const [het, setHet] = useState<Date | null>(null);
  const [may, setMay] = useState<ConChiTiet["may"][number] | null>(null);
  const { lam, loi } = useLam();
  const tao = useCallback(() => lam(async () => {
    const r = await bm.goi<{ ma: string }>("ma-ghep", { con: tl.conId, nen: tl.nen ?? "windows" });
    setMa(r.ma);
    setHet(new Date(Date.now() + 15 * 60_000));
  }), [lam, tl.conId, tl.nen]);
  useEffect(() => { tao(); }, [tao]);
  useEffect(() => {
    if (!tl.conId) return;
    const t = setInterval(async () => {
      try { const c = await bm.goi<ConChiTiet>(`con/${tl.conId}`); setMay(c.may.find((m) => !m.dungChung) ?? null); } catch { /* thử lại nhịp sau */ }
    }, 3000);
    return () => clearInterval(t);
  }, [tl.conId]);
  const ten = tl.tenCon ?? "Con";
  return (
    <Man dau={<Buoc n={3} tong={5} nhan="Bước 3/5 · Ghép máy" />} day={<><BaoLoi loi={loi} /><Nut chu="Tiếp: nhiệm vụ & quà" rong bam={() => router.push("/thiet-lap/mau")} /></>}>
      <The dem>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Chu kieu="rat" co={18} style={{ textAlign: "center" }}>{`Trên ${TEN_NEN[tl.nen ?? "windows"]} của ${ten}: cài AiiGrow Kid rồi quét mã`}</Chu>
          {ma ? <MaQr noiDung={`aiigrow:ghep:${ma}`} /> : null}
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(ma ?? "      ").split("").map((c, i) => (
              <View key={i} style={{ width: 42, height: 54, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: M.vien2, alignItems: "center", justifyContent: "center" }}>
                <Chu kieu="rat" co={24} so>{c}</Chu>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <Chu co={13} mau={M.chu3}>{het ? `Hết hạn lúc ${het.toTimeString().slice(0, 5)}` : "Đang tạo mã…"}</Chu>
            <Pressable onPress={tao} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Chu kieu="rat" co={13} mau={M.chinhInk}>Tạo mã mới</Chu></Pressable>
          </View>
        </View>
      </The>
      <The dem>
        <TickDong chu="Máy đã nhận mã" trang={may ? "xong" : "cho"} phu={may ? may.ten : `Đang chờ ${TEN_NEN[tl.nen ?? "windows"]} của ${ten}…`} />
        <TickDong chu="Cấp quyền bảo vệ" trang={!may ? "sau" : may.baoVe === "day_du" ? "xong" : "cho"}
          phu={!may ? "Sau khi ghép xong" : may.baoVe === "day_du" ? "Bảo vệ đầy đủ" : "Bộ lọc web, chặn cài đặt, chống gỡ…"} />
      </The>
    </Man>
  );
}
