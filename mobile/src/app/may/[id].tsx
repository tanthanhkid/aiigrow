// Chi tiết một máy (thiết kế chốt 15/11, #267 một máy nhiều Con): bm2-may-m1 «Máy cả nhà» (bảo vệ đủ) · bm2-may-m2 «iPad của Bảo Minh» (chưa bảo vệ) ·
// them-tmezw761 «Khoá <máy>?» (khoá theo máy) · them-sll7clha «Khoá máy <bé>?» (khoá theo bé, lib/hang-ngay › BangKhoaMay) · them-tw6apkag / them-4e4o5c72 «Đổi tên máy» (màn /may/<id>/doi-ten) ·
// them-v4ovqk42 / them-18q14mik «Gỡ <máy>?» (bảng trượt, gỡ xong về «Máy của con») · them-slv33bgc «Sửa trên <máy> của con» (màn /may/<id>/sua).
// Bảo vệ đủ: thẻ sân «<bé> đang dùng · ✓ Đang bảo vệ · Máy chung · 2 bé» (chạm ⇒ «Máy cả nhà · chi tiết» /may/<id>/chi-tiet), hai ô «<app> N phút ·
// ● Đang mở» / «<bé> còn N sao = N phút chơi», lời xin đang chờ trên máy, «Máy này ai dùng?» (công tắc gán / bỏ gán từng bé — POST may/:id/con/:con/gan|bo;
// đầu mục ⇒ /may/<id>/con), «Cài đặt», Đổi tên / Gỡ, «Khoá <máy> ngay» + «Chỉ khoá <bé> · mọi máy».
// Chưa bảo vệ: cảnh đào (bong bóng việc thiếu, chip «Hôm nay N phút · vẫn trừ sao»), «Nếu để vậy», «Sửa <máy> trong N bước», Đổi tên / Gỡ, «Để sau».
// iPhone / iPad: «Máy riêng của <bé> · iPad không đổi người dùng được nên chỉ một bé dùng» (không có «Máy này ai dùng?»).
// Mục «An toàn & sự cố» giữ các tính năng cũ: mở khẩn cấp, gỡ từ xa (nhập lại mật khẩu), gỡ tại máy, nhật ký. Người trông giúp: xem, khoá máy, mã mất mạng.
// Dữ liệu: GET may/:id/tuan-thu (conDs, dangDung, khoaMay, tungCon) + GET may/:id/con (mọi bé, gán chưa, sao) + GET tuan-thu (máy khác) + gia-dinh.
import { cheDoTu } from "@/lib/app-web";
import { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, coMaOff, GOC, LoiApi, type ChiTietTuanThu, type GiaDinh, type KqGoMay, type PhienDang, type SuKienTuanThu, type TuanThuMay } from "@/lib/api";
import { BangKhoaMay, HangViec, quyenToi, tenGoi, TieuMuc, type ChoDuyetMoi, type ConCt } from "@/lib/hang-ngay";
import { cauMoTam, conHan, datKhoaMay } from "@/lib/khoa-may";
import { cauKhoaMay, mayDangKhoa } from "@/lib/noi-1411";
import { tieuXin } from "@/lib/hom-nay-xin";
import {
  appTrenMay, AvtCon, BangKhoaTheoMay, conCuaMay, mayCuaCon, nganTen as ngan, ganBoCon, hinhMay, keDau, laMayChung, laMotCon, MucPhai, SaoNho, TEN_NEN, TheDs, type ConMay, type ConNganMay,
} from "@/lib/may-nhieu-con";
import {
  BangTruot, Bao, BaoLoi, baoKhiVe, BieuTron, Chips, ChoTai, Chu, CongTac, Dong, gioPhut, HaiNut, Icon3D, M, Man, Nhom, NhomTieu, Nut, ONhap, Rob, TickDong, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";
import { BONG, KHOI, HERO, KHOI_HERO } from "@/lib/clay";

const PHUT = [15, 30, 60, 120];
const SU_KIEN: Record<string, string> = {
  tuan_thu_lech: "Lệch chuẩn tuân thủ", tuan_thu_on: "Tuân thủ trở lại", may_ngoai_vong: "Máy ngoài vòng kiểm soát", may_tro_lai: "Máy đồng bộ trở lại",
  mo_khan_cap: "Ba Mẹ mở khẩn cấp", huy_mo_khan_cap: "Huỷ mở khẩn cấp", het_mo_khan_cap: "Hết giờ mở khẩn cấp", tin_cay_admin: "Xác nhận tài khoản quản trị",
  lenh_go: "Ra lệnh gỡ từ xa", go_may: "Máy đã gỡ AiiGrow", xem_ma_offline: "Xem mã mở offline", may_mo_ma_offline: "Máy mở bằng mã offline", may_sai_ma_offline: "Gõ sai mã offline nhiều lần", may_het_ma_offline: "Có mạng lại, hết mở bằng mã", doi_che_do: "Đổi chế độ", doi_ten_may: "Đổi tên máy",
  doi_con_may: "Đổi bé dùng máy", khoa_may: "Ba Mẹ khoá máy", mo_khoa_may: "Ba Mẹ mở khoá máy",
};
const NGAY_XOA_HAN = 7;
/** Agent-win tự thôi theo danh sách khi bị bỏ khỏi gia đình quá ngần này giờ (agent-win AnToan.cs › MoCoi.GioNguong). */
const GIO_MO_COI = 6;

export default function AnToanMay() {
  const { id, mo: moSan } = useLocalSearchParams<{ id: string; mo?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    // coMk: tài khoản Google / Facebook chưa đặt mật khẩu ⇒ gỡ máy dẫn sang «Đặt mật khẩu» thay vì ô mật khẩu (app/dat-mat-khau.tsx)
    const [quyen, coMk] = await Promise.all([quyenToi(), bm.goi<{ baMe: { coMatKhau?: boolean } }>("toi").then((t) => t.baMe.coMatKhau !== false, () => true)]);
    // Máy đã gỡ xong (agent báo đã gỡ / đã xoá hẳn) ⇒ không còn trong gia đình
    const m = await bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`).catch((e) => { if (e instanceof LoiApi && e.ma === "khong_thay") return null; throw e; });
    // bé «chính» của máy (bé đang dùng › máy riêng = bé của máy) suy ngay từ tuan-thu ⇒ gọi con/:id SONG SONG với các lời gọi khác
    const aiId = m ? m.dangDung?.id ?? (m.conDs ? (m.conDs.length === 1 ? m.conDs[0].id : null) : m.con) ?? null : null;
    const [g, tt, cm, cd, ph, ct0] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu").catch(() => null),
      // «Máy này ai dùng?»: mọi bé trong nhà kèm đã gán chưa, sao — máy chủ trước #267 không có ⇒ null (ẩn công tắc)
      m ? bm.goi<ConMay>(`may/${id}/con`).catch(() => null) : null,
      bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null), bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null),
      aiId ? bm.goi<ConCt>(`con/${aiId}`).catch(() => null) : null]);
    const caNha: ConNganMay[] = g.con.map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar }));
    const conDs = m ? cm ? cm.ds.filter((c) => c.gan) : conCuaMay(m, caNha) : [];
    // bé «chính» của máy — luật (chế độ App & web) và sao hiện theo bé này
    const ai = m ? (m.dangDung ? conDs.find((c) => c.id === m.dangDung!.id) ?? m.dangDung : conDs.length === 1 ? conDs[0] : null) : null;
    const ct = ai && ai.id === aiId ? ct0 : ai ? await bm.goi<ConCt>(`con/${ai.id}`).catch(() => null) : null;
    const xem = quyen === "trong_giup";
    const ids = new Set(conDs.map((c) => c.id));
    // lời xin của các bé dùng máy: lời xin trên MÁY NÀY trước (requests.device_id)
    const xin = (cd?.yeuCau ?? []).filter((y) => ids.has(y.child_id))
      .sort((a, b) => Number((b as { device_id?: string | null }).device_id === id) - Number((a as { device_id?: string | null }).device_id === id));
    const app = m ? appTrenMay(ph?.ds ?? [], m, ai?.id) : null;
    // khoá theo máy: máy chủ #267 trả `khoaMay` ở tuan-thu; máy chủ cũ chỉ có ở GET con/:id › may[] — máy dùng chung chưa gắn Con có trong may[]
    // của MỌI Con ⇒ hỏi Con đầu tiên
    const ctMay = m && !m.khoaMay && !ct?.may.some((x) => x.id === id) && g.con[0] ? await bm.goi<ConCt>(`con/${g.con[0].id}`).catch(() => null) : ct;
    const km = m?.khoaMay ?? ctMay?.may.find((x) => x.id === id)?.khoaMay ?? null;
    const sao = (cid: string) => cm?.ds.find((c) => c.id === cid)?.sao ?? g.con.find((c) => c.id === cid)?.soDu ?? null;
    return { m, caNha, conDs, cm, ai, ct, xin, app, km, sao, khac: (tt?.ds ?? []).filter((x) => x.id !== id), chu: !xem, xem, coMk };
  });
  const [mo, setMo] = useState<"khan" | "go" | "xoa" | "tai_may" | "khoa" | "khoa_be" | null>(null);
  const [phut, setPhut] = useState(30);
  const [lyDo, setLyDo] = useState("");
  const [mk, setMk] = useState("");
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const { lam: lamGan, loi: loiGan, dangChay: dangGan } = useLam();
  const { bao, noi } = useHoanTac();
  const dong = () => { setMo(null); setLyDo(""); setMk(""); setLoi(null); };
  // Trang chủ mở thẳng bảng «Mở khẩn cấp» / «Mã mở khi mất mạng» (?mo=khan|offline): Ba Mẹ đang vội, không đi qua thêm màn nào
  // Chỉ đổi state ⇒ chỉnh ngay lúc render (mẫu «điều chỉnh state khi dữ liệu đổi» của React), không setState trong effect; mở MỘT lần khi dữ liệu máy về.
  const [daMoSan, setDaMoSan] = useState(false);
  if (d?.m && !daMoSan && moSan) {
    setDaMoSan(true);
    // đang mở khẩn cấp / đang gỡ ⇒ không mở bảng (màn này cũng ẩn nút đó): khỏi tạo/kéo dài mở khẩn cấp thứ hai
    const dangKhan = !!d.m.moKhanCapDen && new Date(d.m.moKhanCapDen) > new Date();
    if (moSan === "khan" && !d.xem && !dangKhan && !d.m.dangGo) setMo("khan");
    // «Gỡ máy này» từ màn kết quả xoá hồ sơ Con (ho-so/[id]/xoa)
    if (moSan === "go" && d.chu && !d.m.dangGo) setMo(d.m.daDongBo ? "go" : "xoa");
  }
  const dangGo = !!d?.m?.dangGo;
  // Đang chờ máy nhận lệnh gỡ ⇒ tự tải lại mỗi 20 giây để thấy «đã gỡ» ngay khi máy báo xong — chỉ khi màn đang hiện
  // (expo-router giữ màn trong stack khi mở màn khác ⇒ useFocusEffect dừng hẹn giờ khi rời màn).
  useFocusEffect(useCallback(() => {
    if (!dangGo) return;
    const t = setInterval(() => { tai(); }, 20_000);
    return () => clearInterval(t);
  }, [dangGo, tai]));
  const goMay = (xoaHan: boolean) => lam(async () => {
    try {
      const r = await bm.goi<KqGoMay>(`may/${id}/go`, { matKhau: mk, ...(xoaHan ? { xoaHan: true } : {}) });
      dong();
      if (r.trangThai === "da_xoa") { bao(r.canGoTaiMay ? "Đã xoá khỏi danh sách — nhớ gỡ tại máy nếu AiiGrow còn trên đó" : "Đã xoá máy khỏi danh sách"); await tai(); return; }
      const chu = r.lapLai ? `${d?.m?.ten ?? "Máy"} đã có lệnh gỡ đang chờ` : `Đã gửi lệnh gỡ tới ${d?.m?.ten ?? "máy"}`;
      // thiết kế them-v4ovqk42 / them-18q14mik: gỡ xong về «Máy của con» (máy hiện «Đang gỡ AiiGrow khỏi máy này» tới khi máy báo đã gỡ);
      // câu báo hiện ở màn đích (baoKhiVe — useHoanTac của «Máy của con» nhận)
      if (!xoaHan) { baoKhiVe(chu); router.dismissTo("/may"); return; }
      bao(chu); await tai();
    } catch (e) {
      // Máy chưa đồng bộ lần nào ⇒ không nhận được lệnh gỡ ⇒ hỏi lại: xoá hẳn khỏi danh sách
      if (e instanceof LoiApi && e.ma === "can_xoa_han") { setLoi(null); setMo("xoa"); return; }
      // tài khoản Google / Facebook chưa có mật khẩu ⇒ sang «Đặt mật khẩu» (xác minh lại bằng Google / Facebook)
      if (e instanceof LoiApi && e.ma === "chua_co_mat_khau") { setLoi(null); dong(); router.push("/dat-mat-khau"); return; }
      throw e;
    }
  });
  // «Mã mở khi mất mạng» (06/11): một màn duy nhất them-rz77kk45 (/may/<id>/ma-offline, chọn 15/30/60 phút) — lối cũ ?mo=offline chuyển sang đó; bảng trượt cũ đã bỏ.
  if (moSan === "offline") return <Redirect href={{ pathname: "/may/[id]/ma-offline", params: { id } }} />;
  if (!d) return <Man lui={{ chu: "Quay lại" }} tieu="Máy"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.m) return (
    <Man lui={{ chu: "Quay lại" }} tieu="Máy">
      <Bao loai="ok" ic="tick" tieu="Máy này không còn trong gia đình" loi="AiiGrow đã được gỡ (hoặc máy đã được xoá khỏi danh sách). Máy không còn bị hạn chế gì từ AiiGrow." />
      <Nut chu="Quay lại" loai="vien" rong bam={() => router.back()} />
    </Man>
  );
  const m = d.m;
  const win = m.nen === "windows";
  const tot = m.baoVe ? m.baoVe === "day_du" : m.trangThai === "tuan_thu";
  const ten = ngan(m.ten);
  const tenNgan = ten.replace(/ của .*$/, "");
  const ai = d.ai;
  const tenAi = ai ? tenGoi(ai.ten) : null;
  const motCon = laMotCon(m);
  const chung = d.conDs.length >= 2 || (d.cm ? d.cm.may.mayChung : laMayChung(m));
  const saoAi = ai ? d.sao(ai.id) : null;
  const phutAi = ai ? d.cm?.ds.find((c) => c.id === ai.id)?.phutHomNay ?? m.tungCon?.find((c) => c.id === ai.id)?.phutHomNay ?? null : null;
  const khanCap = m.moKhanCapDen && new Date(m.moKhanCapDen) > new Date();
  // Windows: «đang mở» gồm cả thêm giờ đã duyệt (moDen) — «Khoá lại ngay» đóng cả hai
  const moDen = m.moDen && new Date(m.moDen) > new Date() ? m.moDen : khanCap ? m.moKhanCapDen : null;
  const cheDo = cheDoTu(d.ct) === "mo_het" ? "Mở hết" : "Theo danh sách";
  // khoá theo máy (POST may/:id/khoa) — mọi bé trên máy này
  const km = d.km;
  const khoaRieng = mayDangKhoa(km);
  const cauKhoaRieng = cauKhoaMay(km);
  // khoá theo bé (bé chính) vẫn còn ⇒ mở khoá máy xong máy VẪN khoá với bé đó — nói rõ
  const conConKhoa = !!d.ct?.khoaNgay && conHan(d.ct.khoaDen) && !cauMoTam(d.ct.moTamDen, d.ct.khoaDen);
  const moKhoaRieng = () => lam(async () => {
    await datKhoaMay(id, false);
    bao(conConKhoa && !chung ? `Đã mở khoá ${tenNgan} — máy vẫn khoá theo khoá của ${tenAi}` : `Đã mở khoá ${tenNgan}`, () => { datKhoaMay(id, true, km?.den ? new Date(km.den) : null).then(tai, tai); }); await tai();
  });
  // công tắc «Máy này ai dùng?»: gán / bỏ gán một bé (máy chủ chặn bỏ bé cuối — 400 can_mot_con; iPhone/iPad — 409 ios_mot_con)
  const doiGan = (c: ConNganMay, gan: boolean) => lamGan(async () => {
    await ganBoCon(id, c.id, gan);
    bao(gan ? `${tenGoi(c.ten)} dùng được ${tenNgan}` : `${tenGoi(c.ten)} không còn dùng ${tenNgan}`, () => { ganBoCon(id, c.id, !gan).then(tai, tai); });
    await tai();
  });
  const khac = d.khac.map((x) => ({ id: x.id, ten: ngan(x.ten), nen: x.nen, rieng: !laMayChung(x) }));
  const mayCuaAi = ai ? [{ ...m, id }, ...d.khac].filter((x) => mayCuaCon(x, ai.id)) : [];
  const xin0 = d.xin[0];
  const tenXin = xin0 ? tenGoi(d.caNha.find((c) => c.id === xin0.child_id)?.ten ?? xin0.ten_con) : "";

  const hangRieng = motCon && d.conDs[0] ? (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingRight: 14, borderRadius: 18, backgroundColor: M.xamSoft }}>
      <AvtCon c={d.conDs[0]} co={26} />
      <Chu kieu="rat" co={13} mau={M.chu2} style={{ flex: 1, lineHeight: 18 }}>{`Máy riêng của ${tenGoi(d.conDs[0].ten)} · ${tenNgan} không đổi người dùng được nên chỉ một bé dùng.`}</Chu>
    </View>
  ) : null;
  // them-tw6apkag / them-4e4o5c72 «Đổi tên máy»: màn riêng /may/<id>/doi-ten
  const doiTen = () => router.push({ pathname: "/may/[id]/doi-ten", params: { id } });
  const nutSuaGo = d.xem ? null : (
    <HaiNut>
      <Nut chu="Đổi tên máy" ic="but" ic3d loai="vien" bam={doiTen} />
      {!m.dangGo ? <Nut chu="Gỡ máy này" loai="huy" bam={() => setMo(m.daDongBo ? "go" : "xoa")} /> : null}
    </HaiNut>
  );
  const caiDat = (
    <>
      <TieuMuc chu="Cài đặt" />
      <TheDs>
        {chung && ["windows", "mac", "android"].includes(m.nen) ? (
          <HangViec dau ic="khien" mau="xanh" tieu="App & web theo từng bé" phu="Theo bé đang dùng máy"
            phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Xem ›</Chu>} bam={() => router.push({ pathname: "/ung-dung/[may]", params: { may: id } })} />
        ) : <>
          <HangViec dau ic="khien" mau="xanh" tieu={cheDo} phu={cheDoTu(d.ct) === "mo_het" ? "Con mở mọi app, web · không tính phút" : "Chỉ mở app, web Ba Mẹ đã thêm"}
            phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Đổi ›</Chu>} bam={() => router.push((ai ? `/app-web?con=${ai.id}` : "/app-web") as never)} />
          {["windows", "mac", "android"].includes(m.nen) ? <HangViec ic="laptop" mau="lam" tieu="Ứng dụng trên máy này" phu="App đã cài thật trên máy — thêm vào danh sách"
            bam={() => router.push({ pathname: "/ung-dung/[may]", params: { may: id } })} /> : null}
        </>}
        {coMaOff(m) ? <HangViec ic="mo_khoa" mau="xanh" tieu="Mã mở máy khi mất mạng" phu={d.ct?.may.find((x) => x.id === id)?.matMang ? "Máy đang mất mạng · lấy mã cho con" : "Mã 6 số, máy không cần mạng"}
          bam={() => router.push({ pathname: "/may/[id]/ma-offline", params: { id } })} /> : null}
      </TheDs>
    </>
  );
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={ten} noi={noi} tai={tai}
      phai={tot && !d.xem ? (
        <Pressable onPress={doiTen} accessibilityRole="button" accessibilityLabel="Đổi tên máy" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon3D ten="but" co={20} /></View>
        </Pressable>
      ) : undefined}>
      {tot ? (
        // thiết kế m1 .san: thẻ hero navy (bàn Navy 17/11) — hình máy 88 (khiên) · bé đang dùng · «✓ Đang bảo vệ» + chip «Máy chung · 2 bé» · nền máy
        <Pressable onPress={chung ? () => router.push({ pathname: "/may/[id]/chi-tiet", params: { id } }) : undefined} disabled={!chung} accessibilityRole={chung ? "button" : undefined}
          accessibilityLabel={chung ? `${ten}, xem chi tiết từng bé` : undefined}
          style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 28, overflow: "hidden", ...KHOI_HERO }}>
          <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.heroThe }}>
            <Icon3D ten={hinhMay(m.nen, chung)} co={64} />
            <View style={{ position: "absolute", right: -6, bottom: -6 }}><Icon3D ten="khien" co={36} /></View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            {ai ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AvtCon c={ai} co={28} toi />
                <Chu kieu="rat" co={16} dong={2} mau={HERO.chu} style={{ flexShrink: 1 }}>{chung ? `${tenAi} đang dùng` : tenAi!}</Chu>
              </View>
            ) : <Chu kieu="rat" co={16} mau={HERO.chu}>{d.conDs.length ? "Chưa bé nào đang dùng" : "Chưa có bé dùng máy"}</Chu>}
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 2, marginTop: 2 }}>
              <Chu kieu="rat" co={13} mau={M.ok}>✓ Đang bảo vệ</Chu>
              <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, backgroundColor: M.the }}>
                <Chu kieu="rat" co={11.5} mau={M.chu}>{chung ? `Máy chung · ${d.conDs.length} bé` : "Máy riêng"}</Chu>
              </View>
            </View>
            <Chu kieu="dam7" co={12} mau="rgba(255,255,255,0.75)" dong={1}>{`${TEN_NEN[m.nen] ?? m.nen}${!chung && d.ct ? ` · ${cheDo}` : ""}${chung ? " · xem từng bé ›" : ""}`}</Chu>
          </View>
        </Pressable>
      ) : (
        // bm2-may-m2 «lệch chuẩn»: cảnh đào cao 210 — bong bóng việc thiếu đầu tiên, máy 3D + dấu «!» cam, Grow «so-tay» góc phải, chip «… · vẫn trừ sao»;
        // dưới là tiêu đề «<máy> chưa được bảo vệ» 20/800 + một câu
        <>
          <View style={{ height: 210, borderRadius: 28, backgroundColor: "#fbe5ce", backgroundImage: "linear-gradient(#f9dcc0, #fdeedd)", overflow: "hidden", ...KHOI.the }}
            accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ position: "absolute", left: 22, top: 60 }}><Icon3D ten={hinhMay(m.nen, chung)} co={80} /></View>
            {/* máy 80 (HTML 104): chip «… · vẫn trừ sao» xuống 2–3 dòng khi giãn chữ (WCAG 1.4.12) không chạm máy — cổng DE-ANH */}
            <View style={{ position: "absolute", left: 88, top: 54, width: 40, height: 40, borderRadius: 20, backgroundColor: "#e2660f", alignItems: "center", justifyContent: "center",
              boxShadow: "0px 6px 10px -4px rgba(161,75,0,0.6), inset 0px 1.5px 0px rgba(255,255,255,0.4)" }}>
              <Chu kieu="rat" co={24} mau="#fff">!</Chu>
            </View>
            <View style={{ position: "absolute", right: -10, bottom: -34 }}><Rob ten="so-tay" co={136} /></View>
            {m.baoVeThieu?.[0] || m.vanDe[0] ? (
              <View style={{ position: "absolute", left: 16, top: 14, right: 16, alignSelf: "flex-start" }}>
                <View style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
                  backgroundColor: M.the, boxShadow: "0px 6px 10px -6px rgba(28,32,30,0.26)" }}>
                  <Chu kieu="rat" co={13.5} dong={2} style={{ lineHeight: 18 }}>{`${(m.baoVeThieu?.[0]?.ten ?? m.vanDe[0]?.cauBaMe ?? "").replace(/[.!]$/, "")}!`}</Chu>
                </View>
              </View>
            ) : null}
            <View style={{ position: "absolute", left: 16, bottom: 14, right: 132, alignItems: "flex-start" }}><View style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: M.the }}>
              <Chu kieu="rat" co={12.5} mau={M.canh} dong={2}>{phutAi != null ? `Hôm nay ${phutAi} phút · vẫn trừ sao` : `Báo về ${truoc(m.lanCuoi) || "chưa lần nào"} · vẫn trừ sao`}</Chu>
            </View></View>
          </View>
          <View style={{ paddingHorizontal: 6, gap: 4 }}>
            <Chu kieu="rat" co={20} style={{ lineHeight: 26, letterSpacing: -0.3 }}>{`${tenNgan} chưa được bảo vệ`}</Chu>
            <Chu kieu="dam" co={14} mau={M.chu2} style={{ lineHeight: 20 }}>{m.baoVeCau && !/việc cần sửa/.test(m.baoVeCau) ? m.baoVeCau
              : `Grow vẫn trừ sao khi ${tenAi ?? "con"} chơi, nhưng ${tenNgan} chưa được khoá đủ nên con tự tắt được.`}</Chu>
            {/* bong bóng chỉ nêu việc đầu ⇒ các việc còn lại (và vấn đề tuân thủ khi không có danh sách việc thiếu) liệt kê ở đây */}
            {(m.baoVeThieu?.length ?? 0) > 1 ? <View>{m.baoVeThieu!.slice(1).map((x) => <TickDong key={x.ma} trang="x" chu={x.ten} />)}</View> : null}
            {!m.baoVeThieu?.length && m.vanDe.length ? <View>{m.vanDe.map((v) => <TickDong key={v.loai} trang="x" chu={v.cauBaMe} />)}</View> : null}
          </View>
        </>
      )}
      {hangRieng}

      {/* Máy chưa nối bé nào (bé riêng của máy vừa bị xoá hồ sơ…): máy khoá, chờ Ba Mẹ chọn bé */}
      {!d.conDs.length && d.cm ? (
        <Bao loai="canh" ic="canh_bao" tieu="Chưa bé nào dùng máy này" loi="Máy đang khoá cho tới khi Ba Mẹ chọn bé dùng máy.">
          {d.xem ? null : <Nut chu="Chọn bé dùng máy này" loai="vien" nho bam={() => router.push({ pathname: "/may/[id]/ai-dung", params: { id } })} />}
        </Bao>
      ) : null}

      {/* m2 «Nếu để vậy»: 3 hậu quả khi máy chưa được bảo vệ — ô lõm xám 88 (thiết kế .vi) */}
      {!tot && !m.dangGo ? (
        <>
          <TieuMuc chu="Nếu để vậy" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([["mo_khoa", "Con tự tắt\nđược Grow"], ["game", "Mở cả app\nngoài danh sách"], ["dongho", "Chơi không\ntrừ sao"]] as const).map(([ic, chu]) => (
              <View key={ic} style={{ flex: 1, minHeight: 88, paddingVertical: 8, borderRadius: 20, backgroundColor: M.xamSoft, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon3D ten={ic} co={28} />
                <Chu kieu="rat" co={12.5} mau={M.chu2} style={{ textAlign: "center", lineHeight: 16 }}>{chu}</Chu>
              </View>
            ))}
          </View>
          {!d.xem && m.baoVeThieu?.length ? <Nut chu={`Sửa ${tenNgan} trong ${m.baoVeThieu.length} bước`} rong bam={() => router.push({ pathname: "/may/[id]/sua", params: { id } })} /> : null}
        </>
      ) : null}
      {/* «Đổi tên máy» luôn có cho Ba Mẹ (cả lúc máy đang gỡ — chỉ ẩn «Gỡ máy này») */}
      {!tot ? <>
        {nutSuaGo}
        {/* data-toi bm2-trang-chu: về màn trước (Trang chủ hoặc Máy của con); mở thẳng (không có màn trước) ⇒ Trang chủ */}
        <Nut chu="Để sau" loai="vien" rong bam={() => (router.canGoBack() ? router.back() : router.replace("/hom-nay"))} />
      </> : null}

      {/* m1: hai ô nổi — app đang mở (phút trên máy này) · sao còn của bé (= phút chơi) */}
      {tot && ai && (d.app || saoAi != null || phutAi != null) ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => router.push(`/da-dung/${ai.id}` as never)} accessibilityRole="button" style={[{ flex: 1, gap: 2, padding: 16, borderRadius: 26, backgroundColor: M.the }, KHOI.the]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten={d.app ? "game" : "dongho"} co={22} /><Chu kieu="rat" co={13.5} mau={M.chu2} dong={1} style={{ flexShrink: 1 }}>{d.app?.tenApp ?? "Hôm nay"}</Chu></View>
            <Chu kieu="rat" co={28} so style={{ letterSpacing: -0.8, lineHeight: 32, marginTop: 4 }}>{String(phutAi ?? 0)}<Chu kieu="rat" co={14} mau={M.chu2}> phút</Chu></Chu>
            {d.app ? <Chu kieu="rat" co={12.5} mau={M.chinhInk} dong={1}><Chu kieu="rat" co={12.5} mau={M.chinh}>● Đang mở</Chu>{m.dangDung?.tu ? ` từ ${gioPhut(m.dangDung.tu)}` : " trên máy này"}</Chu>
              : <Chu kieu="rat" co={12.5} mau={M.chinhInk} dong={1}>trên máy này</Chu>}
          </Pressable>
          {saoAi != null ? (
            <Pressable onPress={() => router.push(`/vi/${ai.id}` as never)} accessibilityRole="button" style={[{ flex: 1, gap: 2, padding: 16, borderRadius: 26, backgroundColor: M.the }, KHOI.the]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="sao" co={22} /><Chu kieu="rat" co={13.5} mau={M.chu2} dong={1} style={{ flexShrink: 1 }}>{`${tenAi} còn`}</Chu></View>
              <Chu kieu="rat" co={28} so mau={saoAi < 0 ? M.canh : M.diemInk} style={{ letterSpacing: -0.8, lineHeight: 32, marginTop: 4 }}>{`${saoAi < 0 ? "−" : ""}${Math.abs(saoAi)}`}<Chu kieu="rat" co={14} mau={saoAi < 0 ? M.canh : M.diemInk}> sao</Chu></Chu>
              <Chu kieu="rat" co={12.5} mau={saoAi < 0 ? M.canh : M.chinhInk} dong={1}>{saoAi < 0 ? "đang nợ Ba Mẹ" : `= ${saoAi} phút chơi`}</Chu>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* lời xin đang chờ của bé dùng máy (thẻ đào .xin) */}
      {tot && xin0 ? (
        <Pressable onPress={() => router.push(`/yeu-cau/${xin0.id}` as never)} accessibilityRole="button"
          style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 66, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 28, backgroundColor: M.canhSoft, ...KHOI.the }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#f3d6b8", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}><Icon3D ten={xin0.loai === "them_gio" ? "dongho" : "web"} co={24} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={15} dong={1}>{`${tenXin} xin ${/^xin\s/i.test(tieuXin(xin0)) ? tieuXin(xin0).replace(/^xin\s+/i, "") : tieuXin(xin0).replace(/^./, (x) => x.toLowerCase())}`}</Chu>
            <Chu kieu="dam7" co={12.5} mau={M.canh} dong={1}>{`${gioPhut(xin0.created_at)} · ${(xin0 as { device_id?: string | null }).device_id === id ? "đang chờ trên máy này" : "đang chờ"}${d.xin.length > 1 ? ` · +${d.xin.length - 1} lời xin` : ""}`}</Chu>
          </View>
          <Chu kieu="rat" co={14} mau={M.canh}>Xem ›</Chu>
        </Pressable>
      ) : null}

      {/* «Máy này ai dùng?» (Windows / Mac / Android): công tắc gán / bỏ gán từng bé; đầu mục ⇒ màn chọn đủ (them-okpa735o) */}
      {!motCon && d.cm && d.cm.ds.length > 1 ? (
        <>
          <MucPhai chu="Máy này ai dùng?" phai={`${d.conDs.length}/${d.cm.ds.length} bé ›`} bam={() => router.push({ pathname: "/may/[id]/ai-dung", params: { id } })} />
          <TheDs>
            {[...d.cm.ds].sort((a, b) => Number(b.dangDung) - Number(a.dangDung)).map((c, k) => {
              const rieng = c.mayKhac.find((x) => x.rieng);
              return (
                <View key={c.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 }, keDau(k)]}>
                  <AvtCon c={c} co={36} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Chu kieu="rat" dong={1}>{tenGoi(c.ten)}</Chu>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      {c.dangDung ? <Chu kieu="dam" co={12.5} mau={M.chu3}>Đang dùng ·</Chu> : null}
                      <SaoNho n={c.sao} />
                      {!c.dangDung && rieng ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1} style={{ flexShrink: 1 }}>{`· có ${rieng.ten.replace(/ (của|·) .*$/, "")} riêng`}</Chu> : null}
                    </View>
                  </View>
                  {d.xem ? null : <CongTac bat={c.gan} nhan={`${tenGoi(c.ten)} được dùng ${tenNgan}`} doi={(v) => { if (!dangGan) doiGan(c, v); }} />}
                </View>
              );
            })}
          </TheDs>
          <BaoLoi loi={loiGan} />
          <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 8, lineHeight: 18 }}>
            Mỗi bé chọn tên + PIN để vào máy. Chơi trên máy này chỉ trừ sao của bé đang dùng; «Đổi người» dừng tính phút của bé trước.
          </Chu>
        </>
      ) : null}

      {tot ? caiDat : null}
      {tot ? nutSuaGo : null}
      {khoaRieng && cauKhoaRieng ? (
        <Bao loai="lam" ic="khoa" tieu={`${tenNgan} ${cauKhoaRieng.charAt(0).toLowerCase()}${cauKhoaRieng.slice(1)}`}
          loi={chung ? "Mọi bé đều không vào được máy này — máy khác vẫn dùng bình thường." : "Chỉ máy này khoá — máy khác của con vẫn dùng bình thường."}>
          <Nut chu={`Mở khoá ${tenNgan}`} ic="mo_khoa" loai="vien" nho dangChay={dangChay} bam={moKhoaRieng} />
        </Bao>
      ) : d.conDs.length ? (
        <>
          <Nut chu={`Khoá ${tenNgan} ngay`} ic="khoa" ic3d rong bam={() => setMo("khoa")} />
          <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ textAlign: "center", lineHeight: 18, marginHorizontal: 8 }}>
            {`Khoá máy: ${chung ? `cả ${d.conDs.length} bé` : tenAi ?? "con"} không vào được máy này.${khac.length ? ` ${khac.slice(0, 2).map((x) => x.ten.replace(/ của .*$/, "")).join(", ")} vẫn dùng bình thường.` : ""}`}
          </Chu>
        </>
      ) : null}
      {ai && !khoaRieng ? (
        // «Chỉ khoá <bé> · mọi máy» ⇒ bảng khoá theo bé (them-sll7clha)
        <Pressable onPress={() => setMo("khoa_be")} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44 }}>
          <AvtCon c={ai} co={24} />
          <Chu kieu="rat" co={14} mau={M.chinhInk}>{chung ? `Chỉ khoá ${tenAi} · mọi máy` : `Khoá ${tenAi} · mọi máy`}</Chu>
        </Pressable>
      ) : null}
      {!tot ? caiDat : null}

      <NhomTieu chu="An toàn & sự cố" />
      {moDen ? (
        <Bao loai="lam" ic="mo_khoa" tieu={khanCap && moDen === m.moKhanCapDen ? "Đang mở khẩn cấp" : "Đang mở thêm giờ"} loi={`Giải trí được mở tới ${gio(moDen)} — trừ khi đang Khoá ngay (lúc đó máy vẫn khoá).`}>
          {d.xem ? null : <Nut chu="Khoá lại ngay" loai="vien" nho bam={() => lam(async () => { await bm.goi(`may/${id}/mo-khan-cap/huy`, {}); bao(ai ? `Đã khoá lại ${ten} — thêm giờ của ${tenAi} trên mọi máy cũng đóng` : `Đã khoá lại ${ten}`); await tai(); })} />}
        </Bao>
      ) : null}

      {!khanCap ? (
        <Nhom>
          <Dong dau tieu="Mở khẩn cấp" phu="Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ chơi trong ngày)" trai={<BieuTron ic="mo_khoa" mau="vang" />} bam={() => setMo("khan")} />
        </Nhom>
      ) : null}

      {m.dangGo ? (
        <Bao loai="lam" ic="dong_ho_cat" tieu="Đang chờ máy nhận lệnh gỡ…"
          loi={`Gửi ${truoc(m.dangGo.tu)}. Trong lúc chờ, máy chạy Giám sát (không theo danh sách App & web). Khi có mạng, máy tự gỡ AiiGrow rồi tự rời danh sách; gỡ tại máy cũng tự báo về. Máy không bật lại nữa? Sau ${NGAY_XOA_HAN} ngày không liên lạc, bạn xoá hẳn được.`}>
          {d.chu && m.coTheXoaHan ? <Nut chu="Xoá hẳn khỏi danh sách" loai="vien" nho bam={() => setMo("xoa")} /> : null}
        </Bao>
      ) : null}

      <NhomTieu chu="Gỡ cài đặt" />
      <Nhom>
        {d.chu && !m.dangGo && m.daDongBo ? (
          <Dong dau tieu="Gỡ AiiGrow khỏi máy này (từ xa)" phu="Máy tự gỡ sạch ở lần đồng bộ tới — cần nhập lại mật khẩu của bạn" trai={<BieuTron ic="thoat" mau="do" />} bam={() => setMo("go")} />
        ) : null}
        {d.chu && !m.daDongBo ? (
          <Dong dau tieu="Xoá máy khỏi danh sách" phu="Máy chưa đồng bộ lần nào nên không nhận được lệnh gỡ" trai={<BieuTron ic="thoat" mau="do" />} bam={() => setMo("xoa")} />
        ) : null}
        <Dong dau={!d.chu || (!!m.dangGo && m.daDongBo)} tieu="Gỡ tại máy" phu="Cài đặt › Ứng dụng › AiiGrow trên máy của Con — cần mật khẩu quản trị của Ba Mẹ" trai={<BieuTron ic="may_tinh" mau="lam" />} bam={() => setMo("tai_may")} />
      </Nhom>
      {!d.chu ? <Chu co={13} mau={M.chu3}>Chỉ Ba Mẹ mới gỡ AiiGrow được — Người trông giúp nhờ Ba Mẹ.</Chu> : null}

      {m.suKien.length ? (
        <>
          <NhomTieu chu="Nhật ký" />
          <Nhom>
            {m.suKien.slice(0, 20).map((s, i) => <DongSuKien key={i} s={s} dau={i === 0} />)}
          </Nhom>
        </>
      ) : null}

      <BangTruot mo={mo === "khan"} dong={dong} tieu={`Mở khẩn cấp ${m.ten}`}>
        <Chu mau={M.chu2}>Giải trí được mở trong khoảng thời gian bạn chọn. Khoá ngày vẫn giữ nguyên. Việc này được ghi nhật ký và báo cho Ba Mẹ khác.</Chu>
        <Chu kieu="rat" co={14} style={{ marginTop: 12, marginBottom: 6 }}>Thời lượng</Chu>
        <Chips ds={PHUT.map((p) => ({ gia: p, chu: `${p} phút` }))} chon={[phut]} doi={(v) => setPhut(v)} />
        <View style={{ marginTop: 12 }}>
          <ONhap nhan="Lý do (tuỳ chọn)" value={lyDo} onChangeText={(t) => setLyDo(t.slice(0, 200))} placeholder="VD: Con làm xong bài, thưởng 30 phút" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Mở ${phut} phút`} rong dangChay={dangChay} bam={() => lam(async () => {
          await bm.goi(`may/${id}/mo-khan-cap`, { phut, lyDo: lyDo.trim() || undefined }); dong(); bao(`Đã mở khẩn cấp ${m.ten} ${phut} phút`); await tai();
        })} />
      </BangTruot>

      {/* them-v4ovqk42 «Gỡ Máy cả nhà?» · them-18q14mik «Gỡ iPad của Bảo Minh?» */}
      <BangTruot mo={mo === "go"} dong={dong} hinh={hinhMay(m.nen, chung)} hinhDao tieu={`Gỡ ${ten}?`}>
        <Chu kieu="dam" co={14} mau={M.chu2} style={{ textAlign: "center", marginTop: -4, lineHeight: 20 }}>{`Grow thôi trông máy này. ${chung ? `Các bé dùng ${ten}` : `Con dùng ${tenNgan}`} sẽ không bị trừ sao, không theo danh sách App & web.`}</Chu>
        <TheDs>
          {([["lich", "Báo cáo cũ vẫn giữ", "Lịch sử dùng máy không mất"], ["lap", "Ghép lại lúc nào cũng được", "Bằng mã 6 số như lần đầu"]] as const).map(([ic, tieu, phu], k) => (
            <View key={ic} style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }, keDau(k)]}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={22} /></View>
              <View style={{ flex: 1, minWidth: 0 }}><Chu kieu="rat" co={14.5}>{tieu}</Chu><Chu kieu="dam" co={12} mau={M.chu3}>{phu}</Chu></View>
            </View>
          ))}
        </TheDs>
        <Chu co={13} mau={M.chu3}>Máy tự gỡ sạch AiiGrow ở lần đồng bộ tới (máy tắt / mất mạng thì chờ tới khi có mạng). Nhập lại mật khẩu để chắc là Ba Mẹ.</Chu>
        <View style={{ marginTop: 12 }}>
          {d.coMk ? <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" /> : <Chu co={13} mau={M.chu3}>Tài khoản vào bằng Google / Facebook chưa có mật khẩu — đặt mật khẩu trước để gỡ máy.</Chu>}
        </View>
        <BaoLoi loi={loiLam} />
        {d.coMk ? <Nut chu={`Gỡ ${tenNgan} khỏi AiiGrow`} loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => goMay(false)} /> : <Nut chu="Đặt mật khẩu để gỡ máy" loai="vien" rong bam={() => { dong(); router.push("/dat-mat-khau"); }} />}
        <View style={{ marginTop: 8 }}><Nut chu="Giữ máy này" loai="vien" rong bam={dong} /></View>
      </BangTruot>

      <BangTruot mo={mo === "xoa"} dong={dong} tieu={`Xoá hẳn ${m.ten} khỏi danh sách?`}>
        <Chu mau={M.chu2}>
          {m.daDongBo
            ? `Máy đã ${NGAY_XOA_HAN} ngày không liên lạc nên chưa nhận được lệnh gỡ. Xoá hẳn thì máy rời danh sách ngay, nhưng nếu AiiGrow vẫn còn trên máy, bạn phải gỡ tại máy (xem «Gỡ tại máy»).`
            : "Máy này chưa đồng bộ lần nào nên không nhận được lệnh gỡ. Xoá hẳn thì máy rời danh sách ngay. Nếu đã lỡ cài AiiGrow trên máy đó, hãy gỡ tại máy (xem «Gỡ tại máy»)."}
        </Chu>
        <View style={{ marginTop: 12 }}>
          {d.coMk ? <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" /> : <Chu co={13} mau={M.chu3}>Tài khoản vào bằng Google / Facebook chưa có mật khẩu — đặt mật khẩu trước để gỡ máy.</Chu>}
        </View>
        <BaoLoi loi={loiLam} />
        {d.coMk ? <Nut chu="Xoá hẳn" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => goMay(true)} /> : <Nut chu="Đặt mật khẩu để gỡ máy" loai="vien" rong bam={() => { dong(); router.push("/dat-mat-khau"); }} />}
        <View style={{ marginTop: 8 }}><Nut chu="Xem cách gỡ tại máy" loai="vien" rong bam={() => { dong(); setMo("tai_may"); }} /></View>
        <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={dong} /></View>
      </BangTruot>

      <BangTruot mo={mo === "tai_may"} dong={dong} tieu="Gỡ AiiGrow ngay trên máy">
        {win ? (
          <>
            <Chu mau={M.chu2}>Máy có mạng thì dùng «Gỡ từ xa» cho nhanh. Gỡ ngay trên máy của Con (có mạng hay không đều được):</Chu>
            <Chu style={{ marginTop: 10 }}>1. Trên máy đó, mở Cài đặt → Ứng dụng → Ứng dụng đã cài → AiiGrow → Gỡ cài đặt. Đang ở tài khoản của Con cũng được: Windows sẽ hỏi tài khoản và mật khẩu quản trị — của Ba Mẹ, nên Con không tự gỡ được.</Chu>
            <Chu style={{ marginTop: 6 }}>2. Bấm Yes. AiiGrow gỡ dịch vụ, danh sách app, khay, thông báo đăng nhập, tệp và cấu hình. Máy có mạng thì tự báo về và rời danh sách ở đây; không có mạng thì vào lại đây bấm «Gỡ AiiGrow khỏi máy này», sau {NGAY_XOA_HAN} ngày bạn xoá hẳn được.</Chu>
            <Chu style={{ marginTop: 6 }}>3. Không thấy AiiGrow trong «Ứng dụng» (máy cài bản cũ)? Bấm Start, gõ PowerShell, chuột phải → «Run as administrator», rồi gõ:</Chu>
            <Chu kieu="rat" co={13.5} style={{ marginTop: 6 }} mau={M.chinhInk}>{'& "C:\\Program Files\\AiiGrow\\AiiGrow.Setup.exe" --uninstall'}</Chu>
            <Chu co={13} mau={M.chu3} style={{ marginTop: 4 }}>Báo không tìm thấy tệp thì tải lại bộ cài ở {GOC}/tai, giải nén, rồi chạy AiiGrow.Setup.exe --uninstall từ thư mục đó (thường là thư mục Tải về của tài khoản bạn đang dùng).</Chu>
            <Chu co={13} mau={M.chu3} style={{ marginTop: 6 }}>Lỡ xoá máy khỏi danh sách mà chưa gỡ được tại máy: sau {GIO_MO_COI} giờ không còn trong gia đình, AiiGrow trên máy tự thôi theo danh sách (không khoá, không giới hạn app) cho tới khi được gỡ.</Chu>
          </>
        ) : (
          <Chu mau={M.chu2}>Trên máy của Con: mở phần quản lý ứng dụng / hồ sơ quản lý của hệ điều hành, gỡ AiiGrow bằng mật khẩu của Ba Mẹ. Cần giúp thì chat với AiiLab.</Chu>
        )}
        <View style={{ marginTop: 12 }}><Nut chu="Đã hiểu" loai="vien" rong bam={dong} /></View>
      </BangTruot>

      {/* them-tmezw761 «Khoá <máy>?»: khoá THEO MÁY (POST may/:id/khoa) — mọi bé trên máy «Sẽ khoá», máy khác «Vẫn dùng» */}
      <BangKhoaTheoMay mo={mo === "khoa"} dong={dong} may={{ id, ten: tenNgan, nen: m.nen }} con={d.conDs} dangDung={m.dangDung?.id ?? null} app={d.app?.tenApp ?? null}
        khac={khac} xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
      {/* them-sll7clha «Khoá máy <bé>?»: khoá THEO BÉ (mọi máy của bé; máy chung chỉ khoá phần của bé) */}
      {ai ? (
        <BangKhoaMay mo={mo === "khoa_be"} dong={dong} con={ai.id} ten={tenAi!}
          may={mayCuaAi.map((x) => ({ id: x.id, ten: ngan(x.ten), nen: x.nen, truc: x.trangThai === "tuan_thu" || x.trangThai === "lech_chuan", khoaMay: x.khoaMay,
            dungChung: laMayChung(x), conKhac: conCuaMay(x, d.caNha).filter((c) => c.id !== ai.id).map((c) => tenGoi(c.ten)) }))}
          dang={d.app ? { [id]: { chu: `● ${d.app.tenApp} · đang mở`, mo: true } } : undefined}
          xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
      ) : null}
    </Man>
  );
}

function DongSuKien({ s, dau }: { s: SuKienTuanThu; dau: boolean }) {
  const xau = s.loai === "may_ngoai_vong" || s.loai === "tuan_thu_lech";
  const tot = s.loai === "may_tro_lai" || s.loai === "tuan_thu_on" || s.loai === "go_may";
  return (
    <Dong dau={dau} tieu={SU_KIEN[s.loai] ?? s.loai} phu={`${truoc(s.created_at)}${chiTiet(s)}`}
      trai={<BieuTron ic={xau ? "canh_bao" : tot ? "tick" : "lich"} mau={xau ? "do" : tot ? "xanh" : "lam"} />} />
  );
}

const gio = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
function chiTiet(s: SuKienTuanThu) {
  const c = s.chi_tiet || {};
  if (s.loai === "doi_ten_may" && c.tu && c.den) return ` · từ «${c.tu}» thành «${c.den}»`;
  if (s.loai === "mo_khan_cap" && c.phut) return ` · ${c.phut} phút${c.lyDo ? ` — ${c.lyDo}` : ""}`;
  return "";
}
