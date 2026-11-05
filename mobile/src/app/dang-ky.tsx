// bm1-dang-ky «Tạo tài khoản Ba Mẹ» — số điện thoại + mật khẩu + nhập lại ⇒ «Nhận mã xác thực». Số đã có tài khoản ⇒ bảng trượt
// them-ahk69dtl (Đăng nhập bằng số này / Quên mật khẩu / Dùng số khác). Nhánh được mời (?moi=<token> hoặc ?duocMoi=1): them-0zrwe8yz.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, LoiApi } from "@/lib/api";
import { nhoDangKy, TEN_MAC_DINH } from "@/lib/dang-ky";
import { CanhRob, DauMan, LienKet, OLom } from "@/lib/lan-dau";
import { BangTruot, BaoLoi, Chu, M, Man, Nut, Rob, useLam } from "@/lib/ui";

export default function DangKy() {
  const { moi, duocMoi, tenNha, tenGoi } = useLocalSearchParams<{ moi?: string; duocMoi?: string; tenNha?: string; tenGoi?: string }>();
  const [sdt, setSdt] = useState("");
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
    <Man dau={<DauMan ve={moi || duocMoi ? "/moi" : "/tao-tai-khoan"} />}
      day={<><BaoLoi loi={loi} /><Nut chu="Nhận mã xác thực" rong dangChay={dangChay} tat={!sdt.trim() || !khop} bam={gui} />
        <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>Mã 6 số gửi tới số điện thoại trên</Chu></>}>
      <CanhRob lv="so-tay" tieu={tieu} loi="Số điện thoại và mật khẩu là xong." cao={140} />
      <OLom nhan="Số điện thoại" value={sdt} onChangeText={setSdt} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="0912 345 678" />
      <OLom nhan="Mật khẩu" ghi="Ít nhất 8 ký tự" matKhau value={mk} onChangeText={setMk} autoComplete="new-password" textContentType="newPassword" />
      <OLom nhan="Nhập lại mật khẩu" ghi={mk2 ? (khop ? "Đã khớp" : "Chưa khớp") : undefined} ghiOk={khop} matKhau value={mk2} onChangeText={setMk2} autoComplete="new-password" onSubmitEditing={() => khop && sdt && gui()} />
      <BangTruot mo={daCo} dong={() => setDaCo(false)} tieu="">
        <View style={{ alignItems: "center", gap: 10, marginTop: -30 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch", borderRadius: 26, backgroundColor: "#dcebe6", padding: 14 }}>
            <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 }}><Chu kieu="rat" co={20} so>{an}</Chu></View>
            <Rob ten="chi" co={96} />
          </View>
          <Chu kieu="rat" co={21} style={{ textAlign: "center" }}>Số này đã có tài khoản</Chu>
          <Chu co={14.5} mau={M.chu2} style={{ textAlign: "center" }}>Đăng nhập để vào lại nhà mình nhé.</Chu>
        </View>
        <Nut chu="Đăng nhập bằng số này" rong bam={() => { setDaCo(false); router.push({ pathname: "/dang-nhap", params: { dd: sdt, ...(moi || duocMoi ? { moi: moi ? String(moi) : "1" } : {}) } }); }} />
        <Nut chu="Quên mật khẩu" loai="vien" rong bam={() => { setDaCo(false); router.push({ pathname: "/quen-mat-khau", params: { dd: sdt, ...(moi || duocMoi ? { moi: moi ? String(moi) : "1" } : {}) } }); }} />
        <LienKet chu="Dùng số khác" gach bam={() => { setDaCo(false); setSdt(""); }} />
      </BangTruot>
    </Man>
  );
}
