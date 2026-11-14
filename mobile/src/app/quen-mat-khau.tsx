// them-2g3zpiie «Quên mật khẩu» (gộp nhập mã vào cùng màn — Nghi chọn pa-mw007t65-1) ⇒ them-6aomy24b «Đặt mật khẩu mới».
// 1) nhập số đã đăng ký, «Gửi mã» (POST otp {mucDich: quen_mk}) · 2) nhập mã 6 số ⇒ «Xác nhận mã» ⇒ đặt mật khẩu mới + nhập lại ⇒
// POST quen-mat-khau {dinhDanh, ma, matKhauMoi} rồi đăng nhập luôn («Lưu mật khẩu và vào app»).
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, LoiApi } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { CanGiup, CanhRob, DauMan, demNguoc, OLom, OLomTran, TieuDe } from "@/lib/lan-dau";
import { Bao, BaoLoi, Chu, Icon, M, Ma6, Man, Nut, useLam } from "@/lib/ui";
import { BONG } from "@/lib/clay";

export default function QuenMatKhau() {
  const { dd: ddVao, moi } = useLocalSearchParams<{ dd?: string; moi?: string }>();
  const [dd, setDd] = useState(String(ddVao ?? ""));
  const [gui, setGui] = useState<{ guiDen: string; ma?: string } | null>(null);
  const [ma, setMa] = useState("");
  const [buoc2, setBuoc2] = useState(false);
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [con, setCon] = useState(0);
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
      <Man dau={<DauMan bamLui={() => setBuoc2(false)} phai={<CanGiup />} />}
        day={<><BaoLoi loi={loi} /><Nut chu="Lưu mật khẩu và vào app" rong dangChay={dangChay} tat={!khop} bam={luu} /></>}>
        <CanhRob lv="xong" ic="mo_khoa" tieu="Gần xong rồi! Chọn mật khẩu mới nhé." cao={150} />
        <TieuDe chu="Đặt mật khẩu mới" giua />
        <OLom nhan="Mật khẩu mới" ghi="Ít nhất 8 ký tự" matKhau value={mk} onChangeText={setMk} autoComplete="new-password" textContentType="newPassword" />
        <OLom nhan="Nhập lại mật khẩu mới" ghi={mk2 ? (khop ? "Đã khớp" : "Chưa khớp") : undefined} ghiOk={khop} matKhau value={mk2} onChangeText={setMk2} autoComplete="new-password" />
      </Man>
    );
  }
  return (
    <Man dau={<DauMan ve="/dang-nhap" phai={<CanGiup />} />}
      day={<><BaoLoi loi={loi} /><Nut chu="Xác nhận mã" rong tat={!gui || ma.length < 6} bam={() => setBuoc2(true)} /></>}>
      <CanhRob lv="so-tay" ic="khoa" tieu="Đừng lo, Grow giúp lấy lại nè!" cao={150} />
      <TieuDe chu="Quên mật khẩu" giua />
      <SoBuoc n={1} chu="Nhập số đã đăng ký, bấm Gửi mã" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 54, borderRadius: 27, backgroundColor: "#e9e8e4", boxShadow: BONG.lom, paddingLeft: 18, paddingRight: 6 }}>
        <View style={{ flex: 1 }}><OLomTran value={dd} onChangeText={(t) => { setDd(t); setGui(null); }} /></View>
        {gui ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: M.chinh, borderRadius: 20, paddingHorizontal: 12, height: 40, boxShadow: BONG.ngoc }}>
            <Icon ten="tick" mau="#fff" co={14} /><Chu kieu="rat" co={13} mau="#fff">Đã gửi mã</Chu>
          </View>
        ) : <Nut chu="Gửi mã" nho dangChay={dangChay} tat={!dd.trim()} bam={guiMa} />}
      </View>
      <SoBuoc n={2} chu="Nhập mã 6 số vừa nhận" />
      <Ma6 gia={ma} doi={setMa} />
      {gui ? (
        <View style={{ alignItems: "center" }}>
          {con > 0 ? <Chu co={13.5} mau={M.chu3}>Chưa nhận được? <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{`Gửi lại sau ${demNguoc(con)}`}</Chu></Chu>
            : <Pressable onPress={guiMa} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Chu kieu="rat" co={14} mau={M.chinhInk}>Chưa nhận được? Gửi lại mã</Chu></Pressable>}
        </View>
      ) : null}
      {gui?.ma ? <Bao loai="canh" tieu={`Bản thử: mã là ${gui.ma}`} loi="Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử." /> : null}
    </Man>
  );
}

const SoBuoc = ({ n, chu }: { n: number; chu: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center" }}><Chu kieu="rat" co={12} mau="#fff">{n}</Chu></View>
    <Chu kieu="rat" co={14}>{chu}</Chu>
  </View>
);
