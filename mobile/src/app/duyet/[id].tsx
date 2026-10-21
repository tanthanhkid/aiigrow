// bm-duyet-nv: xem ảnh bằng chứng, chỉnh điểm ±, lời khen, Duyệt (1 chạm) / Cần chụp lại / Từ chối (bm-tu-choi: bảng lý do nhẹ nhàng).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { bm } from "@/lib/api";
import {
  Avt, BangTruot, BaoLoi, ChoTai, Chips, Chu, gioPhut, HaiNut, Icon, M, Man, Nhan, Nut, OChon, ONhap, The, useLam, useTai,
} from "@/lib/ui";

type Luot = { id: string; child_id: string; ten_con: string; ten: string; diem_md: number; trang_thai: string; nop_luc: string; ghi_chu: string | null;
  nghi_trung: boolean; lamPhut: number | null; lanHomNay: number; toi_da_ngay: number | null };
type Anh = { id: string; mime: string; base64: string; chupLuc: string };

const KHEN = ["Giỏi lắm!", "Cảm ơn con", "Con làm tốt quá", "Mai cố tiếp nhé"];
const LY_DO = [
  { chu: "Ảnh chưa rõ — chụp lại nhé", phu: "Con thấy nút «Chụp lại», nhiệm vụ vẫn mở", boSung: true },
  { chu: "Chưa xong — làm tiếp nhé", phu: "Nộp lại sau khi làm xong", boSung: true },
  { chu: "Không đúng nhiệm vụ", phu: "Đóng nhiệm vụ này, không cộng điểm", boSung: false },
];

