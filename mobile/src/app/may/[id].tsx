// bm-an-toan-may: một máy — điểm tuân thủ, vấn đề đang có, nhật ký, và mục «An toàn & gỡ cài đặt»: chế độ Giám sát / Chặn thật
// (đổi từ xa), MỞ KHẨN CẤP (có hạn giờ), mã mở khi mất mạng, GỠ AN TOÀN (chỉ chủ gia đình, nhập lại mật khẩu; máy chỉ rời danh sách
// khi agent báo đã gỡ — không để AiiGrow «dính» lại trên máy Con) + cách gỡ tại máy khi không có mạng.
// Gọi GET may/:id/tuan-thu, POST may/:id/che-do, POST may/:id/mo-khan-cap(+/huy), GET may/:id/ma-offline, POST may/:id/go (docs/API.md).
import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, catTen, chuanHoaTen, GOC, LoiApi, TEN_CHE_DO, type CheDoMay, type ChiTietTuanThu, type GiaDinh, type KqGoMay, type MaOffline, type SuKienTuanThu, TT_TRANG } from "@/lib/api";
import {
  BangTruot, Bao, BaoLoi, BieuTron, Canh, cauLoi, Chips, ChoTai, ChonMot, Chu, Dong, M, Man, Nhom, NhomTieu, Nut, ONhap, OSo, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const PHUT = [15, 30, 60, 120];
const SU_KIEN: Record<string, string> = {
  tuan_thu_lech: "Lệch chuẩn tuân thủ", tuan_thu_on: "Tuân thủ trở lại", may_ngoai_vong: "Máy ngoài vòng kiểm soát", may_tro_lai: "Máy đồng bộ trở lại",
  mo_khan_cap: "Ba Mẹ mở khẩn cấp", huy_mo_khan_cap: "Huỷ mở khẩn cấp", het_mo_khan_cap: "Hết giờ mở khẩn cấp", tin_cay_admin: "Xác nhận tài khoản quản trị",
  lenh_go: "Ra lệnh gỡ từ xa", go_may: "Máy đã gỡ AiiGrow", xem_ma_offline: "Xem mã mở offline", may_mo_ma_offline: "Máy mở bằng mã offline", may_sai_ma_offline: "Gõ sai mã offline nhiều lần", may_het_ma_offline: "Có mạng lại, hết mở bằng mã", doi_che_do: "Đổi chế độ", doi_ten_may: "Đổi tên máy",
};
const CHE_DO: { gia: CheDoMay; chu: string }[] = [{ gia: "giam-sat", chu: "Giám sát" }, { gia: "chan", chu: "Chặn thật" }];
const GIAI_CHE_DO: Record<CheDoMay, string> = {
  "giam-sat": "Chỉ ghi lại những gì sẽ chặn: không chặn app, không khoá máy, không hiện màn khoá. Hợp để thử vài ngày hoặc khi cần tắt hết hạn chế.",
  chan: "Áp thật: chặn app ngoài danh sách, khoá máy ngoài giờ. Luật web áp cho mọi tài khoản Windows trên máy — Ba Mẹ dùng máy này thì chọn Giám sát trước. Muốn tắt thì chọn lại Giám sát — máy đổi ở lần đồng bộ tới khi có mạng.",
};
const NGAY_XOA_HAN = 7;
/** Agent-win tự thôi chặn khi bị bỏ khỏi gia đình quá ngần này giờ (agent-win AnToan.cs › MoCoi.GioNguong). */
const GIO_MO_COI = 6;

export default function AnToanMay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const toi = await bm.goi<{ baMe: { vai: string } }>("toi");
    // Máy đã gỡ xong (agent báo đã gỡ / đã xoá hẳn) ⇒ không còn trong gia đình
    const m = await bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`).catch((e) => { if (e instanceof LoiApi && e.ma === "khong_thay") return null; throw e; });
    // máy Windows «dùng chung» ⇒ cần danh sách Con để gán (POST may/:id/gan-con)
    const con = m?.dungChung && m.nen === "windows" ? (await bm.goi<GiaDinh>("gia-dinh")).con : [];
    return { m, con, chu: toi.baMe.vai === "chu", xem: toi.baMe.vai === "xem" };
  });
  const [mo, setMo] = useState<"khan" | "go" | "xoa" | "offline" | "tai_may" | "ten" | null>(null);
  const [phut, setPhut] = useState(30);
  const [lyDo, setLyDo] = useState("");
  const [mk, setMk] = useState("");
  const [tenMoi, setTenMoi] = useState("");
  const [maOff, setMaOff] = useState<MaOffline | null>(null);
  const [taiMa, setTaiMa] = useState(false);
  const [loiMa, setLoiMa] = useState<string | null>(null);
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const { bao, noi } = useHoanTac();
  const dong = () => { setMo(null); setLyDo(""); setMk(""); setLoi(null); };
  const xemMaOffline = async () => {
    setMo("offline"); setMaOff(null); setLoiMa(null); setTaiMa(true);
    try { setMaOff(await bm.goi<MaOffline>(`may/${id}/ma-offline`)); } catch (e) { setLoiMa(cauLoi(e)); } finally { setTaiMa(false); }
  };
  const dangGo = !!d?.m?.dangGo;
  // Đang chờ máy nhận lệnh gỡ ⇒ tự tải lại mỗi 20 giây để thấy «đã gỡ» ngay khi máy báo xong — chỉ khi màn đang hiện
  // (expo-router giữ màn trong stack khi mở màn khác ⇒ useFocusEffect dừng hẹn giờ khi rời màn).
  useFocusEffect(useCallback(() => {
    if (!dangGo) return;
    const t = setInterval(() => { tai(); }, 20_000);
    return () => clearInterval(t);
  }, [dangGo, tai]));
  const doiCheDo = (v: CheDoMay) => lam(async () => {
    if (!d?.m || v === d.m.cheDoBaMeChon) return;
    await bm.goi(`may/${id}/che-do`, { cheDo: v });
    bao(`${d.m.ten}: ${v === "chan" ? "Chặn thật" : "Giám sát"} — máy đổi ở lần đồng bộ tới`); await tai();
  });
  const goMay = (xoaHan: boolean) => lam(async () => {
    try {
      const r = await bm.goi<KqGoMay>(`may/${id}/go`, { matKhau: mk, ...(xoaHan ? { xoaHan: true } : {}) });
      dong();
      if (r.trangThai === "da_xoa") { bao(r.canGoTaiMay ? "Đã xoá khỏi danh sách — nhớ gỡ tại máy nếu AiiGrow còn trên đó" : "Đã xoá máy khỏi danh sách"); await tai(); return; }
      bao(r.lapLai ? `${d?.m?.ten ?? "Máy"} đã có lệnh gỡ đang chờ` : `Đã gửi lệnh gỡ tới ${d?.m?.ten ?? "máy"}`); await tai();
    } catch (e) {
      // Máy chưa đồng bộ lần nào ⇒ không nhận được lệnh gỡ ⇒ hỏi lại: xoá hẳn khỏi danh sách
      if (e instanceof LoiApi && e.ma === "can_xoa_han") { setLoi(null); setMo("xoa"); return; }
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
  const khanCap = m.moKhanCapDen && new Date(m.moKhanCapDen) > new Date();
  // Windows: «đang mở» gồm cả thêm giờ đã duyệt (moDen) — «Khoá lại ngay» đóng cả hai
  const moDen = m.moDen && new Date(m.moDen) > new Date() ? m.moDen : khanCap ? m.moKhanCapDen : null;
  const ganCon = (con: string, ten: string) => lam(async () => { await bm.goi(`may/${id}/gan-con`, { con }); bao(`${m.ten} giờ là máy của ${ten}`); await tai(); });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={m.ten} noi={noi} tai={tai}>
      <Canh lv="chi" thap tieu={TT_TRANG[m.trangThai].chu}
        loi={`Đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}${m.phienBan ? ` · bản ${m.phienBan}` : ""}${m.dungChung ? " · máy dùng chung" : ""}`} />

      {win ? (
        <View style={{ gap: 8 }}>
          <Chu kieu="rat" co={14}>Chế độ trên máy</Chu>
          {dangGo ? <Chu mau={M.chu2}>{m.cheDoMay ? TEN_CHE_DO[m.cheDoMay] : "Giám sát"} — tạm khoá vì máy đang được gỡ</Chu>
            : d.xem ? <Chu mau={M.chu2}>{m.cheDo ? TEN_CHE_DO[m.cheDo] : "Chưa biết"} (bạn đang ở quyền Chỉ xem)</Chu>
            : <ChonMot<CheDoMay | ""> ds={CHE_DO} gia={m.cheDo ?? ""} doi={(v) => { if (v) doiCheDo(v); }} />}
          {m.cheDo ? <Chu co={13.5} mau={M.chu2}>{GIAI_CHE_DO[m.cheDo]}</Chu> : null}
          <Chu co={13} mau={M.chu3}>{dongCheDo(m)}</Chu>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <OSo nho="Điểm tuân thủ" so={m.diem} don="/100" />
        <OSo nho="Giải trí" so={m.khoaGiaiTri ? "Đang khoá" : "Mở"} />
      </View>

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

      {m.vanDe.length ? (
        <>
          <NhomTieu chu="Đang cần xử lý" />
          <Nhom>
            {m.vanDe.map((v, i) => (
              <Dong key={v.loai} dau={i === 0} tieu={v.cauBaMe} phu={`Trừ ${v.tru} điểm tuân thủ`} trai={<BieuTron ic="canh_bao" mau="cam" />} />
            ))}
          </Nhom>
        </>
      ) : (
        <Bao loai="ok" ic="tick" tieu="Không có vấn đề tuân thủ nào" />
      )}

      <NhomTieu chu="Khi cần" />

      <Nhom>
        {d.xem ? null : <Dong dau tieu="Đổi tên máy" phu={`Hiện là «${m.ten}» — tên này hiện ở danh sách máy của Con`} trai={<BieuTron ic="may_tinh" mau="lam" />} bam={() => { setTenMoi(m.ten); setMo("ten"); }} />}
        {!khanCap ? (
          <Dong dau={!!d.xem} tieu="Mở khẩn cấp" phu="Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ ngủ, khoá ngày)" trai={<BieuTron ic="mo_khoa" mau="vang" />} bam={() => setMo("khan")} />
        ) : null}
        {win ? (
          <Dong dau={!!khanCap && !!d.xem} tieu="Mã mở khi mất mạng" phu="Máy mất mạng mà cần mở gấp — đọc mã này cho Con gõ vào máy" trai={<BieuTron ic="khoa" mau="lam" />} bam={xemMaOffline} />
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
      {!d.chu ? <Chu co={13} mau={M.chu3}>Chỉ chủ gia đình mới gỡ AiiGrow được.</Chu> : null}

      {m.suKien.length ? (
        <>
          <NhomTieu chu="Nhật ký" />
          <Nhom>
            {m.suKien.slice(0, 20).map((s, i) => <DongSuKien key={i} s={s} dau={i === 0} />)}
          </Nhom>
        </>
      ) : null}

      <BangTruot mo={mo === "ten"} dong={dong} tieu="Đổi tên máy">
        <ONhap nhan="Tên máy" value={tenMoi} onChangeText={(t) => setTenMoi(catTen(t, 80))} autoCapitalize="sentences" placeholder="VD: Laptop của Ken" />
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu tên máy" rong dangChay={dangChay} tat={!chuanHoaTen(tenMoi) || chuanHoaTen(tenMoi) === m.ten} bam={() => lam(async () => {
          const moi = chuanHoaTen(tenMoi);
          if (moi === m.ten) { dong(); return; }
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

      <BangTruot mo={mo === "go"} dong={dong} tieu={`Gỡ AiiGrow khỏi ${m.ten}?`}>
        <Chu mau={M.chu2}>Máy sẽ tự gỡ sạch AiiGrow (dịch vụ, luật chặn app, thông báo đăng nhập, tệp & cấu hình) ở lần đồng bộ tới, rồi tự rời danh sách. Máy đang tắt hoặc mất mạng thì lệnh chờ tới khi máy có mạng. Muốn bảo vệ lại phải cài & ghép lại.</Chu>
        <View style={{ marginTop: 12 }}>
          <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu="Gỡ từ xa" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => goMay(false)} />
        <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={dong} /></View>
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

/** Dòng nhỏ dưới mục chế độ: chế độ THẬT máy đang chạy (agent báo), đang chờ máy đổi, hay agent cũ chưa hỗ trợ đổi từ xa. */
function dongCheDo(m: ChiTietTuanThu) {
  if (m.dangGo) return "Máy đang được gỡ nên tạm chạy Giám sát (không chặn gì).";
  if (!m.daDongBo) return "Máy chưa đồng bộ lần nào — chế độ áp khi máy có mạng.";
  if (!m.cheDoMay) return "Máy chưa báo chế độ đang chạy: bản AiiGrow trên máy có thể cũ, chưa đổi chế độ từ xa được. Cập nhật AiiGrow trên máy (tải ở trang /tai) hoặc gỡ tại máy.";
  if (m.cheDoBaMeChon && m.cheDoBaMeChon !== m.cheDoMay) return `Máy đang chạy ${TEN_CHE_DO[m.cheDoMay]} — sẽ đổi sang ${TEN_CHE_DO[m.cheDoBaMeChon]} ở lần đồng bộ tới (trong vòng 3 phút khi có mạng).`;
  return `Máy đang chạy ${TEN_CHE_DO[m.cheDoMay]}${m.lanCuoi ? ` (báo ${truoc(m.lanCuoi)})` : ""}.`;
}

const gio = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
function chiTiet(s: SuKienTuanThu) {
  const c = s.chi_tiet || {};
  if ((s.loai === "doi_ten_may" || s.loai === "doi_ten_con") && c.tu && c.den) return ` · từ «${c.tu}» thành «${c.den}»`;
  if (s.loai === "mo_khan_cap" && c.phut) return ` · ${c.phut} phút${c.lyDo ? ` — ${c.lyDo}` : ""}`;
  return "";
}
