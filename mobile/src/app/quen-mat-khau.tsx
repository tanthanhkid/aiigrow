// them-2g3zpiie «Quên mật khẩu» (gộp nhập mã vào cùng màn — Nghi chọn pa-mw007t65-1) ⇒ them-6aomy24b «Đặt mật khẩu mới».
// 1) nhập số đã đăng ký, «Gửi mã» (POST otp {mucDich: quen_mk}) · 2) nhập mã 6 số ⇒ «Xác nhận mã» ⇒ đặt mật khẩu mới + nhập lại ⇒
// POST quen-mat-khau {dinhDanh, ma, matKhauMoi} rồi đăng nhập luôn («Lưu mật khẩu và vào app»).
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { bm, LoiApi } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { CanGiup, DauMan, demNguoc, INK2, NhanBuoc, OLom, OSoGui, SanQuenMk, useOSo } from "@/lib/lan-dau";
import { Bao, BaoLoi, Chu, F, M, Ma6, Man, Nut, useLam } from "@/lib/ui";

export default function QuenMatKhau() {
  const { dd: ddVao, moi } = useLocalSearchParams<{ dd?: string; moi?: string }>();
  const [dd, setDd] = useState(String(ddVao ?? ""));
  const [gui, setGui] = useState<{ guiDen: string; ma?: string } | null>(null);
  const [ma, setMa] = useState("");
  const [buoc2, setBuoc2] = useState(false);
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [con, setCon] = useState(0);
  const oSo = useOSo(dd, (v) => { setDd(v); setGui(null); });
  const { vao } = usePhien();
  const { lam, loi, dangChay, setLoi } = useLam();
  useEffect(() => { const t = setInterval(() => setCon((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, []);
  const guiMa = () => lam(async () => { setGui(await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: dd, mucDich: "quen_mk" })); setCon(60); });
  const khop = mk.length >= 8 && mk === mk2;
  const luu = () => lam(async () => {
    const dinhDanh = gui?.guiDen ?? dd;
    try { await bm.goi("quen-mat-khau", { dinhDanh, ma, matKhauMoi: mk }); } catch (e) {
      // mã sai / hết hạn: quay lại bước nhập mã (mật khẩu mới vẫn giữ trong ô)
      if (e instanceof LoiApi && /^otp/.test(e.ma)) { setBuoc2(false); setMa(""); setTimeout(() => setLoi(e.message), 0); return; }
      throw e;
    }
    // mật khẩu đã đổi (mã đã dùng): đăng nhập trượt thì sang màn Đăng nhập, không bắt nhập lại mã
    const r = await bm.goi<{ token: string }>("dang-nhap", { dinhDanh, matKhau: mk }).catch(() => null);
    if (r) await vao(r.token, false, moi ? (moi === "1" ? "/moi/vao" : `/moi/vao?ma=${encodeURIComponent(moi)}`) : undefined); else router.replace({ pathname: "/dang-nhap", params: { dd: dinhDanh } });
  });
  if (buoc2) {
    return (
      <Man dau={<DauMan bamLui={() => setBuoc2(false)} giua={<VachBuoc dang={2} />} phai={<CanGiup />} />}
        day={<><BaoLoi loi={loi} /><Nut chu="Lưu mật khẩu và vào app" rong dangChay={dangChay} tat={!khop} bam={luu} /></>}>
        {/* bàn them-6aomy24b (20/11): thẻ 200 + tiêu đề 28 cách thẻ 20 + ô 58 nhãn trên, gợi ý / «✓ Đã khớp» dưới ô */}
        <SanQuenMk moKhoa thoai="Mã đúng rồi! Chọn mật khẩu mới nhé." />
        <Text accessibilityRole="header" style={{ marginTop: 8, textAlign: "center", fontFamily: F.tieu, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: M.chu }}>Đặt mật khẩu mới</Text>
        <View style={{ marginTop: 2 }}>
          <OLom lon cach={10} nhan="Mật khẩu mới" ghi="Ít nhất 8 ký tự" ghiDuoi matKhau value={mk} onChangeText={setMk} autoComplete="new-password" textContentType="newPassword" />
          <OLom lon cach={18} nhan="Nhập lại mật khẩu mới" ghi={mk2 ? (khop ? "Đã khớp" : "Chưa khớp") : undefined} ghiOk={khop} ghiDuoi matKhau value={mk2} onChangeText={setMk2} autoComplete="new-password" />
        </View>
      </Man>
    );
  }
  return (
    <Man dau={<DauMan ve="/dang-nhap" giua={<VachBuoc dang={1} />} phai={<CanGiup />} />} dayStyle={{ paddingTop: 0, paddingBottom: 22 }}
      day={<><BaoLoi loi={loi} /><Nut chu="Xác nhận mã" rong lon tat={!gui || ma.length < 6} bam={() => setBuoc2(true)} /></>}>
      {/* bàn them-2g3zpiie (sửa 19/11): thẻ 200 + tiêu đề 28 + hai bước (nhãn viên tròn navy số vàng), ô số 60 kèm nút navy chữ vàng, 6 ô mã đều cột */}
      <SanQuenMk thoai="Đừng lo, Grow giúp lấy lại nè!" />
      <Text accessibilityRole="header" style={{ marginTop: 8, textAlign: "center", fontFamily: F.tieu, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: M.chu }}>Quên mật khẩu</Text>
      <View style={{ marginTop: 10 }}>
        <NhanBuoc n={1} chu="Nhập số đã đăng ký, bấm Gửi mã" />
        <OSoGui {...oSo} da={!!gui} dangChay={dangChay} tat={!dd.trim()} bam={guiMa} />
        <NhanBuoc n={2} cach={20} chu="Nhập mã 6 số vừa nhận" />
        <Ma6 quen gia={ma} doi={setMa} />
        {gui ? (
          <View style={{ alignItems: "center", marginTop: 6 }}>
            {con > 0 ? <Text style={{ minHeight: 44, textAlignVertical: "center", lineHeight: 44, fontFamily: F.dam, fontSize: 14, color: INK2 }}>Chưa nhận được? <Text style={{ fontFamily: F.rat, color: M.chu }}>{`Gửi lại sau ${demNguoc(con)}`}</Text></Text>
              : <Pressable onPress={guiMa} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Chu kieu="rat" co={14} mau={M.chinhInk}>Chưa nhận được? Gửi lại mã</Chu></Pressable>}
          </View>
        ) : null}
      </View>
      {gui?.ma ? <Bao loai="canh" tieu={`Bản thử: mã là ${gui.ma}`} loi="Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử." /> : null}
    </Man>
  );
}

/** Vạch tiến độ 2 bước ở giữa thanh đầu (bàn them-2g3zpiie v4 / them-6aomy24b v8): bước đã tới vạch vàng kim, bước sau vạch xám. */
const VachBuoc = ({ dang }: { dang: 1 | 2 }) => (
  <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="progressbar" accessibilityLabel={`Bước ${dang} trên 2`}>
    {[1, 2].map((i) => <View key={i} style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: "#E3D9CB", boxShadow: "inset 3px 3px 6px rgba(120,98,70,0.28), inset -3px -3px 6px #FFFBF5", ...(i <= dang ? { backgroundImage: "linear-gradient(135deg, #FBE7B0 0%, #F4C76A 38%, #C9973B 72%, #F2D48C 100%)", boxShadow: "none" } : null) } as never} />)}
  </View>
);
