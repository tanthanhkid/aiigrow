// «Đổi tên máy» (thiết kế bm-may-con): them-tw6apkag @v6 (máy đang bảo vệ — «Máy cả nhà») · them-4e4o5c72 @v3 (máy chưa bảo vệ — «iPad»).
// Bảo vệ đủ: «Ba Mẹ sẽ thấy máy thế này» + thẻ xem trước (hình máy, tên đang gõ, avatar + «<bé> · <bé> dùng»), ô «Tên máy» có nút ✕,
// «Tối đa 30 chữ» · «✓ Chưa trùng máy nào trong nhà» (trùng ⇒ nhắc, vẫn lưu được), gợi ý Phòng khách / Phòng học / Phòng ngủ / «Của <các bé>»,
// Grow «chi» nhắc tên hiện ở đâu, «Lưu tên máy». Chưa bảo vệ: ô hình máy to, ô «Tên máy», Grow nhắc (đào), «Lưu tên máy».
// «Loại máy» (Laptop / Máy bàn / Máy tính bảng / Điện thoại) của bàn chưa làm: máy chủ chưa lưu loại máy (hình máy suy từ hệ điều hành).
// POST may/:id/doi-ten {ten}. Lưu xong quay về màn máy (bm2-may-m1 / bm2-may-m2).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, chuanHoaTen, type ChiTietTuanThu, type GiaDinh, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { tenGoi } from "@/lib/hang-ngay";
import { CapAvt, conCuaMay, DauHaiDong, hinhMay, laMayChung, nganTen, type ConNganMay } from "@/lib/may-nhieu-con";
import { BaoLoi, baoKhiVe, ChoTai, Chu, Icon, Icon3D, M, Man, Nut, ONhap, Rob, useLam, useTai } from "@/lib/ui";

/** Tối đa 30 chữ (thiết kế them-tw6apkag) — máy chủ nhận tới 80 (tên lúc ghép), app giữ tên ngắn để vừa thẻ máy. */
const TOI_DA = 30;

/** «Bảo Anh & Minh»: các bé cùng họ đệm với bé đầu chỉ giữ tên cuối. */
function tenCacBe(ds: ConNganMay[]) {
  const ten = ds.map((c) => tenGoi(c.ten));
  const dau = ten[0]?.split(" ") ?? [];
  return ten.map((t, i) => {
    const x = t.split(" ");
    return i && x.length > 1 && dau.length > 1 && x[0] === dau[0] ? x.slice(1).join(" ") : t;
  }).join(" & ");
}

