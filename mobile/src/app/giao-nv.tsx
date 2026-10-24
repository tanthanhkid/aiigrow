// bm-giao-nv: giao nhiệm vụ cho Con (FR-03.01) — Một lần / Hằng ngày / Thử thách (có hạn chót), điểm, bằng chứng, giao cho ai.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh, TEN_NV_TOI_THIEU as TEN_TOI_THIEU } from "@/lib/api";
import { BaoLoi, baoKhiVe, Canh, Chips, ChonMot, Chu, Man, Nut, ONhap, useLam, useTai } from "@/lib/ui";

/** Tên nhiệm vụ tối thiểu (sau trim) — khớp server/lib/nhiem-vu.ts › TEN_NV_TOI_THIEU. */

export default function GiaoNv() {
  const { con: conXem } = useLocalSearchParams<{ con?: string }>();       // Con đang xem ở Trang chủ ⇒ mặc định giao cho đúng Con đó
  const { d } = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const [ten, setTen] = useState("");
  const [kieu, setKieu] = useState<"mot_lan" | "thuong" | "thu_thach">("mot_lan");
  const [diem, setDiem] = useState("20");
  const [han, setHan] = useState("");
  const [loiNhan, setLoiNhan] = useState("");
  const [bc, setBc] = useState<"anh" | "van_ban">("anh");
  const [cho, setCho] = useState<string | null>(null);
  const { lam, loi, dangChay } = useLam();
  const con = d?.con ?? [];
  const giaoCho = cho ?? (conXem && con.some((c) => c.id === conXem) ? conXem : con[0]?.id) ?? "ca_nha";
  const tenGiao = giaoCho === "ca_nha" ? "cả nhà" : con.find((c) => c.id === giaoCho)?.ten ?? "Con";
  const tenNgan = [...ten.trim()].length > 0 && [...ten.trim()].length < TEN_TOI_THIEU;
  const hanDate = /^\d{1,2}\/\d{1,2}$/.test(han) ? (() => { const [dd, mm] = han.split("/").map(Number); const t = new Date(); t.setMonth(mm - 1, dd); t.setHours(21, 0, 0, 0); return t; })() : null;
  const giao = () => lam(async () => {
    await bm.goi("nhiem-vu", { ten, mo_ta: loiNhan.trim(), diem: Number(diem), kieu, bang_chung: bc, giao_cho: giaoCho === "ca_nha" ? null : giaoCho,
      han: kieu !== "thuong" && hanDate ? hanDate.toISOString() : null, toi_da_ngay: kieu === "thuong" ? 1 : null });
    baoKhiVe(`Đã giao «${ten}» cho ${tenGiao}`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="Giao nhiệm vụ"
      day={<><BaoLoi loi={loi} /><Nut chu={`Giao cho ${tenGiao} · ${diem || 0} điểm`} rong dangChay={dangChay} tat={[...ten.trim()].length < TEN_TOI_THIEU || !(Number(diem) >= 1)} bam={giao} /></>}>
      <Canh lv="so-tay" thap tieu={`Giao việc cho ${tenGiao}`} loi="Con nhận thông báo và thấy việc ở khay của máy tính, kèm hạn và số điểm. Con nộp xong, Ba Mẹ duyệt ở Chờ duyệt." />
      <ONhap nhan="Việc cần làm" loi={tenNgan ? `Tên cần ít nhất ${TEN_TOI_THIEU} ký tự để Con hiểu việc cần làm` : null} value={ten} onChangeText={setTen} placeholder="Dọn tủ sách" maxLength={60} />
      <ONhap nhan="Lời nhắn cho Con (không bắt buộc)" value={loiNhan} onChangeText={setLoiNhan} placeholder="Xếp sách theo cỡ, chụp trước và sau" maxLength={300} />
      <ChonMot ds={[{ gia: "mot_lan", chu: "Một lần" }, { gia: "thuong", chu: "Hằng ngày" }, { gia: "thu_thach", chu: "Thử thách" }]} gia={kieu} doi={setKieu} />
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 140 }}><ONhap nhan="Điểm" value={diem} onChangeText={(t) => setDiem(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" /></View>
        {kieu !== "thuong" ? <View style={{ flex: 1, minWidth: 140 }}><ONhap nhan="Hạn (ngày/tháng)" value={han} onChangeText={setHan} placeholder="26/10" /></View> : null}
      </View>
      <View>
        <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Bằng chứng</Chu>
        <Chips ds={[{ gia: "anh", chu: "Ảnh trước/sau" }, { gia: "van_ban", chu: "Viết vài câu" }]} chon={[bc]} doi={setBc} />
      </View>
      <View>
        <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Giao cho</Chu>
        <Chips ds={[...con.map((c) => ({ gia: c.id, chu: c.ten })), ...(con.length > 1 ? [{ gia: "ca_nha", chu: "Cả nhà" }] : [])]} chon={[giaoCho]} doi={setCho} />
      </View>
    </Man>
  );
}
