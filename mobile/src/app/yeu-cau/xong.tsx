// Kết quả trả lời lời xin của Con / cho vay sao (thiết kế chốt 15/11 — bm-con-xin/03 them-3wp5ty1o «Đã cho Bảo Anh vay 20 sao», 02 them-1ypcydle «Đã thêm
// YouTube · Tính phút», 04 «Đã không cho»): dấu tick · tiêu đề 2 dòng · câu phụ · thẻ dòng · «Về Hôm nay» / «Hoàn tác».
// params: kieu (vay | mo | khong | mo_khoa), ten, con, phut (số sao vay; mo: 1 = Tính phút), muc, ma, may, grant (khoản vay), no / sao / phutCon (sau vay),
// noTruoc, canh (câu cảnh báo nợ > 1.000 của khoản vay).
//  • vay (#263/#265): «= 20 phút chơi hoặc đổi quà · Sao nhiệm vụ sẽ trả nợ trước», dòng «<Con> đang nợ · Nợ cũ 20 + vay 20 sao · −40 sao», «Đã báo <Con>»;
//    nợ > 1.000 ⇒ dải cảnh báo. «Hoàn tác» = vay/:id/hoan-tac (60 giây, đúng người cho; sao đã tiêu thì máy chủ báo 409).
//  • mo_khoa: Ba Mẹ mở khoá máy theo lời xin (không cho vay, chơi vẫn trừ sao).
// 15/11 (#262, them-1ypcydle): kieu «mo» = «Đã thêm YouTube · Tính phút» — viên «Tính phút · 1 sao = 1 phút xem», «Đổi sang Không tính phút» (danh-sach/doi),
// «Hoàn tác» = bỏ mục khỏi danh sách (danh-sach/bo). phut = 1 ⇒ Tính phút.
import { useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { boKhoiDs, doiNhom, hangCua, napDanhSach, type Nhom } from "@/lib/app-web";
import { BONG, MEN } from "@/lib/clay";
import { quyenToi } from "@/lib/hang-ngay";
import { DaiNhacNo, hoanTacVay, soVN, VienSao } from "@/lib/so-sao";
import { BaoLoi, BieuTron, Chu, gioPhut, Icon, M, Man, Nut, The, useLam, useTai, type TenIcon } from "@/lib/ui";

const veHomNay = () => router.replace("/hom-nay" as never);

function Dong({ ic, tieu, phu, phai, dau }: { ic: TenIcon; tieu: string; phu?: string; phai?: ReactNode; dau?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8, borderTopWidth: dau ? 0 : 1.5, borderTopColor: M.vien }}>
      <BieuTron ic={ic} mau="xam" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15}>{tieu}</Chu>
        {phu ? <Chu co={13} mau={M.chu3}>{phu}</Chu> : null}
      </View>
      {phai}
    </View>
  );
}

