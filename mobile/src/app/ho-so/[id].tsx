// bm2-ho-so «Hồ sơ con» (thiết kế chốt 05/11, bm-hang-ngay/15): chip đổi con; đầu màn ảnh + tên + tuổi + sao, tóm tắt hôm nay; mỗi cài đặt MỘT
// dòng có giá trị hiện tại (Giờ chơi, Giờ ngủ, Giờ học, App được dùng, Máy, Nhiệm vụ & sao); sửa / xoá hồ sơ ở cuối. Bỏ PIN (L5).
// Người trông giúp: xem được mọi dòng, không có «Sửa» / «Xoá».
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import {
  CAU_TRONG_GIUP, ChipCon, gioGon, HangViec, mauCon, quyenToi, SaoVien, tuoiCua, cauThu, type ConCt, type GioChoi, type GioHoc, type NhiemVuMoi,
} from "@/lib/hang-ngay";
import { Avt, BangTruot, ChoTai, Chu, M, Man, NhanMen, Nut, The, TickDong, useHoanTac, useTai } from "@/lib/ui";
import { saoChep } from "@/lib/luu-tep";
import { KHOI, MEN } from "@/lib/clay";

export default function HoSoCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [con, g, gio, nv, quyen] = await Promise.all([
      bm.goi<ConCt>(`con/${id}`), bm.goi<GiaDinh>("gia-dinh"),
      bm.goi<GioChoi>(`con/${id}/gio-choi`).catch(() => null),                 // máy chủ cũ chưa có ⇒ dòng Giờ chơi đọc tham số cũ
      bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu").catch(() => null), quyenToi(),
    ]);
    return { con, g, gio, nv: nv?.ds.filter((x) => x.bat && (!x.giao_cho || x.giao_cho === id)) ?? null, trongGiup: quyen === "trong_giup" };
  });
  // M6: mã liên kết AiiRob «<family_id>.<child_id>» — thiết kế 05/11 không nói ⇒ giữ (không có mã thì Ba Mẹ không nối được AiiRob).
  // Tải riêng: lỗi thì chỉ ẩn mục này, không hỏng cả màn.
  const lk = useTai(() => bm.goi<{ ma: string }>(`con/${id}/lien-ket-aiirob`));
  const { bao, noi } = useHoanTac();
  const [xoa, setXoa] = useState(false);
  if (!d) return <Man lui={{ chu: "Cả nhà" }} tieu="Hồ sơ con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.con;
  const thu = Math.max(0, d.g.con.findIndex((x) => x.id === id));
  const mau = mauCon(c.avatar, thu);
  const tuoi = tuoiCua(c.namSinh);
  const sao = c.sao ?? c.soDu;
  const homNay = d.gio?.homNay;
  const canSua = c.may.filter((m) => m.baoVe !== "day_du");
  const hoc = d.gio ? d.gio.gioHoc : (c.lich as { hoc?: GioHoc | null }).hoc ?? null;
  const ngu = d.gio?.gioNgu ?? c.lich.ngu;
  const bo = d.nv?.find((x) => x.bo)?.bo;
  return (
    <Man lui={{ chu: "Cả nhà", ve: "/cai-dat" }} tieu="Hồ sơ con" tai={tai} noi={noi}>
      {d.g.con.length > 1 ? <ChipCon ds={d.g.con} chon={id} doi={(x) => router.replace(`/ho-so/${x.id}` as never)} /> : null}

      <The dem style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avt ten={c.ten} mau={mau} co={64} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Chu kieu="rat" co={22}>{c.ten}</Chu>
            {tuoi ? <Chu co={14} mau={M.chu3}>{`${tuoi} tuổi`}</Chu> : null}
          </View>
          <NhanMen onPress={() => router.push(`/vi/${id}` as never)} accessibilityRole="button" accessibilityLabel={`Ví sao của ${c.ten}: ${sao} sao`} muc="chip" sang>
            <SaoVien n={sao} />
          </NhanMen>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NhanMen onPress={() => router.push(`/man-hinh/${id}` as never)} accessibilityRole="button" muc="khoi" sang men={MEN.sang}
            style={[{ flex: 1, padding: 12, borderRadius: 20, backgroundColor: M.chinhSoft, gap: 2 }, KHOI.vien]}>
            <Chu co={13} mau={M.chinhInk}>Hôm nay đã chơi</Chu>
            <Chu kieu="rat" co={18} so mau={M.chinhInk}>{homNay ? `${homNay.daDung} / ${homNay.tongPhut} phút` : "—"}</Chu>
          </NhanMen>
          <NhanMen onPress={() => router.push(`/may?con=${id}` as never)} accessibilityRole="button" muc="khoi" sang men={MEN.sang}
            style={[{ flex: 1, padding: 12, borderRadius: 20, backgroundColor: canSua.length ? M.canhSoft : M.xamSoft, gap: 2 }, KHOI.vien]}>
            <Chu co={13} mau={canSua.length ? M.canh : M.chu2}>{canSua.length ? `${canSua.length} máy cần sửa` : "Máy của con"}</Chu>
            <Chu kieu="rat" co={18} so mau={canSua.length ? M.canh : M.chu}>{`${c.may.length} máy`}</Chu>
          </NhanMen>
        </View>
      </The>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>{`Cài đặt của ${c.ten}`}</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="dongho" mau="cam" tieu="Giờ chơi" phu={d.gio ? `${d.gio.quyNgayThuong} / ${d.gio.quyCuoiTuan} phút · ngày thường / cuối tuần` : "Quỹ phút mỗi ngày"}
          bam={() => router.push(`/gio/${id}` as never)} />
        <HangViec ic="trang_ngu" mau="tim" tieu="Giờ ngủ" phu={`${gioGon(ngu.tu)} – ${gioGon(ngu.den)}`} bam={() => router.push(`/gio/ngu?con=${id}` as never)} />
        <HangViec ic="mu" mau="xanh" tieu="Giờ học" phu={hoc ? `${gioGon(hoc.tu)} – ${gioGon(hoc.den)} · ${cauThu(hoc.thu)}` : "Chưa đặt"}
          bam={() => router.push(`/gio/hoc?con=${id}` as never)} />
        <HangViec ic="luoi" mau="lam" tieu="App được dùng" phu={c.cheDoChan === "mo_het" ? "Mở hết · chỉ chặn web người lớn" : "Chỉ app được phép"}
          bam={() => router.push(`/app-web?con=${id}` as never)} />
        <HangViec ic="laptop" mau="xam" tieu={`Máy của ${c.ten}`}
          phu={c.may.length ? `${c.may.length} máy${canSua.length ? ` · ${canSua.map((m) => m.ten).join(", ")} cần sửa` : " · đang được bảo vệ"}` : "Chưa ghép máy nào"}
          bam={() => router.push(`/may?con=${id}` as never)} />
        <HangViec ic="sao" mau="vang" tieu="Nhiệm vụ & sao"
          phu={d.nv ? `${bo ? `${bo === "tu_lap" ? "Tự lập" : bo === "viec_nha" ? "Phụ việc nhà" : bo === "hoc_tap" ? "Học tập" : bo === "khoe_manh" ? "Khoẻ mạnh" : bo} · ` : ""}${d.nv.length} việc` : `${sao} sao`}
          bam={() => router.push("/diem-qua")} />
      </The>

      {lk.d ? (
        <The dem style={{ gap: 10 }}>
          <HangViec dau ic="sach" mau="xanh" tieu="Liên kết AiiRob" phu={`Dán mã này vào AiiRob để bài học đạt tự cộng sao cho ${c.ten}`} />
          <Chu kieu="rat" co={14} so mau={M.chu2} style={{ marginHorizontal: 4 }}>{lk.d.ma}</Chu>
          <Nut chu="Sao chép mã" nho loai="vien" rong bam={() => saoChep(lk.d!.ma).then((ok) => ok && bao("Đã sao chép mã — dán vào AiiRob"))} />
        </The>
      ) : null}

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>{`Về ${c.ten}`}</Chu>
      {d.trongGiup ? <Chu co={13.5} mau={M.chu3} style={{ marginHorizontal: 4 }}>{CAU_TRONG_GIUP}</Chu> : (
        <The dem style={{ paddingVertical: 4 }}>
          <HangViec dau ic="but" mau="lam" tieu="Sửa tên, tuổi, ảnh" bam={() => router.push(`/ho-so/sua?id=${id}` as never)} />
          <HangViec ic="x" mau="do" tieu={`Xoá hồ sơ ${c.ten}`} bam={() => setXoa(true)} />
        </The>
      )}

      <BangTruot mo={xoa} dong={() => setXoa(false)} tieu={`Xoá hồ sơ ${c.ten}?`}>
        <Chu co={14.5} mau={M.chu2}>Xoá rồi không lấy lại được.</Chu>
        <View>
          {c.may.length ? <TickDong trang="x" chu={`Gỡ Rob khỏi ${c.may.map((m) => m.ten).join(" và ")} của ${c.ten}`} /> : null}
          <TickDong trang="x" chu={`Mất ${sao} sao và quà đang chờ trao`} />
          <TickDong trang="x" chu="Mất báo cáo, nhiệm vụ, giờ chơi đã đặt" />
        </View>
        {/* Máy chủ chưa có đường xoá hồ sơ Con (05/11) ⇒ nhờ AiiGrow xoá giúp qua chat hỗ trợ — câu mở trong PR M2 */}
        <Chu co={13} mau={M.chu3}>Để tránh xoá nhầm, AiiGrow xoá hồ sơ giúp Ba Mẹ qua chat — gỡ máy của con trước, rồi nhắn AiiGrow.</Chu>
        <Nut chu="Nhờ AiiGrow xoá giúp" loai="huy" rong bam={() => { setXoa(false); router.push("/ho-tro"); }} />
        <Nut chu="Giữ lại" loai="ma" rong bam={() => setXoa(false)} />
      </BangTruot>
    </Man>
  );
}
