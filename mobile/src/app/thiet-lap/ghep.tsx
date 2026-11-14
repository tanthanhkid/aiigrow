// bm1-ob-ghep / bm1-may-ghep «Ghép máy của X» — MỘT nội dung cho Lần đầu và Ghép thêm máy (thiết kế chốt 14/11 «Mã ghép: hạn 19:50 khớp cảnh»):
// thẻ «Mở app AiiGrow trên máy con, quét mã này» (QR — chạm phóng to) + mã 6 số + «Mã dùng được 10 phút · hết hạn lúc HH:MM»;
// «Hoặc gửi link cho con» — hàng cuộn ngang Zalo · Messenger · Tin nhắn · Email · Telegram · Sao chép + «Thêm…»; gửi xong ⇒ «Đang chờ máy của con»;
// dòng «Đang chờ máy con… ghép xong tự chuyển» (hỏi máy chủ 4 giây/lần), «Để sau, ghép máy sau».
// MỚI 14/11: them-q44uxha5 «Mã đã hết hạn» (mã quá 10 phút — Lấy mã mới / Để sau, vào trang chủ) và them-ytmgijqo «Chưa thấy máy của con»
// (chờ 5 phút chưa ghép — 3 việc cần thử, «Thử lại, chờ máy con» / «Hỏi AiiGrow»).
// Link mang sẵn mã gia đình (…/tai?g=…&ma=…) ⇒ trang tải tự ghép; mã 6 số là dự phòng. Không chọn loại máy (trang tải tự nhận).
// Tham số: con, giong (= «Cài giống máy trước»: id máy), nguon = lan-dau | them, moi = 1 (bắt buộc lấy mã mới).
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { layMaGhep, xemGhep, type KqGhep } from "@/lib/ghep-may";
import { DauMan, DongTrangThai, HangChiaSe, KhoiTrangThaiGhep, LienKet, NutHoi } from "@/lib/lan-dau";
import { MaQr } from "@/lib/qr";
import { xoaTl } from "@/lib/thiet-lap";
import { BangTruot, BaoLoi, Chu, LopMen, M, Man, Nut, useHoanTac, useLam, useTai } from "@/lib/ui";
import { bm, type ConChiTiet } from "@/lib/api";

const CHO_PHUT = 5;
const gioPhut = (ms: number) => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

