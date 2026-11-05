// bm2-thanh-vien (thiết kế chốt bm-cai-dat/12): một người lớn trong nhà — ảnh chữ, tên, «<tên> trong nhà» (SĐT / email, quyền, cùng trông các con),
// «Xong, về Cả nhà» + «Mời <tên> rời nhà». 2 quyền (S2): Ba Mẹ đổi được quyền người khác (trừ người tạo nhà, trừ chính mình).
// Không có `id` (thông báo cũ trỏ /thanh-vien) ⇒ về tab Cả nhà — danh sách người lớn + lời mời nằm ở đó.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { IC_QUYEN, MO_TA_QUYEN, TEN_QUYEN, chuDau, type DsThanhVien, type Quyen } from "@/lib/ca-nha";
import { MucTieu, OIcon, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { BangTruot, BaoLoi, baoKhiVe, ChoTai, Chu, Dong, Icon3D, M, MAU_CON, Man, Nhom, Nut, OChon, useLam, useTai } from "@/lib/ui";

export default function ThanhVien() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tv, g] = await Promise.all([bm.goi<DsThanhVien>("thanh-vien"), bm.goi<GiaDinh>("gia-dinh")]);
    return { tv, con: g.con.map((c) => c.ten) };
  });
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const [mo, setMo] = useState<null | "quyen" | "roi">(null);
  if (!id) return <Redirect href="/cai-dat" />;
  if (!d) return <Man lui={{ chu: "Cả nhà" }}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const i = d.tv.ds.findIndex((x) => x.id === id);
  const x = d.tv.ds[i];
  const ve = () => veHoac("/cai-dat");
  if (!x) return <Man lui={{ chu: "Cả nhà" }}><ChoTai loi="Người này không còn trong nhà." tai={ve} /></Man>;
  const toiBaMe = d.tv.toi.quyen === "ba_me";
  const doiDuoc = toiBaMe && !x.laChuNha && !x.laToi;
  const roiDuoc = x.laToi ? !x.laChuNha : doiDuoc;
  const dong = () => { setMo(null); setLoi(null); };
  const doiQuyen = (q: Quyen) => lam(async () => {
    if (q === x.quyen) { dong(); return; }
    await bm.goi(`thanh-vien/${x.id}/quyen`, { quyen: q });
    dong();
    await tai();
  });
  const roi = () => lam(async () => {
    if (x.laToi) {
      await bm.goi("thanh-vien/roi-nha", {});
      baoKhiVe("Bạn đã rời nhà");
      router.replace("/hom-nay");
      return;
    }
    await bm.goi(`thanh-vien/${x.id}/moi-ra`, {});
    baoKhiVe(`${x.ten} đã rời nhà`);
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} day={<>
      <Nut chu="Xong, về Cả nhà" rong bam={ve} />
      {roiDuoc ? (
        <Pressable onPress={() => setMo("roi")} accessibilityRole="button" style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={15} mau={M.loi}>{x.laToi ? "Rời nhà" : `Mời ${x.ten} rời nhà`}</Chu>
        </Pressable>
      ) : null}
    </>}>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: MAU_CON[(i + 2) % MAU_CON.length], alignItems: "center", justifyContent: "center", ...KHOI.the }}>
          <Chu kieu="rat" co={40} mau="#fff">{chuDau(x.ten)}</Chu>
        </View>
        <Chu kieu="rat" co={26} style={{ letterSpacing: -0.4, textAlign: "center" }}>{x.ten}</Chu>
        <Chu kieu="dam" co={14} mau={M.chu3}>{x.laChuNha ? "Người tạo nhà" : x.laToi ? "Bạn" : "Đã vào nhà"}</Chu>
      </View>
      <MucTieu chu={`${x.laToi ? "Bạn" : x.ten} trong nhà`} />
      <Nhom>
        <Dong dau tieu={x.dinh_danh.includes("@") ? "Email" : "Số điện thoại"} phu={x.dinh_danh ? x.dinh_danh.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3") : "Chưa có"} trai={<OIcon ic={x.dinh_danh.includes("@") ? "tin" : "dt"} />} />
        <Dong tieu="Quyền" phu={TEN_QUYEN[x.quyen]} trai={<OIcon ic={IC_QUYEN[x.quyen]} />} bam={doiDuoc ? () => setMo("quyen") : undefined} />
        <Dong tieu="Cùng trông" phu={d.con.length ? d.con.join(", ") : "Chưa có con nào"} trai={<OIcon ic="nguoi" />} />
      </Nhom>

      <BangTruot mo={mo === "quyen"} dong={dong} tieu={`Quyền của ${x.ten}`}>
        {(["ba_me", "trong_giup"] as const).map((q) => (
          <OChon key={q} chon={x.quyen === q} bam={() => doiQuyen(q)} trai={<Icon3D ten={IC_QUYEN[q]} co={32} />} tieu={TEN_QUYEN[q]} phu={MO_TA_QUYEN[q]} />
        ))}
        <BaoLoi loi={loiLam} />
      </BangTruot>
      <BangTruot mo={mo === "roi"} dong={dong} tieu={x.laToi ? "Rời nhà?" : `Mời ${x.ten} rời nhà?`}>
        <Chu mau={M.chu2}>{x.laToi ? "Bạn không xem, không duyệt việc của các con nữa. Tài khoản của bạn vẫn giữ." : `${x.ten} không xem, không duyệt việc của các con nữa. Muốn vào lại thì mời lần nữa.`}</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={x.laToi ? "Rời nhà" : `Mời ${x.ten} rời nhà`} loai="huy" rong dangChay={dangChay} bam={roi} />
        <Nut chu="Để sau" loai="ma" rong bam={dong} />
      </BangTruot>
    </Man>
  );
}
