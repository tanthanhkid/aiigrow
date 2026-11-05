// bm1-ob-ghep / bm1-may-ghep «Ghép máy của X» — MỘT nội dung cho Lần đầu và Ghép thêm máy (Nghi 04/11, L8): mã 6 số hạn 10 phút + QR,
// hàng chia sẻ (Zalo · Tin nhắn · Messenger · Sao chép link · Khác…), «Máy của con ở ngay đây?» (QR to), «Đã gửi, chờ máy của con», «Để sau».
// Link mang sẵn mã gia đình (…/tai?g=…&ma=…) ⇒ trang tải tự ghép; mã 6 số là dự phòng. Không chọn loại máy (trang tải tự nhận).
// Tham số: con, giong (= «Cài giống máy trước»: id máy), nguon = lan-dau | them, moi = 1 (bắt buộc lấy mã mới).
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { KHOI, MEN } from "@/lib/clay";
import { layMaGhep, xemGhep, type KqGhep } from "@/lib/ghep-may";
import { DauMan, HangChiaSe, LienKet, NutHoi } from "@/lib/lan-dau";
import { MaQr } from "@/lib/qr";
import { BangTruot, BaoLoi, Chu, Icon, Icon3D, LopMen, M, Man, Nut, Rob, The, useHoanTac, useLam, useTai } from "@/lib/ui";
import { bm, type ConChiTiet } from "@/lib/api";

export default function GhepMay() {
  const p = useLocalSearchParams<{ con?: string; giong?: string; nguon?: string; moi?: string }>();
  const con = p.con ? String(p.con) : null;
  const nguon = p.nguon === "them" ? "them" : "lan-dau";
  const [kq, setKq] = useState<KqGhep | null>(null);
  const [qrTo, setQrTo] = useState(false);
  const { lam, loi } = useLam();
  const { bao, noi } = useHoanTac();
  const { d: c } = useTai(() => (con ? bm.goi<ConChiTiet>(`con/${con}`) : Promise.resolve(null)));
  const ten = c?.ten ?? "con";
  const lay = useCallback((moi: boolean) => lam(async () => setKq(await layMaGhep(con, p.giong ? String(p.giong) : null, moi))), [lam, con, p.giong]);
  useEffect(() => { lay(p.moi === "1"); }, [lay, p.moi]);
  const sangCho = useCallback(() => kq && router.push({ pathname: "/thiet-lap/cho", params: { ma: kq.ma, con: con ?? "", nguon } }), [kq, con, nguon]);
  // Máy mở link là tự ghép — đang ở màn này cũng chuyển thẳng sang «Đã ghép»
  useEffect(() => {
    if (!kq) return;
    const t = setInterval(async () => {
      try {
        const g = await xemGhep(kq.ma);
        if (g.daGhep) { clearInterval(t); router.replace({ pathname: "/thiet-lap/da-ghep", params: { con: g.con ?? con ?? "", may: g.may?.id ?? "", nguon } }); }
      } catch { /* thử lại nhịp sau */ }
    }, 4000);
    return () => clearInterval(t);
  }, [kq, con, nguon]);
  const deSau = () => (nguon === "lan-dau" ? router.replace({ pathname: "/thiet-lap/xong", params: { con: con ?? "" } }) : router.canGoBack() ? router.back() : router.replace("/may"));
  return (
    <Man noi={noi} dau={<DauMan tieu={`Ghép máy của ${ten}`} ve={nguon === "them" ? "/may" : "/thiet-lap/gio"} phai={<NutHoi />} />}
      day={<>
        <BaoLoi loi={loi} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M.chinh }} />
          <Chu kieu="dam" co={13} mau={M.chinhInk}>Gửi xong, máy con mở link là tự ghép</Chu>
        </View>
        <Nut chu="Đã gửi, chờ máy của con" rong tat={!kq} bam={sangCho} />
        <LienKet chu="Để sau" bam={deSau} />
      </>}>
      <View style={{ borderRadius: 32, backgroundColor: "#dcebe6", padding: 16, minHeight: 230, ...KHOI.the }}>
        <LopMen men={MEN.vien} bo={32} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Rob ten="cho" co={110} />
          <Pressable onPress={() => kq && setQrTo(true)} accessibilityRole="button" accessibilityLabel="Phóng to mã QR">
            {kq ? <MaQr noiDung={kq.qr} co={112} /> : <View style={{ width: 112, height: 112, borderRadius: 24, backgroundColor: "#fff" }} />}
          </Pressable>
        </View>
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Chu kieu="dam" co={13.5} mau={M.chu2}>Mã ghép máy</Chu>
          <Chu kieu="rat" co={46} so style={{ letterSpacing: 2, lineHeight: 54 }}>{kq?.maHien ?? "··· ···"}</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon3D ten="dong_ho_cat" co={18} />
            <Chu kieu="dam" co={13} mau={M.chu2}>{`Mã dùng được ${kq?.hanPhut ?? 10} phút`}</Chu>
          </View>
        </View>
      </View>
      <Chu kieu="rat" co={15} style={{ paddingHorizontal: 4 }}>Gửi link sang máy của con</Chu>
      <The>{kq ? <HangChiaSe chiaSe={kq.chiaSe} bao={bao} /> : <View style={{ height: 76 }} />}</The>
      <Pressable onPress={() => kq && setQrTo(true)} accessibilityRole="button">
        <The>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#eeede9", alignItems: "center", justifyContent: "center" }}><Icon3D ten="camera" co={28} /></View>
            <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>Máy của con ở ngay đây?</Chu><Chu co={13} mau={M.chu3}>Mở camera máy con, quét QR ở trên</Chu></View>
            <Icon ten="phai" mau={M.chu3} co={18} />
          </View>
        </The>
      </Pressable>
      <BangTruot mo={qrTo} dong={() => setQrTo(false)} tieu="Quét bằng camera máy của con">
        <View style={{ alignItems: "center", gap: 10 }}>
          {kq ? <MaQr noiDung={kq.qr} co={260} /> : null}
          <Chu co={14} mau={M.chu2} style={{ textAlign: "center" }}>{`Hoặc mở aiigrow.aiilab.vn/tai trên máy của ${ten} rồi nhập mã ${kq?.maHien ?? ""}`}</Chu>
        </View>
        <Nut chu="Đã quét, chờ máy của con" rong bam={() => { setQrTo(false); sangCho(); }} />
      </BangTruot>
    </Man>
  );
}
