// «Quà của <Con>» (bàn 17/11 them-473f52w6@v11 · them-f0fnp733@v4; trước: thiết kế 14/11 bm-sao-qua/02 them-473f52w6 «Quà đổi bằng sao» = bm-cai-dat/12 bm2-quy; MỚI bm-sao-qua/08 them-f0fnp733 «Ba Mẹ tạo quà»;
// N12): hai tab —
//   • «Voucher AiiGrow»: quà AiiGrow bán (AiiCafe 20k/50k/100k, sách / workshop AiiLab — mẫu `loai: voucher` nhóm «Ba Mẹ mua» của GET qua/thu-vien),
//     «Đã mua» (con đã có trong kho) / «Mua» ⇒ màn chi tiết /vi/qua-mua.
//   • «Ba Mẹ tự điền»: quà ở nhà, không tốn tiền — tên (gợi ý chip) + số sao (50/100/200/300) ⇒ «Thêm quà» (POST qua, áp cho Con đang xem);
//     dưới là «Quà Ba Mẹ đã điền N quà», bấm một quà ⇒ «Sửa quà». 7 quà mặc định (L14) vẫn gieo khi tạo Con.
// `?con=` Con đang xem (nhà nhiều con ⇒ chip đổi Con), `?tab=nha` mở thẳng tab «Ba Mẹ tự điền». Người trông giúp: chỉ xem.
// 15/11 (#263): thiếu sao thì con xin Ba Mẹ cho vay — thẻ lời xin vay đổi quà (cho-duyet › yeuCau vay_sao, muc_dich «qua», gia_tri = id quà)
// «<Con> xin vay 50 sao · Để đổi <quà> · con có 150/200 sao» + «Cho vay» ⇒ bảng Cho vay sao (lib/so-sao) ⇒ toast + Hoàn tác.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, TextInput, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { CAU_TRONG_GIUP, quyenToi } from "@/lib/hang-ngay";
import { icQua, tenVoucher, type NhomThuVien, type QuaS3 } from "@/lib/s3";
import { veHoac } from "@/lib/ui-bm3";
import { BaoLoi, baoKhiVe, ChoTai, Chips, ChonMot, Chu, Dong, F, Icon3D, IconNet, M, Man, NhanMen, Nhom, Nut, The, tien, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";
import { GiaSao, OHinhQua } from "@/lib/ui-s3";
import { BONG, KHOI } from "@/lib/clay";
import { ChonSao } from "@/lib/chon-sao";
import { useSaoTu } from "@/lib/sao-tu-nhap";
import { quaNha } from "@/lib/qua-nhom";

const TIEU = "Quà con đổi bằng sao";
const GOI_Y = ["Đi ăn kem", "Xem phim", "Chọn món tối", "Đi công viên", "Đồ chơi nhỏ"];
const SO_SAO = [50, 100, 200, 300];
const ve = () => veHoac("/cai-dat");
/** Hình voucher ở tab «Voucher AiiGrow» (thiết kế 473f52w6): AiiCafe ⇒ cốc, Workshop ⇒ máy tính, còn lại theo icQua (sách…). */
const icVoucher = (m: { hinh?: string | null; loai: string; ten: string }) => (/aiicafe/i.test(m.ten) ? "coc" : /workshop/i.test(m.ten) ? "may_tinh" : icQua(m));

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
  return <QuaCon key={c?.id ?? "-"} c={c} coCon={!!conSan || chon != null} dsCon={g.d.con} baMe={g.d.baMe} quyVoucher={g.d.quyVoucher} doiCon={setChon} tabDau={tab === "nha" ? "nha" : "voucher"} />;
}

type Con = GiaDinh["con"][number];

