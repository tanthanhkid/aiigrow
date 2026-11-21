// «Thêm quà cho <Con>» (bàn 17/11 them-dlul0jlr@v8; thiết kế 14/11 bm-sao-qua/04, L14 · N12): lọc Tất cả · Ba Mẹ mua · Quà nhà; hai nhóm «Quà Ba Mẹ mua · trả tiền»
// (voucher AiiGrow có giá tiền) và «Quà nhà · không tốn tiền»; mỗi mẫu có giá sao gợi ý, quà đã có đánh «Đã có», bấm + để chọn;
// «Tự đặt quà nhà» ⇒ tab «Ba Mẹ tự điền» của «Quà của <Con>»; «Thêm N quà» ⇒ POST qua/thu-vien {mau, soLuong, con} (#502: «Ba Mẹ mua» có +/− «Đang có: N»). GET qua/thu-vien?con= (docs/API.md «S3»).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { KHOI, MEN } from "@/lib/clay";
import { DongQua } from "@/lib/dong-qua";
import { Anh3D } from "@/lib/lan-dau";
import { cauThemQua, doiChonMau, type MauQua, type NhomThuVien } from "@/lib/s3";
import { BaoLoi, baoKhiVe, ChoTai, ChonMot, Chu, M, Man, NhanMen, Nut, The, tien, useLam, useTai } from "@/lib/ui";
import { GiaSao, NutCong } from "@/lib/ui-s3";
import type { Ten3D } from "@/lib/icon-3d";

const IC_NHOM: Record<string, Ten3D> = { ba_me_mua: "the_qua", qua_nha: "qua" };
const NGAN: Record<string, string> = { ba_me_mua: "Ba Mẹ mua", qua_nha: "Quà nhà" };
/** Câu phụ dưới tên nhóm (chữ của bàn dlul0jlr). */
const MO_TA: Record<string, string> = { ba_me_mua: "Ba Mẹ mua trước, con đủ sao thì nhận", qua_nha: "Ba Mẹ tự trao, tự đặt số sao" };

export default function ThuVienQua() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tv, g] = await Promise.all([bm.goi<{ nhom: NhomThuVien[] }>(con ? `qua/thu-vien?con=${encodeURIComponent(con)}` : "qua/thu-vien"), bm.goi<GiaDinh>("gia-dinh")]);
    return { nhom: tv.nhom, ten: con ? g.con.find((c) => c.id === con)?.ten ?? null : null };
  });
  const [loc, setLoc] = useState<string | null>(null);
  const [chon, setChon] = useState<string[]>([]);
  // #502: «Ba Mẹ mua» có số lượng — +/− «Đang có: N» như bước quà Lần đầu; quà nhà không đếm (bấm + để thêm)
  const [sl, setSl] = useState<Record<string, number>>({});
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = d?.ten ? `Thêm quà cho ${d.ten}` : "Thêm quà";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const goc = (m: MauQua) => m.dangCo ?? (m.daCo ? 1 : 0);   // quà cũ không đếm (dangCo null) = đang có 1, không phải «Hết»
  const soMua = (m: MauQua) => sl[m.ma] ?? goc(m);
  const doiMua = d.nhom.filter((g) => g.ma === "ba_me_mua").flatMap((g) => g.ds).filter((m) => soMua(m) !== goc(m) && (soMua(m) > 0 || m.daCo));
  const soDoi = chon.length + doiMua.length;
  const them = () => lam(async () => {
    const soLuong = Object.fromEntries(doiMua.map((m) => [m.ma, soMua(m)]));
    const r = await bm.goi<{ taoMoi: number }>("qua/thu-vien", { mau: [...chon, ...doiMua.map((m) => m.ma)], ...(doiMua.length ? { soLuong } : {}), ...(con ? { con } : {}) });
    baoKhiVe(r.taoMoi ? `Đã thêm ${r.taoMoi} quà${d.ten ? ` cho ${d.ten}` : ""}` : "Đã cập nhật số lượng quà");
    router.back();
  });
  const nhom = d.nhom.filter((g) => !loc || g.ma === loc);
  return (
    <Man lui={{ chu: "" }} tieu={tieu}
      day={<><BaoLoi loi={loiLam} /><Nut chu={cauThemQua(soDoi, d.ten)} rong dangChay={dangChay} tat={!soDoi} bam={them} /></>}>
      {/* #492 Bàn: ba tab chia đều «Tất cả / Ba Mẹ mua / Quà nhà» */}
      <ChonMot ds={[{ gia: "", chu: "Tất cả" }, ...d.nhom.map((g) => ({ gia: g.ma as string, chu: NGAN[g.ma] ?? g.ten }))]} gia={loc ?? ""} doi={(v) => setLoc(v || null)} />
      {nhom.map((g) => (
        <View key={g.ma} style={{ gap: 8 }}>
          <The sat>
            {/* thiết kế dlul0jlr@v8: đầu nhóm là dòng đầu của thẻ — ô icon 40 · «Quà Ba Mẹ mua · trả tiền» + câu phụ */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
              {IC_NHOM[g.ma] ? <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }}><Anh3D ten={IC_NHOM[g.ma]} co={24} /></View> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={15}>{g.phu ? `${g.ten} · ${g.phu}` : g.ten}</Chu>
                {MO_TA[g.ma] ? <Chu co={12.5} mau={M.chu3}>{MO_TA[g.ma]}</Chu> : null}
              </View>
            </View>
            {g.ds.map((m) => g.ma === "ba_me_mua" ? (
              <View key={m.ma} style={{ paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: M.vien }}>
                <DongQua i={0} ten={m.ten} phu={[m.menhGia ? tien(m.menhGia) : null, `${m.sao} sao`, m.moTa].filter(Boolean).join(" · ")} n={soMua(m)}
                  dat={(n) => setSl((x) => ({ ...x, [m.ma]: Math.max(0, Math.min(99, n)) }))} het={m.daCo && soMua(m) === 0} muaThem={() => setSl((x) => ({ ...x, [m.ma]: goc(m) + 1 }))} />
              </View>
            ) : (
              <View key={m.ma} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: M.vien }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Chu kieu="rat" co={15}>{m.ten}</Chu>
                  {m.menhGia || m.moTa ? <Chu co={12.5} mau={M.chu3}>{[m.menhGia ? tien(m.menhGia) : null, m.moTa].filter(Boolean).join(" · ")}</Chu> : null}
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
      <NhanMen onPress={() => router.push({ pathname: "/vi/qua", params: { tab: "nha", ...(con ? { con } : {}) } })} accessibilityRole="button" muc="khoi" sang men={MEN.sang}
        style={[{ minHeight: 56, borderRadius: 22, backgroundColor: M.the, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          borderWidth: 2, borderStyle: "dashed", borderColor: M.vien2 }, KHOI.nho]}>
        <Anh3D ten="but" co={22} /><Chu kieu="rat" co={15.5} mau={M.chinhInk}>Tự đặt quà nhà</Chu>
      </NhanMen>
    </Man>
  );
}
