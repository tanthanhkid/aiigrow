// bm-ob-ghep (bước 3/5) — biến thể appllama: một câu hướng dẫn + link /tai + mã 6 số to (hạn 15 phút); app tự theo dõi máy đã nhận mã
// + mức bảo vệ (BRD 6.1 bước 4). Push từ bước 2 (lùi được để đổi loại máy). Trạng thái: vòng quay native khi chờ, ✓ khi xong.
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Linking, View } from "react-native";
import { bm, LINK_TAI, type ConChiTiet } from "@/lib/api";
import { saoChep } from "@/lib/luu-tep";
import { layTl } from "@/lib/thiet-lap";
import { useHoanTac, useLam } from "@/lib/ui";
import { BO, C, Ch, GhiChu, haptic, Hang, Khung, LoiTaiCho, Nhom, NutChinh, NutChu, Sym, TienDo, TieuDe } from "@/lib/ob";

const TEN_NEN = { windows: "laptop Windows", mac: "máy Mac", ios: "iPad / iPhone", android: "máy Android" } as const;
const LINK_NGAN = LINK_TAI.replace(/^https:\/\//, "");

export default function ObGhep() {
  const tl = layTl();
  const [ma, setMa] = useState<string | null>(null);
  const [het, setHet] = useState<Date | null>(null);
  const [may, setMay] = useState<ConChiTiet["may"][number] | null>(null);
  const { lam, loi } = useLam();
  const { bao, noi } = useHoanTac();
  const nen = tl.nen ?? "windows";
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
  useEffect(() => { if (may) haptic.ok(); }, [!!may]);     // eslint-disable-line react-hooks/exhaustive-deps
  const ten = tl.tenCon ?? "Con";
  const trangThai = (xong: boolean, dangCho: boolean) =>
    xong ? <Sym ten="checkmark.circle.fill" co={22} /> : dangCho ? <ActivityIndicator /> : <Sym ten="circle.dashed" co={22} mau={C.chu3} />;
  return (
    <Khung noi={noi} dau={<TienDo n={3} tong={5} />} day={<NutChinh chu={may ? "Tiếp" : "Ghép sau, làm tiếp"} bam={() => router.push("/thiet-lap/mau")} />}>
      <StatusBar style="auto" />
      {nen === "windows" ? (
        <>
          <TieuDe tieu={`Ghép laptop của ${ten}`} loi="Trên laptop của Con: vào trang dưới, tải và chạy AiiGrow-Setup.exe rồi nhập mã này." />
          <Nhom chuThich={het ? `Mã hết hạn lúc ${het.toTimeString().slice(0, 5)}.` : "Đang tạo mã…"}>
            <View style={{ paddingVertical: 20, paddingHorizontal: 16, gap: 16, alignItems: "center" }}>
              <View accessible accessibilityLabel={ma ? `Mã ghép ${ma.split("").join(" ")}` : "Đang tạo mã"} style={{ flexDirection: "row", gap: 8, alignSelf: "stretch", justifyContent: "center" }}>
                {(ma ?? "      ").split("").map((c, i) => (
                  <View key={i} style={{ flex: 1, maxWidth: 46, height: 58, borderRadius: BO.o, borderCurve: "continuous", backgroundColor: C.lapNhat, alignItems: "center", justifyContent: "center" }}>
                    <Ch k="title1" so selectable>{c}</Ch>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <NutChu nho ic="arrow.clockwise" chu="Tạo mã mới" bam={tao} />
                <NutChu nho ic="doc.on.doc" chu="Chép link" bam={() => saoChep(LINK_TAI).then((ok) => { if (ok) { haptic.ok(); bao("Đã chép link — dán vào trình duyệt trên máy của Con"); } })} />
              </View>
            </View>
            <Hang trai={<Sym ten="safari" co={22} />} tieu={LINK_NGAN} phu="Mở trang tải trên máy này" phai={<Sym ten="arrow.up.right" co={15} mau={C.chu3} />}
              bam={() => { Linking.openURL(LINK_TAI).catch(() => bao(`Chưa mở được — gõ ${LINK_NGAN} trên trình duyệt`)); }} />
          </Nhom>
        </>
      ) : (
        <>
          <TieuDe tieu={`Bản cho ${TEN_NEN[nen]} sắp có`} loi="Hiện có bản cho laptop Windows. Ba Mẹ có thể quay lại chọn laptop Windows để ghép trước." />
        </>
      )}
      <Nhom tieu="Tiến trình">
        <Hang trai={trangThai(!!may, !may)} tieu="Máy đã nhận mã" phu={may ? may.ten : `Đang chờ ${TEN_NEN[nen]} của ${ten}…`} />
        <Hang trai={trangThai(may?.baoVe === "day_du", !!may && may.baoVe !== "day_du")} tieu="Cấp quyền bảo vệ"
          phu={!may ? "Sau khi ghép xong" : may.baoVe === "day_du" ? "Bảo vệ đầy đủ" : "Bộ lọc web, chặn cài đặt, chống gỡ…"} />
      </Nhom>
      <LoiTaiCho loi={loi} />
      {nen === "windows" ? (
        <GhiChu ic="lock.shield.fill" chu={`Cài xong là chặn luôn: app chưa xếp loại không mở được trên máy của ${ten}, ${ten} bấm «Xin phép» thì Ba Mẹ duyệt trong app. Trình duyệt vẫn dùng được, web lọc theo danh sách của Ba Mẹ. Muốn tạm chỉ theo dõi (không chặn) thì chọn «Chỉ theo dõi» ở thẻ máy.`} />
      ) : null}
    </Khung>
  );
}
