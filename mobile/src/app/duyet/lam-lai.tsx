// «Nhờ con làm lại» (thiết kế chốt bm-hang-ngay/25 ảnh · 27 ghi âm): vì sao (chip) + lời nhắn nhẹ nhàng → POST luot/:id/lam-lai {lyDo, loiNhan}.
// Con chưa nhận sao, nộp bằng chứng MỚI thì Ba Mẹ duyệt tiếp. Gửi xong ⇒ 28 «Đã nhắn <Con> làm lại» (ManKetQua). `?id=` = lượt nộp.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TextInput, View } from "react-native";
import { BONG } from "@/lib/clay";
import { bm } from "@/lib/api";
import { ManKetQua, type BangChung } from "@/lib/hang-ngay";
import { BaoLoi, ChoTai, Chips, Chu, F, gioPhut, Icon3D, M, Man, Nut, Rob, useLam, useTai } from "@/lib/ui";

type Luot = { id: string; child_id: string; ten_con: string; ten: string; nhom: string; trang_thai: string };

const VI_SAO_ANH = ["Còn bừa một chỗ", "Ảnh mờ, chụp lại", "Chưa làm xong"];
const VI_SAO_AM = ["Nghe chưa rõ", "Chưa đủ 20 phút", "Nhầm bài"];
const NHAN_ANH = "Con làm lại rồi chụp ảnh mới cho Ba Mẹ nhé!";
const NHAN_AM = "Con ghi âm lại giúp Ba Mẹ nhé!";

/** «dọn» / «đọc» / «làm» — động từ theo việc. */
const dongTu = (ten: string) => (/^dọn/i.test(ten) ? "dọn" : /đọc/i.test(ten) ? "đọc" : "làm");

export default function NhoLamLai() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [l, bc] = await Promise.all([bm.goi<Luot>(`luot/${id}`), bm.goi<{ ds: Pick<BangChung, "loai">[] }>(`luot/${id}/bang-chung`).catch(() => ({ ds: [] }))]);
    const vi = await bm.goi<{ soDu: number; sao?: number }>(`con/${l.child_id}/vi`).catch(() => null);
    return { l, ghiAm: bc.ds.some((b) => b.loai === "ghi_am") && !bc.ds.some((b) => b.loai === "anh"), sao: vi ? (vi.sao ?? vi.soDu) : null };
  });
  const [viSao, setViSao] = useState<string | null>(null);
  const [nhan, setNhan] = useState<string | null>(null);
  const [daGui, setDaGui] = useState<{ nhan: string; luc: Date } | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Bằng chứng" }} tieu="Nhờ làm lại"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const l = d.l;
  if (daGui) {
    return (
      <ManKetQua lv="nghi" tieu={`Đã nhắn ${l.ten_con} ${d.ghiAm ? "đọc lại" : "làm lại"}`} loi="Con thấy lời nhắn ngay trên máy. Nộp lại xong, Ba Mẹ nhận thông báo để duyệt."
        dong={[daGui.nhan ? `Lời nhắn đã tới máy con · «${daGui.nhan}» · ${gioPhut(daGui.luc)}` : `Lời nhắn đã tới máy của ${l.ten_con}`,
          `Chưa cộng sao${d.sao !== null ? ` · Ví ${l.ten_con} vẫn ${d.sao} sao` : ""}`]}
        chinh={{ chu: "Xem việc còn chờ duyệt", bam: () => router.replace(`/duyet?con=${l.child_id}` as never) }}
        phu={{ chu: "Về Trang chủ", bam: () => router.replace("/hom-nay" as never) }} />
    );
  }
  const dsViSao = d.ghiAm ? VI_SAO_AM : VI_SAO_ANH;
  const loiNhan = (nhan ?? (d.ghiAm ? NHAN_AM : NHAN_ANH)).trim();
  const gui = () => lam(async () => {
    await bm.goi(`luot/${id}/lam-lai`, { lyDo: viSao ?? undefined, loiNhan: loiNhan || undefined });
    setDaGui({ nhan: loiNhan, luc: new Date() });
  }, { hangDoi: true });
  return (
    <Man lui={{ chu: "Bằng chứng" }} tieu={l.ten} day={<>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Gửi lời nhắn cho ${l.ten_con}`} ic="gui" rong dangChay={dangChay} tat={l.trang_thai !== "cho_duyet"} bam={gui} />
      <Nut chu={d.ghiAm ? "Thôi, quay lại nghe ghi âm" : "Thôi, quay lại xem ảnh"} loai="vien" rong bam={() => router.back()} />
      {/* bài nộp không đúng việc / nộp trùng ⇒ đóng hẳn, không cộng sao (luot/:id/tu-choi, boSung false) — review PR #183 */}
      <Nut chu="Không đúng việc · không tính lần này" loai="huy" rong tat={l.trang_thai !== "cho_duyet"} dangChay={dangChay} bam={() => lam(async () => {
        await bm.goi(`luot/${id}/tu-choi`, { lyDo: viSao ?? "Không đúng nhiệm vụ", boSung: false });
        router.replace((`/duyet?con=${l.child_id}`) as never);
      })} />
    </>}>
      {/* thiết kế 10 .dau: Grow 60 trái + «Nhờ <Con> dọn lại» 20/800 + câu phụ (không bong bóng) */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Rob ten="nghi" co={60} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={20} style={{ lineHeight: 26, letterSpacing: -0.3 }}>{`Nhờ ${l.ten_con} ${dongTu(l.ten)} lại`}</Chu>
          <Chu kieu="dam" co={13} mau="#565c59" style={{ lineHeight: 18 }}>{`Con chưa nhận sao. Nộp ${d.ghiAm ? "ghi âm" : "ảnh"} mới thì Ba Mẹ duyệt tiếp.`}</Chu>
        </View>
      </View>
      {l.trang_thai !== "cho_duyet" ? <BaoLoi loi="Việc này đã được xử lý — có thể người khác trong nhà đã duyệt trước." /> : null}
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Vì sao?</Chu>
        <Chips ds={dsViSao.map((x) => ({ gia: x, chu: x }))} chon={viSao ? [viSao] : []} doi={(v) => setViSao(viSao === v ? null : v)} />
      </View>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Nhắn con</Chu>
        <TextInput value={nhan ?? (d.ghiAm ? NHAN_AM : NHAN_ANH)} onChangeText={setNhan} maxLength={200} multiline accessibilityLabel="Nhắn con"
          style={{ minHeight: 52, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#ecebe7", boxShadow: BONG.lom, fontFamily: F.dam7, fontSize: 15, color: M.chu }} />
      </View>
      {/* thiết kế .ghi: dải đào nhắc nhẹ */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#f9e7d2" }}>
        <Icon3D ten="tim" co={20} /><Chu kieu="dam7" co={13} mau="#8a3c0c" style={{ flex: 1 }}>Nói nhẹ nhàng để con vui vẻ làm lại</Chu>
      </View>
    </Man>
  );
}
