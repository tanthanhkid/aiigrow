// Ghép máy Con với Ba Mẹ — bản «Dịu» (con-dt-cai 01–10 + con-dt-khac 02/03, thiết kế chốt 06/11):
// Rob chào → «Máy này chưa ghép» (3 bước) → gõ mã 6 số (bàn phím to, «Mã còn N phút») hoặc quét QR trên máy Ba Mẹ → lỗi: mã chưa đúng
// (còn N lần thử) / mã hết hạn (10 phút) / mất mạng → «Đã ghép» → máy dùng chung: giải thích tên + PIN → cho AiiGrow giữ giờ chơi
// (Thời gian sử dụng / Truy cập dữ liệu sử dụng) → màn Chọn tên (máy khoá). POST /api/device/ghep {ma} hoặc ghep-goi {token} (QR).
import { useEffect, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LoiApi } from "@/lib/api";
import { may, nenMay } from "@/lib/api-tre";
import { GHEP_THU_TOI_DA, loaiLoiGhep, maTuQr, type LoiGhep } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { BanPhim, BuocD, CamXuc, ChuD, IcO, LoiD, ManD, MatMangD, NutD, O6, PillD, TheD, TieuD, useDemNguoc } from "@/lib/ui-diu";
import { RobChao } from "@/lib/man-con";

type Buoc = "chao" | "chua" | "nhap" | "qr" | LoiGhep | "chung" | "quyen" | "quyen_chua";
const MA_PHUT = 10;

