// Một người lớn trong nhà (thiết kế 14/11 bm-ca-nha/06 them-7vmoufz3 = bm-cai-dat/10 bm2-thanh-vien; bảng «Mời … rời nhà?» 07 them-xnbiksmr):
// ảnh chữ, tên, «Vào nhà từ 20/10 · Làm được như Ba Mẹ», «<tên> trong nhà» (SĐT / email, quyền, cùng trông «Cả N con» + ảnh chữ các con),
// «Mời <tên> rời nhà» + dòng giải thích. 2 quyền (S2): Ba Mẹ đổi được quyền người khác (trừ người tạo nhà, trừ chính mình).
// Dòng của chính mình ⇒ «Tài khoản của bạn» (/tai-khoan). «7 ngày qua · Cho thêm giờ N lần» của thiết kế chưa làm (máy chủ chưa đếm theo người lớn).
// Không có `id` (thông báo cũ trỏ /thanh-vien) ⇒ về tab Cả nhà — danh sách người lớn + lời mời nằm ở đó.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { IC_QUYEN, MO_TA_QUYEN, TEN_QUYEN, chuDau, type DsThanhVien, type Quyen } from "@/lib/ca-nha";
import { MucTieu, OIcon, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { Avt, BangTruot, BaoLoi, baoKhiVe, ChoTai, Chu, Dong, Icon3D, M, MAU_CON, Man, Nhom, Nut, OChon, TickDong, useLam, useTai } from "@/lib/ui";

export default function ThanhVien() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tv, g] = await Promise.all([bm.goi<DsThanhVien>("thanh-vien"), bm.goi<GiaDinh>("gia-dinh")]);
    return { tv, con: g.con };
  });
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const [mo, setMo] = useState<null | "quyen" | "roi">(null);
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
    <Man lui={{ chu: "", bam: ve }} tieu={x.ten} day={roiDuoc ? <>
      <Nut chu={`Mời ${x.ten} rời nhà`} loai="huy" rong bam={() => setMo("roi")} />
      <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>{`${x.ten} sẽ không xem, không cho giờ được nữa.`}</Chu>
    </> : undefined}>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: MAU_CON[(i + 2) % MAU_CON.length], alignItems: "center", justifyContent: "center", ...KHOI.the }}>
          <Chu kieu="rat" co={40} mau="#fff">{chuDau(x.ten)}</Chu>
        </View>
        <Chu kieu="rat" co={26} style={{ letterSpacing: -0.4, textAlign: "center" }}>{x.ten}</Chu>
        <Chu kieu="dam" co={14} mau={M.chu3} style={{ textAlign: "center" }}>
          {[x.laChuNha ? "Người tạo nhà" : vao && !Number.isNaN(vao.getTime()) ? `Vào nhà từ ${vao.getDate()}/${vao.getMonth() + 1}` : "Đã vào nhà",
            x.quyen === "ba_me" ? "Làm được như Ba Mẹ" : "Xem, duyệt, khoá máy"].join(" · ")}
        </Chu>
      </View>
      <MucTieu chu={`${x.ten} trong nhà`} />
      <Nhom>
        <Dong dau tieu={fb ? "Đăng nhập bằng" : email ? "Email" : "Số điện thoại"} phu={dd ? dd.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3") : "Chưa có"} trai={<OIcon ic={email || fb ? "tin" : "dt"} />} />
        <Dong tieu="Quyền" phu={TEN_QUYEN[x.quyen]} trai={<OIcon ic={IC_QUYEN[x.quyen]} />} bam={doiDuoc ? () => setMo("quyen") : undefined} />
        <Dong tieu="Cùng trông" phu={soCon ? (soCon > 1 ? `Cả ${soCon} con` : d.con[0].ten) : "Chưa có con nào"} trai={<OIcon ic="nguoi" />}
          phai={soCon ? <View style={{ flexDirection: "row", gap: 2 }}>{d.con.slice(0, 4).map((c, k) => <Avt key={c.id} ten={c.ten} mau={MAU_CON[k % MAU_CON.length]} co={24} />)}</View> : undefined} />
      </Nhom>

      <BangTruot mo={mo === "quyen"} dong={dong} tieu={`Quyền của ${x.ten}`}>
        {(["ba_me", "trong_giup"] as const).map((q) => (
          <OChon key={q} chon={x.quyen === q} bam={() => doiQuyen(q)} trai={<Icon3D ten={IC_QUYEN[q]} co={32} />} tieu={TEN_QUYEN[q]} phu={MO_TA_QUYEN[q]} />
        ))}
        <BaoLoi loi={loiLam} />
      </BangTruot>
      <BangTruot mo={mo === "roi"} dong={dong} tieu={`Mời ${x.ten} rời nhà?`}>
        <Chu mau={M.chu2}>{`${x.ten} sẽ không xem, cho giờ hay khoá máy của ${soCon ? `${soCon} con` : "các con"} nữa.`}</Chu>
        <TickDong trang="sau" chu="Muốn mời lại thì gửi lời mời mới" />
        <BaoLoi loi={loiLam} />
        <Nut chu={`Mời ${x.ten} rời nhà`} loai="huy" rong dangChay={dangChay} bam={roi} />
        <Nut chu={`Thôi, giữ ${x.ten}`} loai="ma" rong bam={dong} />
      </BangTruot>
    </Man>
  );
}
