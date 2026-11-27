// «Nhờ con làm lại» (bàn 17/11 them-nxclxlit@v3 ảnh · them-l0saosnz@v3 ghi âm — BẢNG TRƯỢT trên màn bằng chứng; kết quả them-4u3doee9@v3):
// vì sao (chip) + lời nhắn nhẹ nhàng → POST luot/:id/lam-lai {lyDo, loiNhan}. Con chưa nhận sao, nộp bằng chứng MỚI thì Ba Mẹ duyệt tiếp.
// Dùng ở bảng trượt của app/duyet/[id].tsx và màn dự phòng app/duyet/lam-lai.tsx (mở thẳng bằng đường dẫn).
import { useState } from "react";
import { router } from "expo-router";
import { TextInput, View } from "react-native";
import { BONG, KHOI } from "./clay";
import { bm } from "./api";
import { BaoLoi, CanhGiua, Chips, Chu, F, gioPhut, Icon3D, M, Man, Nut, Rob, useLam, type TenIcon } from "./ui";
import { soVN } from "./so-sao";

export type LuotLamLai = { id: string; child_id: string; ten_con: string; ten: string; trang_thai: string; ghi_chu?: string | null };

const VI_SAO_ANH = ["Còn bừa một chỗ", "Ảnh mờ, chụp lại", "Chưa làm xong"];
const VI_SAO_AM = ["Nghe chưa rõ", "Chưa đủ 20 phút", "Nhầm bài"];
const NHAN_ANH = "Con làm lại rồi chụp ảnh mới cho Ba Mẹ nhé!";
const NHAN_AM = "Con ghi âm lại giúp Ba Mẹ nhé!";
const NHAN_VIET = "Con viết lại giúp Ba Mẹ nhé!";
const VI_SAO_VIET = ["Viết chưa rõ ý", "Viết quá ngắn", "Nhầm bài"];

/** «dọn» / «đọc» / «làm» — động từ theo việc. */
export const dongTu = (ten: string) => (/^dọn/i.test(ten) ? "dọn" : /đọc/i.test(ten) ? "đọc" : "làm");

/** Thân bảng «Nhờ <Con> dọn lại»: tiêu đề + câu phụ, Vì sao?, Nhắn con, dải đào nhắc nhẹ, hai nút (+ «Không đúng việc» — review PR #183). */
export function FormLamLai({ l, ghiAm, viet, daGui, huy }: { l: LuotLamLai; ghiAm: boolean; viet?: boolean; daGui: (nhan: string) => void; huy: () => void }) {
  const [viSao, setViSao] = useState<string | null>(null);
  const [nhan, setNhan] = useState<string | null>(null);
  const { lam, loi, dangChay } = useLam();
  const dsViSao = viet ? VI_SAO_VIET : ghiAm ? VI_SAO_AM : VI_SAO_ANH;
  const nhanMd = viet ? NHAN_VIET : ghiAm ? NHAN_AM : NHAN_ANH;
  const loiNhan = (nhan ?? nhanMd).trim();
  const xong = l.trang_thai !== "cho_duyet";
  const gui = () => lam(async () => {
    await bm.goi(`luot/${l.id}/lam-lai`, { lyDo: viSao ?? undefined, loiNhan: loiNhan || undefined });
    daGui(loiNhan);
  }, { hangDoi: true });
  return (
    <View style={{ gap: 12 }}>
      {/* bàn: bản ghi âm (l0saosnz) có Grow 60 bên trái tiêu đề, bản ảnh (nxclxlit) không */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 }}>
        {ghiAm ? <Rob ten="chi" co={60} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={20} style={{ lineHeight: 26, letterSpacing: -0.3 }}>{`Nhờ ${l.ten_con} ${dongTu(l.ten)} lại`}</Chu>
          <Chu kieu="dam" co={13} mau={M.chu3} style={{ lineHeight: 18 }}>{`Con chưa nhận sao. Nộp ${viet ? "bài viết" : ghiAm ? "ghi âm" : "ảnh"} mới thì Ba Mẹ duyệt tiếp.`}</Chu>
        </View>
      </View>
      {xong ? <BaoLoi loi="Việc này đã được xử lý — có thể người khác trong nhà đã duyệt trước." /> : null}
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Vì sao?</Chu>
        <Chips ds={dsViSao.map((x) => ({ gia: x, chu: x }))} chon={viSao ? [viSao] : []} doi={(v) => setViSao(viSao === v ? null : v)} />
      </View>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Nhắn con</Chu>
        <TextInput value={nhan ?? (ghiAm ? NHAN_AM : NHAN_ANH)} onChangeText={setNhan} maxLength={200} multiline accessibilityLabel="Nhắn con"
          style={{ minHeight: 52, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: M.xamSoft, boxShadow: BONG.lom, fontFamily: F.dam7, fontSize: 15, color: M.chu }} />
      </View>
      {/* thiết kế .ghi: dải đào nhắc nhẹ */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: M.canhSoft }}>
        <Icon3D ten="tim" co={20} /><Chu kieu="dam7" co={13} mau={M.canh} style={{ flex: 1 }}>Nói nhẹ nhàng để con vui vẻ làm lại</Chu>
      </View>
      <BaoLoi loi={loi} />
      <Nut chu={`Gửi lời nhắn cho ${l.ten_con}`} ic="gui" ic3d rong dangChay={dangChay} tat={xong} bam={gui} />
      <Nut chu={viet ? "Thôi, quay lại xem bài viết" : ghiAm ? "Thôi, quay lại nghe ghi âm" : "Thôi, quay lại xem ảnh"} loai={ghiAm ? "ma" : "vien"} rong bam={huy} />
      {/* bài nộp không đúng việc / nộp trùng ⇒ đóng hẳn, không cộng sao (luot/:id/tu-choi, boSung false) — review PR #183; bàn không vẽ */}
      <Nut chu="Không đúng việc · không tính lần này" loai="ma" rong tat={xong} dangChay={dangChay} bam={() => lam(async () => {
        await bm.goi(`luot/${l.id}/tu-choi`, { lyDo: viSao ?? "Không đúng nhiệm vụ", boSung: false });
        router.replace(`/duyet?con=${l.child_id}` as never);
      })} />
    </View>
  );
}

