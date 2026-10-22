// bm-an-toan-may: một máy — điểm tuân thủ, vấn đề đang có, nhật ký, và mục «An toàn & gỡ cài đặt»: chế độ Giám sát / Chặn thật
// (đổi từ xa), MỞ KHẨN CẤP (có hạn giờ), mã mở khi mất mạng, GỠ AN TOÀN (chỉ chủ gia đình, nhập lại mật khẩu; máy chỉ rời danh sách
// khi agent báo đã gỡ — không để AiiGrow «dính» lại trên máy Con) + cách gỡ tại máy khi không có mạng.
// Gọi GET may/:id/tuan-thu, POST may/:id/che-do, POST may/:id/mo-khan-cap(+/huy), GET may/:id/ma-offline, POST may/:id/go (docs/API.md).
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, GOC, LoiApi, type CheDoMay, type ChiTietTuanThu, type KqGoMay, type MaOffline, type SuKienTuanThu, TT_TRANG } from "@/lib/api";
import {
  BangTruot, Bao, BaoLoi, BieuTron, Canh, cauLoi, Chips, ChoTai, ChonMot, Chu, Dong, M, Man, Nhom, NhomTieu, Nut, ONhap, OSo, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const PHUT = [15, 30, 60, 120];
const SU_KIEN: Record<string, string> = {
  tuan_thu_lech: "Lệch chuẩn tuân thủ", tuan_thu_on: "Tuân thủ trở lại", may_ngoai_vong: "Máy ngoài vòng kiểm soát", may_tro_lai: "Máy đồng bộ trở lại",
  mo_khan_cap: "Ba Mẹ mở khẩn cấp", huy_mo_khan_cap: "Huỷ mở khẩn cấp", het_mo_khan_cap: "Hết giờ mở khẩn cấp", tin_cay_admin: "Xác nhận tài khoản quản trị",
  lenh_go: "Ra lệnh gỡ từ xa", go_may: "Máy đã gỡ AiiGrow", xem_ma_offline: "Xem mã mở offline", may_mo_ma_offline: "Máy mở bằng mã offline", may_sai_ma_offline: "Gõ sai mã offline nhiều lần", may_het_ma_offline: "Có mạng lại, hết mở bằng mã", doi_che_do: "Đổi chế độ",
};
const CHE_DO: { gia: CheDoMay; chu: string }[] = [{ gia: "giam-sat", chu: "Giám sát" }, { gia: "chan", chu: "Chặn thật" }];
const GIAI_CHE_DO: Record<CheDoMay, string> = {
  "giam-sat": "Chỉ ghi lại những gì sẽ chặn, KHÔNG chặn app, không khoá máy. Hợp để thử vài ngày hoặc khi cần tắt hết hạn chế.",
  chan: "Áp thật: chặn app ngoài danh sách, khoá máy ngoài giờ. Muốn tắt lúc nào cũng được — chọn lại Giám sát.",
};
const NGAY_XOA_HAN = 7;

export default function AnToanMay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const toi = await bm.goi<{ baMe: { vai: string } }>("toi");
    // Máy đã gỡ xong (agent báo đã gỡ / đã xoá hẳn) ⇒ không còn trong gia đình
    const m = await bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`).catch((e) => { if (e instanceof LoiApi && e.ma === "khong_thay") return null; throw e; });
    return { m, chu: toi.baMe.vai === "chu", xem: toi.baMe.vai === "xem" };
  });
  const [mo, setMo] = useState<"khan" | "go" | "xoa" | "offline" | "tai_may" | null>(null);
  const [phut, setPhut] = useState(30);
  const [lyDo, setLyDo] = useState("");
  const [mk, setMk] = useState("");
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
  // Đang chờ máy nhận lệnh gỡ ⇒ tự tải lại mỗi 20 giây để thấy «đã gỡ» ngay khi máy báo xong
  useEffect(() => {
    if (!dangGo) return;
    const t = setInterval(() => { tai(); }, 20_000);
    return () => clearInterval(t);
  }, [dangGo, tai]);
  const doiCheDo = (v: CheDoMay) => lam(async () => {
    if (!d?.m || v === d.m.cheDo) return;
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
  if (!d) return <Man lui={{ chu: "An toàn thiết bị" }} tieu="Máy"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.m) return (
    <Man lui={{ chu: "An toàn thiết bị" }} tieu="Máy">
      <Bao loai="ok" ic="tick" tieu="Máy này không còn trong gia đình" loi="AiiGrow đã được gỡ (hoặc máy đã được xoá khỏi danh sách). Máy không còn bị hạn chế gì từ AiiGrow." />
      <Nut chu="Quay lại" loai="vien" rong bam={() => router.back()} />
    </Man>
  );
  const m = d.m;
  const win = m.nen === "windows";
  const khanCap = m.moKhanCapDen && new Date(m.moKhanCapDen) > new Date();
  return (
    <Man lui={{ chu: "An toàn thiết bị" }} tieu={m.ten} noi={noi} tai={tai}>
      <Canh lv="chi" thap tieu={TT_TRANG[m.trangThai].chu}
        loi={`Đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}${m.phienBan ? ` · bản ${m.phienBan}` : ""}${m.dungChung ? " · máy dùng chung" : ""}`} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <OSo nho="Điểm tuân thủ" so={m.diem} don="/100" />
        <OSo nho="Giải trí" so={m.khoaGiaiTri ? "Đang khoá" : "Mở"} />
      </View>

      {khanCap ? (
        <Bao loai="lam" ic="mo_khoa" tieu="Đang mở khẩn cấp" loi={`Giải trí được mở tới ${gio(m.moKhanCapDen!)}.`}>
          <Nut chu="Khoá lại ngay" loai="vien" nho bam={() => lam(async () => { await bm.goi(`may/${id}/mo-khan-cap/huy`, {}); bao(`Đã khoá lại ${m.ten}`); await tai(); })} />
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

      <NhomTieu chu="An toàn & gỡ cài đặt" />
      {win ? (
        <View style={{ gap: 8 }}>
          <Chu kieu="rat" co={14}>Chế độ trên máy</Chu>
          {d.xem ? <Chu mau={M.chu2}>{m.cheDo === "chan" ? "Chặn thật" : "Giám sát"} (bạn đang ở quyền Chỉ xem)</Chu>
            : <ChonMot ds={CHE_DO} gia={m.cheDo} doi={doiCheDo} />}
          <Chu co={13.5} mau={M.chu2}>{GIAI_CHE_DO[m.cheDo]}</Chu>
          <Chu co={13} mau={M.chu3}>
            {m.dangGo ? "Máy đang được gỡ nên tạm chạy Giám sát (không chặn gì)." : "Máy sẽ đổi ở lần đồng bộ tới (≤ 1 phút khi có mạng)."}
          </Chu>
        </View>
      ) : null}

      <Nhom>
        {!khanCap ? (
          <Dong dau tieu="Mở khẩn cấp" phu="Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ ngủ, khoá ngày)" trai={<BieuTron ic="mo_khoa" mau="vang" />} bam={() => setMo("khan")} />
        ) : null}
        {win ? (
          <Dong dau={!!khanCap} tieu="Mã mở khi mất mạng" phu="Máy mất mạng mà cần mở gấp — đọc mã này cho Con gõ vào máy" trai={<BieuTron ic="khoa" mau="lam" />} bam={xemMaOffline} />
        ) : null}
      </Nhom>

      {m.dangGo ? (
        <Bao loai="lam" ic="dong_ho_cat" tieu="Đang chờ máy nhận lệnh gỡ…"
          loi={`Gửi ${truoc(m.dangGo.tu)}. Khi có mạng, máy tự gỡ AiiGrow rồi tự rời danh sách. Máy không bật lại nữa? Sau ${NGAY_XOA_HAN} ngày không liên lạc, bạn xoá hẳn được.`}>
          {d.chu && m.coTheXoaHan ? <Nut chu="Xoá hẳn khỏi danh sách" loai="vien" nho bam={() => setMo("xoa")} /> : null}
        </Bao>
      ) : null}

      <Nhom>
        {d.chu && !m.dangGo && m.daDongBo ? (
          <Dong dau tieu="Gỡ AiiGrow khỏi máy này (từ xa)" phu="Máy tự gỡ sạch ở lần đồng bộ tới — cần nhập lại mật khẩu của bạn" trai={<BieuTron ic="thoat" mau="do" />} bam={() => setMo("go")} />
        ) : null}
        {d.chu && !m.daDongBo ? (
          <Dong dau tieu="Xoá máy khỏi danh sách" phu="Máy chưa đồng bộ lần nào nên không nhận được lệnh gỡ" trai={<BieuTron ic="thoat" mau="do" />} bam={() => setMo("xoa")} />
        ) : null}
        <Dong dau={!d.chu || (!!m.dangGo && m.daDongBo)} tieu="Gỡ tại máy (khi không có mạng)" phu="Từng bước gỡ ngay trên máy của Con, cần mật khẩu quản trị của Ba Mẹ" trai={<BieuTron ic="may_tinh" mau="lam" />} bam={() => setMo("tai_may")} />
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
            <Chu mau={M.chu2}>Máy có mạng thì dùng «Gỡ từ xa» cho nhanh. Khi máy không có mạng, làm trên chính máy của Con:</Chu>
            <Chu style={{ marginTop: 10 }}>1. Đăng nhập máy bằng tài khoản quản trị (tài khoản của Ba Mẹ, không phải của Con).</Chu>
            <Chu style={{ marginTop: 6 }}>2. Mở Cài đặt → Ứng dụng → Ứng dụng đã cài → AiiGrow → Gỡ cài đặt. Windows sẽ hỏi mật khẩu quản trị — chỉ Ba Mẹ biết nên Con không tự gỡ được.</Chu>
            <Chu co={13} mau={M.chu3} style={{ marginTop: 4 }}>Mục AiiGrow trong «Ứng dụng» có từ bản AiiGrow kế tiếp. Máy đang chạy bản cũ chưa có mục này thì làm bước 3.</Chu>
            <Chu style={{ marginTop: 6 }}>3. Bản cũ: tìm tệp AiiGrow.Setup.exe trong thư mục đã giải nén lúc cài (mất thì tải lại ở {GOC}/tai). Bấm Start, gõ PowerShell, chuột phải → «Run as administrator», rồi gõ:</Chu>
            <Chu kieu="rat" co={13.5} style={{ marginTop: 6 }} mau={M.chinhInk}>{'& "$env:USERPROFILE\\Downloads\\AiiGrow\\AiiGrow.Setup.exe" --uninstall'}</Chu>
            <Chu co={13} mau={M.chu3} style={{ marginTop: 4 }}>(Đổi đường dẫn cho đúng chỗ bạn để tệp. Tệp này không nằm trong C:\Program Files\AiiGrow — thư mục đó chỉ có dịch vụ và khay.) Bấm Yes để gỡ: dịch vụ, luật chặn app, thông báo đăng nhập, tệp & cấu hình đều được xoá.</Chu>
            <Chu style={{ marginTop: 6 }}>4. Xong, quay lại đây bấm «Gỡ AiiGrow từ xa». Máy đã gỡ rồi nên sẽ không báo lại; sau {NGAY_XOA_HAN} ngày bạn xoá hẳn được máy khỏi danh sách.</Chu>
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

const gio = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
function chiTiet(s: SuKienTuanThu) {
  const c = s.chi_tiet || {};
  if (s.loai === "mo_khan_cap" && c.phut) return ` · ${c.phut} phút${c.lyDo ? ` — ${c.lyDo}` : ""}`;
  return "";
}
