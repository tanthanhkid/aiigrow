// bm-cai-dat «Cả nhà» (thiết kế chốt 05/11: docs/thiet-ke-chot/bm-cai-dat/01-bm2-gia-dinh.html = 03 «Tab Cả nhà»): các con · người lớn trông con
// (2 quyền Ba Mẹ / Người trông giúp, lời mời đang chờ hàng vàng «Gửi lại», «+ Mời người nhà») · máy của con · cài đặt chung (thông báo, quà đổi
// bằng sao, Hỏi AiiGrow) · Đăng xuất. Giữ «Xoá tài khoản» (Apple 5.1.1(v), server/lib/xoa-tai-khoan.ts) dưới Đăng xuất. Bỏ vai Ba/Mẹ, mã mời, PIN.
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { router } from "expo-router";
import { bm, LoiApi } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { IC_QUYEN, KHOA_CA_NHA, TEN_QUYEN, napCaNha, tenMoi, type LoiMoiCho } from "@/lib/ca-nha";
import { MucTieu, OIcon } from "@/lib/ui-bm3";
import { mauMay } from "@/lib/viec-nhanh";
import { BONG, KHOI } from "@/lib/clay";
import {
  Avt, BangTruot, BaoLoi, baoKhiVe, ChoTai, Chu, Dong, Icon, Icon3D, M, MAU_CON, Man, NhanMen, Nhom, Nut, ONhap, TickDong, cauLoi, tien, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const TEN_NEN = { windows: "Laptop", mac: "MacBook", ios: "iPad", android: "Điện thoại" } as const;

export default function CaiDat() {
  const { ra } = usePhien();
  const [moXoa, setMoXoa] = useState(false);
  const [mk, setMk] = useState("");
  // Máy chủ chặn xoá (chủ còn Ba/Mẹ khác / còn máy đã ghép — server/lib/xoa-tai-khoan.ts): mã + câu hướng dẫn của máy chủ
  const [chan, setChan] = useState<{ ma: string; cau: string } | null>(null);
  const [dangKiem, setDangKiem] = useState(false);
  const [moiMo, setMoiMo] = useState<LoiMoiCho | null>(null);
  const { dangChay, loi: loiXoa, lam, setLoi } = useLam();
  const moi = useLam();
  const { bao, noi } = useHoanTac();
  const { d, loi, matMang, tai } = useTai(napCaNha, KHOA_CA_NHA);
  if (!d) return <Man tieuLon="Cả nhà"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const khac = d.tv.ds.filter((x) => !x.laToi);
  const laChu = d.toi.baMe.laChuNha ?? d.toi.baMe.vai === "chu", chuConNguoi = laChu && khac.length > 0;
  const laBaMe = (d.toi.baMe.quyen ?? (d.toi.baMe.vai === "xem" ? "trong_giup" : "ba_me")) === "ba_me";
  const khongMk = d.toi.baMe.coMatKhau === false;
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
      r = await bm.goi("xoa-tai-khoan", khongMk ? { xacNhan: mk } : { matKhau: mk });
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
  const guiLai = (m: LoiMoiCho) => moi.lam(async () => {
    const r = await bm.goi<{ chiaSe: { tieuDe: string; noiDung: string } }>(`thanh-vien/moi/${m.id}/gui-lai`, {});
    await tai();
    bao(`Đã tạo link mới cho ${tenMoi(m)}`);
    Share.share({ title: r.chiaSe.tieuDe, message: r.chiaSe.noiDung }).catch(() => {});
  });
  const huyMoi = (m: LoiMoiCho) => moi.lam(async () => {
    await bm.goi(`thanh-vien/moi/${m.id}/huy`, {});
    setMoiMo(null);
    await tai();
    bao(`Đã huỷ lời mời ${tenMoi(m)}`);
  });
  const dongNguoi = (x: (typeof d.tv.ds)[number], i: number) => (
    <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={x.laToi ? `Bạn · ${TEN_QUYEN[x.quyen]}` : TEN_QUYEN[x.quyen]}
      trai={<Avt ten={x.ten} mau={MAU_CON[(i + 2) % MAU_CON.length]} />}
      phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLabel={TEN_QUYEN[x.quyen]}>
        <Icon3D ten={IC_QUYEN[x.quyen]} co={22} />{x.laToi && x.laChuNha ? null : <Icon ten="phai" mau="#b3b5b1" co={18} />}</View>}
      bam={x.laToi && x.laChuNha ? undefined : () => router.push({ pathname: "/thanh-vien", params: { id: x.id } })} />
  );
  const may = d.may ?? [];
  const canSua = may.filter((m) => mauMay(m) !== "xanh").length;
  const tenMay = [...new Set(may.map((m) => (m.ten && m.ten.length <= 14 ? m.ten : TEN_NEN[m.nen])))].join(", ");
  const tatTb = (d.tatTb ?? []).filter((x) => x !== "canh_bao").length;
  return (
    <Man tieuLon="Cả nhà" noi={noi} tai={tai} vongTai>
      <MucTieu chu="Các con" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {d.g.con.map((c, i) => (
          <NhanMen key={c.id} onPress={() => router.push(`/ho-so/${c.id}`)} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${c.ten}`} muc="khoi" sang
            style={{ width: "31%", flexGrow: 1, maxWidth: 160, alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 26, backgroundColor: M.the, ...KHOI.the }}>
            <Avt ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} co={52} />
            <Chu kieu="rat" co={14.5} dong={1}>{c.ten}</Chu>
            <Chu kieu="dam" co={12} mau={M.chu3}>{`${(c as { sao?: number }).sao ?? c.soDu} sao`}</Chu>
          </NhanMen>
        ))}
        {laBaMe ? (
          <NhanMen onPress={() => router.push("/thiet-lap/ten-con")} accessibilityRole="button" accessibilityLabel="Thêm con" muc="khoi" sang
            style={{ width: "31%", flexGrow: 1, maxWidth: 160, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon ten="cong" mau={M.chinhInk} co={22} /></View>
            <Chu kieu="rat" co={14.5} mau={M.chinhInk}>Thêm con</Chu>
          </NhanMen>
        ) : null}
      </View>

      <MucTieu chu="Người lớn trông con" />
      <Nhom>
        {d.tv.ds.slice(0, 1).map((x, i) => dongNguoi(x, i))}
        {/* lời mời đang chờ nằm ngay trong danh sách (hàng vàng «Đang chờ nhận lời mời · Gửi lại») */}
        {d.tv.loiMoi.map((m) => (
          <NhanMen key={m.id} onPress={laBaMe ? () => setMoiMo(m) : undefined} disabled={!laBaMe} accessibilityRole="button" accessibilityLabel={`${tenMoi(m)}, đang chờ nhận lời mời`} muc="khoi"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 6, marginVertical: 4, paddingVertical: 10, paddingLeft: 10, paddingRight: 8, borderRadius: 20, backgroundColor: M.diemSoft }}>
            <Avt ten={tenMoi(m)} mau="#8f9894" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15.5} dong={1}>{tenMoi(m)}</Chu>
              <Chu kieu="dam" co={12.5} mau={M.diemInk} dong={1}>Đang chờ nhận lời mời</Chu>
            </View>
            {laBaMe ? (
              <NhanMen onPress={() => guiLai(m)} disabled={moi.dangChay} accessibilityRole="button" accessibilityLabel={`Gửi lại lời mời cho ${tenMoi(m)}`} muc="chip" sang
                style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "#fff", justifyContent: "center", ...KHOI.nho }}>
                <Chu kieu="rat" co={13.5} mau={M.diemInk}>Gửi lại</Chu>
              </NhanMen>
            ) : null}
          </NhanMen>
        ))}
        {d.tv.ds.slice(1).map((x, i) => dongNguoi(x, i + 1))}
        {laBaMe ? (
          <NhanMen onPress={() => router.push("/moi-nguoi-nha")} accessibilityRole="button" muc="khoi" sang
            style={{ flexDirection: "row", alignItems: "center", gap: 12, margin: 10, marginTop: 6, padding: 10, borderRadius: 22, backgroundColor: M.the, ...KHOI.the }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
              <Icon ten="cong" mau={M.chinhInk} co={20} />
            </View>
            <Chu kieu="rat" co={16} mau={M.chinhInk} style={{ flex: 1 }}>Mời người nhà</Chu>
            <Icon ten="phai" mau={M.chinhInk} co={18} />
          </NhanMen>
        ) : null}
      </Nhom>
      <BaoLoi loi={moi.loi} />

      <MucTieu chu="Máy của con" />
      <Nhom>
        <Dong dau tieu={may.length ? `${may.length} máy đã ghép` : "Chưa ghép máy nào"} phu={may.length ? tenMay : "Ghép máy để bảo vệ con"}
          trai={<OIcon ic="laptop" />}
          phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {canSua ? <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11, backgroundColor: M.canhSoft }}><Chu kieu="rat" co={12} mau={M.canh}>{`${canSua} cần sửa`}</Chu></View> : null}
            <Icon ten="phai" mau="#b3b5b1" co={18} /></View>}
          bam={() => router.push("/may")} />
      </Nhom>

      <MucTieu chu="Cài đặt chung" />
      <Nhom>
        <Dong dau tieu="Thông báo" phu={d.tatTb === null ? "Báo ngay việc cần Ba Mẹ" : tatTb ? `Đã tắt ${tatTb} loại` : "Đang nhận hết"} trai={<OIcon ic="chuong" />} bam={() => router.push("/thong-bao/cai-dat")} />
        <Dong tieu="Cảnh báo & quy tắc tự động" phu="Ngoại lệ, gợi ý, an toàn thiết bị" trai={<OIcon ic="tia" />} bam={() => router.push("/canh-bao")} />
        <Dong tieu="Quà con đổi bằng sao" phu={d.soQua === null ? "Con đủ sao thì tự đổi" : `${d.soQua} món quà`} trai={<OIcon ic="coc" />} bam={() => router.push("/quy")} />
        <Dong tieu="Hỏi AiiGrow" phu="Chat, gọi, hướng dẫn" trai={<OIcon ic="tin" />} bam={() => router.push("/ho-tro")} />
        {d.toi.laAdmin ? <Dong tieu="Hộp thư hỗ trợ" phu="Tin các gia đình gửi AiiGrow — quản trị" trai={<OIcon ic="tin" nen={M.timSoft} />} bam={() => router.push("/admin-ho-tro")} /> : null}
      </Nhom>

      <View style={{ alignItems: "center", gap: 2, marginTop: 6 }}>
        <Pressable onPress={() => ra()} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}>
          <Chu kieu="rat" co={15} mau={M.loi}>Đăng xuất</Chu>
        </Pressable>
        <Pressable onPress={moBangXoa} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}>
          <Chu kieu="dam" co={13} mau={M.chu3}>{chuConNguoi ? "Xoá tài khoản (mời người nhà ra trước)" : "Xoá tài khoản"}</Chu>
        </Pressable>
      </View>

      <BangTruot mo={!!moiMo} dong={() => setMoiMo(null)} tieu={moiMo ? tenMoi(moiMo) : ""}>
        {moiMo ? <Chu mau={M.chu2}>{`Đang chờ nhận lời mời · ${TEN_QUYEN[moiMo.quyen]}${moiMo.dinhDanh && moiMo.tenGoi ? ` · ${moiMo.dinhDanh}` : ""}. «Gửi lại» tạo link mới, link cũ hết dùng.`}</Chu> : null}
        <BaoLoi loi={moi.loi} />
        {moiMo ? <Nut chu="Gửi lại lời mời" rong dangChay={moi.dangChay} bam={() => guiLai(moiMo)} /> : null}
        {moiMo ? <Nut chu="Huỷ lời mời" loai="huy" rong tat={moi.dangChay} bam={() => huyMoi(moiMo)} /> : null}
      </BangTruot>
      <BangTruot mo={moXoa} dong={dongXoa} tieu={chan?.ma === "loi" ? "Chưa kiểm tra được" : chan ? "Chưa xoá được tài khoản người tạo nhà" : laChu ? "Xoá tài khoản và cả gia đình?" : "Xoá tài khoản của bạn?"}>
        {chan ? (
          <>
            <Chu mau={M.chu2}>{chan.cau}</Chu>
            {chan.ma === "con_may" ? <Nut chu="Xem các máy" loai="vien" rong bam={() => { dongXoa(); router.push("/may"); }} />
              : chan.ma === "con_thanh_vien" ? <Nut chu="Xem người lớn trong nhà" loai="vien" rong bam={dongXoa} />
                : <Nut chu="Thử lại" loai="vien" rong dangChay={dangKiem} bam={moBangXoa} />}
            <View style={{ marginTop: 8 }}><Nut chu="Đóng" loai="ma" rong bam={dongXoa} /></View>
          </>
        ) : (
          <>
            <Chu mau={M.chu2}>Việc xoá có hiệu lực ngay và không khôi phục được:</Chu>
            <View>
              {laChu ? (
                <>
                  <TickDong trang="x" chu={`Hồ sơ ${d.g.con.length ? `${d.g.con.length} Con` : "các Con"}, nhiệm vụ, ảnh bằng chứng, sao, quà và luật`} />
                  {d.g.quyVoucher > 0 ? <TickDong trang="x" chu={`Quỹ phiếu quà AiiCafe còn ${tien(d.g.quyVoucher)} và các phiếu chưa dùng`} phu="Muốn hoàn tiền thì chat với AiiLab TRƯỚC khi xoá" /> : null}
                  <TickDong trang="x" chu="Tài khoản và mọi phiên đăng nhập của bạn" />
                  <Chu mau={M.chu2}>Nhật ký giao dịch quỹ và phiếu quà được AiiLab giữ tối đa 90 ngày để xử lý khiếu nại, sau đó xoá hẳn.</Chu>
                </>
              ) : (
                <>
                  <TickDong trang="x" chu="Tài khoản và mọi phiên đăng nhập của bạn" />
                  <TickDong trang="x" chu="Gia đình, các Con và dữ liệu vẫn giữ nguyên" phu="Người tạo nhà tiếp tục quản lý" />
                </>
              )}
            </View>
            {/* tài khoản vào bằng Google / Facebook không có mật khẩu ⇒ gõ chữ XOA (server/lib/xoa-tai-khoan.ts) */}
            {khongMk ? <ONhap nhan="Gõ chữ XOA để xác nhận" value={mk} onChangeText={setMk} autoCapitalize="characters" autoCorrect={false} placeholder="XOA" />
              : <ONhap nhan="Nhập lại mật khẩu để xác nhận" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" placeholder="••••••••" />}
            <BaoLoi loi={loiXoa} />
            <Nut chu="Xoá vĩnh viễn" loai="huy" rong dangChay={dangChay} tat={mk.length < 1} bam={xoa} />
            <View style={{ marginTop: 8 }}><Nut chu="Giữ tài khoản" loai="ma" rong bam={dongXoa} /></View>
          </>
        )}
      </BangTruot>
    </Man>
  );
}