export default function Ghep() {
  const p = useLocalSearchParams<{ buoc?: string }>();
  const [buoc, setBuoc] = useState<Buoc>(may.co() ? (p.buoc === "quyen_chua" ? "quyen_chua" : "quyen") : "chao");
  const [ma, setMa] = useState("");
  const [conLan, setConLan] = useState(GHEP_THU_TOI_DA);
  const [dungChung, setDungChung] = useState(false);
  const [tenMay, setTenMay] = useState<string | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  // «Mã còn 9 phút»: đếm từ lúc con mở màn gõ mã (mã Ba Mẹ sống 10 phút)
  const [mocMa, setMocMa] = useState<number | null>(null);
  const conGiay = useDemNguoc(mocMa);

  const dangGui = useRef(false);      // chặn gửi trùng (gõ số thứ 6 + bấm nút cùng lúc)
  const ghep = async (b: { ma?: string; goi?: string }) => {
    if (dangGui.current) return;
    dangGui.current = true;
    setDangChay(true); setLoi(null);
    try {
      const r = b.ma
        ? await may.goi<{ token: string; dungChung?: boolean; childName?: string }>("ghep", { ma: b.ma, nen: nenMay(), tenMay: "AiiGrow Con" })
        : await may.goi<{ token: string; dungChung?: boolean; childName?: string }>("ghep-goi", { token: b.goi, nen: nenMay(), tenMay: "AiiGrow Con" });
      await may.dat(r.token);
      setDungChung(!!r.dungChung);
      setTenMay(r.childName ?? null);
      setBuoc(r.dungChung ? "chung" : "quyen");
    } catch (e) {
      const k = loaiLoiGhep(e instanceof LoiApi ? e.ma : undefined);
      if (k === "sai") setConLan((n) => Math.max(1, n - 1));
      if (k === "khac") setLoi(e instanceof LoiApi ? e.message : "Chưa ghép được — thử lại nhé.");
      else setBuoc(k);
    } finally { dangGui.current = false; setDangChay(false); }
  };
  const moNhap = () => { setMa(""); setMocMa((m) => m ?? Date.now() + MA_PHUT * 60_000); setBuoc("nhap"); };
  const go = (k: string) => {
    if (ma.length >= 6) return;
    const v = ma + k;
    setMa(v);
    if (v.length === 6) ghep({ ma: v });
  };

  switch (buoc) {
    case "chao":
      return <ManD giua day={<NutD chu="Ghép máy với Ba Mẹ" bam={() => setBuoc("chua")} />}><RobChao /></ManD>;

    case "chua":
      return (
        <ManD lui={() => setBuoc("chao")} day={<><NutD chu="Gõ mã 6 số của Ba Mẹ" bam={moNhap} /><NutD chu="Quét QR trên máy Ba Mẹ" loai="phu" ic="tim_kiem" bam={() => setBuoc("qr")} /></>}>
          <TieuD chu="Máy này chưa ghép" />
          <ChuD co={15} mau={D.chu2}>Nhờ Ba Mẹ mở AiiGrow nhé.</ChuD>
          <TheD style={{ gap: 14 }}>
            <BuocD n={1} tieu="Ba Mẹ mở AiiGrow" phu="Bấm «Thêm máy»" />
            <BuocD n={2} tieu="Máy Ba Mẹ hiện mã 6 số" phu={`Mã đổi sau ${MA_PHUT} phút`} />
            <BuocD n={3} tieu="Con gõ mã vào đây" phu="Xong là ghép" cuoi />
          </TheD>
        </ManD>
      );

    case "nhap":
      return (
        <ManD lui={() => setBuoc("chua")} tieu="Gõ mã trên máy Ba Mẹ" day={<NutD chu="Ghép máy này" bam={() => ghep({ ma })} dangChay={dangChay} tat={ma.length < 6} />}>
          <View style={{ gap: 14, paddingTop: 8 }}>
            <O6 gia={ma} />
            {mocMa ? <ChuD kieu="rat" co={14} mau={D.chu2} giua>{conGiay > 0 ? `Mã còn ${Math.ceil(conGiay / 60)} phút` : "Mã có thể đã hết hạn — nhờ Ba Mẹ lấy mã mới"}</ChuD> : null}
            <LoiD loi={loi} />
            <BanPhim go={go} xoa={() => setMa((m) => m.slice(0, -1))} tat={dangChay} nho />
          </View>
        </ManD>
      );

    case "sai":
      return (
        <ManD lui={moNhap} giua day={<><NutD chu="Gõ lại mã" bam={moNhap} /><NutD chu="Quét QR thay" loai="phu" bam={() => setBuoc("qr")} /></>}>
          <CamXuc lv="trong-loi" co={130} tieu="Mã chưa đúng" phu="Con xem lại 6 số trên máy Ba Mẹ nhé." />
          <O6 gia={ma} loi />
          <View style={{ alignSelf: "center" }}><PillD chu={`Còn ${conLan} lần thử`} loai="loi" /></View>
        </ManD>
      );

    case "het_han":
      return (
        <ManD lui={moNhap} day={<><NutD chu="Nhờ Ba Mẹ lấy mã mới" bam={() => { setMocMa(Date.now() + MA_PHUT * 60_000); moNhap(); }} />
          <NutD chu="Quét QR mới" loai="phu" bam={() => setBuoc("qr")} /></>}>
          <CamXuc lv="cho" co={120} tieu="Mã hết hạn rồi" phu={`Mã chỉ dùng được ${MA_PHUT} phút.`} />
          <TheD style={{ gap: 14 }}>
            <BuocD n={1} tieu="Ba Mẹ bấm «Lấy mã mới»" phu="Trong AiiGrow · Thêm máy" />
            <BuocD n={2} tieu="Con gõ mã mới" phu="Xong là ghép" cuoi />
          </TheD>
        </ManD>
      );

    case "mat_mang":
      return (
        <ManD lui={moNhap} giua day={<><NutD chu="Thử ghép lại" bam={() => (ma.length === 6 ? ghep({ ma }) : moNhap())} dangChay={dangChay} />
          <NutD chu="Mã hết hạn? Nhờ Ba Mẹ lấy mã mới" loai="chu" bam={() => setBuoc("het_han")} /></>}>
          <CamXuc lv="trong-loi" co={130} tieu="Chưa ghép được" phu={"Máy chưa có mạng.\nBật Wi‑Fi rồi thử lại nhé."} />
          <MatMangD chu={mocMa && conGiay > 0 ? `Mất mạng · mã còn ${Math.ceil(conGiay / 60)} phút` : "Mất mạng"} />
        </ManD>
      );

    case "khoa":
      return (
        <ManD lui={() => setBuoc("chua")} giua day={<NutD chu="Về màn đầu" loai="phu" bam={() => setBuoc("chua")} />}>
          <CamXuc lv="cho" co={130} tieu="Gõ sai nhiều lần rồi" phu="Đợi 15 phút rồi thử lại, hoặc nhờ Ba Mẹ quét QR nhé." />
        </ManD>
      );

    case "qr":
      return <QuetQr lui={() => setBuoc("chua")} go={moNhap} ghep={ghep} dangChay={dangChay} loi={loi} />;

    case "chung":
      return (
        <ManD lui={() => setBuoc("quyen")} day={<NutD chu="Vào máy dùng chung" bam={() => setBuoc("quyen")} />}>
          <View style={{ alignSelf: "flex-start" }}><PillD chu="Đã ghép" loai="xanh" ic="tick" /></View>
          <TieuD chu="Máy dùng chung" />
          <ChuD co={15} mau={D.chu2}>Mỗi bé vào bằng tên + PIN của mình.</ChuD>
          <TheD style={{ gap: 14 }}>
            <Dong ic="dongho" a="Giờ chơi riêng từng bé" b="Ai vào thì trừ giờ của người đó" />
            <Dong ic="nguoi" a="Chạm tên + nhập PIN" b="PIN 4 số do Ba Mẹ đặt" />
            <Dong ic="khoa" a="Không ai vào thì máy khoá" b="Ba Mẹ mở bằng mã Ba Mẹ" />
          </TheD>
        </ManD>
      );

    case "quyen":
    case "quyen_chua":
      return <Quyen chua={buoc === "quyen_chua"} dungChung={dungChung} tenMay={tenMay} xong={() => router.replace("/tre/chon-ten")} chua_={() => setBuoc("quyen_chua")} lai={() => setBuoc("quyen")} />;
  }
}

