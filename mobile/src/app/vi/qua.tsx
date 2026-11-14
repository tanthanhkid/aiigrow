// «Quà của <Con>» (thiết kế 14/11 bm-sao-qua/02 them-473f52w6 «Quà đổi bằng sao» = bm-cai-dat/12 bm2-quy; MỚI bm-sao-qua/08 them-f0fnp733 «Ba Mẹ tạo quà»;
// N12): hai tab —
//   • «Voucher AiiGrow»: quà AiiGrow bán (AiiCafe 20k/50k/100k, sách / workshop AiiLab — mẫu `loai: voucher` nhóm «Ba Mẹ mua» của GET qua/thu-vien),
//     «Đã mua» (con đã có trong kho) / «Mua» ⇒ màn chi tiết /vi/qua-mua.
//   • «Ba Mẹ tự điền»: quà ở nhà, không tốn tiền — tên (gợi ý chip) + số sao (50/100/200/300) ⇒ «Thêm quà» (POST qua, áp cho Con đang xem);
//     dưới là «Quà Ba Mẹ đã điền N quà», bấm một quà ⇒ «Sửa quà». 7 quà mặc định (L14) vẫn gieo khi tạo Con.
// `?con=` Con đang xem (nhà nhiều con ⇒ chip đổi Con), `?tab=nha` mở thẳng tab «Ba Mẹ tự điền». Người trông giúp: chỉ xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { CAU_TRONG_GIUP, ChipCon, quyenToi } from "@/lib/hang-ngay";
import { icQua, tenVoucher, type NhomThuVien, type QuaS3 } from "@/lib/s3";
import { veHoac } from "@/lib/ui-bm3";
import { BaoLoi, baoKhiVe, ChoTai, Chips, ChonMot, Chu, Dong, Icon3D, M, Man, NhanMen, Nhom, Nut, ONhap, The, tien, useLam, useTai, type TenIcon } from "@/lib/ui";
import { GiaSao, OHinhQua } from "@/lib/ui-s3";
import { KHOI } from "@/lib/clay";

const TIEU = "Quà con đổi bằng sao";
const GOI_Y = ["Đi ăn kem", "Xem phim", "Chọn món tối", "Đi công viên", "Đồ chơi nhỏ"];
const SO_SAO = [50, 100, 200, 300];
const ve = () => veHoac("/cai-dat");

export default function QuaCuaCon() {
  const { con: conSan, tab } = useLocalSearchParams<{ con?: string; tab?: string }>();
  const [chon, setChon] = useState<string | null>(conSan ?? null);
  const g = useTai(async () => {
    const [gd, quyen] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    return { con: gd.con, baMe: quyen === "ba_me", quyVoucher: gd.quyVoucher ?? 0 };
  });
  if (!g.d) return <Man lui={{ chu: "", bam: ve }} tieu={TIEU}><ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man>;
  const c = g.d.con.find((x) => x.id === chon) ?? g.d.con[0];
  // một khối theo Con (key) ⇒ đổi chip Con là tải lại đúng quà của Con đó
  return <QuaCon key={c?.id ?? "-"} c={c} dsCon={g.d.con} baMe={g.d.baMe} quyVoucher={g.d.quyVoucher} doiCon={setChon} tabDau={tab === "nha" ? "nha" : "voucher"} />;
}

type Con = GiaDinh["con"][number];

