// «Con đang xin» bản «Dịu» (con-dt-xin 02 cdt-yeu-cau, FR-05.02; 15/11 #258 #263 #265): lời xin mới nhất đã có trả lời ⇒ màn kết quả:
//  · vay sao được ⇒ «Mẹ Lan cho vay 20 sao!» (them-0p8dmjan): «Vay 20 sao · = 20 phút chơi hoặc đổi quà · ✓ Đã nhận», «Đang nợ Ba Mẹ 20 sao ·
//    −20 sao», lời nhắn, «Chơi 20 phút» / «Cảm ơn Mẹ Lan ›»;
//  · vay sao chưa được ⇒ «Mẹ Lan chưa cho vay sao lúc này…» (them-5nxwuaxz): «Xin lại» / «Về trang chính» / «Làm nhiệm vụ kiếm sao»;
//  · app / web đã thêm ⇒ «Mẹ Lan đã thêm Roblox!» (them-j4g2mtm8): «Đã vào danh sách · lần sau không cần xin», nhóm «Tính phút» (1 sao = 1 phút ·
//    còn 18 sao = 18 phút chơi) / «Không tính phút»; mở tạm (`ketQua: mo_tam`) ⇒ «Mẹ Lan cho mở Roblox 30 phút»;
//  · app / web chưa thêm ⇒ «Ba Mẹ chưa thêm Roblox» (them-w8po32o6): lý do (không bắt buộc) + «Xin lại» / «Về trang chính».
// Còn chờ ⇒ «Đã gửi Ba Mẹ! Ba Mẹ trả lời là máy báo con ngay.», mỗi lời xin một thẻ («Mở YouTube», «Vay 20 sao» · ⏳ Đang chờ / ✓ Được /
// Chưa cho / Hết hạn); chạm lời đang chờ ⇒ huỷ. Tự hỏi lại mỗi 15 giây khi còn chờ. Máy chủ cũ (chưa có `ketQua`) ⇒ suy từ `trang_thai`.
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { LoiApi } from "@/lib/api";
import { guiXinMo, kid, taiSao, type YcTre } from "@/lib/api-tre";
import { soSao, soVN } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { gioPhut, useLam } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, IcO, LoiD, ManD, NutD, PillD, TamTruot, TheD, TieuD } from "@/lib/ui-diu";
import { NO } from "@/lib/man-con";
import { useTaiTre } from "@/lib/ui-tre";
import { tenMuc } from "@/lib/ten-muc";
import { chuPhut } from "@/lib/chu-phut";

const laVay = (y: YcTre) => y.loai === "vay_sao" || y.loai === "them_gio" || y.loai === "ngoai_le" || y.loai === "ngoai_gio";
const laAppWeb = (y: YcTre) => y.loai === "mo_web" || y.loai === "cai_app";
const soVayCua = (y: YcTre) => Number(y.so_sao ?? y.soSao ?? y.phut ?? 0) || 0;
const tieuYc = (y: YcTre) => laAppWeb(y) ? `Mở ${y.loai === "mo_web" ? (y.gia_tri ? `trang ${y.gia_tri}` : "trang web") : y.gia_tri ? tenMuc(y.gia_tri, (y as { ten_app?: string | null }).ten_app) : "app"}` : laVay(y) ? `Vay ${soVN(soVayCua(y))} sao` : y.gia_tri || y.ly_do;

type Kq = "cho" | "duoc" | "mo_tam" | "chua" | "het_han" | "huy";
const BO_QUA_HOAN_TAC_MS = 60_000;
/** Kết quả lời xin cho Con: `ketQua` mới (#258) hoặc suy từ `trang_thai` (vay sao / máy chủ cũ). «bo_qua» trong 60 giây Ba Mẹ còn Hoàn tác được
 *  ⇒ vẫn «chờ» (như máy chủ `ketQuaYc`), quá 60 giây mới «chưa cho». */
function kqCua(y: YcTre, now: number): Kq {
  if (y.ketQua === "da_them") return "duoc";
  if (y.ketQua === "mo_tam") return "mo_tam";
  if (y.ketQua === "chua_them") return "chua";
  if (y.ketQua === "cho" || y.ketQua === "het_han" || y.ketQua === "huy") return y.ketQua;
  switch (y.trang_thai) {
    case "dong_y": case "da_thuc_thi": return "duoc";
    case "bo_qua": return y.xu_ly_luc && now - Date.parse(y.xu_ly_luc) < BO_QUA_HOAN_TAC_MS ? "cho" : "chua";
    case "tu_choi": return "chua";
    case "het_han": return "het_han";
    case "huy": return "huy";
    default: return "cho";
  }
}
function nhanYc(k: Kq): [string, "cho" | "xanh" | "loi" | "xam"] {
  switch (k) {
    case "duoc": return ["✓ Được", "xanh"];
    case "mo_tam": return ["✓ Mở tạm", "xanh"];
    case "chua": return ["Chưa cho", "loi"];
    case "het_han": return ["Hết hạn", "xam"];
    case "huy": return ["Đã huỷ", "xam"];
    default: return ["⏳ Đang chờ", "cho"];
  }
}
const LY_DO_XIN_LAI = ["Chơi cùng bạn", "Con làm xong bài rồi"];

