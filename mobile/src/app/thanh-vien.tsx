// Một người lớn trong nhà (thiết kế 14/11 bm-ca-nha/06 them-7vmoufz3 = bm-cai-dat/10 bm2-thanh-vien; bảng «Mời … rời nhà?» 07 them-xnbiksmr):
// ảnh chữ, tên, «Vào nhà từ 20/10 · Làm được như Ba Mẹ», «<tên> trong nhà» (SĐT / email, quyền, cùng trông «Cả N con» + ảnh chữ các con),
// «Mời <tên> rời nhà» + dòng giải thích. 2 quyền (S2): Ba Mẹ đổi được quyền người khác (trừ người tạo nhà, trừ chính mình).
// Dòng của chính mình ⇒ «Tài khoản của bạn» (/tai-khoan). «7 ngày qua · Cho vay N lần · S sao» (15/11 #265): GET nhat-ky?ca-nha=1 › choVay.theoNguoi (theo tên).
// Không có `id` (thông báo cũ trỏ /thanh-vien) ⇒ về tab Cả nhà — danh sách người lớn + lời mời nằm ở đó.
import { hienSo } from "@/lib/lan-dau";
import { useRef, useState } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { chuDau, type DsThanhVien, type Quyen } from "@/lib/ca-nha";
import { MucTieu, OIcon, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { ChuCaiCon } from "@/lib/ui-viec";
import { soVN } from "@/lib/so-sao";
import { DsBang, HaiTheVai, HangViecVai } from "@/lib/ca-nha-ui";
import { Avt, BangTruot, BaoLoi, baoKhiVe, ChoTai, Chu, Dong, M, Man, Nhom, Nut, useLam, useTai } from "@/lib/ui";

/** Màu avatar người lớn (thiết kế .ng — cùng bảng tab Cả nhà). */

export default function ThanhVien() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tv, g, nk] = await Promise.all([bm.goi<DsThanhVien>("thanh-vien"), bm.goi<GiaDinh>("gia-dinh"),
      bm.goi<{ choVay?: { theoNguoi: { ten: string; so: number; sao: number }[] } }>("nhat-ky?ca-nha=1&ngay=7").catch(() => null)]);
    return { tv, con: g.con, vay: nk?.choVay?.theoNguoi ?? null };
  });
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const [mo, setMo] = useState<null | "ha" | "nang" | "roi">(null);
  const huongHa = useRef(true);
  if (mo === "ha" || mo === "nang") huongHa.current = mo === "ha";   // giữ chữ hộp khi đang trượt đóng (không nhảy sang chiều kia)
  if (!id) return <Redirect href="/cai-dat" />;
  if (!d) return <Man lui={{ chu: "Cả nhà" }}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const i = d.tv.ds.findIndex((x) => x.id === id);
  const x = d.tv.ds[i];
  const ve = () => veHoac("/cai-dat");
  if (!x) return <Man lui={{ chu: "Cả nhà" }}><ChoTai loi="Người này không còn trong nhà." tai={ve} /></Man>;
  if (x.laToi) return <Redirect href="/tai-khoan" />;
  const dd = x.dinh_danh ?? "", email = dd.includes("@"), fb = !!x.laFacebook;    // tài khoản tạo bằng Facebook (định danh riêng — máy chủ trả dinh_danh «Facebook»)
  const toiBaMe = d.tv.toi.quyen === "ba_me";
  const doiDuoc = toiBaMe && !x.laChuNha && !x.laToi;
  const roiDuoc = doiDuoc;
  const soCon = d.con.length;
  const vao = x.vaoLuc ? new Date(x.vaoLuc) : null;
  const dong = () => { setMo(null); setLoi(null); };
  const doiQuyen = (q: Quyen) => lam(async () => {
    if (q === x.quyen) { dong(); return; }
    await bm.goi(`thanh-vien/${x.id}/quyen`, { quyen: q });
    dong();
    await tai();
  });
  const roi = () => lam(async () => {
    await bm.goi(`thanh-vien/${x.id}/moi-ra`, {});
    baoKhiVe(`${x.ten} đã rời nhà`);
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={x.ten}>
      {/* bàn them-7vmoufz3@v8 / bm2-thanh-vien@v7: thẻ ngang — avatar 64 · tên · «Vào nhà từ 20/10» · nhãn quyền ngọc */}
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
        <Avt ten={chuDau(x.ten)} co={64} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Chu kieu="rat" co={17} dong={1}>{x.ten}</Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{x.laChuNha ? "Người tạo nhà" : vao && !Number.isNaN(vao.getTime()) ? `Vào nhà từ ${vao.getDate()}/${vao.getMonth() + 1}` : "Đã vào nhà"}</Chu>
        </View>
      </View>
      {/* #492 bàn bm2-thanh-vien@v12: «<tên> làm được gì?» — 2 thẻ chọn vai + hàng ✓/✕ việc; đổi vai = Ba Mẹ khác (máy chủ chặn thật) */}
      <MucTieu chu={`${x.ten} làm được gì?`} />
      <HaiTheVai quyen={x.quyen} doi={doiDuoc ? (q) => setMo(q === x.quyen ? null : q === "trong_giup" ? "ha" : "nang") : undefined} />
      <HangViecVai quyen={x.quyen} />
      <MucTieu chu={`${x.ten} trong nhà`} />
      <Nhom>
        <Dong dau tieu={fb ? "Đăng nhập bằng" : email ? "Email" : "Số điện thoại"} phu={dd ? hienSo(dd) : "Chưa có"} trai={<OIcon ic={email || fb ? "tin" : "dt"} />} />
        <Dong tieu="Cùng trông" phu={soCon ? (soCon > 1 ? `Cả ${soCon} con` : d.con[0].ten) : "Chưa có con nào"} trai={<OIcon ic="nguoi" />}
          phai={soCon ? <ChuCaiCon ds={d.con.slice(0, 4)} co={24} /> : undefined} />
        {d.vay ? (() => { const v = d.vay.find((n) => n.ten === x.ten);
          return <Dong tieu="7 ngày qua" phu={v?.so ? `Cho vay ${v.so} lần · ${soVN(v.sao)} sao` : "Chưa cho vay sao"} trai={<OIcon ic="sao" />} />; })() : null}
      </Nhom>
      {/* bàn: nút trắng «🚪 Mời <tên> rời nhà» chữ đỏ ngay dưới thẻ (không ghim đáy) + dòng giải thích */}
      {roiDuoc ? <View style={{ gap: 8, marginTop: 6 }}>
        <Nut chu={`Mời ${x.ten} rời nhà`} loai="huy" ic="thoat" ic3d rong bam={() => setMo("roi")} />
        <Chu kieu="dam" co={13} mau={M.chu3} style={{ textAlign: "center" }}>{`${x.ten} sẽ không xem, không cho vay sao được nữa.`}</Chu>
      </View> : null}

      {/* đổi vai: hộp hỏi lại, nút phụ luôn «Giữ lại» */}
      <BangTruot mo={mo === "ha" || mo === "nang"} dong={dong} tieu={huongHa.current ? `Cho ${x.ten} chỉ trông con?` : `Cho ${x.ten} làm như Ba Mẹ?`}>
        <Chu kieu="dam" co={14} mau={M.chu2} style={{ textAlign: "center" }}>{huongHa.current
          ? `${x.ten} xem con chơi, duyệt việc, cho vay sao. Không đổi luật, không mua quà, không mời người, không ghép máy.`
          : `${x.ten} làm được mọi việc như bạn: đổi luật, mua quà, mời người, ghép máy.`}</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={huongHa.current ? `Cho ${x.ten} chỉ trông con` : `Cho ${x.ten} làm như Ba Mẹ`} rong dangChay={dangChay} bam={() => doiQuyen(huongHa.current ? "trong_giup" : "ba_me")} />
        <Nut chu="Giữ lại" loai="vien" rong bam={dong} />
      </BangTruot>
      {/* bàn them-xnbiksmr@v3: ô hình đào, câu giữa, thẻ dòng icon, nút đỏ đặc. «cho giờ» của bàn ⇒ «cho vay sao» (#265). Dòng «<tên> nhận tin đã rời nhà»
          của bàn chưa có — máy chủ chưa gửi tin cho người bị mời ra */}
      <BangTruot mo={mo === "roi"} dong={dong} tieu={`Mời ${x.ten} rời nhà?`} hinh="thoat" hinhDao>
        <Chu kieu="dam" co={14} mau={M.chu2} style={{ textAlign: "center" }}>{`${x.ten} sẽ không xem, cho vay sao hay khoá máy của ${soCon ? `${soCon} con` : "các con"} nữa.`}</Chu>
        <DsBang ds={[{ ic: "gui", chu: "Muốn mời lại thì gửi lời mời mới" }]} />
        <BaoLoi loi={loiLam} />
        <Nut chu={`Mời ${x.ten} rời nhà`} loai="do" rong dangChay={dangChay} bam={roi} />
        <Nut chu="Giữ lại" loai="vien" rong bam={dong} />
      </BangTruot>
    </Man>
  );
}
