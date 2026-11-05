// Chi tiết một máy của con (thiết kế chốt 05/11, bm-hang-ngay/05 tuân thủ · 08 lệch chuẩn · 06/09 đổi tên · 07/10 gỡ · 11 hướng dẫn sửa):
// thẻ trạng thái «✓ Rob đang trông máy này» / «! <máy> chưa được bảo vệ» + hậu quả, «Chỉ app Ba Mẹ cho phép», lời xin đang chờ của con, Đổi tên / Gỡ máy,
// «Sửa <máy> trong 3 bước», «Khoá mọi máy của <Con> ngay». Mục «An toàn & sự cố» giữ các tính năng an toàn cũ: mở khẩn cấp, mã mở khi mất mạng,
// gán con cho máy dùng chung, gỡ từ xa (nhập lại mật khẩu — máy chỉ rời danh sách khi agent báo đã gỡ), gỡ tại máy, nhật ký.
// Bỏ «Giám sát / Chặn thật» (L4: máy luôn chặn thật). Người trông giúp: xem, khoá máy, xem mã mất mạng; không đổi tên / gỡ.
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, chuanHoaTen, coMaOff, GOC, LoiApi, tieuYc, type ChiTietTuanThu, type GiaDinh, type KqGoMay, type MaOffline, type SuKienTuanThu } from "@/lib/api";
import { BangKhoaMay, HangViec, IC_MAY, quyenToi, type ChoDuyetMoi, type ConCt } from "@/lib/hang-ngay";
import {
  BangTruot, Bao, BaoLoi, BieuTron, cauLoi, Chips, ChoTai, Chu, Dong, gioPhut, HaiNut, M, Man, Nhom, NhomTieu, Nut, ONhap, The, TickDong, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

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
    const quyen = await quyenToi();
    // Máy đã gỡ xong (agent báo đã gỡ / đã xoá hẳn) ⇒ không còn trong gia đình
    const m = await bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`).catch((e) => { if (e instanceof LoiApi && e.ma === "khong_thay") return null; throw e; });
    // máy Windows «dùng chung» ⇒ cần danh sách Con để gán (POST may/:id/gan-con)
    const g = await bm.goi<GiaDinh>("gia-dinh");
    // Con dùng máy này: danh sách máy (khoá mọi máy), chế độ chặn; lời xin đang chờ của con — lỗi thì chỉ ẩn phần đó
    const [ct, cd] = await Promise.all([m?.con ? bm.goi<ConCt>(`con/${m.con}`).catch(() => null) : null, bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null)]);
    const xem = quyen === "trong_giup";
    return { m, con: m?.dungChung && m.nen === "windows" ? g.con : [], ct, xin: m?.con ? cd?.yeuCau.filter((y) => y.child_id === m.con) ?? [] : [],
      chu: !xem, xem };
  });
  const [mo, setMo] = useState<"khan" | "go" | "xoa" | "offline" | "tai_may" | "ten" | "sua" | "khoa" | null>(null);
  const [phut, setPhut] = useState(30);
  const [lyDo, setLyDo] = useState("");
  const [mk, setMk] = useState("");
  const [tenMoi, setTenMoi] = useState("");
  const [maOff, setMaOff] = useState<MaOffline | null>(null);
  const [taiMa, setTaiMa] = useState(false);
  const [lanMa, setLanMa] = useState(0);              // mỗi lần bấm xem mã = một lượt tải mới (bấm lại khi đang tải vẫn lấy mã mới nhất)
  const [loiMa, setLoiMa] = useState<string | null>(null);
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const { bao, noi } = useHoanTac();
  const dong = () => { setMo(null); setLyDo(""); setMk(""); setLoi(null); setTaiMa(false); };   // đóng bảng khi đang tải mã ⇒ huỷ lượt tải
  // Mở bảng mã mất mạng = bật cờ tải; effect bên dưới gọi máy chủ (một chỗ cho nút bấm, «Thử lại», «Lấy mã mới» và ?mo=offline).
  const xemMaOffline = () => { setMo("offline"); setMaOff(null); setLoiMa(null); setTaiMa(true); setLanMa((n) => n + 1); };
  useEffect(() => {
    if (!lanMa || !taiMa) return;                    // bảng đã đóng / đã tải xong ⇒ đổi id không tự tạo mã mới
    let bo = false;
    bm.goi<MaOffline>(`may/${id}/ma-offline`).then((v) => { if (!bo) setMaOff(v); }, (e) => { if (!bo) setLoiMa(cauLoi(e)); })
      .finally(() => { if (!bo) setTaiMa(false); });
    return () => { bo = true; };
  }, [lanMa, id]);   // eslint-disable-line react-hooks/exhaustive-deps -- taiMa chỉ là điều kiện chặn, không phải lý do tải lại
  // Trang chủ mở thẳng bảng «Mở khẩn cấp» / «Mã mở khi mất mạng» (?mo=khan|offline): Ba Mẹ đang vội, không đi qua thêm màn nào
  // Chỉ đổi state ⇒ chỉnh ngay lúc render (mẫu «điều chỉnh state khi dữ liệu đổi» của React), không setState trong effect; mở MỘT lần khi dữ liệu máy về.
  const [daMoSan, setDaMoSan] = useState(false);
  if (d?.m && !daMoSan && moSan) {
    setDaMoSan(true);
    // đang mở khẩn cấp / đang gỡ ⇒ không mở bảng (màn này cũng ẩn nút đó): khỏi tạo/kéo dài mở khẩn cấp thứ hai
    const dangKhan = !!d.m.moKhanCapDen && new Date(d.m.moKhanCapDen) > new Date();
    if (moSan === "khan" && !d.xem && !dangKhan && !d.m.dangGo) setMo("khan");
    else if (moSan === "offline" && coMaOff(d.m) && !d.xem) xemMaOffline();
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
  const ganCon = (con: string, ten: string) => lam(async () => { await bm.goi(`may/${id}/gan-con`, { con }); bao(`${m.ten} giờ là máy của ${ten}`); await tai(); });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={m.ten} noi={noi} tai={tai}>
      {/* thẻ trạng thái (05 / 08): xanh khi Rob trông đủ, cam khi chưa được bảo vệ + hậu quả */}
      <The dem style={{ gap: 10, backgroundColor: tot ? M.chinhSoft : M.canhSoft }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <BieuTron ic={IC_MAY[m.nen]} mau={tot ? "xanh" : "cam"} lon />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={17} mau={tot ? M.chinhInk : M.canh}>{tot ? "✓ Rob đang trông máy này" : `! ${ngan} chưa được bảo vệ`}</Chu>
            <Chu co={13.5} mau={M.chu2}>{tot ? `Đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}${m.dungChung ? " · máy dùng chung" : ""}`
              : m.baoVeCau ?? `Rob vẫn tính giờ, nhưng máy chưa được khoá đủ nên con tự tắt được. Báo về ${truoc(m.lanCuoi) || "chưa lần nào"}.`}</Chu>
          </View>
        </View>
        {!tot && m.baoVeThieu?.length ? (
          <View>{m.baoVeThieu.map((x) => <TickDong key={x.ma} trang="x" chu={x.ten} />)}</View>
        ) : null}
        {!tot && m.vanDe.length && !m.baoVeThieu?.length ? <View>{m.vanDe.map((v) => <TickDong key={v.loai} trang="x" chu={v.cauBaMe} />)}</View> : null}
      </The>

      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="luoi" mau="tim" tieu={d.ct?.cheDoChan === "mo_het" ? "Mở hết · chỉ chặn web người lớn" : "Chỉ app Ba Mẹ cho phép"}
          phu="Xem app & web con được dùng" bam={() => router.push((m.con ? `/app-web?con=${m.con}` : "/app-web") as never)} />
        {["windows", "mac", "android"].includes(m.nen) ? <HangViec ic="laptop" mau="lam" tieu="Ứng dụng trên máy này" phu="App đã cài thật trên máy — chặn hoặc cho phép"
          bam={() => router.push({ pathname: "/ung-dung/[may]", params: { may: id } })} /> : null}
        {d.xin.slice(0, 2).map((y) => (
          <HangViec key={y.id} ic="tin" mau="cam" tieu={`Con ${tieuYc(y).charAt(0).toLowerCase()}${tieuYc(y).slice(1)}`} phu={`Lúc ${gioPhut(y.created_at)}`}
            bam={() => router.push(`/yeu-cau/${y.id}` as never)} />
        ))}
      </The>

      {!tot && !d.xem && m.baoVeThieu?.length ? <Nut chu={`Sửa ${ngan} trong ${m.baoVeThieu.length} bước`} rong bam={() => setMo("sua")} /> : null}
      {d.xem ? null : (
        <HaiNut>
          <Nut chu="Đổi tên máy" loai="vien" bam={() => { setTenMoi(m.ten); setMo("ten"); }} />
          {!m.dangGo ? <Nut chu="Gỡ máy này" loai="huy" bam={() => setMo(m.daDongBo ? "go" : "xoa")} /> : null}
        </HaiNut>
      )}
      {d.ct && m.con ? <Nut chu={`Khoá mọi máy của ${tenCon} ngay`} ic="khoa" loai="vien" rong bam={() => setMo("khoa")} /> : null}

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

      <Nhom>
        {!khanCap ? (
          <Dong dau tieu="Mở khẩn cấp" phu="Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ ngủ, khoá ngày)" trai={<BieuTron ic="mo_khoa" mau="vang" />} bam={() => setMo("khan")} />
        ) : null}
        {coMaOff(m) ? (
          <Dong dau={!!khanCap} tieu="Mã mở khi mất mạng" phu="Máy mất mạng mà cần mở gấp — đọc mã này cho Con gõ vào máy" trai={<BieuTron ic="khoa" mau="lam" />} bam={xemMaOffline} />
        ) : null}
      </Nhom>

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

      <BangTruot mo={mo === "ten"} dong={dong} tieu="Đổi tên máy">
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

      <BangTruot mo={mo === "go"} dong={dong} tieu={`Gỡ ${m.ten}?`}>
        <Chu mau={M.chu2}>Rob thôi trông máy này. Con dùng máy sẽ không bị tính giờ, không bị chặn.</Chu>
        <View>
          <TickDong chu="Lịch sử dùng máy vẫn giữ trong báo cáo" />
          <TickDong chu="Muốn trông lại thì ghép lại bằng mã 6 số" />
        </View>
        <Chu co={13} mau={M.chu3}>Máy tự gỡ sạch AiiGrow ở lần đồng bộ tới (máy tắt / mất mạng thì chờ tới khi có mạng). Nhập lại mật khẩu để chắc là Ba Mẹ.</Chu>
        <View style={{ marginTop: 12 }}>
          <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Gỡ ${ngan} khỏi AiiGrow`} loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => goMay(false)} />
        <View style={{ marginTop: 8 }}><Nut chu="Giữ máy này" loai="ma" rong bam={dong} /></View>
      </BangTruot>

      <BangTruot mo={mo === "xoa"} dong={dong} tieu={`Xoá hẳn ${m.ten} khỏi danh sách?`}>
        <Chu mau={M.chu2}>
          {m.daDongBo
            ? `Máy đã ${NGAY_XOA_HAN} ngày không liên lạc nên chưa nhận được lệnh gỡ. Xoá hẳn thì máy rời danh sách ngay, nhưng nếu AiiGrow vẫn còn trên máy, bạn phải gỡ tại máy (xem «Gỡ tại máy»).`
            : "Máy này chưa đồng bộ lần nào nên không nhận được lệnh gỡ. Xoá hẳn thì máy rời danh sách ngay. Nếu đã lỡ cài AiiGrow trên máy đó, hãy gỡ tại máy (xem «Gỡ tại máy»)."}
        </Chu>
        <View style={{ marginTop: 12 }}>
          <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu="Xoá hẳn" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => goMay(true)} />
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

      <BangTruot mo={mo === "offline"} dong={dong} tieu={`Mã mở ${m.ten} khi mất mạng`}>
        <Chu mau={M.chu2}>Khi máy của Con mất mạng mà cần mở gấp: đọc mã dưới đây cho Con gõ vào màn hình khoá. Máy tự kiểm mã, không cần mạng.</Chu>
        {taiMa ? (
          <Chu kieu="rat" co={40} style={{ marginTop: 16, textAlign: "center", letterSpacing: 6 }}>• • • • • •</Chu>
        ) : loiMa ? (
          <View style={{ marginTop: 12 }}><BaoLoi loi={loiMa} /><Nut chu="Thử lại" loai="vien" rong bam={xemMaOffline} /></View>
        ) : maOff ? (
          <>
            <Chu kieu="rat" co={44} mau={M.chinh} style={{ marginTop: 16, textAlign: "center", letterSpacing: 10 }}>{maOff.ma}</Chu>
            <Chu co={13.5} mau={M.chu3} style={{ textAlign: "center", marginTop: 8 }}>Mã mới mỗi vài phút · mở máy khoảng {maOff.phutMo} phút</Chu>
            <View style={{ marginTop: 12 }}>
              <Bao loai="canh" ic="canh_bao" tieu="Chỉ đọc cho Con khi bạn đồng ý mở" loi="Mã này mở tạm giải trí trên máy đó. Đừng để Con tự xem." />
            </View>
            <Nut chu="Lấy mã mới" loai="vien" rong bam={xemMaOffline} />
          </>
        ) : null}
      </BangTruot>
      <BangTruot mo={mo === "sua"} dong={dong} tieu={`Sửa trên ${ngan} của con`}>
        <Chu mau={M.chu2}>{`Cầm ${ngan} lên, làm theo ${m.baoVeThieu?.length ?? 0} bước:`}</Chu>
        <View style={{ gap: 10 }}>
          {(m.baoVeThieu ?? []).map((x, k) => (
            <View key={x.ma} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center" }}>
                <Chu kieu="rat" co={15} mau="#fff">{String(k + 1)}</Chu>
              </View>
              <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>{x.ten}</Chu><Chu co={13.5} mau={M.chu3}>{x.cach}</Chu></View>
            </View>
          ))}
        </View>
        <Nut chu="Đã làm xong, kiểm tra lại" rong bam={() => { dong(); tai(); bao("Rob kiểm lại ở lần máy báo về kế tiếp (thường dưới 3 phút)"); }} />
        <Nut chu="Làm không được? Hỏi AiiGrow" loai="ma" rong bam={() => { dong(); router.push("/ho-tro"); }} />
      </BangTruot>

      {d.ct && m.con ? <BangKhoaMay mo={mo === "khoa"} dong={dong} con={m.con} ten={d.ct.ten} may={d.ct.may}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} /> : null}
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