export default function YeuCau() {
  const { d, loi, matMang, tai } = useTaiTre("yeu-cau", async () => {
    const [s, r] = await Promise.all([taiSao().catch(() => null), kid.goi<{ ds: YcTre[] }>("yeu-cau")]);
    return { s, ds: r.ds, luc: Date.now() };
  });
  const [huy, setHuy] = useState<YcTre | null>(null);
  const [lyDo, setLyDo] = useState<string | null>(null);
  const [daySo, setDaySo] = useState(false);
  const { dangChay, loi: loiLam, lam } = useLam();
  const coCho = !!d?.ds.some((y) => kqCua(y, d.luc) === "cho");
  useEffect(() => {
    if (!coCho) return;
    const t = setInterval(() => { tai(); }, 15_000);
    return () => clearInterval(t);
  }, [coCho, tai]);
  if (!d) return <ManD lui="/tre/nha" tieu="Con đang xin"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const s = d.s;
  if (!d.ds.length) {
    return (
      <ManD lui="/tre/nha" giua day={<NutD chu="Xin phép Ba Mẹ" ic="tin" bam={() => router.replace("/tre/xin-phep")} />}>
        <CamXuc lv="canh-trong" co={140} tieu="Con chưa xin gì cả" phu="Muốn mở app mới hay xin Ba Mẹ cho vay sao? Xin ở đây nhé." />
      </ManD>
    );
  }
  const dau = d.ds[0];
  const kq = kqCua(dau, d.luc);
  const vuaTraLoi = kq === "duoc" || kq === "mo_tam" || kq === "chua";
  const ai = dau.tenNguoiDuyet || "Ba Mẹ";
  const loiBaMe = dau.loiNhan ?? (dau as { loi_nhan?: string | null }).loi_nhan ?? dau.ly_do_tu_choi ?? null;
  const mucXin = dau.gia_tri ?? "app";
  const tenXin = dau.loai === "mo_web" ? (dau.gia_tri ?? "trang") : dau.gia_tri ? tenMuc(dau.gia_tri, (dau as { ten_app?: string | null }).ten_app) : "app";   // #691: không hiện «robloxplayerbeta.exe»
  const xacNhanHuy = () => lam(async () => { await kid.goi(`yeu-cau/${huy!.id}/huy`, {}); setHuy(null); await tai(); });
  // «Xin lại» app / web chưa thêm: lời xin mới cùng mục (kèm lý do nếu chọn)
  const xinLai = () => lam(async () => {
    setDaySo(false);
    try {
      const r = await guiXinMo({ loai: dau.loai === "mo_web" ? "mo_web" : "cai_app", muc: mucXin, lyDo: lyDo ?? "" });
      setLyDo(null);
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
      await tai();
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "bam_don") { setDaySo(true); return; }
      throw e;
    }
  }, { hangDoi: true });
  const loiNhanThe = loiBaMe ? (
    <TheD mong>
      <ChuD kieu="rat" co={13.5} mau={D.chu2}>{ai}</ChuD>
      <ChuD kieu="rat" co={16}>{`«${loiBaMe}»`}</ChuD>
    </TheD>
  ) : null;

  // ---- vay sao: được / chưa được
  if (vuaTraLoi && laVay(dau)) {
    const so = soVayCua(dau);
    // vay để đổi quà (muc_dich qua, gia_tri = id quà): được ⇒ về màn đổi quà đó; xin lại ⇒ giữ mục đích quà
    const quaId = dau.muc_dich === "qua" && dau.gia_tri ? dau.gia_tri : null;
    if (kq === "duoc") {
      return (
        <ManD lui="/tre/nha" day={<>{quaId
          ? <NutD chu="Đổi quà ngay" ic="qua" bam={() => router.replace(`/tre/doi/${quaId}`)} />
          : <NutD chu={`Chơi ${chuPhut(s?.phutCon ?? so)}`} ic="game" bam={() => router.replace("/tre/gio")} />}
          <NutD chu={`Cảm ơn ${ai} ›`} loai="chu" bam={() => router.push("/tre/tin")} /></>}>
          <TieuD chu={`${ai} cho vay ${soVN(so)} sao!`} />
          <TheD>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <ChuD kieu="den" co={17}>{`Vay ${soVN(so)} sao`}</ChuD>
                <ChuD co={14} mau={D.chu2}>{quaId ? "Để đổi quà" : `= ${soVN(so)} phút chơi hoặc đổi quà`}</ChuD>
              </View>
              <PillD chu="✓ Đã nhận" loai="xanh" />
            </View>
          </TheD>
          {s && s.no > 0 ? (
            <TheD mong style={{ backgroundColor: NO.nen, borderColor: NO.vien }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <ChuD kieu="den" co={15} mau={NO.chu}>{`Đang nợ Ba Mẹ ${soVN(s.no)} sao`}</ChuD>
                  <ChuD kieu="rat" co={13} mau={NO.chu}>Sao nhiệm vụ trả nợ trước</ChuD>
                </View>
                <ChuD kieu="den" co={17} mau={NO.chu} so>{`${soVN(s.no)} sao`}</ChuD>
              </View>
            </TheD>
          ) : null}
          {loiNhanThe}
        </ManD>
      );
    }
    return (
      <ManD lui="/tre/nha" day={<><NutD chu="Xin lại" ic="tin"
        bam={() => router.replace(`/tre/them-gio?soSao=${so}${quaId ? `&mucDich=qua&quaId=${encodeURIComponent(quaId)}` : ""}`)} />
        <NutD chu="Về trang chính" loai="phu" bam={() => router.replace("/tre/nha")} />
        <NutD chu="Làm nhiệm vụ kiếm sao" loai="chu" bam={() => router.replace("/tre/nhiem-vu")} /></>}>
        <TieuD chu={`${ai} chưa cho vay sao lúc này. Con làm nhiệm vụ kiếm sao nhé!`} nho />
        <TheD>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <ChuD kieu="den" co={17}>{`Vay ${soVN(so)} sao`}</ChuD>
              <ChuD co={14} mau={D.chu2}>{`Trả lời lúc ${gioPhut(dau.xu_ly_luc ?? dau.created_at)}`}</ChuD>
            </View>
            <PillD chu="Chưa cho" loai="loi" />
          </View>
        </TheD>
        {loiNhanThe}
      </ManD>
    );
  }

  // ---- app / web: đã thêm / mở tạm / chưa thêm
  if (vuaTraLoi && laAppWeb(dau)) {
    if (kq === "chua") {
      return (
        <ManD lui="/tre/nha" day={<><LoiD loi={daySo ? "Con bấm nhanh quá — đợi vài giây rồi xin lại nhé." : loiLam} />
          <NutD chu="Xin lại" ic="tin" bam={xinLai} dangChay={dangChay} />
          <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} /></>}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <IcO ic={dau.loai === "mo_web" ? "web" : "game"} co={72} />
            <ChuD kieu="rat" co={15} mau={D.chu2}>{tenXin}</ChuD>
            <TieuD chu={`Ba Mẹ chưa thêm ${tenXin}`} giua nho />
            <ChuD co={15} mau={D.chu2} giua>{`Ba Mẹ chưa thêm ${tenXin} lúc này.\nCon xin lại sau được nhé!`}</ChuD>
          </View>
          {loiNhanThe}
          <ChuD kieu="den" co={15}>Lý do (không bắt buộc)</ChuD>
          <View style={{ gap: 8 }}>
            {LY_DO_XIN_LAI.map((x) => <NutD key={x} chu={x} loai={lyDo === x ? "chinh" : "phu"} nho bam={() => setLyDo(lyDo === x ? null : x)} />)}
          </View>
        </ManD>
      );
    }
    const tinhPhut = dau.nhom !== "khong_tinh_phut";
    return (
      <ManD lui="/tre/nha" day={<><NutD chu={kq === "mo_tam" || !tinhPhut || !s ? "Về trang chính" : `Mở ${tenXin} · còn ${chuPhut(s.phutCon)}`} ic="game"
        bam={() => router.replace("/tre/nha")} />
        <NutD chu={`Cảm ơn ${ai} ›`} loai="chu" bam={() => router.push("/tre/tin")} /></>}>
        <TieuD chu={kq === "mo_tam" ? `${ai} cho mở ${tenXin}${dau.moTam?.phut ? ` ${chuPhut(dau.moTam.phut)}` : ""}` : `${ai} đã thêm ${tenXin}!`} />
        <TheD>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IcO ic={dau.loai === "mo_web" ? "web" : "game"} co={48} />
            <View style={{ flex: 1 }}>
              <ChuD kieu="den" co={17} dong={1}>{tenXin}</ChuD>
              <ChuD co={13.5} mau={D.chu2}>{kq === "mo_tam" ? "Mở tạm lần này · chưa vào danh sách" : "Đã vào danh sách · lần sau không cần xin"}</ChuD>
            </View>
            <PillD chu={kq === "mo_tam" ? "✓ Mở tạm" : "✓ Đã thêm"} loai="xanh" />
          </View>
        </TheD>
        {kq === "duoc" ? (
          <TheD mong>
            <ChuD kieu="den" co={15}>{tinhPhut ? "Nhóm «Tính phút»" : "Nhóm «Không tính phút»"}</ChuD>
            <ChuD kieu="rat" co={13.5} mau={D.chu2}>{tinhPhut ? `1 sao = 1 phút${s ? ` · ${s.cau.phut}` : ""}` : "Dùng thoải mái, không trừ sao"}</ChuD>
          </TheD>
        ) : null}
        {loiNhanThe}
      </ManD>
    );
  }

  // ---- lời xin khác đã trả lời (máy chủ cũ / «khác») hoặc còn chờ
  const day = kq === "duoc"
    ? <><NutD chu="Về trang chính" bam={() => router.replace("/tre/nha")} />
      <NutD chu={`Cảm ơn ${ai} ›`} loai="chu" bam={() => router.push("/tre/tin")} /></>
    : kq === "chua"
      ? <><NutD chu="Làm nhiệm vụ kiếm sao" ic="sao" bam={() => router.replace("/tre/nhiem-vu")} />
        <NutD chu="Nhắn lại Ba Mẹ" loai="phu" bam={() => router.push("/tre/tin")} />
        <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} /></>
      : <><NutD chu={s ? `Về trang chính · còn ${soSao(s.sao)}` : "Về trang chính"} bam={() => router.replace("/tre/nha")} />
        <NutD chu="Trong lúc chờ: làm nhiệm vụ kiếm sao ›" loai="chu" bam={() => router.push("/tre/nhiem-vu")} /></>;
  return (
    <ManD lui="/tre/nha" day={day}>
      {vuaTraLoi ? (
        <View style={{ gap: 8 }}>
          <TieuD chu={kq === "duoc" ? "Ba Mẹ cho rồi!" : "Ba Mẹ chưa cho"} />
          <TheD>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ChuD kieu="den" co={17} style={{ flex: 1 }}>{tieuYc(dau)}</ChuD>
              <PillD chu={kq === "duoc" ? "✓ Được" : "Chưa cho"} loai={kq === "duoc" ? "xanh" : "loi"} />
            </View>
            <ChuD co={14} mau={D.chu2}>{`Trả lời lúc ${gioPhut(dau.xu_ly_luc ?? dau.created_at)}`}</ChuD>
          </TheD>
          {loiNhanThe}
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <TieuD chu="Con đang xin" />
          <ChuD kieu="rat" co={15} mau={D.xanhD}>Đã gửi Ba Mẹ!</ChuD>
          <ChuD co={14.5} mau={D.chu2}>Ba Mẹ trả lời là máy báo con ngay.</ChuD>
        </View>
      )}
      {d.ds.slice(vuaTraLoi ? 1 : 0, 8).map((y) => {
        const k = kqCua(y, d.luc);
        const [chu, loai] = nhanYc(k);
        return (
          <TheD key={y.id} mong bam={k === "cho" ? () => setHuy(y) : undefined} nhanDoc={`${tieuYc(y)}. ${chu}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ChuD kieu="rat" co={16} dong={1}>{tieuYc(y)}</ChuD>
                <ChuD co={13.5} mau={D.chu2}>{`Gửi lúc ${gioPhut(y.created_at)}`}</ChuD>
              </View>
              <PillD chu={chu} loai={loai} />
            </View>
          </TheD>
        );
      })}
      <TamTruot mo={!!huy} dong={() => setHuy(null)} nhan="Huỷ lời xin này?">
        <ChuD kieu="den" co={18}>Huỷ lời xin này?</ChuD>
        <ChuD co={15} mau={D.chu2}>{huy ? tieuYc(huy) : ""}</ChuD>
        <LoiD loi={loiLam} />
        <NutD chu="Huỷ lời xin" loai="phu" bam={xacNhanHuy} dangChay={dangChay} />
        <NutD chu="Giữ lại" loai="chu" bam={() => setHuy(null)} />
      </TamTruot>
    </ManD>
  );
}
