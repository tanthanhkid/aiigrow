// Kết quả trả lời lời xin của Con (thiết kế chốt 14/11 — bm-con-xin/02 «Đã cho mở YouTube», 03 «Đã cho thêm 20 phút», 04 «Đã không cho»):
// dấu tick · tiêu đề 2 dòng · câu phụ · thẻ dòng (Giờ chơi hôm nay 60 + 20 phút = 80 phút / Đã báo <Con> · Trên Laptop · 19:40) · «Về Hôm nay» / «Hoàn tác».
// params: kieu (them_gio | ngoai_le | mo | khong), ten, con, phut, muc, may, grant. «Hoàn tác» chỉ khi có grant (thêm giờ — 60 giây, đúng người cho):
// 15/11 (#262, them-1ypcydle): kieu «mo» = «Đã thêm YouTube · Tính phút» — viên «Tính phút · 1 sao = 1 phút xem», «Đổi sang Không tính phút» (danh-sach/doi),
// «Hoàn tác» = bỏ mục khỏi danh sách (danh-sach/bo). phut = 1 ⇒ Tính phút.
import { useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { boKhoiDs, doiNhom, hangCua, napDanhSach, type Nhom } from "@/lib/app-web";
import { BONG, MEN } from "@/lib/clay";
import { hoanTacThemGio, quyenToi, SaoVien, type QuyCon } from "@/lib/hang-ngay";
import { BaoLoi, BieuTron, Chu, gioPhut, Icon, M, Man, Nut, The, useLam, useTai, type TenIcon } from "@/lib/ui";

const veHomNay = () => router.replace("/hom-nay" as never);

function Dong({ ic, tieu, phu, phai, dau }: { ic: TenIcon; tieu: string; phu?: string; phai?: ReactNode; dau?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8, borderTopWidth: dau ? 0 : 1.5, borderTopColor: "#ecebe7" }}>
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
  const p = useLocalSearchParams<{ kieu: string; ten: string; con: string; phut?: string; muc?: string; ma?: string; may?: string; grant?: string }>();
  const phut = Number(p.phut) || 0;
  const [luc] = useState(() => Date.now());          // mốc lúc trả lời — một lần, không đổi khi vẽ lại
  const { d } = useTai(() => (p.con ? bm.goi<QuyCon>(`con/${p.con}/quy`) : Promise.resolve(null)));
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
  const hoan = p.grant ? () => lam(async () => { await hoanTacThemGio(p.grant!); router.back(); }) : null;
  const q = d?.quy;
  let tieu: string, dong2: string, phu: string, ds: ReactNode, vien: string | null = null;
  let hoanMo: (() => void) | null = null, doiMo: (() => void) | null = null;
  if (p.kieu === "them_gio") {
    tieu = `Đã cho ${p.ten}`; dong2 = `thêm ${phut} phút chơi`;
    phu = q ? `Giờ còn ${q.conPhut} phút · chỉ tính hôm nay` : "Chỉ tính cho hôm nay";
    ds = <>
      {q ? <Dong dau ic="game" tieu="Giờ chơi hôm nay" phu={`${q.quyNgayPhut} + ${q.themPhut} phút`} phai={<Chu kieu="rat" co={15} so>{`${q.tongPhut} phút`}</Chu>} /> : null}
      <Dong dau={!q} ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />
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
  } else if (p.kieu === "ngoai_le") {
    tieu = `Đã cho ${p.ten} mở`; dong2 = `${p.muc || "máy"} ${phut} phút`;
    phu = `${p.muc && p.muc !== "cả máy" ? p.muc : "Máy"} mở được tới ${gioPhut(new Date(luc + phut * 60000))}`;
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />;
  } else {
    tieu = "Đã không cho"; dong2 = "lần này";
    phu = q && q.doiSao.bat && d?.sao ? "" : `${p.ten} vẫn xin lại được khi cần`;
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={`«${p.muc || "Ba Mẹ chưa cho lúc này"}»`} />;
  }
  return (
    <Man day={<>
      <Nut chu="Về Hôm nay" rong bam={veHomNay} />
      {doiMo ? <Nut chu={tinh ? "Đổi sang Không tính phút" : "Đổi sang Tính phút"} rong loai="ngoc" tat={dangChay} bam={doiMo} /> : null}
      {hoan ?? hoanMo ? <Nut chu={dangChay ? "Đang hoàn tác…" : "Hoàn tác"} rong loai="vien" tat={dangChay} bam={(hoan ?? hoanMo)!} /> : null}
    </>}>
      <View style={{ alignItems: "center", gap: 6, marginTop: 24 }}>
        <View style={{ width: 88, height: 88, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: M.chinhSoft, boxShadow: BONG.the, backgroundImage: MEN.the }}>
          <Icon ten={p.kieu === "khong" ? "x" : "tick"} co={40} mau={p.kieu === "khong" ? M.chu2 : M.chinhInk} />
        </View>
        <Chu kieu="rat" co={24} style={{ textAlign: "center", marginTop: 8 }}>{`${tieu}\n${dong2}`}</Chu>
        {p.kieu === "khong" && q && q.doiSao.bat && d?.sao ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Chu kieu="dam" co={15} mau={M.chu2}>Con vẫn đổi được</Chu><SaoVien n={d.sao} nho /><Chu kieu="dam" co={15} mau={M.chu2}>ra phút</Chu>
          </View>
        ) : phu ? <Chu kieu="dam" co={15} mau={M.chu2} style={{ textAlign: "center" }}>{phu}</Chu> : null}
        {vien ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: tinh ? M.diemSoft : M.chinhSoft }}>
            <Chu kieu="rat" co={12.5} mau={tinh ? M.diemInk : M.chinhInk}>{vien}</Chu>
          </View>
        ) : null}
      </View>
      <The style={{ paddingVertical: 4, marginTop: 8 }}>{ds}</The>
      <BaoLoi loi={loi} />
    </Man>
  );
}