/** Kết quả «Đã nhắn <Con> đọc lại» (them-4u3doee9): Grow chỉ tay, tiêu đề + câu, thẻ hai dòng (lời nhắn · Đã gửi / Chưa cộng sao · N sao),
 *  «Xem việc còn chờ duyệt» + nút chữ «Về Hôm nay». */
export function KetQuaLamLai({ tenCon, con, ghiAm, viet, nhan, luc, sao }: { tenCon: string; con: string; ghiAm: boolean; viet?: boolean; nhan: string; luc: Date; sao: number | null }) {
  return (
    <Man day={<>
      <Nut chu="Xem việc còn chờ duyệt" rong bam={() => router.replace(`/duyet?con=${con}` as never)} />
      <Nut chu="Về Hôm nay" loai="ma" rong bam={() => router.replace("/hom-nay" as never)} />
    </>}>
      <CanhGiua lv="chi" tieu={`Đã nhắn ${tenCon} ${viet ? "viết lại" : ghiAm ? "đọc lại" : "làm lại"}`} loi="Con thấy lời nhắn ngay trên máy. Nộp lại xong, Ba Mẹ nhận thông báo để duyệt.">
        <View style={[{ alignSelf: "stretch", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 26, backgroundColor: M.the }, KHOI.the]}>
          <DongKq ic="tin" tieu="Lời nhắn đã tới máy con" phu={nhan ? `«${nhan}» · ${gioPhut(luc)}` : gioPhut(luc)} nhan="Đã gửi" />
          <DongKq ic="sao" tieu="Chưa cộng sao" phu={sao !== null ? `Ví ${tenCon} vẫn ${soVN(sao)} sao` : undefined} nhan={sao !== null ? `${soVN(sao)} sao` : undefined} vang tren />
        </View>
      </CanhGiua>
    </Man>
  );
}

function DongKq({ ic, tieu, phu, nhan, vang, tren }: { ic: TenIcon; tieu: string; phu?: string; nhan?: string; vang?: boolean; tren?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: tren ? 1 : 0, borderTopColor: M.vien }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={24} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={13} mau={M.chu3}>{phu}</Chu> : null}
      </View>
      {nhan ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: vang ? M.diemSoft : M.chinhSoft }}>
          <Chu kieu="rat" co={13} mau={vang ? M.diemInk : M.chinhInk}>{nhan}</Chu>
        </View>
      ) : null}
    </View>
  );
}
