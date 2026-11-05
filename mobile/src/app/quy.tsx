// «Quà con đổi bằng sao» (thiết kế chốt bm-cai-dat/17 — key cũ bm2-quy; L10 bỏ phiếu quà AiiCafe / quỹ nạp tiền khỏi giao diện): Rob nói cách dùng,
// lưới quà (icon, tên, số sao), ô «Có sẵn» = đổi sao ra phút chơi (con tự đổi), «+ Thêm quà». Chạm một quà ⇒ sửa tên / số sao / cất đi.
// Ghi ngay: POST qua {ten, diem, loai: qua} · POST qua/:id {ten, diem, bat}. Phiếu quà (voucher) cũ không hiện ở đây (bảng giữ nguyên).
import { useState } from "react";
import { View } from "react-native";
import { bm, laChiXem, type GiaDinh, type Qua } from "@/lib/api";
import { KHOI, BONG } from "@/lib/clay";
import { napQuyCon, veHoac } from "@/lib/ui-bm3";
import { router } from "expo-router";
import { BangTruot, BaoLoi, ChoTai, Chips, Chu, Dong, Icon, Icon3D, M, Man, NhanMen, Nhom, Nut, ONhap, Rob, tien, type TenIcon, useLam, useTai } from "@/lib/ui";

const IC: Record<Qua["loai"], TenIcon> = { qua: "game", dac_quyen: "lich", tiet_kiem: "xu", voucher: "coc" };
const icQua = (q: Pick<Qua, "ten" | "loai">): TenIcon => (/kem|ăn|an |pizza|bánh|banh/i.test(q.ten) ? "coc" : /phim|đi chơi|di choi/i.test(q.ten) ? "lich" : IC[q.loai]);
const GOI_Y = [{ ten: "Đi ăn kem", diem: 50 }, { ten: "Xem phim cả nhà", diem: 40 }, { ten: "Đồ chơi nhỏ", diem: 100 }, { ten: "Chọn món tối nay", diem: 30 }];

function OQua({ ic, ten, sao, tag, bam }: { ic: TenIcon; ten: string; sao: string; tag?: string; bam?: () => void }) {
  return (
    <NhanMen onPress={bam} disabled={!bam} accessibilityRole="button" accessibilityLabel={`${ten}, ${sao}`} muc="khoi" sang
      style={{ width: "47.5%", minHeight: 168, padding: 14, borderRadius: 26, backgroundColor: M.the, gap: 10, ...KHOI.the }}>
      {tag ? <View style={{ position: "absolute", right: 12, top: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: M.chinhSoft }}>
        <Chu kieu="rat" co={11} mau={M.chinhInk}>{tag}</Chu></View> : null}
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: M.diemSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={42} /></View>
      <Chu kieu="rat" co={15} dong={2} style={{ flex: 1 }}>{ten}</Chu>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", paddingLeft: 5, paddingRight: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: M.diemSoft }}>
        <Icon3D ten="sao" co={16} /><Chu kieu="rat" co={12.5} mau={M.diemInk}>{sao}</Chu>
      </View>
    </NhanMen>
  );
}

