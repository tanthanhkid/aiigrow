// Trả lời MỘT lời xin của Con (thiết kế chốt 15/11 — bm-con-xin, bảng «Cho vay sao» them-6wjhze1d / them-y1r1eidm):
//  • xin vay sao (vay_sao + them_gio / ngoai_le / ngoai_gio của máy cũ): sao hiện có của con («−20 sao · Đang nợ Ba Mẹ 20 sao»), chọn 10 / 15 / 30 sao
//    (+ số con xin), «vay xong sẽ nợ N sao», dải nhắc khi đang nợ > 1.000 (vẫn cho vay được), lời nhắn ngắn (không bắt buộc — gửi qua `loi-khen`)
//    ⇒ dong-y {soSao}. Không còn «tặng thêm giờ», «trừ sao lấy phút», «ngoại lệ».
//  • app / web chưa có trong danh sách (#262 — PR #279): chưa trả lời ⇒ chuyển sang «Con xin mở» (/yeu-cau-web/:id — Tính phút / Không tính phút / Bỏ qua);
//    đã trả lời ⇒ chỉ báo «Lời xin này đã được trả lời»
// Xử lý xong ⇒ /yeu-cau/xong (lib/hom-nay-xin › denXong).
import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { type ConCt, type YeuCauMoi } from "@/lib/hang-ngay";
import { choXin, denXong, khongChoXin, laAppWeb, laVay, tenMayXin, tieuXin } from "@/lib/hom-nay-xin";
import { cauNhacNo, cauNo, DaiNhacNo, MUC_VAY, saoTu, soVN, VienSao, type SaoCon } from "@/lib/so-sao";
import { Bao, BaoLoi, Canh, Chips, ChoTai, ChonMot, Chu, gioPhut, M, Man, Nut, ONhap, useLam, useTai } from "@/lib/ui";

type ChiTiet = YeuCauMoi & Partial<SaoCon> & { trang_thai: string; soDu: number; laVay?: boolean; soSao?: number | null; mucDich?: "choi" | "qua" | null;
  qua?: { id: string; ten: string; diem: number } | null; xemTruoc?: { nhacNo?: string | null } | null };
const NHAN = ["Nhớ làm nhiệm vụ trả nợ nhé", "Chơi xong nhớ đi tắm", "Hôm nay vay lần cuối nhé"];

export default function XuLyYeuCau() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const y = await bm.goi<ChiTiet>(`yeu-cau/${id}`);
    const ct = await bm.goi<ConCt>(`con/${y.child_id}`).catch(() => null);
    return { y, ct };
  });
  const [chon, setChon] = useState<number | null>(null);
  const [nhan, setNhan] = useState<string | null>(null);
  const [tuViet, setTuViet] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Quay lại" }} tieu="Lời xin của con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const { y } = d;
  const ten = y.ten_con, may = tenMayXin(y, d.ct?.may);
  const vay = laVay(y);
  const sao = saoTu(y.no !== undefined ? y : { soDu: y.soDu });
  const xin = y.soSao ?? y.phut ?? 15;
  const n = chon ?? xin;
  const daXuLy = y.trang_thai !== "cho";
  // lời xin app / web trả lời ở màn «Con xin mở» (Tính phút / Không tính phút / Bỏ qua)
  if (laAppWeb(y) && !daXuLy) return <Redirect href={{ pathname: "/yeu-cau-web/[id]", params: { id: y.id } }} />;
  const nhac = y.xemTruoc?.nhacNo ?? cauNhacNo(ten, sao.no);
  const loiNhan = nhan === "tu_viet" ? tuViet.trim() : nhan;
  const guiNhan = async () => { if (loiNhan) await bm.goi(`con/${y.child_id}/loi-khen`, { noiDung: loiNhan }).catch(() => {}); };
  const choVay = (so: number) => lam(async () => { const k = await choXin(y, may, so, sao); await guiNhan(); denXong(k); });
  const khong = () => lam(async () => { const k = await khongChoXin(y, may, loiNhan || undefined); denXong(k); });

  const nutDay = daXuLy ? <Nut chu="Quay lại" rong bam={() => router.back()} /> : vay ? (
    <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Cho ${ten} vay ${soVN(n)} sao`} rong dangChay={dangChay} bam={() => choVay(n)} />
      <Nut chu="Không cho" loai="huy" rong bam={khong} />
    </>
  ) : (
    <>
      <BaoLoi loi={loiLam} />
      <Nut chu="Không cho" loai="huy" rong bam={khong} />
    </>
  );

  const no = cauNo(sao);
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={laAppWeb(y) ? "Con xin thêm vào danh sách" : vay ? "Con xin vay sao" : "Lời xin của con"} day={nutDay}>
      <Canh lv={laAppWeb(y) ? "nghi" : "cho"} thap tieu={`${ten} ${tieuXin(y).charAt(0).toLowerCase()}${tieuXin(y).slice(1)}${y.qua ? ` «${y.qua.ten}»` : ""}`}
        loi={`${y.ly_do?.trim() ? `Con nói: «${y.ly_do.trim()}» · ` : ""}${gioPhut(y.created_at)}${may ? ` · ${may}` : ""}`} />
      {daXuLy ? <Bao loai="lam" ic="tick" tieu="Lời xin này đã được trả lời" loi="Có thể người khác trong nhà đã trả lời trước." /> : vay ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Chu kieu="dam" co={14} mau={M.chu2}>Đang có</Chu>
            <VienSao s={sao} />
            {no ? <Chu kieu="dam" co={13.5} mau={M.canh}>{no}</Chu> : null}
          </View>
          <Chu kieu="rat" co={15}>{`Cho ${ten} vay bao nhiêu?`}</Chu>
          <ChonMot ds={[...new Set([...MUC_VAY, xin])].sort((a, b) => a - b).map((x) => ({ gia: x, chu: `${x} sao` }))} gia={n} doi={setChon} />
          <Chu kieu="dam" co={14} mau={M.chu2}>{`= ${soVN(n)} phút chơi hoặc đổi quà · vay xong ${ten} sẽ nợ ${soVN(sao.no + n)} sao. Sao nhiệm vụ của con trả nợ trước.`}</Chu>
          {nhac ? <DaiNhacNo chu={nhac} phu="Chỉ nhắc thôi · Ba Mẹ vẫn cho vay được" /> : null}
        </>
      ) : null}
      {!daXuLy && vay ? (
        <View style={{ gap: 6 }}>
          <Chu kieu="rat" co={15}>{`Nhắn ${ten} · không bắt buộc`}</Chu>
          <Chips ds={[...NHAN.map((x) => ({ gia: x, chu: x })), { gia: "tu_viet", chu: "Tự viết…" }]} chon={nhan ? [nhan] : []} doi={(v) => setNhan(v === nhan ? null : v)} />
          {nhan === "tu_viet" ? <ONhap nhan="Lời nhắn của Ba Mẹ" value={tuViet} onChangeText={setTuViet} maxLength={160} /> : null}
          <Chu co={13} mau={M.chu3}>Lời nhắn hiện trên máy con cùng câu trả lời.</Chu>
        </View>
      ) : null}
    </Man>
  );
}
