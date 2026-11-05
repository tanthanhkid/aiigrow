// Trả lời MỘT lời xin của Con (thiết kế chốt 05/11; bố cục bm-duyet 06 «Con xin thêm giờ», 07 «App mới con vừa tải» — chữ «sao»):
//  • thêm giờ: «Ba Mẹ tặng thêm» (không trừ sao, chỉ hôm nay) hoặc «Trừ sao của con» (10 sao = N phút, ví a → b), chọn phút, lời nhắn ngắn
//    (không bắt buộc — gửi kèm lời trả lời qua `loi-khen` của Con) ⇒ dong-y {phut, truDiem}
//  • ngoại lệ (giờ ngủ / Ba Mẹ khoá / giờ học): «Không trừ giờ chơi, không trừ sao», phạm vi cả máy hoặc một app, chọn phút ≤ tối đa ⇒ dong-y {phut}
//  • app / web lạ: «Cho, dùng thoải mái» (Học, luôn) · «Cho, trừ giờ chơi» (Giải trí, luôn) · «Không cho»
// Xử lý xong ⇒ /yeu-cau/xong (lib/hom-nay-xin › denXong).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { type ConCt, type GioChoi, type YeuCauMoi } from "@/lib/hang-ngay";
import { choAppWeb, denXong, khongChoXin, laAppWeb, laThemGio, mucXin, tenMayXin, tieuXin } from "@/lib/hom-nay-xin";
import {
  Bao, BaoLoi, BieuTron, Canh, Chips, ChoTai, ChonMot, Chu, gioPhut, M, Man, Nut, OChon, ONhap, useLam, useTai,
} from "@/lib/ui";

type ChiTiet = YeuCauMoi & { trang_thai: string; sao?: number; soDu: number; phutDoiDuoc?: number };
const NHAN = ["Hôm nay đủ rồi con nhé", "Chơi xong nhớ đi tắm", "Làm bài xong Ba Mẹ cho thêm"];

