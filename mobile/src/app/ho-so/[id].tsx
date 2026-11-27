// bm2-ho-so «Hồ sơ con» (thiết kế chốt 15/11 #264/#266, bm-gio-ho-so/04): chip đổi con (N9); thẻ đầu ảnh + tên + «9 tuổi · 2 máy» + viên sao (âm = viên
// cảnh báo — lib/so-sao), ô «Hôm nay chơi 42 phút = 42 sao» + «Đang nợ Ba Mẹ 20 sao» + «Xem ›» (⇒ con dùng gì hôm nay); «Cài đặt của X»: «Sao & phút chơi ·
// 1 sao = 1 phút» (⇒ Ví sao — màn Giờ chơi bm2-gio đã bỏ), #302 «Giờ chơi» (giới hạn ngày + mỗi lượt ⇒ /ho-so/<id>/gio-choi), App & web (15/11 #262: bỏ Giờ ngủ, Giờ học)
// («Theo danh sách» / «Mở hết» · Được mở N app), Máy của X (N máy · «iPad cần sửa»), Nhiệm vụ & sao (N việc mỗi ngày); «Về X»: Sửa tên, năm sinh, ảnh ·
// PIN vào máy (Đặt lại) · «Xoá hồ sơ X» chữ đỏ canh giữa (⇒ /ho-so/<id>/xoa, them-canktzlq). #325: theo bm2-ho-so@v22 (thẻ đầu ngọc nhạt). Người trông giúp: xem được mọi dòng, không có «Sửa» / «Xoá».
import { canSuaMay } from "@/lib/trang-thai-may";
import { tomTatGioiHan, type GioiHan } from "@/lib/gioi-han";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import {
  CAU_TRONG_GIUP, HangViec, mauCon, TieuMuc, tenGoi, quyenToi, soAppDuocMo, tuoiCua, type ConCt, type LuatDem, type NhiemVuMoi,
} from "@/lib/hang-ngay";
import { Avt, ChoTai, Chu, Icon, Icon3D, M, Man, NhanMen, Nut, The, useHoanTac, useTai } from "@/lib/ui";
import { saoChep } from "@/lib/luu-tep";
import { HangChonBe } from "@/lib/ui-chung";
import { KHOI, MEN, HERO, KHOI_HERO } from "@/lib/clay";
import { chuPhut } from "@/lib/chu-phut";

type Luat = { ds: LuatDem[] };

