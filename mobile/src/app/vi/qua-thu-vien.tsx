// them-dlul0jlr «Thêm quà từ thư viện» (thiết kế chốt 06/11, L14): lọc theo loại (Tất cả · Thời gian · Voucher · Quà vật lý · Đặc quyền · Tiết kiệm),
// mỗi mẫu có giá sao gợi ý, quà đã có đánh «Đã có», bấm + để chọn; «Tự đặt quà riêng» ⇒ form Sửa quà; «Thêm N quà cho Bảo Anh» ⇒
// POST qua/thu-vien {mau, con}. GET qua/thu-vien?con= (docs/API.md «S3»).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { Anh3D } from "@/lib/lan-dau";
import { cauThemQua, doiChonMau, type NhomThuVien } from "@/lib/s3";
import { BaoLoi, baoKhiVe, ChoTai, Chu, Icon, M, Man, NhanMen, Nut, The, useLam, useTai } from "@/lib/ui";
import { GiaSao, NutCong } from "@/lib/ui-s3";
import type { Ten3D } from "@/lib/icon-3d";

const IC_NHOM: Record<string, Ten3D> = { thoi_gian: "dongho", voucher: "the_qua", qua_vat_ly: "qua", dac_quyen: "lap_lanh", tiet_kiem: "xu" };
const NGAN: Record<string, string> = { thoi_gian: "Thời gian", voucher: "Voucher", qua_vat_ly: "Quà vật lý", dac_quyen: "Đặc quyền", tiet_kiem: "Tiết kiệm" };

export default function ThuVienQua() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tv, g] = await Promise.all([bm.goi<{ nhom: NhomThuVien[] }>(con ? `qua/thu-vien?con=${encodeURIComponent(con)}` : "qua/thu-vien"), bm.goi<GiaDinh>("gia-dinh")]);
    return { nhom: tv.nhom, ten: con ? g.con.find((c) => c.id === con)?.ten ?? null : null };
  });
  const [loc, setLoc] = useState<string | null>(null);
  const [chon, setChon] = useState<string[]>([]);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = "Thêm quà từ thư viện";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const them = () => lam(async () => {
    const r = await bm.goi<{ taoMoi: number }>("qua/thu-vien", { mau: chon, ...(con ? { con } : {}) });
    baoKhiVe(`Đã thêm ${r.taoMoi} quà${d.ten ? ` cho ${d.ten}` : ""}`);
    router.back();
  });
  const nhom = d.nhom.filter((g) => !loc || g.ma === loc);
  return (
    <Man lui={{ chu: "" }} tieu={tieu}
      day={<><BaoLoi loi={loiLam} /><Nut chu={cauThemQua(chon.length, d.ten)} rong dangChay={dangChay} tat={!chon.length} bam={them} /></>}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 8 }} accessibilityRole="tablist">
        {[{ ma: null as string | null, ten: "Tất cả" }, ...d.nhom.map((g) => ({ ma: g.ma as string | null, ten: NGAN[g.ma] ?? g.ten }))].map((x) => {
          const on = x.ma === loc;
          return (
            <Pressable key={x.ma ?? "tat_ca"} onPress={() => setLoc(x.ma)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22,
                backgroundColor: on ? M.chinh : M.the, boxShadow: on ? BONG.ngoc : BONG.nho }}>
              {x.ma && IC_NHOM[x.ma] ? <Anh3D ten={IC_NHOM[x.ma]} co={20} /> : null}
              <Chu kieu="rat" co={14.5} mau={on ? "#fff" : M.chu}>{x.ten}</Chu>
            </Pressable>
          );
        })}
      </ScrollView>
      {nhom.map((g) => (
        <View key={g.ma} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
            {IC_NHOM[g.ma] ? <Anh3D ten={IC_NHOM[g.ma]} co={22} /> : null}
            <Chu kieu="rat" co={16}>{g.ten}</Chu><Chu co={13} mau={M.chu3}>{g.phu}</Chu>
          </View>
          <The sat>
            {g.ds.map((m, i) => (
              <View key={m.ma} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: "#efefec" }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Chu kieu="rat" co={15}>{m.ten}</Chu>
                  {m.moTa ? <Chu co={12.5} mau={M.chu3}>{m.moTa}</Chu> : null}
                </View>
                <GiaSao n={m.sao} />
                {m.daCo ? (
                  <View style={{ minWidth: 64, alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: M.xamSoft }}>
                    <Chu kieu="dam" co={12.5} mau={M.chu2}>Đã có</Chu>
                  </View>
                ) : <NutCong chon={chon.includes(m.ma)} bam={() => setChon((c) => doiChonMau(c, m))} nhan={`${chon.includes(m.ma) ? "Bỏ chọn" : "Thêm"} ${m.ten}`} />}
              </View>
            ))}
          </The>
        </View>
      ))}
      <NhanMen onPress={() => router.push({ pathname: "/vi/qua-sua", params: con ? { con } : {} })} accessibilityRole="button" muc="khoi" sang men={MEN.sang}
        style={[{ minHeight: 56, borderRadius: 22, backgroundColor: M.the, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          borderWidth: 2, borderStyle: "dashed", borderColor: M.vien2 }, KHOI.nho]}>
        <Icon ten="cong" co={20} mau={M.chinhInk} /><Chu kieu="rat" co={15.5} mau={M.chinhInk}>Tự đặt quà riêng</Chu>
      </NhanMen>
    </Man>
  );
}
