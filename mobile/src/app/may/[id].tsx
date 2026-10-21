// bm-an-toan-may: một máy — điểm tuân thủ, vấn đề đang có, nhật ký, MỞ KHẨN CẤP (có hạn giờ) và GỠ TỪ XA (chỉ chủ gia đình,
// nhập lại mật khẩu). Gọi GET may/:id/tuan-thu, POST may/:id/mo-khan-cap(+/huy), POST may/:id/go-tu-xa (docs/API.md).
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ChiTietTuanThu, type MaOffline, type SuKienTuanThu, TT_TRANG } from "@/lib/api";
import {
  BangTruot, Bao, BaoLoi, BieuTron, Canh, cauLoi, Chips, ChoTai, Chu, Dong, M, Man, Nhom, NhomTieu, Nut, ONhap, OSo, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const PHUT = [15, 30, 60, 120];
const SU_KIEN: Record<string, string> = {
  tuan_thu_lech: "Lệch chuẩn tuân thủ", tuan_thu_on: "Tuân thủ trở lại", may_ngoai_vong: "Máy ngoài vòng kiểm soát", may_tro_lai: "Máy đồng bộ trở lại",
  mo_khan_cap: "Ba Mẹ mở khẩn cấp", huy_mo_khan_cap: "Huỷ mở khẩn cấp", het_mo_khan_cap: "Hết giờ mở khẩn cấp", tin_cay_admin: "Xác nhận tài khoản quản trị",
  lenh_go: "Ra lệnh gỡ từ xa", go_may: "Máy đã gỡ AiiGrow", xem_ma_offline: "Xem mã mở offline",
};

export default function AnToanMay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [m, toi] = await Promise.all([bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`), bm.goi<{ baMe: { vai: string } }>("toi")]);
    return { m, chu: toi.baMe.vai === "chu" };
  });
  const [mo, setMo] = useState<"khan" | "go" | "offline" | null>(null);
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
  if (!d) return <Man lui={{ chu: "An toàn thiết bị" }} tieu="Máy"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const m = d.m;
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

      <NhomTieu chu="Ba Mẹ" />
      <Nhom>
        {!khanCap ? (
          <Dong dau tieu="Mở khẩn cấp" phu="Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ ngủ, khoá ngày)" trai={<BieuTron ic="mo_khoa" mau="vang" />} bam={() => setMo("khan")} />
        ) : null}
        {m.nen === "windows" ? (
          <Dong tieu="Mã mở khi mất mạng" phu="Máy mất mạng mà cần mở gấp — đọc mã này cho Con gõ vào máy" trai={<BieuTron ic="khoa" mau="lam" />} bam={xemMaOffline} />
        ) : null}
        {d.chu ? (
          <Dong dau={!!khanCap} tieu="Gỡ AiiGrow khỏi máy này (từ xa)" phu="Ra lệnh cho máy tự gỡ phần mềm — cần nhập lại mật khẩu của bạn" trai={<BieuTron ic="thoat" mau="do" />} bam={() => setMo("go")} />
        ) : null}
      </Nhom>

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
        <Chu mau={M.chu2}>Máy sẽ tự gỡ phần mềm AiiGrow trong lần đồng bộ tới và không còn được bảo vệ. Muốn bảo vệ lại phải cài & ghép lại. Nhập mật khẩu của bạn để xác nhận.</Chu>
        <View style={{ marginTop: 12 }}>
          <ONhap nhan="Mật khẩu của bạn" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu="Gỡ từ xa" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={() => lam(async () => {
          const r = await bm.goi<{ lapLai: boolean }>(`may/${id}/go-tu-xa`, { matKhau: mk }); dong();
          bao(r.lapLai ? `${m.ten} đã có lệnh gỡ đang chờ` : `Đã gửi lệnh gỡ tới ${m.ten}`); await tai();
        })} />
        <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={dong} /></View>
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
