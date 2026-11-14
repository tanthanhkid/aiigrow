// bm2-ho-so «Hồ sơ con» (thiết kế chốt 14/11, bm-gio-ho-so/04): chip đổi con (N9); thẻ đầu ảnh + tên + «9 tuổi · 2 máy» + sao, ô «Còn N phút chơi
// · đã 42/60» có vạch + «Xem ›» (⇒ con dùng gì hôm nay); «Cài đặt của X»: Giờ chơi (60 phút/ngày · T7, CN 90 phút), Giờ ngủ, Giờ học, App & web
// («Chặn app & web» / «Mở hết» · Được mở N app), Máy của X (N máy · «iPad cần sửa»), Nhiệm vụ & sao (N việc mỗi ngày); «Về X»: Sửa tên, năm sinh, ảnh ·
// PIN vào máy (Đặt lại) · «Xoá hồ sơ X» (⇒ /ho-so/<id>/xoa, them-canktzlq). Người trông giúp: xem được mọi dòng, không có «Sửa» / «Xoá».
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import {
  CAU_TRONG_GIUP, ChipCon, gioGon, HangViec, mauCon, quyenToi, SaoVien, soAppDuocMo, tuoiCua, cauThu, type ConCt, type LuatDem, type GioChoi, type GioHoc, type NhiemVuMoi,
} from "@/lib/hang-ngay";
import { Avt, ChoTai, Chu, Icon3D, M, Man, NhanMen, Nut, The, useHoanTac, useTai } from "@/lib/ui";
import { saoChep } from "@/lib/luu-tep";
import { BONG, KHOI, MEN } from "@/lib/clay";

type Luat = { ds: LuatDem[] };