export default function XongYeuCau() {
  const p = useLocalSearchParams<{ kieu: string; ten: string; con: string; phut?: string; muc?: string; ma?: string; may?: string; grant?: string; no?: string;
    sao?: string; phutCon?: string; noTruoc?: string; canh?: string }>();
  const phut = Number(p.phut) || 0;
  const [luc] = useState(() => Date.now());          // mốc lúc trả lời — một lần, không đổi khi vẽ lại
  // danh sách chỉ Ba Mẹ sửa được (người trông giúp: máy chủ 403) ⇒ ẩn «Đổi sang…» / «Hoàn tác» của kieu «mo»
  const q0 = useTai(() => (p.kieu === "mo" ? quyenToi() : Promise.resolve("ba_me" as const)));
  const { lam, loi, dangChay } = useLam();
  const [nhom, setNhom] = useState<Nhom>(phut ? "tinh_phut" : "khong_tinh_phut");      // kieu «mo»: nhóm vừa thêm
  const tinh = nhom === "tinh_phut";
  // hàng vừa thêm trong danh sách của Con (đủ mọi định danh) — để đổi nhóm / hoàn tác
  // ưu tiên định danh máy chủ trả (`ma`); không có (máy chủ cũ) ⇒ so tên hiển thị
  const timHang = async () => { const ds = await napDanhSach(p.con); const tat = [...hangCua(ds, "app"), ...hangCua(ds, "web")];
    const ma = (p.ma ?? "").toLowerCase(), k = (p.muc ?? "").toLowerCase();
    const h = (ma ? tat.find((x) => x.muc.some((m) => m.toLowerCase() === ma)) : undefined) ?? tat.find((x) => x.ten.toLowerCase() === k || x.muc.includes(k));
    if (!h) throw new Error("Mục này không còn trong danh sách"); return h; };
  const may = p.may ? p.may.replace(/ của .*$/, "") : null;
  const baoLuc = `${may ? `Trên ${may} · ` : ""}${gioPhut(new Date(luc))}`;
  const hoan = p.kieu === "vay" && p.grant ? () => lam(async () => { await hoanTacVay(p.grant!); router.back(); }) : null;
  const so = (v?: string) => (v !== undefined && v !== "" ? Number(v) : null);
  const no = so(p.no), noTruoc = so(p.noTruoc);
  let tieu: string, dong2: string, phu: string, ds: ReactNode, vien: string | null = null;
  let hoanMo: (() => void) | null = null, doiMo: (() => void) | null = null;
  if (p.kieu === "vay") {
    tieu = `Đã cho ${p.ten}`; dong2 = `vay ${soVN(phut)} sao`;
    phu = `= ${soVN(phut)} phút chơi hoặc đổi quà\nSao nhiệm vụ sẽ trả nợ trước`;
    ds = <>
      {no !== null ? (
        <Dong dau ic="sao" tieu={`${p.ten} đang nợ`} phu={noTruoc ? `Nợ cũ ${soVN(noTruoc)} + vay ${soVN(phut)} sao` : `Vay ${soVN(phut)} sao`}
          phai={<VienSao n={-no} />} />
      ) : null}
      <Dong dau={no === null} ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />
    </>;
  } else if (p.kieu === "mo") {
    tieu = `Đã thêm ${p.muc || "mục này"}`; dong2 = tinh ? "· Tính phút" : "· Không tính phút";
    phu = tinh ? `${p.ten} dùng ${p.muc} sẽ trừ sao của con` : `${p.ten} dùng ${p.muc} thoải mái, không trừ sao`;
    vien = tinh ? "Tính phút · 1 sao = 1 phút xem" : "Không tính phút · vào thoải mái";
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />;
    if (p.con && p.muc && q0.d === "ba_me") {
      doiMo = () => lam(async () => { const moi: Nhom = tinh ? "khong_tinh_phut" : "tinh_phut"; await doiNhom(p.con, await timHang(), moi); setNhom(moi); });
      hoanMo = () => lam(async () => { await boKhoiDs(p.con, await timHang()); router.back(); });
    }
  } else if (p.kieu === "mo_khoa") {
    tieu = "Đã mở khoá máy"; dong2 = `cho ${p.ten}`;
    phu = "Chơi app «Tính phút» vẫn trừ sao · 1 sao = 1 phút";
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />;
  } else {
    tieu = "Đã không cho"; dong2 = "lần này";
    phu = `${p.ten} vẫn xin lại được khi cần`;
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={`«${p.muc || "Ba Mẹ chưa cho lúc này"}»`} />;
  }
  return (
    <Man day={<>
      <Nut chu="Về Hôm nay" rong bam={veHomNay} />
      {doiMo ? <Nut chu={tinh ? "Đổi sang Không tính phút" : "Đổi sang Tính phút"} rong loai="xanh" tat={dangChay} bam={doiMo} /> : null}
      {hoan ?? hoanMo ? <Nut chu={dangChay ? "Đang hoàn tác…" : "Hoàn tác"} rong loai="vien" tat={dangChay} bam={(hoan ?? hoanMo)!} /> : null}
    </>}>
      <View style={{ alignItems: "center", gap: 6, marginTop: 24 }}>
        <View style={{ width: 88, height: 88, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: M.chinhSoft, boxShadow: BONG.the, ...(MEN.the ? { backgroundImage: MEN.the } : null) }}>
          <Icon ten={p.kieu === "khong" ? "x" : "tick"} co={40} mau={p.kieu === "khong" ? M.chu2 : M.chinhInk} />
        </View>
        <Chu kieu="rat" co={24} style={{ textAlign: "center", marginTop: 8 }}>{`${tieu}\n${dong2}`}</Chu>
        {phu ? <Chu kieu="dam" co={15} mau={M.chu2} style={{ textAlign: "center" }}>{phu}</Chu> : null}
        {vien ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: tinh ? M.diemSoft : M.chinhSoft }}>
            <Chu kieu="rat" co={12.5} mau={tinh ? M.diemInk : M.chinhInk}>{vien}</Chu>
          </View>
        ) : null}
      </View>
      <The style={{ paddingVertical: 4, marginTop: 8 }}>{ds}</The>
      {p.kieu === "vay" && p.canh ? <DaiNhacNo chu={p.canh} phu="Chỉ nhắc thôi · Ba Mẹ vẫn cho vay được" /> : null}
      <BaoLoi loi={loi} />
    </Man>
  );
}
