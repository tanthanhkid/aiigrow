// bm1-dang-ky «Tạo tài khoản Ba Mẹ» — số điện thoại + mật khẩu + nhập lại ⇒ «Nhận mã xác thực». Số đã có tài khoản ⇒ bảng trượt
// them-ahk69dtl (Đăng nhập bằng số này / Quên mật khẩu / Dùng số khác). Nhánh được mời (?moi=<token> hoặc ?duocMoi=1): them-0zrwe8yz.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { bm, LoiApi } from "@/lib/api";
import { nhoDangKy, TEN_MAC_DINH } from "@/lib/dang-ky";
import { DauMan, HeroBan, INK2, LienKet, OLom, useOSo } from "@/lib/lan-dau";
import { BONG } from "@/lib/clay";
import { BangTruot, BaoLoi, Chu, F, LV, M, Man, Nut, useLam } from "@/lib/ui";

export default function DangKy() {
  const { width: wMan } = useWindowDimensions();
  const hep = wMan < 360;
  const wChi = hep ? 104 : 142;
  const { moi, duocMoi, tenNha, tenGoi } = useLocalSearchParams<{ moi?: string; duocMoi?: string; tenNha?: string; tenGoi?: string }>();
  const [sdt, setSdt] = useState("");
  const oSo = useOSo(sdt, (v) => setSdt(v.replace(/[^\d+]/g, "")));
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [daCo, setDaCo] = useState(false);
  const { lam, loi, dangChay, setLoi } = useLam();
  const khop = mk.length >= 8 && mk === mk2;
  const tieu = tenNha ? `Vào nhà cùng ${tenNha}` : "Tạo tài khoản Ba Mẹ";
  const gui = () => lam(async () => {
    try {
      const r = await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: sdt, mucDich: "dang_ky" });
      nhoDangKy({ dinhDanh: r.guiDen, ten: String(tenGoi || TEN_MAC_DINH), matKhau: mk, maThu: r.ma, moi: moi ? String(moi) : undefined,
        duocMoi: !!duocMoi || !!moi, tenNha: tenNha ? String(tenNha) : undefined });
      router.push("/otp");
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "da_co_tai_khoan") { setLoi(null); setDaCo(true); return; }
      throw e;
    }
  });
  const an = sdt.replace(/\D/g, "").replace(/^(\d{4})\d+(\d{3})$/, "$1 *** $2") || sdt;
  return (
    <Man dau={<DauMan ve={moi || duocMoi ? "/moi" : "/tao-tai-khoan"} />} dayStyle={{ paddingTop: 0, paddingBottom: 18, gap: 2 }}
      day={<><BaoLoi loi={loi} /><Nut chu="Nhận mã xác thực" rong lon dangChay={dangChay} tat={!sdt.trim() || !khop} bam={gui} />
        <View style={{ minHeight: 36, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.thuong, fontSize: 13, color: M.chu3 }}>Mã 6 số gửi tới số điện thoại trên</Text></View></>}>
      <HeroBan tieu={tieu} loi="Số điện thoại và mật khẩu là xong." />
      <View>
        <OLom lon dau nhan="Số điện thoại" {...oSo} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="0912 345 678" />
        <OLom lon nhan="Mật khẩu" ghi="Ít nhất 8 ký tự" matKhau value={mk} onChangeText={setMk} autoComplete="new-password" textContentType="newPassword" />
        <OLom lon nhan="Nhập lại mật khẩu" ghi={mk2 ? (khop ? "Đã khớp" : "Chưa khớp") : undefined} ghiOk={khop} matKhau value={mk2} onChangeText={setMk2} autoComplete="new-password" onSubmitEditing={() => khop && sdt && gui()} />
      </View>
      <BangTruot ban mo={daCo} dong={() => setDaCo(false)} tieu="">
        {/* bàn them-ahk69dtl (sửa 19/11): thẻ cao 132 kem nổi, viên số bên trái, Grow chỉ tay 142 rộng tràn đáy thẻ; tiêu đề 22; 3 nút cách 10, đáy cách 18 */}
        <View style={{ height: 132, borderRadius: 30, backgroundColor: M.nen, boxShadow: BONG.the, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: 18, top: 42, maxWidth: "62%", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: M.the, boxShadow: BONG.nho }}>
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: hep ? 17 : 20, lineHeight: 28, letterSpacing: hep ? 0 : 0.5, color: M.chu, fontVariant: ["tabular-nums"] }}>{an}</Text>
          </View>
          <View pointerEvents="none" style={{ position: "absolute", right: 4, bottom: -26, width: wChi, height: wChi * 193 / 142 }}>
            <Image cachePolicy="memory-disk" source={LV.chi} style={{ width: wChi, height: wChi * 193 / 142 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          </View>
        </View>
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: M.chu, textAlign: "center" }}>Số này đã có tài khoản</Text>
          <Text style={{ marginTop: 4, fontFamily: F.thuong, fontSize: 14, lineHeight: 20, color: INK2, textAlign: "center" }}>Đăng nhập để vào lại nhà mình nhé.</Text>
        </View>
        <View style={{ marginTop: 6, gap: 10 }}>
          <Nut chu="Đăng nhập bằng số này" rong lon bam={() => { setDaCo(false); router.push({ pathname: "/dang-nhap", params: { dd: sdt, ...(moi || duocMoi ? { moi: moi ? String(moi) : "1" } : {}) } }); }} />
          <Nut chu="Quên mật khẩu" loai="nho" rong lon bam={() => { setDaCo(false); router.push({ pathname: "/quen-mat-khau", params: { dd: sdt, ...(moi || duocMoi ? { moi: moi ? String(moi) : "1" } : {}) } }); }} />
          <LienKet chu="Dùng số khác" gach co={14} bam={() => { setDaCo(false); setSdt(""); }} />
        </View>
      </BangTruot>
    </Man>
  );
}
