// «Tài khoản của bạn» (thiết kế 14/11 bm-ca-nha/08 them-ncmuuqav; bảng «Rời khỏi nhà này?» 10 them-liz6hzww; «Xoá tài khoản …?» 11 them-4vj35r7c):
// ảnh chữ + «Bạn cùng trông N con», «Tên hiển thị · Lưu tên» (POST toi/ten), «Đăng nhập»: SĐT / email · «Đổi mật khẩu» (/doi-mat-khau;
// tài khoản Google / Facebook chưa có mật khẩu ⇒ /dat-mat-khau), «Rời đi»: Đăng xuất · Rời nhà (không phải người tạo nhà — POST thanh-vien/roi-nha) ·
// Xoá tài khoản (chuyển từ tab Cả nhà — Apple 5.1.1(v), server/lib/xoa-tai-khoan.ts: hỏi máy chủ trước, bị chặn thì hiện hướng dẫn, rồi nhập mật khẩu).
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, LoiApi } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { chuDau, KHOA_CA_NHA, napCaNha } from "@/lib/ca-nha";
import { MucTieu, OIcon, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { Avt, BangTruot, BaoLoi, baoKhiVe, cauLoi, ChoTai, Chu, Dong, M, MAU_CON, Man, Nhom, Nut, ONhap, TickDong, tien, useLam, useTai } from "@/lib/ui";

export default function TaiKhoan() {
  const { ra } = usePhien();
  const { d, loi, matMang, tai } = useTai(napCaNha, KHOA_CA_NHA);
  const [ten, setTen] = useState<string | null>(null);
  const [mo, setMo] = useState<null | "roi" | "xoa">(null);
  const [mk, setMk] = useState("");
  // Máy chủ chặn xoá (chủ còn Ba/Mẹ khác / còn máy đã ghép): mã + câu hướng dẫn của máy chủ
  const [chan, setChan] = useState<{ ma: string; cau: string } | null>(null);
  const [dangKiem, setDangKiem] = useState(false);
  const luuTen = useLam();
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const ve = () => veHoac("/cai-dat");
  if (!d) return <Man lui={{ chu: "Cả nhà", bam: ve }} tieu="Tài khoản của bạn"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const toi = d.toi.baMe;
  const laChu = toi.laChuNha ?? toi.vai === "chu";
  const khac = d.tv.ds.filter((x) => !x.laToi);
  const soCon = d.g.con.length;
  const t = ten ?? toi.ten;
  const dd = toi.dinhDanh ?? "", email = dd.includes("@");
  const khongMk = toi.coMatKhau === false;
  const dong = () => { setMo(null); setMk(""); setLoi(null); };
  const laChan = (e: unknown): e is LoiApi => e instanceof LoiApi && (e.ma === "con_may" || e.ma === "con_thanh_vien");
  const moXoa = async () => {
    if (dangKiem) return;
    setDangKiem(true);
    setChan(null);
    try {
      await bm.goi("xoa-tai-khoan", { kiemTra: true });
    } catch (e) {
      if (e instanceof LoiApi && e.status === 401) return;
      setChan(laChan(e) ? { ma: e.ma, cau: e.message } : { ma: "loi", cau: cauLoi(e) });
    } finally {
      setDangKiem(false);
    }
    setMo("xoa");
  };
  const xoa = () => lam(async () => {
    let r: { xoa: "tai_khoan" | "gia_dinh" };
    try {
      r = await bm.goi("xoa-tai-khoan", { matKhau: mk });
    } catch (e) {
      // Không đảo được: mất mạng lúc chờ phản hồi thì KHÔNG nói «chưa có gì thay đổi» — máy chủ có thể đã xoá xong.
      if (e instanceof LoiApi && e.ma === "mat_mang") throw new LoiApi("mat_mang_xoa", "Mất kết nối giữa chừng — chưa rõ tài khoản đã xoá xong chưa. Có mạng lại thì bấm «Xoá tài khoản của tôi» lần nữa: nếu app đưa về màn chào là đã xoá.", 0);
      if (laChan(e)) { setChan({ ma: e.ma, cau: e.message }); setMk(""); return; }
      throw e;
    }
    baoKhiVe(r.xoa === "gia_dinh" ? "Đã xoá tài khoản và toàn bộ dữ liệu gia đình" : "Đã xoá tài khoản của bạn");
    setMo(null);
    await ra({ daXoa: true });
  });
  const roi = () => lam(async () => {
    await bm.goi("thanh-vien/roi-nha", {});
    baoKhiVe("Bạn đã rời nhà");
    router.replace("/hom-nay");
  });
  const doiTen = () => luuTen.lam(async () => {
    await bm.goi("toi/ten", { ten: t.trim() });
    setTen(null);
    baoKhiVe("Đã lưu tên");
    await tai();
  });
  const conLai = khac.map((x) => x.ten).join(", ");

  return (
    <Man lui={{ chu: "Cả nhà", bam: ve }} tieu="Tài khoản của bạn" tai={tai}>
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: MAU_CON[2 % MAU_CON.length], alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={28} mau="#fff">{chuDau(toi.ten)}</Chu>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Chu kieu="rat" co={16}>{soCon ? `Bạn cùng trông ${soCon} con` : "Nhà chưa có con nào"}</Chu>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {d.g.con.slice(0, 6).map((c, i) => <Avt key={c.id} ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} co={28} />)}
          </View>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <ONhap nhan="Tên hiển thị" value={t} onChangeText={setTen} maxLength={40} placeholder="Mẹ Lan" />
        {ten !== null && ten.trim() !== toi.ten ? (
          <>
            <BaoLoi loi={luuTen.loi} />
            <Nut chu="Lưu tên" rong dangChay={luuTen.dangChay} tat={!t.trim()} bam={doiTen} />
          </>
        ) : null}
      </View>

      <MucTieu chu="Đăng nhập" />
      <Nhom>
        <Dong dau tieu={email ? "Email" : dd ? "Số điện thoại" : "Đăng nhập bằng"} phu={dd ? `${dd.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3")} · dùng để đăng nhập` : "Google / Facebook"}
          trai={<OIcon ic={email ? "tin" : "dt"} />} />
        <Dong tieu={khongMk ? "Đặt mật khẩu" : "Đổi mật khẩu"} trai={<OIcon ic="khoa" />} bam={() => router.push(khongMk ? "/dat-mat-khau" : "/doi-mat-khau")} />
      </Nhom>

      <MucTieu chu="Rời đi" />
      <Nhom>
        <Dong dau tieu="Đăng xuất" phu="Trên điện thoại này" trai={<OIcon ic="thoat" />} bam={() => ra()} />
        {!laChu ? <Dong tieu="Rời nhà" phu={soCon ? `Không trông ${soCon} con nữa` : "Không ở trong nhà này nữa"} trai={<OIcon ic="nha" />} bam={() => setMo("roi")} /> : null}
        <Dong tieu="Xoá tài khoản" phu="Xoá hẳn, không lấy lại được" trai={<OIcon ic="x" nen={M.loiSoft} />} nguyHiem bam={moXoa} />
      </Nhom>

      <BangTruot mo={mo === "roi"} dong={dong} tieu="Rời khỏi nhà này?">
        <Chu mau={M.chu2}>{`Bạn sẽ không xem, cho giờ hay khoá máy của ${soCon ? `${soCon} con` : "các con"} nữa.`}</Chu>
        <View>
          {conLai ? <TickDong chu={`${conLai} vẫn trông ${soCon ? `${soCon} con` : "các con"}`} /> : null}
          <TickDong trang="sau" chu="Muốn vào lại thì nhờ người trong nhà mời" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu="Rời nhà" loai="huy" rong dangChay={dangChay} bam={roi} />
        <Nut chu="Ở lại" loai="ma" rong bam={dong} />
      </BangTruot>

      <BangTruot mo={mo === "xoa"} dong={dong} tieu={chan?.ma === "loi" ? "Chưa kiểm tra được" : chan ? "Chưa xoá được tài khoản người tạo nhà" : laChu ? "Xoá tài khoản và cả gia đình?" : `Xoá tài khoản ${toi.ten}?`}>
        {chan ? (
          <>
            <Chu mau={M.chu2}>{chan.cau}</Chu>
            {chan.ma === "con_may" ? <Nut chu="Xem các máy" loai="vien" rong bam={() => { dong(); router.push("/may"); }} />
              : chan.ma === "con_thanh_vien" ? <Nut chu="Xem người lớn trong nhà" loai="vien" rong bam={() => { dong(); ve(); }} />
                : <Nut chu="Thử lại" loai="vien" rong dangChay={dangKiem} bam={moXoa} />}
            <View style={{ marginTop: 8 }}><Nut chu="Đóng" loai="ma" rong bam={dong} /></View>
          </>
        ) : (
          <>
            <Chu mau={M.chu2}>{laChu ? "Bạn là người tạo nhà: xoá tài khoản là xoá luôn cả gia đình — mọi dữ liệu dưới đây mất ngay, không lấy lại được."
              : "Xoá hẳn, không lấy lại được."}</Chu>
            <View>
              {laChu ? (
                <>
                  <TickDong trang="x" chu={`Hồ sơ ${soCon ? `${soCon} con` : "các con"}, nhiệm vụ, ảnh bằng chứng, sao, quà và luật`} />
                  {d.g.quyVoucher > 0 ? <TickDong trang="x" chu={`Quỹ phiếu quà AiiCafe còn ${tien(d.g.quyVoucher)} và các phiếu chưa dùng`} phu="Muốn hoàn tiền thì chat với AiiLab TRƯỚC khi xoá" /> : null}
                  <TickDong trang="x" chu="Mất tin nhắn và thông báo cũ" />
                  <Chu mau={M.chu2}>Nhật ký giao dịch cũ (nếu có) được AiiLab giữ tối đa 90 ngày để xử lý khiếu nại, sau đó xoá hẳn.</Chu>
                </>
              ) : (
                <>
                  <TickDong chu="Bạn rời nhà, người khác vẫn trông con" />
                  <TickDong trang="x" chu="Mất tin nhắn và thông báo cũ" />
                </>
              )}
              {dd && !email ? <TickDong trang="sau" chu={`Số ${dd.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3")} đăng ký lại được`} /> : null}
            </View>
            {/* tài khoản vào bằng Google / Facebook chưa có mật khẩu ⇒ đặt mật khẩu trước (xác minh lại bằng Google / Facebook — app/dat-mat-khau.tsx) */}
            {khongMk ? <Nut chu="Đặt mật khẩu để xác nhận" loai="vien" rong bam={() => { dong(); router.push("/dat-mat-khau"); }} /> : <>
              <ONhap nhan="Nhập lại mật khẩu để xác nhận" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
              <BaoLoi loi={loiLam} />
              <Nut chu="Xoá tài khoản của tôi" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={xoa} />
            </>}
            <View style={{ marginTop: 8 }}><Nut chu="Giữ tài khoản" loai="ma" rong bam={dong} /></View>
          </>
        )}
      </BangTruot>
    </Man>
  );
}