const Dong = ({ ic, a, b }: { ic: Parameters<typeof IcO>[0]["ic"]; a: string; b: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
    <IcO ic={ic} co={46} />
    <View style={{ flex: 1 }}><ChuD kieu="rat" co={16}>{a}</ChuD><ChuD co={14} mau={D.chu2}>{b}</ChuD></View>
  </View>
);

/** Cho AiiGrow giữ giờ chơi (cdt-quyen / them-b3prchz2) + «Chưa cho phép» (them-cz5mw9ha). iPhone = Thời gian sử dụng (Apple ID Ba Mẹ);
 *  Android = «Truy cập dữ liệu sử dụng» (app AiiGrow Con bật — mở Cài đặt đúng mục); web (khung Kid) không cần ⇒ đi tiếp. */
function Quyen({ chua, dungChung, tenMay, xong, chua_, lai }: { chua: boolean; dungChung: boolean; tenMay: string | null; xong: () => void; chua_: () => void; lai: () => void }) {
  const ios = Platform.OS === "ios";
  const tenQuyen = ios ? "Thời gian sử dụng" : "Truy cập dữ liệu sử dụng";
  const cuaAi = ios ? "Của Apple" : "Của Android";
  const choPhep = () => {
    if (Platform.OS === "android") Linking.sendIntent("android.settings.USAGE_ACCESS_SETTINGS").catch(() => {}).finally(xong);
    else xong();
  };
  if (chua) {
    return (
      <ManD day={<NutD chu="Nhờ Ba Mẹ cho phép lại" bam={lai} />}>
        <CamXuc lv="trong-loi" co={120} tieu="Chưa giữ được giờ chơi" phu={`Ba Mẹ bấm «Không cho phép» nên AiiGrow chưa đếm giờ.`} />
        <View style={{ alignSelf: "center" }}><PillD chu="Chưa cho phép" loai="loi" /></View>
        <TheD style={{ gap: 14 }}>
          <BuocD n={1} tieu="Bấm nút bên dưới" phu={`Máy hỏi lại ${tenQuyen}`} />
          <BuocD n={2} tieu={ios ? "Ba Mẹ nhập Apple ID" : "Ba Mẹ bật cho AiiGrow Con"} phu="Ba Mẹ tự gõ, con không cần" />
          <BuocD n={3} tieu="Chọn «Cho phép»" phu="Xong là vào màn chính" cuoi />
        </TheD>
      </ManD>
    );
  }
  return (
    <ManD day={<><NutD chu="Cho phép giữ giờ chơi" bam={choPhep} /><NutD chu="Ba Mẹ không cho phép" loai="chu" bam={chua_} /></>}>
      <View style={{ alignSelf: "flex-start" }}><PillD chu="Đã ghép" loai="xanh" ic="tick" /></View>
      <TieuD chu={dungChung ? "Máy dùng chung" : tenMay ? `Điện thoại của ${tenMay}` : "Máy đã ghép"} />
      <ChuD co={15} mau={D.chu2}>Còn 1 bước: cho AiiGrow giữ giờ chơi.</ChuD>
      <TheD style={{ gap: 14 }}>
        <Dong ic="dongho" a={tenQuyen} b={`${cuaAi} · ${dungChung ? "đếm giờ riêng từng bé" : "để đếm giờ chơi"}`} />
        <Dong ic="khien" a="Ba Mẹ xác nhận" b={ios ? "Bằng Apple ID của Ba Mẹ" : "Ba Mẹ bật trong Cài đặt"} />
        <Dong ic="mat" a="Không đọc tin nhắn, ảnh" b="Chỉ đếm giờ và app" />
      </TheD>
      <ChuD kieu="rat" co={14} mau={D.xanhD}>{tenMay && !dungChung ? `Xong thì ${tenMay} chạm tên + nhập PIN để vào máy.` : "Xong thì con chạm tên + nhập PIN để vào máy."}</ChuD>
    </ManD>
  );
}

/** Quét QR trên máy Ba Mẹ (them-z55cy897): camera (app) đọc link cài `…/tai?g=…&ma=…`; web không quét được ⇒ gõ mã 6 số. */
function QuetQr({ lui, go, ghep, dangChay, loi }: { lui: () => void; go: () => void; ghep: (b: { ma?: string; goi?: string }) => void; dangChay: boolean; loi: string | null }) {
  const web = Platform.OS === "web";
  const [quyen, xinQuyen] = useCameraPermissions();
  const [la, setLa] = useState(false);
  const daQuet = useRef(false);
  useEffect(() => { if (!web && quyen && !quyen.granted && quyen.canAskAgain) xinQuyen(); }, [web, quyen, xinQuyen]);
  return (
    <ManD lui={lui} tieu="Quét mã trên máy Ba Mẹ" day={<NutD chu="Gõ mã 6 số thay" loai="phu" bam={go} />}>
      <View style={{ alignSelf: "center", width: 280, height: 280, borderRadius: 28, overflow: "hidden", backgroundColor: "#22303f", alignItems: "center", justifyContent: "center" }}>
        {!web && quyen?.granted ? (
          <CameraView style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={dangChay ? undefined : ({ data }) => {
              if (daQuet.current) return;
              const b = maTuQr(data);
              if (!b) { setLa(true); return; }
              daQuet.current = true;
              ghep(b);
              setTimeout(() => { daQuet.current = false; }, 3000);
            }} />
        ) : <Icon3D ten="tim_kiem" co={72} />}
        <View pointerEvents="none" style={{ width: 200, height: 200, borderRadius: 22, borderWidth: 3, borderColor: "rgba(255,255,255,0.9)" }} />
      </View>
      <ChuD kieu="rat" co={14} mau={D.chu2} giua>{web ? "Máy này không quét được — gõ mã 6 số thay nhé." : la ? "Mã này không phải của AiiGrow — quét mã trong «Thêm máy» nhé." : `Mã đổi sau ${MA_PHUT} phút`}</ChuD>
      {dangChay ? <ChuD kieu="rat" co={14} mau={D.xanhD} giua>Quét được · đang ghép máy này…</ChuD> : null}
      <LoiD loi={loi} />
    </ManD>
  );
}