export default function QuaDoiSao() {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [q, xem, quy] = await Promise.all([bm.goi<{ ds: Qua[] }>("qua"), laChiXem(), bm.goi<{ soDu: number }>("quy").catch(() => null)]);
    // tỉ lệ đổi sao → phút (S1 `phut_10_sao`, mặc định 10 sao = 10 phút) lấy từ quỹ của con đầu tiên
    const g = await bm.goi<GiaDinh>("gia-dinh").catch(() => null);
    const tyLe = g?.con[0] ? (await napQuyCon(g.con[0].id))?.tyLe ?? null : null;
    return { ds: q.ds.filter((x) => x.loai !== "voucher" && x.bat), xem, quyVoucher: quy?.soDu ?? 0, tyLe };
  });
  const [sua, setSua] = useState<Qua | "moi" | null>(null);
  const [ten, setTen] = useState("");
  const [sao, setSao] = useState("");
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const ve = () => veHoac("/cai-dat");
  const mo = (q: Qua | "moi") => { setSua(q); setTen(q === "moi" ? "" : q.ten); setSao(q === "moi" ? "" : String(q.diem)); setLoi(null); };
  if (!d) return <Man lui={{ chu: "" }} tieu="Quà con đổi bằng sao"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const n = Number(sao);
  const hop = ten.trim().length > 0 && Number.isInteger(n) && n >= 1 && n <= 100000;
  const luu = () => lam(async () => {
    if (sua === "moi") await bm.goi("qua", { ten: ten.trim(), diem: n, loai: "qua" });
    else if (sua) await bm.goi(`qua/${sua.id}`, { ten: ten.trim(), diem: n });
    setSua(null);
    await tai();
  });
  const cat = () => lam(async () => { if (sua && sua !== "moi") await bm.goi(`qua/${sua.id}`, { bat: false }); setSua(null); await tai(); });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu="Quà con đổi bằng sao" day={<Nut chu={`Lưu ${d.ds.length + 1} món quà`} rong bam={ve} />}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: M.chinhSoft }}>
        <Rob ten="chi" co={44} />
        <Chu kieu="dam" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>Con thấy các quà này trên máy, đủ sao thì tự đổi. Ba Mẹ trao quà ngoài đời.</Chu>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <OQua ic="dongho" ten="Thêm phút chơi" sao={d.tyLe ? `${d.tyLe.sao} sao = ${d.tyLe.phut} phút` : "10 sao = 10 phút"} tag="Có sẵn" />
        {d.ds.map((q) => <OQua key={q.id} ic={icQua(q)} ten={q.ten} sao={`${q.diem} sao`} bam={d.xem ? undefined : () => mo(q)} />)}
        {d.xem ? null : (
          <NhanMen onPress={() => mo("moi")} accessibilityRole="button" accessibilityLabel="Thêm quà" muc="khoi" sang
            style={{ width: "47.5%", minHeight: 168, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon ten="cong" mau={M.chinhInk} co={30} />
            <Chu kieu="rat" co={15} mau={M.chinhInk}>Thêm quà</Chu>
          </NhanMen>
        )}
      </View>
      {d.quyVoucher > 0 ? (
        // phiếu quà AiiCafe đã nạp trước vẫn dùng ở quầy (KE-HOACH câu mở 3), không phát mới — chỉ báo số dư + chỗ hỏi
        <Nhom><Dong dau tieu={`Quỹ phiếu quà AiiCafe còn ${tien(d.quyVoucher)}`} phu="Dùng ở quầy AiiCafe · cần nạp hay hoàn thì nhắn AiiGrow" trai={<Icon3D ten="coc" co={32} />}
          bam={() => router.push("/ho-tro")} /></Nhom>
      ) : null}
      <BangTruot mo={!!sua} dong={() => setSua(null)} tieu={sua === "moi" ? "Thêm quà" : "Sửa quà"}>
        {sua === "moi" ? <Chips ds={GOI_Y.map((g) => ({ gia: g.ten, chu: `${g.ten} · ${g.diem} sao` }))} chon={[ten]}
          doi={(v) => { const g = GOI_Y.find((x) => x.ten === v)!; setTen(g.ten); setSao(String(g.diem)); }} /> : null}
        <ONhap nhan="Tên quà" value={ten} onChangeText={setTen} placeholder="Đi ăn kem" maxLength={60} />
        <ONhap nhan="Cần bao nhiêu sao" value={sao} onChangeText={(t) => setSao(t.replace(/\D/g, ""))} placeholder="50" keyboardType="number-pad" maxLength={6} />
        <BaoLoi loi={loiLam} />
        <Nut chu={sua === "moi" ? "Thêm quà này" : "Lưu quà"} rong dangChay={dangChay} tat={!hop} bam={luu} />
        {sua && sua !== "moi" ? <Nut chu="Cất quà này đi" loai="huy" rong tat={dangChay} bam={cat} /> : null}
      </BangTruot>
    </Man>
  );
}
