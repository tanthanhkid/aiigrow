// Màn bằng chứng một việc (thiết kế chốt bm-hang-ngay/24 «Bằng chứng · Dọn phòng» — ảnh vuốt ngang; 26 «Bằng chứng · Đọc sách» — ghi âm):
// «<Việc> · Việc i/n», bằng chứng, «<Con> nộp lúc · N sao», lời con nhắn kèm, «Khen con một câu» (chip + Tự viết),
// «Duyệt · <Con> nhận N sao» (POST luot/:id/duyet {diem, loiKhen}) → duyet-xong · «↺ Nhờ con làm lại» → /duyet/lam-lai.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { bm } from "@/lib/api";
import { BO_CLAY, KHOI } from "@/lib/clay";
import { SaoVien, mauCon, type BangChung, type ChoDuyetMoi } from "@/lib/hang-ngay";
import { NgheGhiAm } from "@/lib/nghe-ghi-am";
import { Avt, Bao, BaoLoi, ChoTai, Chips, Chu, gioPhut, M, Man, Nhan, Nut, ONhap, The, useLam, useTai } from "@/lib/ui";

type Luot = { id: string; child_id: string; ten_con: string; ten: string; diem_md: number; trang_thai: string; nop_luc: string; ghi_chu: string | null;
  nghi_trung: boolean };

const KHEN_ANH = ["Giỏi lắm con!", "Phòng sạch quá", "Ba Mẹ tự hào về con"];
const KHEN_AM = ["Con đọc hay lắm!", "Đọc to, rõ quá", "Ba Mẹ tự hào về con"];

