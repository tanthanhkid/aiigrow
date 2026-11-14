// Kết quả trả lời lời xin của Con (thiết kế chốt 14/11 — bm-con-xin/02 «Đã cho mở YouTube», 03 «Đã cho thêm 20 phút», 04 «Đã không cho»):
// dấu tick · tiêu đề 2 dòng · câu phụ · thẻ dòng (Giờ chơi hôm nay 60 + 20 phút = 80 phút / Đã báo <Con> · Trên Laptop · 19:40) · «Về Hôm nay» / «Hoàn tác».
// params: kieu (them_gio | ngoai_le | mo | khong), ten, con, phut, muc, may, grant. «Hoàn tác» chỉ khi có grant (thêm giờ — 60 giây, đúng người cho):
// máy chủ chưa có hoàn tác cho «Đã cho mở» / «Đã không cho» ⇒ không hiện nút (ghi lệch trong PR).
import { useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, MEN } from "@/lib/clay";
import { hoanTacThemGio, SaoVien, type QuyCon } from "@/lib/hang-ngay";
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
  const p = useLocalSearchParams<{ kieu: string; ten: string; con: string; phut?: string; muc?: string; may?: string; grant?: string }>();
  const phut = Number(p.phut) || 0;
  const [luc] = useState(() => Date.now());          // mốc lúc trả lời — một lần, không đổi khi vẽ lại
  const { d } = useTai(() => (p.con ? bm.goi<QuyCon>(`con/${p.con}/quy`) : Promise.resolve(null)));
  const { lam, loi, dangChay } = useLam();
  const may = p.may ? p.may.replace(/ của .*$/, "") : null;
  const baoLuc = `${may ? `Trên ${may} · ` : ""}${gioPhut(new Date(luc))}`;
  const hoan = p.grant ? () => lam(async () => { await hoanTacThemGio(p.grant!); router.back(); }) : null;
  const q = d?.quy;
  let tieu: string, dong2: string, phu: string, ds: ReactNode;
  if (p.kieu === "them_gio") {
    tieu = `Đã cho ${p.ten}`; dong2 = `thêm ${phut} phút chơi`;
    phu = q ? `Giờ còn ${q.conPhut} phút · chỉ tính hôm nay` : "Chỉ tính cho hôm nay";
    ds = <>
      {q ? <Dong dau ic="game" tieu="Giờ chơi hôm nay" phu={`${q.quyNgayPhut} + ${q.themPhut} phút`} phai={<Chu kieu="rat" co={15} so>{`${q.tongPhut} phút`}</Chu>} /> : null}
      <Dong dau={!q} ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />
    </>;
  } else if (p.kieu === "ngoai_le" || p.kieu === "mo") {
    tieu = `Đã cho ${p.ten} mở`; dong2 = p.kieu === "ngoai_le" ? `${p.muc || "máy"} ${phut} phút` : `${p.muc}`;
    phu = p.kieu === "ngoai_le" ? `${p.muc && p.muc !== "cả máy" ? p.muc : "Máy"} mở được tới ${gioPhut(new Date(luc + phut * 60000))}`
      : phut ? "Tính vào giờ chơi mỗi ngày của con" : "Dùng thoải mái, không trừ giờ chơi";
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={baoLuc} />;
  } else {
    tieu = "Đã không cho"; dong2 = "lần này";
    phu = q && q.doiSao.bat && d?.sao ? "" : `${p.ten} vẫn xin lại được khi cần`;
    ds = <Dong dau ic="tin" tieu={`Đã báo ${p.ten}`} phu={`«${p.muc || "Ba Mẹ chưa cho lúc này"}»`} />;
  }
  return (
    <Man day={<>
      <Nut chu="Về Hôm nay" rong bam={veHomNay} />
      {hoan ? <Nut chu={dangChay ? "Đang hoàn tác…" : "Hoàn tác"} rong loai="vien" tat={dangChay} bam={hoan} /> : null}
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
      </View>
      <The style={{ paddingVertical: 4, marginTop: 8 }}>{ds}</The>
      <BaoLoi loi={loi} />
    </Man>
  );
}
