// Tab «Cả nhà» (thiết kế 14/11 bm-ca-nha/01 them-h60stad7 = bm-cai-dat/01 bm2-gia-dinh, 02): các con (+ Thêm con) · người lớn trông con (dòng của mình
// «Bạn · tài khoản của bạn» ⇒ /tai-khoan; lời mời đang chờ hàng vàng «Chưa nhận lời mời · Gửi lại»; người khác «Vào nhà từ dd/mm» ⇒ /thanh-vien;
// «Mời người nhà») · máy của con · cài đặt chung (Thông báo, Quà con đổi bằng sao, Hỏi AiiGrow) · Đăng xuất.
// 14/11: «Xoá tài khoản» chuyển vào «Tài khoản của bạn» (bm-ca-nha/08, 11); bỏ dòng «Cảnh báo & quy tắc tự động» (không còn trên thiết kế — các màn
// bm3-duyet-canh-bao* đã xoá; cảnh báo từng cái vẫn mở từ Hôm nay).
// #325 (bàn them-h60stad7@v10 = bm2-gia-dinh@v9 = them-99ji705p@v10): hàng lời mời và «Gửi lại» mở «Đã mời <tên>!» (data-toi them-hfd2drjy — «Huỷ lời mời» ở
// màn đó); «Gửi lại» tạo link mới + mở hàng chia sẻ rồi sang màn đó. Icon «Quà con đổi bằng sao» = qua.webp như bàn.
import { Pressable, Share, View } from "react-native";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { canSuaMay } from "@/lib/trang-thai-may";
import { usePhien } from "@/lib/phien";
import { KHOA_CA_NHA, TEN_QUYEN, napCaNha, tenMoi, type LoiMoiCho } from "@/lib/ca-nha";
import { MucTieu, OIcon } from "@/lib/ui-bm3";
import { mauCon, tenGoi } from "@/lib/hang-ngay";
import { saoTu, VienSao } from "@/lib/so-sao";
import { BONG, KHOI } from "@/lib/clay";
import {
  Avt, BaoLoi, ChoTai, Chu, Dong, Icon, IconNet, M, Man, NhanMen, Nhom, useHoanTac, useLam, useTai,
} from "@/lib/ui";

/** Màu avatar người lớn theo thiết kế (.ng: hồng, nâu, xám xanh…). */
const MAU_NGUOI = ["#0A1629", "#0A1629", "#0A1629", "#0A1629", "#0A1629"];
const TEN_NEN = { windows: "Laptop", mac: "MacBook", ios: "iPad", android: "Điện thoại" } as const;
/** «20/10». */
const ngayThang = (iso: string) => { const t = new Date(iso); return Number.isNaN(t.getTime()) ? "" : `${t.getDate()}/${t.getMonth() + 1}`; };

