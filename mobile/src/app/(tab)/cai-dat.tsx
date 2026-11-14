// Tab «Cả nhà» (thiết kế 14/11 bm-ca-nha/01 them-h60stad7 = bm-cai-dat/01 bm2-gia-dinh, 02): các con (+ Thêm con) · người lớn trông con (dòng của mình
// «Bạn · tài khoản của bạn» ⇒ /tai-khoan; lời mời đang chờ hàng vàng «Chưa nhận lời mời · Gửi lại»; người khác «Vào nhà từ dd/mm» ⇒ /thanh-vien;
// «Mời người nhà») · máy của con · cài đặt chung (Thông báo, Quà con đổi bằng sao, Hỏi AiiGrow) · Đăng xuất.
// 14/11: «Xoá tài khoản» chuyển vào «Tài khoản của bạn» (bm-ca-nha/08, 11); bỏ dòng «Cảnh báo & quy tắc tự động» (không còn trên thiết kế — các màn
// bm3-duyet-canh-bao* đã xoá; cảnh báo từng cái vẫn mở từ Hôm nay).
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { IC_QUYEN, KHOA_CA_NHA, TEN_QUYEN, napCaNha, tenMoi, type LoiMoiCho } from "@/lib/ca-nha";
import { MucTieu, OIcon } from "@/lib/ui-bm3";
import { mauMay } from "@/lib/viec-nhanh";
import { BONG, KHOI } from "@/lib/clay";
import {
  Avt, BangTruot, BaoLoi, ChoTai, Chu, Dong, Icon, Icon3D, M, MAU_CON, Man, NhanMen, Nhom, Nut, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const TEN_NEN = { windows: "Laptop", mac: "MacBook", ios: "iPad", android: "Điện thoại" } as const;
/** «20/10». */
const ngayThang = (iso: string) => { const t = new Date(iso); return Number.isNaN(t.getTime()) ? "" : `${t.getDate()}/${t.getMonth() + 1}`; };

export default function CaiDat() {
  const { ra } = usePhien();
  const [moiMo, setMoiMo] = useState<LoiMoiCho | null>(null);
  const moi = useLam();
  const { bao, noi } = useHoanTac();
  const { d, loi, matMang, tai } = useTai(napCaNha, KHOA_CA_NHA);
  if (!d) return <Man tieuLon="Cả nhà"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const laBaMe = (d.toi.baMe.quyen ?? (d.toi.baMe.vai === "xem" ? "trong_giup" : "ba_me")) === "ba_me";
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
    <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={x.laToi ? "Bạn · tài khoản của bạn" : x.vaoLuc ? `Vào nhà từ ${ngayThang(x.vaoLuc)}` : TEN_QUYEN[x.quyen]}
      trai={<Avt ten={x.ten} mau={MAU_CON[(i + 2) % MAU_CON.length]} />}
      phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLabel={TEN_QUYEN[x.quyen]}>
        <Icon3D ten={IC_QUYEN[x.quyen]} co={22} /><Icon ten="phai" mau="#b3b5b1" co={18} /></View>}
      bam={() => (x.laToi ? router.push("/tai-khoan") : router.push({ pathname: "/thanh-vien", params: { id: x.id } }))} />
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
            style={{ width: "31%", flexGrow: 1, maxWidth: 160, alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 26, backgroundColor: M.the, ...KHOI.the }}>
            <Avt ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} co={52} />
            <Chu kieu="rat" co={14.5} dong={1}>{c.ten}</Chu>
            <Chu kieu="dam" co={12} mau={M.chu3}>{`${(c as { sao?: number }).sao ?? c.soDu} sao`}</Chu>
          </NhanMen>
        ))}
        {laBaMe ? (
          <NhanMen onPress={() => router.push("/ho-so/them" as never)} accessibilityRole="button" accessibilityLabel="Thêm con" muc="khoi" sang
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
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 6, marginVertical: 4, paddingVertical: 10, paddingLeft: 10, paddingRight: 10, borderRadius: 20, backgroundColor: M.diemSoft }}>
            <Avt ten={tenMoi(m)} mau="#8f9894" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15.5} dong={1}>{tenMoi(m)}</Chu>
              <Chu kieu="dam" co={12.5} mau={M.diemInk} dong={1}>Chưa nhận lời mời</Chu>
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
        <Dong tieu="Quà con đổi bằng sao" phu={d.soQua === null ? "Con đủ sao thì tự đổi" : `${d.soQua} món quà`} trai={<OIcon ic="coc" />} bam={() => router.push("/vi/qua")} />
        <Dong tieu="Hỏi AiiGrow" phu="Nhắn tin, gọi, hướng dẫn" trai={<OIcon ic="tin" />} bam={() => router.push("/hoi-aiigrow")} />
        {d.toi.laAdmin ? <Dong tieu="Hộp thư hỗ trợ" phu="Tin các gia đình gửi AiiGrow — quản trị" trai={<OIcon ic="tin" nen={M.timSoft} />} bam={() => router.push("/admin-ho-tro")} /> : null}
      </Nhom>

      <View style={{ alignItems: "center", gap: 2, marginTop: 6 }}>
        <Pressable onPress={() => ra()} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}>
          <Chu kieu="rat" co={15} mau={M.loi}>Đăng xuất</Chu>
        </Pressable>
      </View>

      <BangTruot mo={!!moiMo} dong={() => setMoiMo(null)} tieu={moiMo ? tenMoi(moiMo) : ""}>
        {moiMo ? <Chu mau={M.chu2}>{`Đang chờ nhận lời mời · ${TEN_QUYEN[moiMo.quyen]}${moiMo.dinhDanh && moiMo.tenGoi ? ` · ${moiMo.dinhDanh}` : ""}. «Gửi lại» tạo link mới, link cũ hết dùng.`}</Chu> : null}
        <BaoLoi loi={moi.loi} />
        {moiMo ? <Nut chu="Gửi lại lời mời" rong dangChay={moi.dangChay} bam={() => guiLai(moiMo)} /> : null}
        {moiMo ? <Nut chu="Huỷ lời mời" loai="huy" rong tat={moi.dangChay} bam={() => huyMoi(moiMo)} /> : null}
      </BangTruot>
    </Man>
  );
}