function QuaCon({ c, dsCon, baMe, quyVoucher, doiCon, tabDau }: { c: Con | undefined; dsCon: Con[]; baMe: boolean; quyVoucher: number;
  doiCon: (id: string) => void; tabDau: "voucher" | "nha" }) {
  const conId = c?.id ?? null;
  const thamCon = conId ? `?con=${encodeURIComponent(conId)}` : "";
  const q = useTai(async () => {
    const [qua, tv] = await Promise.all([bm.goi<{ ds: QuaS3[] }>(`qua${thamCon}`), bm.goi<{ nhom: NhomThuVien[] }>(`qua/thu-vien${thamCon}`)]);
    return { qua: qua.ds, voucher: tv.nhom.flatMap((x) => x.ds).filter((m) => m.loai === "voucher") };
  });
  const [tab, setTab] = useState<"voucher" | "nha">(tabDau);
  const [ten, setTen] = useState("");
  const [sao, setSao] = useState(100);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = c ? `Quà của ${c.ten}` : TIEU;
  if (!q.d) return <Man lui={{ chu: "", bam: ve }} tieu={tieu}><ChoTai loi={q.loi} matMang={q.matMang} tai={q.tai} /></Man>;
  const nha = q.d.qua.filter((x) => x.bat && x.loai !== "voucher");
  const themQua = () => lam(async () => {
    const t = ten.trim();
    await bm.goi("qua", { ten: t, loai: "qua", sao, ...(conId ? { apCho: [conId] } : {}) });
    setTen("");
    baoKhiVe(`Đã thêm quà «${t}» · ${sao} sao`);
    await q.tai();
  });
  const moMua = (ma: string) => router.push({ pathname: "/vi/qua-mua", params: { ma, ...(conId ? { con: conId } : {}) } });

  return (
    <Man lui={{ chu: "", bam: ve }} tieu={tieu} tai={q.tai} day={<Nut chu="Xong" rong bam={ve} />}>
      {dsCon.length > 1 && c ? <ChipCon ds={dsCon} chon={c.id} doi={(x) => doiCon(x.id)} /> : null}
      <ChonMot ds={[{ gia: "voucher" as const, chu: "Voucher AiiGrow" }, { gia: "nha" as const, chu: "Ba Mẹ tự điền" }]} gia={tab} doi={setTab} />

      {tab === "voucher" ? (
        <>
          <Chu kieu="dam" co={13} mau={M.chu2} style={{ marginHorizontal: 6 }}>Ba Mẹ mua một lần, quà nằm sẵn trong kho của con. Con đủ sao thì đổi.</Chu>
          <View style={{ gap: 10 }}>
            {q.d.voucher.map((m) => (
              <NhanMen key={m.ma} onPress={() => moMua(m.ma)} accessibilityRole="button" accessibilityLabel={`${m.ten}, ${tien(m.menhGia ?? 0)}, ${m.sao} sao${m.daCo ? ", đã mua" : ""}`}
                muc="khoi" sang style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, padding: 10, paddingRight: 14, borderRadius: 24, backgroundColor: M.the }, KHOI.the]}>
                <OHinhQua ic={icQua(m)} co={52} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Chu kieu="rat" co={15}>{tenVoucher(m.ten)}</Chu>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Chu kieu="dam" co={12.5} mau={M.chu2}>{`${tien(m.menhGia ?? 0)} ·`}</Chu>
                    <GiaSao n={m.sao} />
                  </View>
                </View>
                <View style={[{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center" }, m.daCo ? { backgroundColor: "#dcebe6" } : { backgroundColor: M.the, ...KHOI.nho }]}>
                  <Chu kieu="rat" co={13} mau={M.chinhInk}>{m.daCo ? "Đã mua" : "Mua"}</Chu>
                </View>
              </NhanMen>
            ))}
          </View>
        </>
      ) : (
        <>
          <Chu kieu="dam" co={13} mau={M.chu2} style={{ marginHorizontal: 6 }}>Quà ở nhà Ba Mẹ tự lo, không tốn tiền trong app. Điền tên quà và số sao con cần để đổi.</Chu>
          {baMe ? (
            <The>
              <View style={{ gap: 10 }}>
                <ONhap nhan="Quà con muốn" value={ten} onChangeText={setTen} placeholder="Ví dụ: Đi ăn kem" maxLength={60} />
                <Chips ds={GOI_Y.map((x) => ({ gia: x, chu: x }))} chon={GOI_Y.includes(ten.trim()) ? [ten.trim()] : []} doi={setTen} />
                <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4, marginTop: 4 }}>Con đổi bằng</Chu>
                <Chips ds={SO_SAO.map((n) => ({ gia: n, chu: `${n} sao` }))} chon={[sao]} doi={setSao} />
                <BaoLoi loi={loiLam} />
                <Nut chu="Thêm quà" ic="cong" rong dangChay={dangChay} tat={!ten.trim() || !conId} bam={themQua} />
              </View>
            </The>
          ) : <Chu co={13} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu>}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
            <Chu kieu="rat" co={16}>Quà Ba Mẹ đã điền</Chu>
            <Chu kieu="dam" co={13} mau={M.chu3}>{`${nha.length} quà`}</Chu>
          </View>
          <Nhom>
            {nha.length ? nha.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={x.ten} trai={<Icon3D ten={icQua(x) as TenIcon} co={30} />} phai={<GiaSao n={x.sao} />}
                bam={baMe ? () => router.push({ pathname: "/vi/qua-sua", params: { id: x.id, ...(conId ? { con: conId } : {}) } }) : undefined} />
            )) : (
              <View style={{ padding: 16, gap: 2 }}>
                <Chu kieu="rat" co={14.5}>Chưa có quà nào.</Chu>
                <Chu co={13} mau={M.chu3}>Ba Mẹ điền ở trên, quà sẽ hiện ở đây.</Chu>
              </View>
            )}
          </Nhom>
          {baMe ? <Nut chu="Xem quà gợi ý" loai="vien" rong bam={() => router.push({ pathname: "/vi/qua-thu-vien", params: conId ? { con: conId } : {} })} /> : null}
        </>
      )}
      {quyVoucher > 0 ? (
        // quỹ phiếu AiiCafe nạp trước 06/11 vẫn dùng ở quầy (KE-HOACH 0511 câu mở 3) — báo số dư + chỗ hỏi nạp / hoàn
        <Nhom><Dong dau tieu={`Quỹ phiếu quà AiiCafe còn ${tien(quyVoucher)}`} phu="Dùng ở quầy AiiCafe · cần nạp hay hoàn thì nhắn AiiGrow" trai={<Icon3D ten="coc" co={32} />}
          bam={() => router.push("/ho-tro")} /></Nhom>
      ) : null}
    </Man>
  );
}