export default function HoSoCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [con, g, gio, nv, quyen, luat] = await Promise.all([
      bm.goi<ConCt>(`con/${id}`), bm.goi<GiaDinh>("gia-dinh"),
      bm.goi<GioChoi>(`con/${id}/gio-choi`).catch(() => null),                 // máy chủ cũ chưa có ⇒ dòng Giờ chơi đọc tham số cũ
      bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu").catch(() => null), quyenToi(),
      bm.goi<Luat>("luat").catch(() => null),
    ]);
    // «Được mở N app»: luật Xanh / Vàng (hoc, giai_tri, cho_phep) của con này hoặc chung cả nhà (N3)
    const duocMo = luat ? soAppDuocMo(luat.ds, id) : null;
    return { con, g, gio, nv: nv?.ds.filter((x) => x.bat && (!x.giao_cho || x.giao_cho === id)) ?? null, trongGiup: quyen === "trong_giup", duocMo };
  });
  // M6: mã liên kết AiiRob «<family_id>.<child_id>» — thiết kế 05/11 không nói ⇒ giữ (không có mã thì Ba Mẹ không nối được AiiRob).
  // Tải riêng: lỗi thì chỉ ẩn mục này, không hỏng cả màn.
  const lk = useTai(() => bm.goi<{ ma: string }>(`con/${id}/lien-ket-aiirob`));
  const { bao, noi } = useHoanTac();
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
  return (
    <Man lui={{ chu: "Cả nhà", ve: "/cai-dat" }} tieu="Hồ sơ con" tai={() => { tai(); lk.tai(); }} noi={noi}>
      {d.g.con.length > 1 ? <ChipCon ds={d.g.con} chon={id} doi={(x) => router.replace(`/ho-so/${x.id}` as never)} /> : null}

      <The dem style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avt ten={c.ten} mau={mau} co={64} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Chu kieu="rat" co={22} dong={1}>{c.ten}</Chu>
            <Chu kieu="dam" co={13.5} mau={M.chu3}>{[tuoi ? `${tuoi} tuổi` : null, `${c.may.length} máy`].filter(Boolean).join(" · ")}</Chu>
          </View>
          <NhanMen onPress={() => router.push(`/vi/${id}` as never)} accessibilityRole="button" accessibilityLabel={`Ví sao của ${c.ten}: ${sao} sao`} muc="chip" sang>
            <SaoVien n={sao} />
          </NhanMen>
        </View>
        {/* ô «Còn N phút chơi · đã 42/60» + vạch; «Xem ›» = con dùng gì hôm nay (màn thời gian dùng máy) */}
        <NhanMen onPress={() => router.push(`/da-dung/${id}` as never)} accessibilityRole="button" accessibilityLabel={`Xem ${c.ten} dùng gì hôm nay`} muc="khoi" sang men={MEN.sang}
          style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, backgroundColor: M.chinhSoft }, KHOI.vien]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Chu kieu="dam" co={14} mau={M.chu2} so>{homNay
              ? <>Còn <Chu kieu="rat" co={14} mau={M.chinhInk}>{`${homNay.conPhut} phút`}</Chu>{` chơi · đã ${homNay.daDung}/${homNay.tongPhut}`}</>
              : "Giờ chơi hôm nay"}</Chu>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: "#e3e2de", boxShadow: BONG.lom, overflow: "hidden" }}>
              <View style={{ width: `${homNay && homNay.tongPhut ? Math.round(Math.min(1, homNay.daDung / homNay.tongPhut) * 100) : 0}%`, height: "100%", borderRadius: 4, backgroundColor: M.chinh }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon3D ten="laptop" co={22} mau={M.chu2} />
            <Chu kieu="rat" co={14} mau={M.chinhInk}>Xem ›</Chu>
          </View>
        </NhanMen>
      </The>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>{`Cài đặt của ${c.ten}`}</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="dongho" mau="cam" tieu="Giờ chơi" phu={d.gio ? `${d.gio.quyNgayThuong} phút/ngày · T7, CN ${d.gio.quyCuoiTuan} phút` : "Quỹ phút mỗi ngày"}
          bam={() => router.push(`/gio/${id}` as never)} />
        <HangViec ic="trang_ngu" mau="tim" tieu="Giờ ngủ" phu={`${gioGon(ngu.tu)} – ${gioGon(ngu.den)}`} bam={() => router.push(`/gio/ngu?con=${id}` as never)} />
        <HangViec ic="mu" mau="xanh" tieu="Giờ học" phu={hoc ? `${gioGon(hoc.tu)} – ${gioGon(hoc.den)} · ${cauThu(hoc.thu)}` : "Chưa đặt"}
          bam={() => router.push(`/gio/hoc?con=${id}` as never)} />
        <HangViec ic="khien" mau="lam" tieu="App & web"
          phu={c.cheDoChan === "mo_het" ? "Mở hết · chỉ chặn web người lớn" : `Chặn app & web${d.duocMo !== null ? ` · Được mở ${d.duocMo} app` : ""}`}
          bam={() => router.push(`/app-web?con=${id}` as never)} />
        <HangViec ic="laptop" mau="xam" tieu={`Máy của ${c.ten}`}
          phu={c.may.length ? `${c.may.length} máy${canSua.length ? ` · ${canSua.map((m) => m.ten.replace(/ của .*$/, "")).join(", ")} cần sửa` : " · đang được bảo vệ"}` : "Chưa ghép máy nào"}
          bam={() => router.push(`/may?con=${id}` as never)} />
        <HangViec ic="sao" mau="vang" tieu="Nhiệm vụ & sao"
          phu={d.nv ? (d.nv.length ? `${d.nv.length} việc mỗi ngày` : "Chưa giao việc nào") : `${sao} sao`}
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
          <HangViec dau ic="but" mau="lam" tieu="Sửa tên, năm sinh, ảnh" bam={() => router.push(`/ho-so/sua?id=${id}` as never)} />
          <HangViec ic="mo_khoa" mau="xanh" tieu="PIN vào máy" phu={c.coPin ? undefined : "Chưa đặt · chạm tên là vào thẳng"}
            phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>{c.coPin ? "Đặt lại" : "Đặt PIN"}</Chu>} bam={() => router.push(`/ho-so/${id}/pin` as never)} />
          <HangViec ic="x" mau="do" tieu={`Xoá hồ sơ ${c.ten}`} bam={() => router.push(`/ho-so/${id}/xoa` as never)} />
        </The>
      )}

    </Man>
  );
}