export default function HoSoCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [con, g, nv, quyen, luat, gc] = await Promise.all([
      bm.goi<ConCt>(`con/${id}`), bm.goi<GiaDinh>("gia-dinh"),
      bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu").catch(() => null), quyenToi(),
      bm.goi<Luat>("luat").catch(() => null),
      bm.goi<{ gioiHanNgayThuong?: number; gioiHanCuoiTuan?: number; phutMoiLuot?: number }>(`con/${id}/gio-choi`).catch(() => null),
    ]);
    // «Được mở N app»: luật Xanh / Vàng (hoc, giai_tri, cho_phep) của con này hoặc chung cả nhà (N3)
    const duocMo = luat ? soAppDuocMo(luat.ds, id) : null;
    // #302: giới hạn ngày + mỗi lượt (máy chủ cũ không có trường ⇒ ẩn hàng «Giờ chơi»)
    const gioiHan = gc && gc.gioiHanNgayThuong !== undefined
      ? { ngayThuong: gc.gioiHanNgayThuong, cuoiTuan: gc.gioiHanCuoiTuan ?? 0, moiLuot: gc.phutMoiLuot ?? 0 } : null;
    return { con, g, nv: nv?.ds.filter((x) => x.bat && (!x.giao_cho || x.giao_cho === id)) ?? null, trongGiup: quyen === "trong_giup", duocMo, gioiHan };
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
  const cg = d.g.con.find((x) => x.id === id);
  // 1 sao = 1 phút: phút «Tính phút» đã dùng hôm nay (gia-dinh › phutChoi)
  const phutHomNay = cg?.phutChoi ?? null;
  const canSua = c.may.filter(canSuaMay);
  return (
    <Man lui={{ chu: "Cả nhà", ve: "/cai-dat" }} tieu="Hồ sơ con" tai={() => { tai(); lk.tai(); }} noi={noi}>
      {d.g.con.length > 1 ? <HangChonBe ds={d.g.con.map((x) => ({ ...x, ten: tenGoi(x.ten) }))} chon={id} doi={(x) => x && router.replace(`/ho-so/${x.id}` as never)} /> : null}

      {/* thẻ đầu .hs: hero navy (bàn Navy 17/11), ảnh 56 + tên + «9 tuổi · 2 máy» + viên sao; ô «Hôm nay chơi …» nổi trắng */}
      <View style={{ gap: 12, padding: 16, borderRadius: 28, overflow: "hidden", ...KHOI_HERO }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avt ten={c.ten} mau={mau} co={56} con={c} toi />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Chu kieu="rat" co={22} dong={2} mau={HERO.chu}>{c.ten}</Chu>
            <Chu kieu="dam" co={13.5} mau="#E3D9CB">{[tuoi ? `${tuoi} tuổi` : null, `${c.may.length} máy`].filter(Boolean).join(" · ")}</Chu>
          </View>
        </View>
        {/* ô «Hôm nay chơi 42 phút = 42 sao» + dòng nợ (cam); «Xem ›» = con dùng gì hôm nay */}
        <NhanMen onPress={() => router.push(`/da-dung/${id}` as never)} accessibilityRole="button" accessibilityLabel={`Xem ${c.ten} dùng gì hôm nay`} muc="khoi" sang men={MEN.sang}
          style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: M.the }, KHOI.heroThe]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Chu kieu="dam" co={13.5} mau={M.chu2} so>{phutHomNay !== null
              ? <>Hôm nay chơi <Chu kieu="rat" co={20} so>{chuPhut(phutHomNay)}</Chu></>
              : "1 sao = 1 phút chơi"}</Chu>
          </View>
          <View style={{ alignItems: "center", gap: 2, paddingLeft: 10, borderLeftWidth: 1.5, borderLeftColor: M.vien }}>
            <Icon3D ten="laptop" co={26} mau={M.chu2} />
            <Chu kieu="rat" co={13} mau={M.chu2}>Xem ›</Chu>
          </View>
        </NhanMen>
      </View>

      <TieuMuc chu={`Cài đặt của ${tenGoi(c.ten)}`} />
      <The dem style={{ paddingVertical: 4 }}>
        {/* thiết kế .lg: tên mục bên trái, giá trị (1–2 dòng nhỏ) canh phải + › */}
        <HangViec dau ic="dongho" mau="cam" tieu="Sao & phút chơi" phai={<GiaPhai tren="1 sao = 1 phút" />} bam={() => router.push(`/vi/${id}` as never)} />
        {d.gioiHan ? <HangViec ic="dong_ho_cat" mau="cam" tieu="Giờ chơi mỗi ngày" phu={tomTat(d.gioiHan)}
          bam={() => router.push(`/ho-so/${id}/gio-choi` as never)} /> : null}
        <HangViec ic="laptop" mau="xam" tieu={`Máy của ${tenGoi(c.ten)}`}
          phai={<GiaPhai tren={c.may.length ? `${c.may.length} máy` : "Chưa ghép"} duoi={canSua.length ? `${canSua.map((m) => m.ten.replace(/ của .*$/, "")).join(", ")} cần sửa` : undefined} canh={!!canSua.length} />}
          bam={() => router.push(`/may?con=${id}` as never)} />
      </The>

      {lk.d ? (
        <The dem style={{ gap: 10 }}>
          <HangViec dau ic="sach" mau="xanh" tieu="Liên kết AiiRob" phu={`Bấm «Sao chép mã» rồi dán vào AiiRob, bài học đạt sẽ tự cộng sao cho ${c.ten}.`} />
          <Nut chu="Sao chép mã" nho loai="vien" rong bam={() => saoChep(lk.d!.ma).then((ok) => ok && bao("Đã sao chép mã — dán vào AiiRob"))} />
        </The>
      ) : null}

      <TieuMuc chu={`Về ${tenGoi(c.ten)}`} />
      {d.trongGiup ? <Chu co={13.5} mau={M.chu3} style={{ marginHorizontal: 4 }}>{CAU_TRONG_GIUP}</Chu> : (
        <The dem style={{ paddingVertical: 4 }}>
          <HangViec dau ic="but" mau="lam" tieu="Sửa tên, năm sinh, ảnh" bam={() => router.push(`/ho-so/sua?id=${id}` as never)} />
          <HangViec ic="mo_khoa" mau="xanh" tieu="PIN vào máy" phu={c.coPin ? undefined : "Chưa đặt · chạm tên là vào thẳng"}
            phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>{c.coPin ? "Đặt lại" : "Đặt PIN"}</Chu>} bam={() => router.push(`/ho-so/${id}/pin` as never)} />
        </The>
      )}
      {/* .xoa: chữ đỏ canh giữa dưới thẻ «Về X» */}
      {d.trongGiup ? null : (
        <Pressable onPress={() => router.push(`/ho-so/${id}/xoa` as never)} accessibilityRole="button"
          style={{ minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
          <Chu kieu="rat" co={14} mau={M.loi} dong={1}>{`Xoá hồ sơ ${c.ten}`}</Chu>
        </Pressable>
      )}

    </Man>
  );
}

/** Giá trị bên phải hàng cài đặt (thiết kế: 12.5/700 xám, dòng dưới cam khi «cần sửa») + mũi tên. */
/** #658: cùng lời với form «Giờ chơi» (0 = không giới hạn, không ghi «0 phút»). */
const tomTat = (g: GioiHan) => { const t = tomTatGioiHan(g); return t.duoi ? `${t.tren} · ${t.duoi}` : t.tren; };

function GiaPhai({ tren, duoi, canh }: { tren: string; duoi?: string; canh?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "58%" }}>
      <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
        <Chu kieu="dam7" co={12.5} mau={M.chu2} dong={1}>{tren}</Chu>
        {duoi ? <Chu kieu="dam7" co={12.5} mau={canh ? M.canh : M.chu3} dong={1}>{duoi}</Chu> : null}
      </View>
      <Icon ten="phai" mau={M.oNhap} co={18} />
    </View>
  );
}