export default function DuyetNv() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => ({
    l: await bm.goi<Luot>(`luot/${id}`), anh: (await bm.goi<{ anh: Anh[] }>(`luot/${id}/anh`)).anh,
  }));
  const [diem, setDiem] = useState<number | null>(null);
  const [khen, setKhen] = useState<string>(KHEN[0]);
  const [tuViet, setTuViet] = useState("");
  const [tuChoi, setTuChoi] = useState(false);
  const [lyDo, setLyDo] = useState(0);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Chờ duyệt" }} tieu="Duyệt nhiệm vụ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const l = d.l, dm = diem ?? l.diem_md;
  const loiKhen = khen === "tu_viet" ? tuViet.trim() : khen;
  const duyet = () => lam(async () => {
    await bm.goi(`luot/${id}/duyet`, { diem: dm, loiKhen });
    router.replace({ pathname: "/duyet-xong", params: { luot: id, con: l.child_id, ten: l.ten_con, diem: String(dm), nv: l.ten, khen: loiKhen } });
  }, { hangDoi: true });
  const guiTuChoi = () => lam(async () => {
    await bm.goi(`luot/${id}/tu-choi`, { lyDo: LY_DO[lyDo].chu, boSung: LY_DO[lyDo].boSung });
    setTuChoi(false);
    router.back();
  });
  const daXuLy = l.trang_thai !== "cho_duyet";
  return (
    <Man lui={{ chu: "Chờ duyệt" }} tieu="Duyệt nhiệm vụ" day={daXuLy ? <Nut chu="Về hộp chờ duyệt" rong bam={() => router.back()} /> : (
      <>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Duyệt · +${dm} điểm cho ${l.ten_con}`} ic="tick" rong dangChay={dangChay} bam={duyet} />
        <HaiNut>
          <Nut chu="Cần chụp lại" loai="vien" bam={() => { setLyDo(0); setTuChoi(true); }} />
          <Nut chu="Từ chối" loai="huy" bam={() => { setLyDo(2); setTuChoi(true); }} />
        </HaiNut>
      </>
    )}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avt ten={l.ten_con} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={18}>{l.ten}</Chu>
          <Chu co={13} mau={M.chu3}>{`${l.ten_con} nộp ${gioPhut(l.nop_luc)}${l.lamPhut !== null ? ` · làm trong ${l.lamPhut} phút` : ""} · lần ${l.lanHomNay}${l.toi_da_ngay ? `/${l.toi_da_ngay}` : ""} hôm nay`}</Chu>
        </View>
      </View>
      {daXuLy ? <Nhan loai="xam" chu="Nhiệm vụ này đã được xử lý" /> : null}
      {d.anh.length ? d.anh.map((a) => (
        // Dấu thời gian + nhãn so trùng nằm DƯỚI ảnh (không phủ lên ảnh — chữ trên ảnh thật khó đọc, WCAG 1.4.3 / F104).
        <View key={a.id} style={{ borderRadius: 20, overflow: "hidden", backgroundColor: M.the, borderWidth: 1, borderColor: M.vien }}>
          <Image source={{ uri: `data:${a.mime};base64,${a.base64}` }} style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: "#cfe3e6" }} contentFit="cover"
            accessibilityLabel={`Ảnh ${l.ten_con} chụp lúc ${gioPhut(a.chupLuc)}`} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Chu kieu="dam" co={13} mau={M.chu2} so style={{ flexShrink: 1 }}>{`Chụp lúc ${gioPhut(a.chupLuc)} · trong app`}</Chu>
            <Nhan loai={l.nghi_trung ? "canh" : "ok"} ic={l.nghi_trung ? "canh_bao" : "tick"} chu={l.nghi_trung ? "Giống ảnh đã nộp trước" : "Không trùng ảnh cũ"} />
          </View>
        </View>
      )) : <The dem><Chu mau={M.chu2}>{l.ghi_chu ? `“${l.ghi_chu}”` : "Nhiệm vụ này không có ảnh."}</Chu></The>}
      {d.anh.length && l.ghi_chu ? <The dem><Chu mau={M.chu2}>{`“${l.ghi_chu}”`}</Chu></The> : null}
      {!daXuLy ? (
        <>
          <The dem style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}><Chu kieu="rat">Điểm thưởng</Chu><Chu co={13} mau={M.chu3}>{`Mặc định của nhiệm vụ: ${l.diem_md}`}</Chu></View>
            <Pressable onPress={() => setDiem(Math.max(1, dm - 1))} accessibilityRole="button" accessibilityLabel="Bớt một điểm" style={nutTron}><Icon ten="tru" /></Pressable>
            <Chu kieu="rat" co={24} so style={{ width: 44, textAlign: "center" }}>{dm}</Chu>
            <Pressable onPress={() => setDiem(dm + 1)} accessibilityRole="button" accessibilityLabel="Thêm một điểm" style={nutTron}><Icon ten="cong" /></Pressable>
          </The>
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{`Lời khen gửi ${l.ten_con}`}</Chu>
            <Chips ds={[...KHEN.map((k) => ({ gia: k, chu: k })), { gia: "tu_viet", chu: "Tự viết…" }]} chon={[khen]} doi={setKhen} />
          </View>
          {khen === "tu_viet" ? <ONhap nhan="Lời khen của Ba Mẹ" value={tuViet} onChangeText={setTuViet} maxLength={200} /> : null}
        </>
      ) : null}
      <BangTruot mo={tuChoi} dong={() => setTuChoi(false)} tieu={`${l.ten_con} cần làm gì thêm?`}>
        <View style={{ gap: 8 }}>
          {LY_DO.map((x, i) => <OChon key={x.chu} chon={lyDo === i} bam={() => setLyDo(i)} tieu={x.chu} phu={x.phu} />)}
        </View>
        <Chu co={13} mau={M.chu3}>{`${l.ten_con} không bị trừ điểm. Rob nói với ${l.ten_con} bằng giọng vui.`}</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Gửi cho ${l.ten_con}`} rong dangChay={dangChay} bam={guiTuChoi} />
      </BangTruot>
    </Man>
  );
}

const nutTron = { width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: M.vien2, alignItems: "center", justifyContent: "center" } as const;
