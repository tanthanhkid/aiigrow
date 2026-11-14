// Chi tiết một máy của con (thiết kế chốt 14/11, bm-may-con/02 tuân thủ · 06 lệch chuẩn · 03 xác nhận khoá máy · 04/07 đổi tên · 05/08 gỡ · 09 hướng dẫn sửa):
// thẻ trạng thái «Grow đang trông máy này ✓ · Đang bảo vệ · Chặn app & web» / «! <máy> chưa được bảo vệ» + «Nếu để vậy» (3 hậu quả), app đang mở,
// giờ chơi còn lại hôm nay (quỹ chung mọi máy — N3), lời xin đang chờ trên máy này, «Cài đặt máy» (chế độ, ứng dụng trên máy, mã mở máy), Đổi tên / Gỡ máy,
// «Sửa <máy> trong N bước», «Khoá <máy> ngay» (bảng xác nhận 03). Mục «An toàn & sự cố» giữ các tính năng an toàn cũ: mở khẩn cấp,
// gán con cho máy dùng chung, gỡ từ xa (nhập lại mật khẩu — máy chỉ rời danh sách khi agent báo đã gỡ), gỡ tại máy, nhật ký.
// 06/11 (L19): hàng «Mã mở máy khi mất mạng» ⇒ màn them-rz77kk45 (/may/<id>/ma-offline). Bỏ «Giám sát / Chặn thật» (L4: máy luôn chặn thật). Người trông giúp: xem, khoá máy, xem mã mất mạng; không đổi tên / gỡ.
import { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, chuanHoaTen, coMaOff, GOC, LoiApi, type ChiTietTuanThu, type GiaDinh, type KqGoMay, type PhienDang, type SuKienTuanThu } from "@/lib/api";
import { HangViec, IC_MAY, quyenToi, TieuMuc, type ChoDuyetMoi, type ConCt, type QuyCon } from "@/lib/hang-ngay";
import { datKhoa } from "@/lib/khoa-may";
import { tieuXin } from "@/lib/hom-nay-xin";
import {
  BangTruot, Bao, BaoLoi, BieuTron, Chips, ChoTai, Chu, Dong, gioPhut, HaiNut, Icon3D, M, Man, NhanMen, Nhom, NhomTieu, Nut, ONhap, Rob, The, TickDong, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";
import { BONG, KHOI } from "@/lib/clay";

const PHUT = [15, 30, 60, 120];
const SU_KIEN: Record<string, string> = {
  tuan_thu_lech: "Lệch chuẩn tuân thủ", tuan_thu_on: "Tuân thủ trở lại", may_ngoai_vong: "Máy ngoài vòng kiểm soát", may_tro_lai: "Máy đồng bộ trở lại",
  mo_khan_cap: "Ba Mẹ mở khẩn cấp", huy_mo_khan_cap: "Huỷ mở khẩn cấp", het_mo_khan_cap: "Hết giờ mở khẩn cấp", tin_cay_admin: "Xác nhận tài khoản quản trị",
  lenh_go: "Ra lệnh gỡ từ xa", go_may: "Máy đã gỡ AiiGrow", xem_ma_offline: "Xem mã mở offline", may_mo_ma_offline: "Máy mở bằng mã offline", may_sai_ma_offline: "Gõ sai mã offline nhiều lần", may_het_ma_offline: "Có mạng lại, hết mở bằng mã", doi_che_do: "Đổi chế độ", doi_ten_may: "Đổi tên máy",
};
const NGAY_XOA_HAN = 7;
/** Agent-win tự thôi chặn khi bị bỏ khỏi gia đình quá ngần này giờ (agent-win AnToan.cs › MoCoi.GioNguong). */
const GIO_MO_COI = 6;

export default function AnToanMay() {
  const { id, mo: moSan } = useLocalSearchParams<{ id: string; mo?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    // coMk: tài khoản Google / Facebook chưa đặt mật khẩu ⇒ gỡ máy dẫn sang «Đặt mật khẩu» thay vì ô mật khẩu (app/dat-mat-khau.tsx)
    const [quyen, coMk] = await Promise.all([quyenToi(), bm.goi<{ baMe: { coMatKhau?: boolean } }>("toi").then((t) => t.baMe.coMatKhau !== false, () => true)]);
    // Máy đã gỡ xong (agent báo đã gỡ / đã xoá hẳn) ⇒ không còn trong gia đình
    const m = await bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`).catch((e) => { if (e instanceof LoiApi && e.ma === "khong_thay") return null; throw e; });
    // máy Windows «dùng chung» ⇒ cần danh sách Con để gán (POST may/:id/gan-con)
    const g = await bm.goi<GiaDinh>("gia-dinh");
    // Con dùng máy này: danh sách máy (khoá mọi máy), chế độ chặn; lời xin đang chờ của con — lỗi thì chỉ ẩn phần đó
    const [ct, cd, qy, ph] = await Promise.all([m?.con ? bm.goi<ConCt>(`con/${m.con}`).catch(() => null) : null, bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null),
      m?.con ? bm.goi<QuyCon>(`con/${m.con}/quy`).catch(() => null) : null, bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null)]);
    const xem = quyen === "trong_giup";
    const ngan = (t: string) => t.replace(/ của .*$/, "");
    // lời xin trên MÁY NÀY trước (requests.device_id), rồi lời xin khác của con
    const xin = (m?.con ? cd?.yeuCau.filter((y) => y.child_id === m.con) ?? [] : [])
      .sort((a, b) => Number((b as { device_id?: string | null }).device_id === id) - Number((a as { device_id?: string | null }).device_id === id));
    const app = m ? ph?.ds.find((p) => p.may && ngan(p.may) === ngan(m.ten) && (!m.con || p.con === m.con)) ?? null : null;
    return { m, con: m?.dungChung && m.nen === "windows" ? g.con : [], ct, xin, quy: qy?.quy ?? null, app, chu: !xem, xem, coMk };
  });
  const [mo, setMo] = useState<"khan" | "go" | "xoa" | "tai_may" | "ten" | "sua" | "khoa" | null>(null);
  const [phut, setPhut] = useState(30);
  const [lyDo, setLyDo] = useState("");
  const [mk, setMk] = useState("");
  const [tenMoi, setTenMoi] = useState("");
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
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
      bao(r.lapLai ? `${d?.m?.ten ?? "Máy"} đã có lệnh gỡ đang chờ` : `Đã gửi lệnh gỡ tới ${d?.m?.ten ?? "máy"}`); await tai();
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
  const tenCon = d.ct?.ten ?? null;
  const ngan = m.ten.replace(/ của .*$/, "");
  const khanCap = m.moKhanCapDen && new Date(m.moKhanCapDen) > new Date();
  // Windows: «đang mở» gồm cả thêm giờ đã duyệt (moDen) — «Khoá lại ngay» đóng cả hai
  const moDen = m.moDen && new Date(m.moDen) > new Date() ? m.moDen : khanCap ? m.moKhanCapDen : null;
  const cheDo = d.ct?.cheDoChan === "mo_het" ? "Mở hết" : "Chặn app & web";
  const ganCon = (con: string, ten: string) => lam(async () => { await bm.goi(`may/${id}/gan-con`, { con }); bao(`${m.ten} giờ là máy của ${ten}`); await tai(); });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={m.ten} noi={noi} tai={tai}>
      {/* thẻ trạng thái (05 / 08): xanh khi Grow trông đủ */}
      {tot ? (
        <The dem style={{ gap: 10, backgroundColor: M.chinhSoft }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <BieuTron ic={IC_MAY[m.nen]} mau="xanh" lon />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={17} mau={M.chinhInk}>Grow đang trông máy này ✓</Chu>
              <Chu co={13.5} mau={M.chu2}>{`Đang bảo vệ${d.ct ? ` · ${cheDo}` : ""}${m.dungChung ? " · máy dùng chung" : ""}`}</Chu>
            </View>
          </View>
        </The>
      ) : (
        // bm-may-con/06 «lệch chuẩn»: cảnh đào cao 210 — bong bóng việc thiếu đầu tiên, máy 3D + dấu «!» cam, Grow «so-tay» góc phải, chip «… · vẫn tính giờ»;
        // dưới là tiêu đề «<máy> chưa được bảo vệ» 20/800 + một câu
        <>
          <View style={{ height: 210, borderRadius: 28, backgroundColor: "#fbe5ce", backgroundImage: "linear-gradient(#f9dcc0, #fdeedd)", overflow: "hidden", ...KHOI.the }}
            accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ position: "absolute", left: 22, top: 54 }}><Icon3D ten={m.nen === "ios" || m.nen === "android" ? "tablet" : "laptop"} co={80} /></View>
            {/* máy 80 (HTML 104): chip «Báo về … · vẫn tính giờ» xuống 2–3 dòng khi giãn chữ (WCAG 1.4.12) không chạm máy — cổng DE-ANH */}
            <View style={{ position: "absolute", left: 88, top: 48, width: 40, height: 40, borderRadius: 20, backgroundColor: "#e2660f", alignItems: "center", justifyContent: "center",
              boxShadow: "0px 6px 10px -4px rgba(161,75,0,0.6), inset 0px 1.5px 0px rgba(255,255,255,0.4)" }}>
              <Chu kieu="rat" co={24} mau="#fff">!</Chu>
            </View>
            <View style={{ position: "absolute", right: -10, bottom: -34 }}><Rob ten="so-tay" co={136} /></View>
            {m.baoVeThieu?.[0] || m.vanDe[0] ? (
              <View style={{ position: "absolute", left: 16, top: 14, right: 16, alignSelf: "flex-start" }}>
                <View style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
                  backgroundColor: "#fff", boxShadow: "0px 6px 10px -6px rgba(28,32,30,0.26)" }}>
                  <Chu kieu="rat" co={13.5} dong={2} style={{ lineHeight: 18 }}>{`${(m.baoVeThieu?.[0]?.ten ?? m.vanDe[0]?.cauBaMe ?? "").replace(/[.!]$/, "")}!`}</Chu>
                </View>
              </View>
            ) : null}
            <View style={{ position: "absolute", left: 16, bottom: 14, right: 132, alignItems: "flex-start" }}><View style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: "#fff" }}>
              <Chu kieu="rat" co={12.5} mau="#8a3c0c" dong={2}>{`Báo về ${truoc(m.lanCuoi) || "chưa lần nào"} · vẫn tính giờ`}</Chu>
            </View></View>
          </View>
          <View style={{ paddingHorizontal: 6, gap: 4 }}>
            <Chu kieu="rat" co={20} style={{ lineHeight: 26, letterSpacing: -0.3 }}>{`${ngan} chưa được bảo vệ`}</Chu>
            <Chu kieu="dam" co={14} mau={M.chu2} style={{ lineHeight: 20 }}>{m.baoVeCau && !/việc cần sửa/.test(m.baoVeCau) ? m.baoVeCau
              : `Grow vẫn tính giờ, nhưng ${ngan} chưa được khoá đủ nên con tự tắt được.`}</Chu>
            {/* bong bóng chỉ nêu việc đầu ⇒ các việc còn lại (và vấn đề tuân thủ khi không có danh sách việc thiếu) liệt kê ở đây */}
            {(m.baoVeThieu?.length ?? 0) > 1 ? <View>{m.baoVeThieu!.slice(1).map((x) => <TickDong key={x.ma} trang="x" chu={x.ten} />)}</View> : null}
            {!m.baoVeThieu?.length && m.vanDe.length ? <View>{m.vanDe.map((v) => <TickDong key={v.loai} trang="x" chu={v.cauBaMe} />)}</View> : null}
          </View>
        </>
      )}

      {/* 06 «Nếu để vậy»: 3 hậu quả khi máy chưa được bảo vệ — ô lõm xám 88 (thiết kế .vi) */}
      {!tot && !m.dangGo ? (
        <>
          <TieuMuc chu="Nếu để vậy" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([["mo_khoa", "Con tự tắt\nđược Grow"], ["game", "App lạ\nmở được"], ["trang_ngu", "Giờ ngủ\nbị bỏ qua"]] as const).map(([ic, chu]) => (
              <View key={ic} style={{ flex: 1, height: 88, borderRadius: 20, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon3D ten={ic} co={28} />
                <Chu kieu="rat" co={12.5} mau={M.chu2} style={{ textAlign: "center", lineHeight: 16 }}>{chu}</Chu>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* 02: app đang mở + giờ chơi còn lại (quỹ chung mọi máy) + lời xin đang chờ */}
      {d.app || d.quy || d.xin.length ? (
        <>
          {/* thiết kế 02: hai ô nổi cạnh nhau — app đang mở · giờ chơi còn (số to) */}
          {d.app || d.quy ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {d.app ? (
                <View style={[{ flex: 1, gap: 2, padding: 16, borderRadius: 24, backgroundColor: "#f7f6f3" }, KHOI.the]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="game" co={18} /><Chu kieu="dam7" co={12.5} mau="#565c59" dong={1}>{d.app.tenApp}</Chu></View>
                  <Chu kieu="rat" co={22} mau={M.chinhInk}>Đang mở</Chu>
                  <Chu kieu="dam7" co={12} mau={M.chinhInk}>● trên máy này</Chu>
                </View>
              ) : null}
              {d.quy ? (
                <NhanMen onPress={m.con ? () => router.push(`/gio/${m.con}` as never) : undefined} disabled={!m.con} accessibilityRole="button" muc="khoi" sang
                  style={[{ flex: 1, gap: 2, padding: 16, borderRadius: 24, backgroundColor: "#f7f6f3" }, KHOI.the]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="dongho" co={18} /><Chu kieu="dam7" co={12.5} mau="#565c59">Giờ chơi</Chu></View>
                  <Chu kieu="rat" co={26} so style={{ letterSpacing: -0.5 }}>{`${d.quy.conPhut}′`}</Chu>
                  <Chu kieu="dam7" co={12} mau="#565c59">còn lại hôm nay</Chu>
                </NhanMen>
              ) : null}
            </View>
          ) : null}
          {d.xin.length ? <The dem style={{ paddingVertical: 4 }}>{d.xin.slice(0, 2).map((y, k) => {
            const tren = (y as { device_id?: string | null }).device_id === id;
            return <HangViec key={y.id} dau={k === 0} ic={y.loai === "them_gio" ? "dongho" : "web"} mau="cam" tieu={`Xin ${tieuXin(y).charAt(0).toLowerCase()}${tieuXin(y).slice(1)}`}
              phu={`${gioPhut(y.created_at)} · ${tren ? "con đang chờ trên máy này" : "con đang chờ"}`} phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Xem ›</Chu>}
              bam={() => router.push(`/yeu-cau/${y.id}` as never)} />;
          })}</The> : null}
        </>
      ) : null}

      <TieuMuc chu="Cài đặt máy" />
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="khien" mau="xanh" tieu={cheDo} phu={d.ct?.cheDoChan === "mo_het" ? "Chỉ chặn web người lớn" : "App, web mới con phải xin Ba Mẹ"}
          phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Đổi ›</Chu>} bam={() => router.push((m.con ? `/app-web?con=${m.con}` : "/app-web") as never)} />
        {["windows", "mac", "android"].includes(m.nen) ? <HangViec ic="laptop" mau="lam" tieu="Ứng dụng trên máy này" phu="App đã cài thật trên máy — chặn hoặc cho phép"
          bam={() => router.push({ pathname: "/ung-dung/[may]", params: { may: id } })} /> : null}
        {coMaOff(m) ? <HangViec ic="mo_khoa" mau="xanh" tieu="Mã mở máy khi mất mạng" phu={d.ct?.may.find((x) => x.id === id)?.matMang ? "Máy đang mất mạng · lấy mã cho con" : "Mã 6 số, máy không cần mạng"}
          bam={() => router.push({ pathname: "/may/[id]/ma-offline", params: { id } })} /> : null}
      </The>

      {!tot && !d.xem && m.baoVeThieu?.length ? <Nut chu={`Sửa ${ngan} trong ${m.baoVeThieu.length} bước`} rong bam={() => setMo("sua")} /> : null}
      {d.xem ? null : (
        <HaiNut>
          <Nut chu="Đổi tên máy" ic="but" ic3d loai="vien" bam={() => { setTenMoi(m.ten); setMo("ten"); }} />
          {!m.dangGo ? <Nut chu="Gỡ máy này" loai="huy" bam={() => setMo(m.daDongBo ? "go" : "xoa")} /> : null}
        </HaiNut>
      )}
      {d.ct && m.con ? <Nut chu={`Khoá ${ngan} ngay`} ic="khoa" loai="huy" rong bam={() => setMo("khoa")} /> : null}

      <NhomTieu chu="An toàn & sự cố" />
      {win && m.dungChung ? (
        <Bao loai="canh" ic="canh_bao" tieu="Máy này của ai?"
          loi="Máy đang ghép «dùng chung» nên chưa nhận nhiệm vụ, giờ chơi, luật web của Con nào. Chọn Con dùng máy này — máy đổi ở lần đồng bộ tới.">
          {d.xem ? null : d.con.map((c) => <Nut key={c.id} chu={`Máy của ${c.ten}`} loai="vien" nho dangChay={dangChay} bam={() => ganCon(c.id, c.ten)} />)}
        </Bao>
      ) : null}

      {moDen ? (
        <Bao loai="lam" ic="mo_khoa" tieu={khanCap && moDen === m.moKhanCapDen ? "Đang mở khẩn cấp" : "Đang mở thêm giờ"} loi={`Giải trí được mở tới ${gio(moDen)} — trừ khi đang Khoá ngay hoặc giờ ngủ (lúc đó máy vẫn khoá).`}>
          {d.xem ? null : <Nut chu="Khoá lại ngay" loai="vien" nho bam={() => lam(async () => { await bm.goi(`may/${id}/mo-khan-cap/huy`, {}); bao(m.con ? `Đã khoá lại ${m.ten} — thêm giờ của Con trên mọi máy cũng đóng` : `Đã khoá lại ${m.ten}`); await tai(); })} />}
        </Bao>
      ) : null}

      {!khanCap ? (
        <Nhom>
          <Dong dau tieu="Mở khẩn cấp" phu="Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ ngủ, khoá ngày)" trai={<BieuTron ic="mo_khoa" mau="vang" />} bam={() => setMo("khan")} />
        </Nhom>
      ) : null}

      {m.dangGo ? (
        <Bao loai="lam" ic="dong_ho_cat" tieu="Đang chờ máy nhận lệnh gỡ…"
          loi={`Gửi ${truoc(m.dangGo.tu)}. Trong lúc chờ, máy chạy Giám sát (không chặn gì). Khi có mạng, máy tự gỡ AiiGrow rồi tự rời danh sách; gỡ tại máy cũng tự báo về. Máy không bật lại nữa? Sau ${NGAY_XOA_HAN} ngày không liên lạc, bạn xoá hẳn được.`}>
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

      <BangTruot mo={mo === "ten"} dong={dong} tieu="Đổi tên máy" hinh={m.nen === "ios" || m.nen === "android" ? "tablet" : "laptop"}>
        <ONhap nhan="Tên máy" value={tenMoi} onChangeText={setTenMoi} autoCapitalize="sentences" placeholder="VD: Laptop của Bảo Anh" maxLength={80} />
        <Chu co={13} mau={M.chu3}>Tên này hiện trên app của Ba Mẹ và trên màn khoá của con.</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu tên máy" rong dangChay={dangChay} tat={!chuanHoaTen(tenMoi) || chuanHoaTen(tenMoi) === chuanHoaTen(m.ten)} bam={() => lam(async () => {
          const moi = chuanHoaTen(tenMoi);
          if (moi === chuanHoaTen(m.ten)) { dong(); return; }
          const kq = await bm.goi<{ doi?: boolean }>(`may/${id}/doi-ten`, { ten: moi }); dong();
          if (kq.doi !== false) bao(`Đã đổi tên máy thành ${moi}`);
          await tai();
        })} />
      </BangTruot>

      <BangTruot mo={mo === "khan"} dong={dong} tieu={`Mở khẩn cấp ${m.ten}`}>
        <Chu mau={M.chu2}>Giải trí được mở trong khoảng thời gian bạn chọn. Giờ ngủ và khoá ngày vẫn giữ nguyên. Việc này được ghi nhật ký và báo cho Ba Mẹ khác.</Chu>
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

      <BangTruot mo={mo === "go"} dong={dong} hinh={m.nen === "ios" || m.nen === "android" ? "tablet" : "laptop"} tieu={`Gỡ ${ngan}${tenCon ? ` của ${tenCon}` : ""}?`}>
        <Chu mau={M.chu2}>{`Grow thôi trông máy này. Con dùng ${ngan} sẽ không bị tính giờ, không bị chặn.`}</Chu>
        <View>
          <TickDong chu="Báo cáo cũ vẫn giữ" phu="Lịch sử dùng máy không mất" />
          <TickDong chu="Ghép lại lúc nào cũng được" phu="Bằng mã 6 số như lần đầu" />
        </View>
        <Chu co={13} mau={M.chu3}>Máy tự gỡ sạch AiiGrow ở lần đồng bộ tới (máy tắt / mất mạng thì chờ tới khi có mạng). Nhập lại mật khẩu để chắc là Ba Mẹ.</Chu>
        <View style={{ marginTop: 12 }}>
          {d.coMk ? <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" /> : <Chu co={13} mau={M.chu3}>Tài khoản vào bằng Google / Facebook chưa có mật khẩu — đặt mật khẩu trước để gỡ máy.</Chu>}
        </View>
        <BaoLoi loi={loiLam} />
        {d.coMk ? <Nut chu={`Gỡ ${ngan} khỏi AiiGrow`} loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => goMay(false)} /> : <Nut chu="Đặt mật khẩu để gỡ máy" loai="vien" rong bam={() => { dong(); router.push("/dat-mat-khau"); }} />}
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
            <Chu style={{ marginTop: 6 }}>2. Bấm Yes. AiiGrow gỡ dịch vụ, luật chặn app, khay, thông báo đăng nhập, tệp và cấu hình. Máy có mạng thì tự báo về và rời danh sách ở đây; không có mạng thì vào lại đây bấm «Gỡ AiiGrow khỏi máy này», sau {NGAY_XOA_HAN} ngày bạn xoá hẳn được.</Chu>
            <Chu style={{ marginTop: 6 }}>3. Không thấy AiiGrow trong «Ứng dụng» (máy cài bản cũ)? Bấm Start, gõ PowerShell, chuột phải → «Run as administrator», rồi gõ:</Chu>
            <Chu kieu="rat" co={13.5} style={{ marginTop: 6 }} mau={M.chinhInk}>{'& "C:\\Program Files\\AiiGrow\\AiiGrow.Setup.exe" --uninstall'}</Chu>
            <Chu co={13} mau={M.chu3} style={{ marginTop: 4 }}>Báo không tìm thấy tệp thì tải lại bộ cài ở {GOC}/tai, giải nén, rồi chạy AiiGrow.Setup.exe --uninstall từ thư mục đó (thường là thư mục Tải về của tài khoản bạn đang dùng).</Chu>
            <Chu co={13} mau={M.chu3} style={{ marginTop: 6 }}>Lỡ xoá máy khỏi danh sách mà chưa gỡ được tại máy: sau {GIO_MO_COI} giờ không còn trong gia đình, AiiGrow trên máy tự thôi chặn (không khoá, không chặn app) cho tới khi được gỡ.</Chu>
          </>
        ) : (
          <Chu mau={M.chu2}>Trên máy của Con: mở phần quản lý ứng dụng / hồ sơ quản lý của hệ điều hành, gỡ AiiGrow bằng mật khẩu của Ba Mẹ. Cần giúp thì chat với AiiLab.</Chu>
        )}
        <View style={{ marginTop: 12 }}><Nut chu="Đã hiểu" loai="vien" rong bam={dong} /></View>
      </BangTruot>

      <BangTruot mo={mo === "sua"} dong={dong} tieu={`Sửa trên ${ngan} của con`}>
        <Chu mau={M.chu2}>{`Cầm ${ngan} lên, làm theo ${m.baoVeThieu?.length ?? 0} bước`}</Chu>
        <View style={{ gap: 10 }}>
          {/* thiết kế 09: mỗi bước một thẻ nổi — ô hình 3D lõm 72 có số ngọc góc, tên bước 15/800 + cách làm */}
          {(m.baoVeThieu ?? []).map((x, k) => (
            <View key={x.ma} style={[{ flexDirection: "row", gap: 14, alignItems: "center", padding: 12, borderRadius: 24, backgroundColor: "#f7f6f3" }, KHOI.the]}>
              <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
                <Icon3D ten={(["banhrang", "dong_ho_cat", "khoa"] as const)[k % 3]} co={44} />
                <View style={{ position: "absolute", left: -6, top: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center" }}>
                  <Chu kieu="rat" co={13} mau="#fff">{String(k + 1)}</Chu>
                </View>
              </View>
              <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>{x.ten}</Chu><Chu kieu="dam" co={12.5} mau="#565c59">{x.cach}</Chu></View>
            </View>
          ))}
        </View>
        <Nut chu="Đã làm xong, kiểm tra lại" rong bam={() => { dong(); tai(); bao("Grow kiểm lại ở lần máy báo về kế tiếp (thường dưới 3 phút)"); }} />
        <Nut chu="Làm không được? Hỏi AiiGrow" loai="ma" rong bam={() => { dong(); router.push("/ho-tro"); }} />
      </BangTruot>

      {/* 03 «Khoá <máy> của <Con>?»: máy chủ khoá theo CON (con/:id/khoa — chưa có khoá riêng từng máy) ⇒ ghi rõ máy khác của con cũng khoá */}
      {d.ct && m.con ? (
        <BangTruot mo={mo === "khoa"} dong={dong} hinh={m.nen === "ios" || m.nen === "android" ? "tablet" : "laptop"} tieu={`Khoá ${ngan} của ${tenCon}?`}>
          <Chu mau={M.chu2}>{d.app ? `${d.app.tenApp} sẽ đóng, con thấy màn khoá.` : "Con thấy màn khoá tới khi Ba Mẹ mở."}</Chu>
          <View style={{ gap: 8 }}>
            {[...d.ct.may].sort((a, b) => Number(b.id === id) - Number(a.id === id)).map((x) => (
              <HangViec key={x.id} dau ic={IC_MAY[x.nen]} mau={x.id === id ? "do" : "xam"} tieu={x.ten.replace(/ của .*$/, "")}
                phu={x.id === id ? (d.app ? `● ${d.app.tenApp}${d.quy ? ` · còn ${d.quy.conPhut} phút` : ""}` : x.truc ? "Đang mở" : "Đang tắt") : "Cũng khoá — Grow khoá mọi máy của con"}
                phai={<Chu kieu="rat" co={13} mau={x.id === id ? M.loi : M.chu3}>Sẽ khoá</Chu>} />
            ))}
          </View>
          <BaoLoi loi={loiLam} />
          <Nut chu={`Khoá ${ngan} ngay`} ic="khoa" loai="huy" rong dangChay={dangChay} bam={() => lam(async () => {
            const con = m.con!;
            await datKhoa(con, true, null); dong();
            bao(`Đã khoá máy của ${tenCon}`, () => { datKhoa(con, false, null).then(tai, tai); }); await tai();
          })} />
          <Nut chu="Để sau" loai="ma" rong bam={dong} />
        </BangTruot>
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