export default function XuLyYeuCau() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const y = await bm.goi<ChiTiet>(`yeu-cau/${id}`);
    const [ct, gc] = await Promise.all([bm.goi<ConCt>(`con/${y.child_id}`).catch(() => null), bm.goi<GioChoi>(`con/${y.child_id}/gio-choi`).catch(() => null)]);
    return { y, ct, gc };
  });
  const [tru, setTru] = useState(false);
  const [phut, setPhut] = useState<number | null>(null);
  const [nhan, setNhan] = useState<string | null>(null);
  const [tuViet, setTuViet] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Quay lại" }} tieu="Lời xin của con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const { y, gc } = d;
  const ten = y.ten_con, may = tenMayXin(y, d.ct?.may);
  const sao = y.sao ?? y.soDu;
  const toiDaNl = gc?.ngoaiLeToiDaPhut ?? 60;
  // ngoại lệ: kẹp theo «tối đa ngoại lệ» Ba Mẹ đặt — máy chủ dong-y chỉ kiểm 5–240 (review PR #183)
  const p0 = phut ?? y.phut ?? 15, p = y.loai === "ngoai_le" || y.loai === "ngoai_gio" ? Math.min(p0, toiDaNl) : p0;
  const tyLe = gc?.phut10Sao ?? 10;
  const saoCan = Math.ceil((p * 10) / tyLe);
  const daXuLy = y.trang_thai !== "cho";
  const loiNhan = nhan === "tu_viet" ? tuViet.trim() : nhan;
  const guiNhan = async () => { if (loiNhan) await bm.goi(`con/${y.child_id}/loi-khen`, { noiDung: loiNhan }).catch(() => {}); };
  const cho = (soPhut: number) => lam(async () => {
    const r = await bm.goi<{ grantId?: string }>(`yeu-cau/${id}/dong-y`, laThemGio(y) ? { phut: soPhut, truDiem: tru } : { phut: soPhut });
    await guiNhan();
    denXong(laThemGio(y) ? { kieu: "them_gio", ten, con: y.child_id, phut: soPhut, may, grant: r.grantId }
      : { kieu: "ngoai_le", ten, con: y.child_id, phut: soPhut, muc: mucXin(y), may });
  });
  const khong = () => lam(async () => { const k = await khongChoXin(y, may, loiNhan || undefined); denXong(k); });
  const appWeb = (tinhGio: boolean) => lam(async () => denXong(await choAppWeb(y, may, tinhGio)));

  const nutDay = daXuLy ? <Nut chu="Quay lại" rong bam={() => router.back()} /> : laAppWeb(y) ? (
    <>
      <BaoLoi loi={loiLam} />
      <Nut chu="Cho, dùng thoải mái" ic="tick" rong dangChay={dangChay} bam={() => appWeb(false)} />
      <Nut chu="Cho, trừ giờ chơi" loai="vien" rong bam={() => appWeb(true)} />
      <Nut chu="Không cho" loai="huy" rong bam={khong} />
    </>
  ) : (
    <>
      <BaoLoi loi={loiLam} />
      <Nut chu={laThemGio(y) && tru ? `Cho ${p} phút · trừ ${saoCan} sao` : `Cho ${p} phút`} rong dangChay={dangChay} tat={laThemGio(y) && tru && sao < saoCan} bam={() => cho(p)} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {p !== 15 && (laThemGio(y) || toiDaNl >= 15) ? <Nut chu="Cho 15 phút" loai="vien" dangChay={dangChay} bam={() => cho(15)} tat={laThemGio(y) && tru && sao < Math.ceil(150 / tyLe)} /> : null}
        <Nut chu="Không cho" loai="huy" bam={khong} />
      </View>
    </>
  );

  return (
    <Man lui={{ chu: "Quay lại" }} tieu={laAppWeb(y) ? "Con xin mở" : laThemGio(y) ? "Con xin thêm giờ" : "Con xin mở ngoại lệ"} day={nutDay}>
      <Canh lv={laAppWeb(y) ? "nghi" : "cho"} thap tieu={`${ten} xin ${tieuXin(y).charAt(0).toLowerCase()}${tieuXin(y).slice(1)}`}
        loi={`${y.ly_do?.trim() ? `Con nói: «${y.ly_do.trim()}» · ` : ""}${gioPhut(y.created_at)}${may ? ` · ${may}` : ""}`} />
      {daXuLy ? <Bao loai="lam" ic="tick" tieu="Lời xin này đã được trả lời" loi="Có thể người khác trong nhà đã trả lời trước." /> : laAppWeb(y) ? (
        <Bao loai="lam" ic="dau_hoi" tieu={`${y.gia_tri} chưa có trong app được phép`}
          loi="«Dùng thoải mái» = không tính giờ (hợp app học). «Trừ giờ chơi» = dùng trong quỹ phút chơi mỗi ngày." />
      ) : laThemGio(y) ? (
        <>
          {gc ? <Chu co={14.5} mau={M.chu2}>{`Hôm nay đã chơi ${gc.homNay.daDung}/${gc.homNay.tongPhut} phút, còn ${gc.homNay.conPhut} phút.`}</Chu> : null}
          <Chu kieu="rat" co={15}>Cho thêm theo cách nào</Chu>
          <View style={{ gap: 8 }}>
            <OChon chon={!tru} bam={() => setTru(false)} trai={<BieuTron ic="qua" mau="xanh" />} tieu="Ba Mẹ tặng thêm" phu="Không trừ sao · chỉ tính hôm nay" />
            <OChon chon={tru} bam={() => setTru(true)} trai={<BieuTron ic="sao" mau="vang" />} tieu="Trừ sao của con"
              phu={sao >= saoCan ? `10 sao = ${tyLe} phút · ví ${sao} → ${sao - saoCan} sao` : `Cần ${saoCan} sao — con có ${sao} sao`} />
          </View>
          <ChonMot ds={[15, 30, 60].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={[15, 30, 60].includes(p) ? p : (y.phut ?? 15)} doi={setPhut} />
        </>
      ) : (
        <>
          <Bao loai="ok" ic="tick" tieu="Không trừ giờ chơi, không trừ sao" loi={`Mở ${mucXin(y)} tới khi hết số phút này, rồi máy tự khoá lại.`} />
          <ChonMot ds={[15, 30, 60].filter((x) => x <= toiDaNl).map((x) => ({ gia: x, chu: `${x} phút` }))} gia={Math.min(p, toiDaNl)} doi={setPhut} />
        </>
      )}
      {!daXuLy && !laAppWeb(y) ? (
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