export default function CaiDat() {
  const { ra } = usePhien();
  const moi = useLam();
  const { noi } = useHoanTac();
  const { d, loi, matMang, tai } = useTai(napCaNha, KHOA_CA_NHA);
  if (!d) return <Man tieuLon="Cả nhà"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const laBaMe = (d.toi.baMe.quyen ?? (d.toi.baMe.vai === "xem" ? "trong_giup" : "ba_me")) === "ba_me";
  const moDaMoi = (m: LoiMoiCho) => router.push({ pathname: "/moi-nguoi-nha", params: { moi: m.id } });
  // «Gửi lại»: link mới (link cũ hết dùng) + hàng chia sẻ, rồi sang «Đã mời <tên>!»
  const guiLai = (m: LoiMoiCho) => moi.lam(async () => {
    const r = await bm.goi<{ chiaSe: { tieuDe: string; noiDung: string } }>(`thanh-vien/moi/${m.id}/gui-lai`, {});
    await tai();
    Share.share({ title: r.chiaSe.tieuDe, message: r.chiaSe.noiDung }).catch(() => {});
    moDaMoi(m);
  });
  const dongNguoi = (x: (typeof d.tv.ds)[number], i: number) => (
    <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={x.laToi ? (x.laChuNha ? "Chủ nhà · tài khoản của bạn" : `${TEN_QUYEN[x.quyen]} · tài khoản của bạn`) : `${TEN_QUYEN[x.quyen]}${x.vaoLuc ? ` · từ ${ngayThang(x.vaoLuc)}` : ""}`}
      trai={<Avt ten={x.ten} mau={MAU_NGUOI[i % MAU_NGUOI.length]} co={40} />}
      phai={<View accessibilityLabel={TEN_QUYEN[x.quyen]}><Icon ten="phai" mau={M.oNhap} co={18} /></View>}
      bam={() => (x.laToi ? router.push("/tai-khoan") : router.push({ pathname: "/thanh-vien", params: { id: x.id } }))} />
  );
  const may = d.may ?? [];
  const canSua = may.filter(canSuaMay).length;
  const tenMay = [...new Set(may.map((m) => (m.ten && m.ten.length <= 14 ? m.ten : TEN_NEN[m.nen])))].join(", ");
  const tatTb = (d.tatTb ?? []).filter((x) => x !== "canh_bao").length;
  return (
    <Man tieuLon="Cả nhà" noi={noi} tai={tai} vongTai>
      <MucTieu chu="Các con" />
      {/* thiết kế .cac-con: lưới 5 cột, avatar tròn 54 + tên 13/800 dưới (không thẻ, không số sao); «＋ Thêm con» avatar sáng nổi */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8, paddingTop: 6 }}>
        {d.g.con.map((c, i) => (
          <Pressable key={c.id} onPress={() => router.push(`/ho-so/${c.id}`)} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${c.ten}`}
            style={{ width: "20%", alignItems: "center", gap: 4, minHeight: 100 }}>
            {/* #417: dải «Các con» không có bé đang chọn ⇒ mọi bé là avatar kem lõm chữ navy (chuẩn E «chưa chọn») */}
            <Avt ten={c.ten} mau={mauCon(c.avatar, i)} co={54} con={c} chon={false} />
            <Chu kieu="rat" co={13} mau={M.chu2} dong={1}>{tenGoi(c.ten)}</Chu>
            {/* #492: chip sao dưới tên bé (nợ ⇒ «−20 sao» đỏ trên chip lõm kem) — cùng VienSao với hàng chọn bé */}
            <VienSao s={saoTu(c)} nho />
          </Pressable>
        ))}
        {laBaMe ? (
          <Pressable onPress={() => router.push("/ho-so/them" as never)} accessibilityRole="button" accessibilityLabel="Thêm con"
            style={{ width: "20%", alignItems: "center", gap: 6, minHeight: 84 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon ten="cong" mau={M.chinhInk} co={22} /></View>
            <Chu kieu="rat" co={13} mau={M.chinhInk} dong={1}>Thêm con</Chu>
          </Pressable>
        ) : null}
      </View>

      <MucTieu chu="Người lớn trông con" />
      <Nhom>
        {d.tv.ds.slice(0, 1).map((x, i) => dongNguoi(x, i))}
        {/* lời mời đang chờ nằm ngay trong danh sách (hàng vàng «Đang chờ nhận lời mời · Gửi lại») */}
        {d.tv.loiMoi.map((m) => (
          <NhanMen key={m.id} onPress={laBaMe ? () => moDaMoi(m) : undefined} disabled={!laBaMe} accessibilityRole="button" accessibilityLabel={`${tenMoi(m)}, đang chờ nhận lời mời`} muc="khoi"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 6, marginVertical: 4, paddingVertical: 8, paddingLeft: 10, paddingRight: 10, borderRadius: 22, backgroundColor: M.canhSoft }}>
            <Avt ten={tenMoi(m)} mau="#0A1629" co={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15.5} dong={1}>{tenMoi(m)}</Chu>
              <Chu kieu="dam" co={12.5} mau={M.canh} dong={1}>Đang chờ nhận lời mời</Chu>
            </View>
            {laBaMe ? (
              <NhanMen onPress={() => guiLai(m)} disabled={moi.dangChay} accessibilityRole="button" accessibilityLabel={`Gửi lại lời mời cho ${tenMoi(m)}`} muc="chip" sang
                style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: M.the, justifyContent: "center", ...KHOI.nho }}>
                <Chu kieu="rat" co={13.5} mau={M.chu}>Gửi lại</Chu>
              </NhanMen>
            ) : null}
          </NhanMen>
        ))}
        {d.tv.ds.slice(1).map((x, i) => dongNguoi(x, i + 1))}
        {laBaMe ? (
          <NhanMen onPress={() => router.push("/moi-nguoi-nha")} accessibilityRole="button" muc="khoi" sang
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, margin: 10, marginTop: 6, paddingLeft: 10, paddingRight: 12, borderRadius: 22, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon ten="cong" mau={M.chinhInk} co={20} />
            </View>
            <Chu kieu="rat" co={15} mau={M.chinhInk} style={{ flex: 1 }}>Mời người nhà</Chu>
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
            <Icon ten="phai" mau={M.oNhap} co={18} /></View>}
          bam={() => router.push(laBaMe && !may.length && d.g.con.length ? "/may/them" : "/may")} />
        {/* #791: đường đi thẳng tới ghép máy, khớp lời trong bộ cài «AiiGrow › Cả nhà › Ghép thêm máy» */}
        {may.length && laBaMe ? <Dong tieu="Ghép thêm máy" phu="Lấy mã 6 số hoặc link cho máy mới" trai={<OIcon ic="laptop" />} phai={<Icon ten="phai" mau={M.oNhap} co={18} />} bam={() => router.push("/may/them")} /> : null}
      </Nhom>

      <MucTieu chu="Cài đặt chung" />
      <Nhom>
        <Dong dau tieu="Thông báo" phu={d.tatTb === null ? "Báo ngay việc cần Ba Mẹ" : tatTb ? `Đã tắt ${tatTb} loại` : "Đang nhận hết"} trai={<OIcon ic="chuong" />} bam={() => router.push("/thong-bao/cai-dat")} />
        <Dong tieu="Quà con đổi bằng sao" phu={d.soQua === null ? "Con đủ sao thì tự đổi" : `${d.soQua} món quà`} trai={<OIcon ic="qua" />} bam={() => router.push("/vi/qua")} />
        <Dong tieu="Hỏi AiiGrow" phu="Nhắn tin, gọi, hướng dẫn" trai={<OIcon ic="tin" />} bam={() => router.push("/hoi-aiigrow")} />
        {d.toi.laAdmin ? <Dong tieu="Hộp thư hỗ trợ" phu="Tin các gia đình gửi AiiGrow — quản trị" trai={<OIcon ic="tin" nen={M.timSoft} />} bam={() => router.push("/admin-ho-tro")} /> : null}
      </Nhom>

      <NhanMen onPress={() => ra()} accessibilityRole="button" muc="khoi" sang
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6, minHeight: 48, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
        <IconNet ten="thoat" co={21} mau={M.chu2} /><Chu kieu="rat" co={15} mau={M.chu2}>Đăng xuất</Chu>
      </NhanMen>
    </Man>
  );
}
