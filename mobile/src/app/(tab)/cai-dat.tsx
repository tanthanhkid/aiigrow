// bm-cai-dat «Gia đình» (thay tab Cài đặt): chỉ còn việc ít đụng — Ba Mẹ (vai), các Con (hồ sơ, PIN, nhóm), thành viên, quy tắc tự động,
// thông báo + giờ yên lặng, trợ giúp, đăng xuất, XOÁ TÀI KHOẢN (Apple 5.1.1(v), server/lib/xoa-tai-khoan.ts). Việc hằng ngày (web, app, giờ, máy)
// đã lên Trang chủ.
import { useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { bm, LoiApi } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { KHOA_TAB, napGiaDinh } from "@/lib/tab-ba-me";
import { Avt, BangTruot, BaoLoi, baoKhiVe, BieuTron, ChoTai, Chu, Dong, M, MAU_CON, Man, Nhom, NhomTieu, Nut, ONhap, Rob, TickDong, cauLoi, tien, useLam, useTai } from "@/lib/ui";

const VAI = { chu: "Chủ gia đình", duyet: "Thành viên phê duyệt", xem: "Chỉ xem" } as const;

export default function CaiDat() {
  const { ra } = usePhien();
  const [moXoa, setMoXoa] = useState(false);
  const [mk, setMk] = useState("");
  // Máy chủ chặn xoá (chủ còn Ba/Mẹ khác / còn máy đã ghép — server/lib/xoa-tai-khoan.ts): mã + câu hướng dẫn của máy chủ
  const [chan, setChan] = useState<{ ma: string; cau: string } | null>(null);
  const [dangKiem, setDangKiem] = useState(false);
  const { dangChay, loi: loiXoa, lam, setLoi } = useLam();
  const { d, loi, matMang, tai } = useTai(napGiaDinh, KHOA_TAB.giaDinh);
  if (!d) return <Man tieuLon="Gia đình"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const khac = d.tv.filter((x) => x.id !== d.toi.baMe.id);
  const laChu = d.toi.baMe.vai === "chu", chuConNguoi = laChu && khac.length > 0;
  const dongXoa = () => { setMoXoa(false); setMk(""); setLoi(null); };
  const laChan = (e: unknown): e is LoiApi => e instanceof LoiApi && (e.ma === "con_may" || e.ma === "con_thanh_vien");
  // hỏi máy chủ trước (không cần mật khẩu) ⇒ bị chặn thì hiện hướng dẫn ngay, không bắt nhập mật khẩu vô ích
  const moBangXoa = async () => {
    if (dangKiem) return;
    setDangKiem(true);
    setChan(null);
    try {
      await bm.goi("xoa-tai-khoan", { kiemTra: true });
    } catch (e) {
      if (e instanceof LoiApi && e.status === 401) return;        // hết phiên: api đã đưa về màn Chào
      setChan(laChan(e) ? { ma: e.ma, cau: e.message } : { ma: "loi", cau: cauLoi(e) });
    } finally {
      setDangKiem(false);
    }
    setMoXoa(true);
  };
  const xoa = () => lam(async () => {
    let r: { xoa: "tai_khoan" | "gia_dinh" };
    try {
      r = await bm.goi("xoa-tai-khoan", { matKhau: mk });
    } catch (e) {
      // Không đảo được: mất mạng lúc chờ phản hồi thì KHÔNG nói «chưa có gì thay đổi» — máy chủ có thể đã xoá xong.
      if (e instanceof LoiApi && e.ma === "mat_mang") throw new LoiApi("mat_mang_xoa", "Mất kết nối giữa chừng — chưa rõ tài khoản đã xoá xong chưa. Có mạng lại thì bấm «Xoá vĩnh viễn» lần nữa: nếu app đưa về màn chào là đã xoá.", 0);
      if (laChan(e)) { setChan({ ma: e.ma, cau: e.message }); setMk(""); return; }
      throw e;
    }
    baoKhiVe(r.xoa === "gia_dinh" ? "Đã xoá tài khoản và toàn bộ dữ liệu gia đình" : "Đã xoá tài khoản của bạn");
    setMoXoa(false);
    await ra({ daXoa: true });
  });
  return (
    <Man tieuLon="Gia đình" day={<Nut chu="Đăng xuất" ic="thoat" loai="vien" rong bam={() => ra()} />}>
      <Nhom>
        <Dong dau tieu={d.toi.baMe.ten} phu={`${VAI[d.toi.baMe.vai]} · ${d.toi.baMe.dinhDanh}`} trai={<Avt ten={d.toi.baMe.ten} mau="#0f6b5c" />} />
      </Nhom>
      <NhomTieu chu="Các Con" />
      <Nhom>
        {d.g.con.map((c, i) => <Dong key={c.id} dau={i === 0} tieu={c.ten} phu="Hồ sơ, nhóm tuổi, mã PIN, liên kết AiiRob" trai={<Avt ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} />}
          bam={() => router.push(`/ho-so/${c.id}`)} />)}
        <Dong dau={!d.g.con.length} tieu="Thêm Con" trai={<BieuTron ic="cong" />} bam={() => router.push("/thiet-lap/ten-con")} />
        {Platform.OS !== "web" && d.g.con.length ? (
          // máy dùng chung với Con (iPad / điện thoại cũ): mở màn Con ngay trên máy này — Con chọn tên + PIN (ghép máy bằng mã 6 số lần đầu)
          <Dong tieu="Máy của Con" phu="Mở màn của Con trên máy này: nhiệm vụ, nộp bài, quà, chơi bằng điểm" trai={<BieuTron ic="sao" mau="vang" />}
            bam={() => router.push("/tre")} />
        ) : null}
      </Nhom>
      <NhomTieu chu="Mọi người" />
      <Nhom>
        <Dong dau tieu="Thành viên" phu={khac.length ? khac.map((x) => `${x.ten} (${VAI[x.vai].toLowerCase()})`).join(" · ") : "Chỉ mình Ba/Mẹ — mời Ba, Ông Bà cùng duyệt"} trai={<BieuTron ic="nguoi" />}
          bam={() => router.push("/thanh-vien")} />
        <Dong tieu="Cảnh báo & quy tắc tự động" phu="Ngoại lệ, gợi ý, an toàn thiết bị" trai={<BieuTron ic="tia" mau="vang" />} bam={() => router.push("/canh-bao")} />
      </Nhom>
      <NhomTieu chu="Thông báo" />
      <Nhom>
        <Dong dau tieu="Thông báo" phu="Việc mới của cả nhà, gộp gọn" trai={<BieuTron ic="chuong" />} bam={() => router.push("/thong-bao")} />
        <Dong tieu="Giờ yên lặng" phu="Không đẩy lên màn khoá, trừ cảnh báo nghiêm trọng" trai={<BieuTron ic="trang_ngu" mau="tim" />} bam={() => router.push("/thong-bao/cai-dat")} />
      </Nhom>
      <NhomTieu chu="Trợ giúp" />
      <Nhom>
        <Dong dau tieu="Chat với AiiLab" phu="Người thật trả lời, thường trong 5 phút" trai={<Rob ten="rob-goc" co={44} />} bam={() => router.push("/ho-tro")} />
        {d.toi.laAdmin ? <Dong tieu="Hộp thư hỗ trợ" phu="Tin của các gia đình gửi AiiLab — dành cho quản trị" trai={<BieuTron ic="tin" mau="tim" />} bam={() => router.push("/admin-ho-tro")} /> : null}
      </Nhom>
      <NhomTieu chu="Tài khoản" />
      <Nhom>
        <Dong dau nguyHiem tieu="Xoá tài khoản" trai={<BieuTron ic="canh_bao" mau="do" />} bam={moBangXoa}
          phu={chuConNguoi ? "Mời các thành viên khác ra trước, rồi mới xoá được" : laChu ? "Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu gia đình" : "Chỉ xoá tài khoản của bạn — gia đình vẫn giữ nguyên"} />
      </Nhom>

      <BangTruot mo={moXoa} dong={dongXoa} tieu={chan?.ma === "loi" ? "Chưa kiểm tra được" : chan ? "Chưa xoá được tài khoản Chủ gia đình" : laChu ? "Xoá tài khoản và cả gia đình?" : "Xoá tài khoản của bạn?"}>
        {chan ? (
          <>
            <Chu mau={M.chu2}>{chan.cau}</Chu>
            {chan.ma === "con_may" ? <Nut chu="Xem các máy" loai="vien" rong bam={() => { dongXoa(); router.push("/may"); }} />
              : chan.ma === "con_thanh_vien" ? <Nut chu="Mở Thành viên" loai="vien" rong bam={() => { dongXoa(); router.push("/thanh-vien"); }} />
                : <Nut chu="Thử lại" loai="vien" rong dangChay={dangKiem} bam={moBangXoa} />}
            <View style={{ marginTop: 8 }}><Nut chu="Đóng" loai="ma" rong bam={dongXoa} /></View>
          </>
        ) : (
          <>
            <Chu mau={M.chu2}>Việc xoá có hiệu lực ngay và không khôi phục được:</Chu>
            <View>
              {laChu ? (
                <>
                  <TickDong trang="x" chu={`Hồ sơ ${d.g.con.length ? `${d.g.con.length} Con` : "các Con"}, nhiệm vụ, ảnh bằng chứng, điểm, quà và luật`} />
                  {d.g.quyVoucher > 0 ? <TickDong trang="x" chu={`Quỹ phiếu quà AiiCafe còn ${tien(d.g.quyVoucher)} và các phiếu chưa dùng`} phu="Muốn hoàn tiền thì chat với AiiLab TRƯỚC khi xoá" /> : null}
                  <TickDong trang="x" chu="Tài khoản và mọi phiên đăng nhập của bạn" />
                  <Chu mau={M.chu2}>Nhật ký giao dịch quỹ và phiếu quà được AiiLab giữ tối đa 90 ngày để xử lý khiếu nại, sau đó xoá hẳn.</Chu>
                </>
              ) : (
                <>
                  <TickDong trang="x" chu="Tài khoản và mọi phiên đăng nhập của bạn" />
                  <TickDong trang="x" chu="Gia đình, các Con và dữ liệu vẫn giữ nguyên" phu="Chủ gia đình tiếp tục quản lý" />
                </>
              )}
            </View>
            <ONhap nhan="Nhập lại mật khẩu để xác nhận" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
            <BaoLoi loi={loiXoa} />
            <Nut chu="Xoá vĩnh viễn" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={xoa} />
            <View style={{ marginTop: 8 }}><Nut chu="Giữ tài khoản" loai="ma" rong bam={dongXoa} /></View>
          </>
        )}
      </BangTruot>
    </Man>
  );
}