export default function GhepMay() {
  const p = useLocalSearchParams<{ con?: string; giong?: string; nguon?: string; moi?: string }>();
  const con = p.con ? String(p.con) : null;
  const nguon = p.nguon === "them" ? "them" : "lan-dau";
  const [kq, setKq] = useState<KqGhep | null>(null);
  const [qrTo, setQrTo] = useState(false);
  const [moc, setMoc] = useState(() => Date.now());           // bắt đầu chờ (lấy mã / «Thử lại») — quá 5 phút ⇒ «Chưa thấy máy»
  // hạn mã theo SỐ GIÂY CÒN LẠI máy chủ trả (conGiay) cộng vào đồng hồ máy lúc nhận — không so `het` với đồng hồ máy (máy Ba Mẹ có thể lệch giờ)
  const [hetLuc, setHetLuc] = useState<number | null>(null);
  const [bay, setBay] = useState(() => Date.now());
  const { lam, loi } = useLam();
  const { bao, noi } = useHoanTac();
  const { d: c } = useTai(() => (con ? bm.goi<ConChiTiet>(`con/${con}`) : Promise.resolve(null)));
  const ten = c?.ten ?? "con";
  const lay = useCallback((moi: boolean) => lam(async () => {
    const r = await layMaGhep(con, p.giong ? String(p.giong) : null, moi);
    const h = Date.now() + r.conGiay * 1000;
    setKq(r); setHetLuc(h); setBay(Date.now());
    // mã dùng lại (còn hạn) ⇒ mốc chờ = lúc mã được tạo
    setMoc(Math.min(Date.now(), h - r.hanPhut * 60_000));
  }), [lam, con, p.giong]);
  useEffect(() => { lay(p.moi === "1"); }, [lay, p.moi]);
  // chỉ vẽ lại đúng lúc tới mốc kế (5 phút chờ / hết hạn) — không đếm từng giây (vẽ lại cả QR)
  useEffect(() => {
    if (hetLuc == null) return;
    const ke = [hetLuc, moc + CHO_PHUT * 60_000].filter((x) => x > bay);
    if (!ke.length) return;
    const t = setTimeout(() => setBay(Date.now()), Math.min(...ke) - Date.now() + 50);
    return () => clearTimeout(t);
  }, [hetLuc, moc, bay]);
  const qr = useMemo(() => (kq ? <MaQr noiDung={kq.qr} co={150} /> : <View style={{ width: 150, height: 150 }} />), [kq]);
  const sangCho = useCallback(() => kq && router.push({ pathname: "/thiet-lap/cho", params: { ma: kq.ma, con: con ?? "", nguon } }), [kq, con, nguon]);
  // Máy mở link là tự ghép — đang ở màn này cũng chuyển thẳng sang «Đã ghép». CHỈ khi màn đang hiện: đã sang «Đang chờ» thì màn đó lo.
  useFocusEffect(useCallback(() => {
    if (!kq) return;
    const t = setInterval(async () => {
      try {
        const g = await xemGhep(kq.ma);
        if (!g.daGhep && !g.hetHan) setHetLuc(Date.now() + g.conGiay * 1000);        // đồng bộ lại hạn theo máy chủ
        if (g.daGhep) { clearInterval(t); router.replace({ pathname: "/thiet-lap/da-ghep", params: { con: g.con ?? con ?? "", may: g.may?.id ?? "", nguon } }); }
      } catch { /* thử lại nhịp sau */ }
    }, 4000);
    return () => clearInterval(t);
  }, [kq, con, nguon]));
  const deSau = () => (nguon === "lan-dau" ? router.replace({ pathname: "/thiet-lap/xong", params: { con: con ?? "" } }) : router.canGoBack() ? router.back() : router.replace("/may"));
  const veTrangChu = () => { if (nguon === "lan-dau") { xoaTl(); router.replace("/hom-nay"); } else router.replace("/may"); };
  const lui = () => (router.canGoBack() ? router.back() : router.replace(nguon === "them" ? "/may" : "/thiet-lap/web"));
  const hetHan = !!kq && hetLuc != null && hetLuc <= bay;
  const linkConHan = !!kq && Date.parse(kq.hetGoi) - Date.parse(kq.het) > 0;        // link cài 48 giờ còn sau khi mã 6 số hết (so hai mốc của máy chủ)
  const chuaThay = !!kq && !hetHan && bay - moc >= CHO_PHUT * 60_000;

  if (hetHan) return (
    <Man dau={<DauMan bamLui={lui} />}
      day={<><BaoLoi loi={loi} /><Nut chu={`Lấy mã mới cho ${ten}`} rong bam={() => lay(true)} /><LienKet chu={nguon === "lan-dau" ? "Để sau, vào trang chủ" : "Để sau"} bam={veTrangChu} /></>}>
      <KhoiTrangThaiGhep lv="cho" ic="dong_ho_cat" tieu="Mã đã hết hạn" phu="Mã chỉ dùng được 10 phút">
        <DongTrangThai ic="khien" chu="Mã 6 số cũ không dùng được nữa" phu={`Chưa máy nào ghép vào nhà bằng mã này${linkConHan ? " · link đã gửi vẫn dùng được trong 48 giờ" : ""}`} />
      </KhoiTrangThaiGhep>
    </Man>
  );
  if (chuaThay) return (
    <Man dau={<DauMan bamLui={lui} />}
      day={<><Nut chu="Thử lại, chờ máy con" rong bam={() => setMoc(Date.now())} /><LienKet chu="Hỏi AiiGrow" bam={() => router.push("/ho-tro")} /></>}>
      <KhoiTrangThaiGhep lv="nghi" ic="canh_bao" tieu="Chưa thấy máy của con" phu={`Đã chờ ${CHO_PHUT} phút, máy chưa trả lời`}>
        <Chu kieu="rat" co={15} style={{ paddingHorizontal: 4 }}>Thử một trong 3 việc</Chu>
        <DongTrangThai ic="wifi" chu="Máy con có mạng chưa?" />
        <DongTrangThai ic="tai" chu="Đã cài AiiGrow chưa?" />
        <DongTrangThai ic="dau_hoi" chu="Mã nhập đúng chưa?" phu={kq ? `Mã đang dùng: ${kq.maHien}` : undefined} />
      </KhoiTrangThaiGhep>
    </Man>
  );
  return (
    <Man noi={noi} dau={<DauMan tieu={`Ghép máy của ${ten}`} bamLui={lui} phai={<NutHoi />} />}
      day={<>
        <BaoLoi loi={loi} />
        {/* thiết kế 01/03: viên lõm «● Đang chờ máy con…» rồi nút trắng «Để sau, ghép máy sau» */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 25, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}
          accessibilityLiveRegion="polite">
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#dcebe6", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: M.chinh }} />
          </View>
          <Chu kieu="rat" co={14} mau={M.chinhInk} style={{ flex: 1 }}>Đang chờ máy con… ghép xong tự chuyển</Chu>
        </View>
        <Nut chu="Để sau, ghép máy sau" loai="vien" rong bam={deSau} />
      </>}>
      <View style={{ borderRadius: 32, backgroundColor: "#dcebe6", paddingVertical: 18, paddingHorizontal: 16, alignItems: "center", gap: 6, ...KHOI.the }}>
        <LopMen men={MEN.vien} bo={32} />
        <Chu kieu="rat" co={15} mau={M.chinhInk} style={{ textAlign: "center" }}>Mở app AiiGrow trên máy con, quét mã này</Chu>
        <Pressable onPress={() => kq && setQrTo(true)} accessibilityRole="button" accessibilityLabel="Mã QR ghép máy — chạm để phóng to"
          style={{ padding: 10, borderRadius: 24, backgroundColor: "#fff", ...KHOI.nho }}>
          {qr}
        </Pressable>
        <Chu kieu="rat" co={44} so style={{ letterSpacing: 2, lineHeight: 52 }}>{kq?.maHien ?? "··· ···"}</Chu>
        <Chu kieu="dam" co={13} mau={M.chu2}>{kq && hetLuc ? `Mã dùng được ${kq.hanPhut} phút · hết hạn lúc ${gioPhut(hetLuc)}` : "Đang lấy mã…"}</Chu>
      </View>
      <View style={{ paddingHorizontal: 4 }}>
        <Chu kieu="rat" co={15}>Hoặc gửi link cho con</Chu>
        <Chu co={12} mau={M.chu3}>Vuốt ngang để xem thêm · «Thêm…» gửi qua mọi app</Chu>
      </View>
      {/* hàng cuộn ngang: ô ló khỏi mép là chủ ý (vuốt xem thêm) ⇒ nền phẳng, không làm thẻ clay (cổng LE-THE đo lề trong thẻ) */}
      <View style={{ borderRadius: 24, backgroundColor: M.the, paddingVertical: 10, paddingLeft: 12, overflow: "hidden" }}>
        {kq ? <HangChiaSe chiaSe={kq.chiaSe} bao={bao} daGui={sangCho} /> : <View style={{ height: 76 }} />}
      </View>
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