function QuaCon({ c, coCon, dsCon, baMe, quyVoucher, doiCon, tabDau }: { c: Con | undefined; coCon: boolean; dsCon: Con[]; baMe: boolean; quyVoucher: number;
  doiCon: (id: string) => void; tabDau: "voucher" | "nha" }) {
  const conId = c?.id ?? null;
  const thamCon = conId ? `?con=${encodeURIComponent(conId)}` : "";
  const q = useTai(async () => {
    const [qua, tv] = await Promise.all([bm.goi<{ ds: QuaS3[] }>(`qua${thamCon}`), bm.goi<{ nhom: NhomThuVien[] }>(`qua/thu-vien${thamCon}`)]);
    // #502: «Ba Mẹ mua» = mọi mẫu nhóm ba_me_mua (voucher, sách, Lego…) — mỗi món có «Đang có: N» / «Hết» + «Mua thêm»
    return { qua: qua.ds, voucher: tv.nhom.filter((x) => x.ma === "ba_me_mua").flatMap((x) => x.ds) };
  });
  const { noi, bao } = useHoanTac();
  const [tab, setTab] = useState<"tat" | "voucher" | "nha">(tabDau === "nha" ? "nha" : "tat");
  const [ten, setTen] = useState("");
  const [sao, setSao] = useState(100);
  const st = useSaoTu(1000);
  const { lam, loi: loiLam, dangChay } = useLam();
  // tiêu đề theo bé đang chọn (#660); vào không kèm bé mà nhà có nhiều bé ⇒ không gán đại cho bé đầu
  const tieu = c && (coCon || dsCon.length < 2) ? `Quà của ${c.ten}` : TIEU;
  if (!q.d) return <Man lui={{ chu: "", bam: ve }} tieu={tieu}><ChoTai loi={q.loi} matMang={q.matMang} tai={q.tai} /></Man>;
  const nha = quaNha(q.d.qua, q.d.voucher.map((m) => m.ma));
  const themQua = () => lam(async () => {
    const t = ten.trim();
    await bm.goi("qua", { ten: t, loai: "qua", sao: st.dung(sao), ...(conId ? { apCho: [conId] } : {}) });
    setTen(""); st.xoa();
    baoKhiVe(`Đã thêm quà «${t}» · ${st.dung(sao)} sao`);
    await q.tai();
  });
  const moMua = (ma: string) => router.push({ pathname: "/vi/qua-mua", params: { ma, ...(conId ? { con: conId } : {}) } });
  // dòng quà (rewards) của một mẫu Ba Mẹ mua mà Con này thấy — để «Mua thêm» và sửa
  const quaCua = (ma: string) => q.d!.qua.find((x) => x.mau === ma && x.bat);
  const muaThem = (ma: string) => lam(async () => { const r = quaCua(ma); if (!r) return; await bm.goi(`qua/${r.id}/mua-them`, { them: 1 }); await q.tai(); bao("Đã thêm 1 vào số quà đang có"); });
  const moMon = (m: { ma: string; loai: string; daCo: boolean }) => {
    if (m.loai === "voucher") return moMua(m.ma);
    const r = quaCua(m.ma);
    if (r && baMe) router.push({ pathname: "/vi/qua-sua", params: { id: r.id, ...(conId ? { con: conId } : {}) } });
    else if (baMe) router.push({ pathname: "/vi/qua-thu-vien", params: conId ? { con: conId } : {} });
  };

  return (
    <Man lui={{ chu: "", bam: ve }} tieu={tieu} tai={q.tai} noi={noi} day={<Nut chu="Về Việc & quà" rong bam={() => router.replace("/diem-qua" as never)} />}>
      {/* #492 Bàn them-473f52w6: tab «Tất cả / Ba Mẹ mua / Quà nhà»; bỏ hàng chọn bé và thẻ xin vay (lời xin chỉ hiện ở Trang chủ + Thông báo) */}
      <ChonMot ds={[{ gia: "tat" as const, chu: "Tất cả" }, { gia: "voucher" as const, chu: "Ba Mẹ mua" }, { gia: "nha" as const, chu: "Quà nhà" }]} gia={tab} doi={setTab} />

      {tab !== "nha" ? (
        <>
          <Chu kieu="dam" co={13} mau={M.chu2} style={{ marginHorizontal: 6 }}>Ba Mẹ mua một lần, quà nằm sẵn trong kho của con. Con đủ sao thì đổi; thiếu sao thì con xin Ba Mẹ cho vay.</Chu>
          <View style={{ gap: 10 }}>
            {q.d.voucher.map((m) => (
              <NhanMen key={m.ma} onPress={() => moMon(m)} accessibilityRole="button" accessibilityLabel={`${m.ten}, ${m.menhGia ? `${tien(m.menhGia)}, ` : ""}${m.sao} sao${m.daCo ? (m.het ? ", hết" : m.dangCo != null ? `, đang có ${m.dangCo}` : ", đã mua") : ""}`}
                muc="khoi" sang style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, padding: 10, paddingRight: 14, borderRadius: 24, backgroundColor: M.the }, KHOI.the]}>
                <OHinhQua ic={icVoucher(m)} co={52} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Chu kieu="rat" co={15}>{tenVoucher(m.ten)}</Chu>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {m.menhGia ? <Chu kieu="dam" co={12.5} mau={M.chu2}>{`${tien(m.menhGia)} ·`}</Chu> : null}
                    <GiaSao n={m.sao} />
                  </View>
                </View>
                {m.daCo && m.het && baMe ? (
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: "center", backgroundColor: M.xamSoft }}><Chu kieu="rat" co={12.5} mau={M.chu2}>Hết</Chu></View>
                    <Pressable onPress={() => muaThem(m.ma)} accessibilityRole="button" accessibilityLabel={`Mua thêm ${m.ten}`} hitSlop={6}
                      style={[{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center", backgroundColor: M.diem }, { boxShadow: BONG.vang }]}>
                      <Chu kieu="rat" co={13} mau={M.chinh}>Mua thêm</Chu>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center" }, m.daCo ? { backgroundColor: m.het ? M.xamSoft : M.chinhSoft } : { backgroundColor: M.the, ...KHOI.nho }]}>
                    <Chu kieu="rat" co={13} mau={M.chinhInk} so>{m.daCo ? (m.het ? "Hết" : m.dangCo != null ? `Đang có: ${m.dangCo}` : "Đã mua") : "Mua"}</Chu>
                  </View>
                )}
              </NhanMen>
            ))}
          </View>
          {tab === "tat" && nha.length ? (
            <>
              <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6, marginTop: 4 }}>Quà nhà</Chu>
              <Nhom>
                {nha.map((x, i) => (
                  <Dong key={x.id} dau={i === 0} tieu={tenVoucher(x.ten)} trai={<IconNet ten={icQua(x) as TenIcon} co={26} />} phai={<GiaSao n={x.sao} />}
                    bam={baMe ? () => router.push({ pathname: "/vi/qua-sua", params: { id: x.id, ...(conId ? { con: conId } : {}) } }) : undefined} />
                ))}
              </Nhom>
            </>
          ) : null}
        </>
      ) : (
        <>
          <Chu kieu="dam" co={13} mau={M.chu2} style={{ marginHorizontal: 6 }}>Quà ở nhà Ba Mẹ tự lo, không tốn tiền trong app. Điền tên quà và số sao con cần để đổi.</Chu>
          {baMe ? (
            <The>
              <View style={{ gap: 10 }}>
                {/* thiết kế f0fnp733@v4: «Quà con muốn» + hàng ô hộp quà 52 · ô tên lõm; gợi ý; «Con đổi bằng» ô sao 3D */}
                <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Quà con muốn</Chu>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[{ width: 52, height: 52, borderRadius: 18, backgroundColor: M.the, alignItems: "center", justifyContent: "center" }, KHOI.nho]}><Icon3D ten="qua" co={30} /></View>
                  <TextInput value={ten} onChangeText={setTen} placeholder="Ví dụ: Đi ăn kem" placeholderTextColor={M.chu3} maxLength={60} accessibilityLabel="Quà con muốn"
                    style={{ flex: 1, minHeight: 50, borderRadius: 25, paddingHorizontal: 18, backgroundColor: M.xamSoft, boxShadow: BONG.lom, fontFamily: F.dam7, fontSize: 16, color: M.chu }} />
                </View>
                <Chips ds={GOI_Y.map((x) => ({ gia: x, chu: x }))} chon={GOI_Y.includes(ten.trim()) ? [ten.trim()] : []} doi={setTen} />
                <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4, marginTop: 4 }}>Con đổi bằng</Chu>
                <ChonSao muc={SO_SAO} gia={sao} doi={setSao} st={st} />
                <BaoLoi loi={loiLam} />
                <Nut chu="Thêm quà" ic="cong" ic3d loai="vien" rong dangChay={dangChay} tat={!ten.trim() || !conId || st.loi} bam={themQua} />
              </View>
            </The>
          ) : <Chu co={13} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu>}
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
            <Chu kieu="rat" co={15} mau={M.chu2}>Quà Ba Mẹ đã điền</Chu>
            <Chu kieu="dam" co={13} mau={M.chu3}>{`${nha.length} quà`}</Chu>
          </View>
          <Nhom>
            {nha.length ? nha.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={tenVoucher(x.ten)} trai={<Icon3D ten={icQua(x) as TenIcon} co={30} />} phai={<GiaSao n={x.sao} />}
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