export default function BangChungLuot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [l, bc, cd] = await Promise.all([bm.goi<Luot>(`luot/${id}`), bm.goi<{ ds: BangChung[] }>(`luot/${id}/bang-chung`),
      bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null)]);
    const cuaCon = cd?.nhiemVu.filter((x) => x.child_id === l.child_id) ?? [];
    return { l, bc: bc.ds, thu: cuaCon.findIndex((x) => x.id === id), tong: cuaCon.length };
  });
  const [khen, setKhen] = useState<string | null>(null);
  const [tuViet, setTuViet] = useState("");
  const [trang, setTrang] = useState(0);
  const rong = useWindowDimensions().width - 32;
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Chờ duyệt" }} tieu="Bằng chứng"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const l = d.l;
  const anh = d.bc.filter((b) => b.loai === "anh");
  const am = d.bc.filter((b) => b.loai === "ghi_am");
  const ghiAm = am.length > 0 && !anh.length;
  const dsKhen = ghiAm ? KHEN_AM : KHEN_ANH;
  const chon = khen ?? dsKhen[0];
  const loiKhen = chon === "tu_viet" ? tuViet.trim() : chon;
  const daXuLy = l.trang_thai !== "cho_duyet";
  const nhanAnh = (k: number) => (anh.length === 2 ? (k === 0 ? "Trước" : "Sau") : `Ảnh ${k + 1}`);
  const duyet = () => lam(async () => {
    await bm.goi(`luot/${id}/duyet`, { diem: l.diem_md, loiKhen: loiKhen || undefined });
    router.replace({ pathname: "/duyet-xong", params: { luot: id, con: l.child_id, ten: l.ten_con, diem: String(l.diem_md), nv: l.ten, khen: loiKhen } } as never);
  }, { hangDoi: true });

  return (
    <Man lui={{ chu: "Chờ duyệt", ve: `/duyet?con=${l.child_id}` }} tieu={l.ten}
      phai={d.thu >= 0 && d.tong > 1 ? <Nhan loai="xam" chu={`Việc ${d.thu + 1}/${d.tong}`} /> : undefined}
      day={daXuLy ? <Nut chu="Về việc chờ duyệt" rong bam={() => router.replace(`/duyet?con=${l.child_id}` as never)} /> : (
        <>
          <BaoLoi loi={loiLam} />
          <Nut chu={`Duyệt · ${l.ten_con} nhận ${l.diem_md} sao`} ic="tick" rong dangChay={dangChay} tat={chon === "tu_viet" && !loiKhen} bam={duyet} />
          <Nut chu="↺ Nhờ con làm lại" loai="vien" rong bam={() => router.push(`/duyet/lam-lai?id=${id}` as never)} />
        </>
      )}>
      {daXuLy ? <Bao loai="lam" ic="tick" tieu="Việc này đã được xử lý" loi="Có thể người khác trong nhà đã duyệt trước." /> : null}

      {anh.length ? (
        // ảnh vuốt ngang; nhãn + giờ nằm DƯỚI ảnh (chữ trên ảnh thật khó đọc — WCAG 1.4.3). Khung = thẻ clay: bóng ở lớp ngoài, cắt bo ở lớp trong
        <View style={[{ borderRadius: BO_CLAY.the, backgroundColor: M.the }, KHOI.the]}>
          <View style={{ borderRadius: BO_CLAY.the, overflow: "hidden" }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setTrang(Math.round(e.nativeEvent.contentOffset.x / rong))}
              onScroll={(e) => setTrang(Math.round(e.nativeEvent.contentOffset.x / rong))} scrollEventThrottle={64}>
              {anh.map((a, k) => (
                <Image key={a.id} source={{ uri: `data:${a.mime};base64,${a.base64}` }} style={{ width: rong, aspectRatio: 4 / 5, backgroundColor: "#f6e7cf" }} contentFit="cover"
                  accessibilityLabel={`${nhanAnh(k)} · ${l.ten_con} chụp lúc ${gioPhut(a.chupLuc)}`} />
              ))}
            </ScrollView>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Chu kieu="rat" co={14.5}>{`Ảnh «${nhanAnh(Math.min(trang, anh.length - 1))}» · ${gioPhut(anh[Math.min(trang, anh.length - 1)].chupLuc)}`}</Chu>
                {anh.length > 1 ? (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {anh.map((a, k) => <View key={a.id} style={{ width: k === trang ? 18 : 8, height: 8, borderRadius: 4, backgroundColor: k === trang ? M.chinh : "#d4d5d1" }} />)}
                  </View>
                ) : null}
              </View>
              {anh.length > 1 ? <Chu co={13} mau={M.chu3}>{`Vuốt xem ${anh.length} ảnh · ${anh.map((a, k) => `${nhanAnh(k)} · ${gioPhut(a.chupLuc)}`).join("   ")}`}</Chu> : null}
              {l.nghi_trung ? <Nhan loai="canh" ic="canh_bao" chu="Giống ảnh đã nộp trước" /> : null}
            </View>
          </View>
        </View>
      ) : null}
      {am.map((a) => <NgheGhiAm key={a.id} mime={a.mime} base64={a.base64} nhan={`Ghi âm ${l.ten_con} · ${gioPhut(a.chupLuc)}`} />)}
      {!d.bc.length ? <The><Chu mau={M.chu2}>Việc này con báo xong, không kèm ảnh hay ghi âm.</Chu></The> : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginHorizontal: 4 }}>
        <Chu kieu="dam" co={14} mau={M.chu2} so style={{ flexShrink: 1 }}>{`${l.ten_con} nộp lúc ${gioPhut(l.nop_luc)}`}</Chu>
        <SaoVien n={l.diem_md} />
      </View>

      {l.ghi_chu ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <Avt ten={l.ten_con} mau={mauCon(null)} co={36} />
          <View style={[{ flex: 1, padding: 14, borderRadius: 22, borderBottomLeftRadius: 8, backgroundColor: M.the }, KHOI.nho]}>
            <Chu co={15}>{`«${l.ghi_chu}»`}</Chu>
            <Chu co={12.5} mau={M.chu3}>{`${l.ten_con} nhắn kèm`}</Chu>
          </View>
        </View>
      ) : null}

      {!daXuLy ? (
        <>
          <View style={{ gap: 8 }}>
            <Chu kieu="rat" co={15}>Khen con một câu</Chu>
            <Chips ds={[...dsKhen.map((k) => ({ gia: k, chu: k })), { gia: "tu_viet", chu: "+ Tự viết" }]} chon={[chon]} doi={setKhen} />
          </View>
          {chon === "tu_viet" ? <ONhap nhan={`Lời khen gửi ${l.ten_con}`} value={tuViet} onChangeText={setTuViet} maxLength={200} autoFocus /> : null}
        </>
      ) : null}
    </Man>
  );
}