export default function DoiTenMay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [m, g, tt] = await Promise.all([bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`), bm.goi<GiaDinh>("gia-dinh"),
      bm.goi<{ ds: TuanThuMay[] }>("tuan-thu").catch(() => null)]);
    const con = conCuaMay(m, g.con.map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar })));
    return { m, con, khac: (tt?.ds ?? []).filter((x) => x.id !== id).map((x) => x.ten) };
  });
  const [ten, setTen] = useState<string | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const lui = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/may/[id]", params: { id } }));
  if (!d) return <Man dau={<DauHaiDong tieu="Đổi tên máy" lui={lui} />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const { m, con } = d;
  const cu = chuanHoaTen(nganTen(m.ten));
  const gt = ten ?? cu;
  const moi = chuanHoaTen(gt);
  const doi = moi !== cu;
  // tên cũ dài hơn 30 (đặt lúc ghép, máy chủ nhận tới 80) ⇒ chỉ nhắc khi Ba Mẹ đã sửa
  const dai = doi && [...moi].length > TOI_DA;
  // so theo tên đã bỏ « · <hệ điều hành>» (agent cũ gắn hậu tố)
  const trung = !!moi && d.khac.some((x) => chuanHoaTen(nganTen(x)).toLowerCase() === moi.toLowerCase());
  const chung = con.length >= 2 || laMayChung(m);
  const tot = m.baoVe ? m.baoVe === "day_du" : m.trangThai === "tuan_thu";
  const goiY = ["Phòng khách", "Phòng học", "Phòng ngủ", ...(con.length ? [`Của ${tenCacBe(con)}`] : [])];
  const luu = () => lam(async () => {
    await bm.goi(`may/${id}/doi-ten`, { ten: moi });
    baoKhiVe(`Đã đổi tên máy thành ${moi}`);
    lui();
  });
  const nhacGrow = (dao: boolean, chu: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingHorizontal: 16, borderRadius: 22,
      backgroundColor: dao ? "#f9e7d2" : "#e2efea", backgroundImage: dao ? "linear-gradient(#f9dcc0, #fdeedd)" : "linear-gradient(#d6e9e2, #eef4f1)", ...KHOI.the }}>
      <Rob ten="chi" co={48} />
      <Chu kieu="rat" co={13} mau={dao ? "#8a3c0c" : M.chinhInk} style={{ flex: 1, lineHeight: 18 }}>{chu}</Chu>
    </View>
  );
  const oTen = (
    <View>
      <ONhap nhan="Tên máy" value={gt} onChangeText={setTen} autoCapitalize="sentences" placeholder="VD: Máy cả nhà" maxLength={80}
        style={tot ? { paddingRight: 48 } : undefined} loi={dai ? `Tên máy tối đa ${TOI_DA} chữ` : null} />
      {tot && gt ? (
        <Pressable onPress={() => setTen("")} accessibilityRole="button" accessibilityLabel="Xoá tên" hitSlop={6}
          style={{ position: "absolute", right: 6, top: 26, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon ten="x" co={18} mau="#3a403d" />
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <Man dau={<DauHaiDong tieu="Đổi tên máy" lui={lui} />}>
      {tot ? <>
        <Chu kieu="rat" co={14} mau="#3a403d" style={{ marginHorizontal: 6 }}>Ba Mẹ sẽ thấy máy thế này</Chu>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 26, backgroundColor: "#f7f6f3", ...KHOI.the }}>
          <View style={{ position: "absolute", right: 12, top: -9, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 10, backgroundColor: "#dcebe6" }}>
            <Chu kieu="rat" co={11} mau={M.chinhInk}>Xem trước</Chu>
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
            <Icon3D ten={hinhMay(m.nen, chung)} co={44} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Chu kieu="rat" co={17} dong={1}>{moi || "Tên máy"}</Chu>
            {con.length ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CapAvt ds={con} co={20} />
                <Chu kieu="dam7" co={12.5} mau="#565c59" dong={1} style={{ flexShrink: 1 }}>{`${con.map((c) => tenGoi(c.ten)).join(" · ")} dùng`}</Chu>
              </View>
            ) : null}
          </View>
        </View>
        {oTen}
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginHorizontal: 8, marginTop: -4 }}>
          <Chu kieu="dam7" co={12} mau="#565c59">{`Tối đa ${TOI_DA} chữ`}</Chu>
          {moi ? <Chu kieu="rat" co={12} mau={trung ? "#8a3c0c" : M.chinhInk} dong={1} style={{ flexShrink: 1, textAlign: "right" }}>
            {trung ? "! Trùng tên một máy khác trong nhà" : "✓ Chưa trùng máy nào trong nhà"}</Chu> : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {goiY.map((g, k) => {
            const chon = moi === g;
            return (
              <Pressable key={g} onPress={() => setTen(g)} accessibilityRole="button" accessibilityLabel={`Đặt tên ${g}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22,
                  backgroundColor: chon ? "#dcebe6" : "#f7f6f3", ...KHOI.nho }}>
                {k === 3 ? <CapAvt ds={con} co={20} /> : null}
                <Chu kieu="rat" co={14} mau={chon ? M.chinhInk : "#3a403d"}>{g}</Chu>
              </Pressable>
            );
          })}
        </View>
        {nhacGrow(false, "Tên này hiện trên app của Ba Mẹ và trên màn khoá của con. Trùng tên máy khác thì Grow nhắc ngay.")}
      </> : <>
        <View style={{ alignSelf: "center", width: 112, height: 112, borderRadius: 32, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", marginVertical: 6, ...KHOI.the }}>
          <Icon3D ten={hinhMay(m.nen, chung)} co={76} />
        </View>
        {oTen}
        {nhacGrow(true, "Tên này hiện trên app của Ba Mẹ và trên màn khoá của con.")}
      </>}
      {/* thiết kế: nút ngay dưới nội dung (không ghim đáy) */}
      <BaoLoi loi={loiLam} />
      <Nut chu="Lưu tên máy" rong dangChay={dangChay} tat={!moi || !doi || dai} bam={luu} />
    </Man>
  );
}
