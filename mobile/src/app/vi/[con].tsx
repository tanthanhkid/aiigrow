// «Ví sao của <Con>» (bàn 17/11 them-1akngbxb@v6 — #263/#264/#266; máy chủ GET con/:id/vi-sao, docs/API.md «Sổ sao 15/11»):
// thẻ lớn theo cách hiện sao chốt (lib/so-sao): chưa nợ ⇒ thẻ vàng «⭐ 30 sao = 30 phút chơi»; đang nợ ⇒ thẻ cảnh báo «−20 sao · Đang nợ Ba Mẹ 20 sao ·
// Sao nhiệm vụ trả nợ trước · Tuần này: vay 45 · đã trả 25 sao» (còn sao vay chưa tiêu ⇒ «còn N sao = N phút chơi»). Dải «1 sao = 1 phút chơi app
// «Tính phút». Hết sao thì con xin Ba Mẹ cho vay.» Quà con đổi bằng sao (chờ trao / còn thiếu). «Sao vào, sao ra, vay và trả»: cho vay «vay 15»,
// chơi «Chơi YouTube 20 phút −20 sao», sao kiếm đã trả nợ gộp một dòng «Trả nợ 10 sao · Tự xếp cặp +10 sao». Giữ «± Điều chỉnh» tay (chỉ Ba Mẹ).
// Máy chủ cũ (chưa có vi-sao) ⇒ dự phòng con/:id/vi.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type Diem, type Qua } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { BangTruot, BaoLoi, ChoTai, ChonMot, Chu, Icon3D, M, Man, Nhan, Nut, ONhap, Rob, The, useHoanTac, useLam, useTai } from "@/lib/ui";
import { OLomIcon } from "@/lib/ui-viec";
import { HangViec, quyenToi, TieuMuc, type ChoDuyetMoi } from "@/lib/hang-ngay";
import { icQua, tenVoucher } from "@/lib/s3";
import { docSoNguyen, loiSoNguyen, soNguyenGo } from "@/lib/so-nguyen";
import { BangChoVay, cauNo, kieuSao, MAU_NO, saoTu, soChinh, soVN, thamSoXongVay, type SaoCon } from "@/lib/so-sao";
import type { TenIcon } from "@/lib/ui";

type Vi = { soDu: number; sao?: number; lichSu: Diem[] };
/** GET con/:id/vi-sao */
type DongVi = { id: string; delta: number; loai: string; kieu: "vay" | "hoan_vay" | "tra_no" | "choi" | "doi_qua" | "kiem" | "tru"; lyDo: string; nguoi: string | null;
  tenNguoi: string | null; luc: string };
type ViSaoT = SaoCon & { ten: string; bayNgay?: { saoKiem: number; saoVay: number; lanVay: number; saoTraNo: number; saoTieu: number }; lichSu: DongVi[] };
/** Một dòng lịch sử đã gộp để vẽ. */
type Hang = { key: string; ic: TenIcon; tieu: string; phu: string; nhan: string; loai: "diem" | "xam" | "canh" };
const boNv = (t: string) => t.replace(/^Nhiệm vụ\s+/, "");
/** Dòng ví → hàng: kiếm + trả nợ cùng lúc (cùng giây) ⇒ «Trả nợ 10 sao · <việc>» «+10 sao»; vay «vay 15»; chơi «−20 sao». */
function hangVi(ds: DongVi[]): Hang[] {
  const traNo = ds.filter((x) => x.kieu === "tra_no" && x.delta < 0);
  const daGop = new Set<string>();
  const out: Hang[] = [];
  for (const x of ds) {
    const khi = `${ngay(x.luc)} · ${gioNgayTrong(x.luc)}`;   // #658: ngày chỉ hiện một lần
    if (x.kieu === "tra_no") {
      if (daGop.has(x.id)) continue;
      // trả nợ không có dòng kiếm đi kèm (hoàn tác duyệt ⇒ +N) — giữ dòng riêng
      out.push({ key: x.id, ic: "sao", tieu: x.lyDo, phu: khi, nhan: `${x.delta > 0 ? "nợ +" : "trả "}${Math.abs(x.delta)}`, loai: "canh" });
      continue;
    }
    if (x.kieu === "kiem") {
      const t = traNo.find((r) => !daGop.has(r.id) && Math.abs(new Date(r.luc).getTime() - new Date(x.luc).getTime()) < 2000);
      if (t) {
        daGop.add(t.id);
        out.push({ key: x.id, ic: x.nguoi ? "mu" : "may_tinh", tieu: `Trả nợ ${-t.delta} sao · ${boNv(x.lyDo)}`, phu: `${khi}${x.tenNguoi ? ` · ${x.tenNguoi} duyệt` : ""}`,
          nhan: `+${x.delta} sao`, loai: "diem" });
        continue;
      }
    }
    if (x.kieu === "vay") { out.push({ key: x.id, ic: "sao", tieu: `Ba Mẹ cho vay ${soVN(x.delta)} sao`, phu: `${khi}${x.tenNguoi ? ` · ${x.tenNguoi}` : ""}`, nhan: `vay ${soVN(x.delta)}`, loai: "canh" }); continue; }
    if (x.kieu === "hoan_vay") { out.push({ key: x.id, ic: "sao", tieu: "Hoàn tác cho vay", phu: `${khi}${x.tenNguoi ? ` · ${x.tenNguoi}` : ""}`, nhan: `${soVN(x.delta)} sao`, loai: "xam" }); continue; }
    out.push({ key: x.id, ic: x.delta > 0 ? (x.nguoi ? "mu" : "may_tinh") : x.kieu === "doi_qua" ? "coc" : x.kieu === "choi" ? "game" : "dongho",
      tieu: x.lyDo, phu: `${khi}${x.tenNguoi ? ` · ${x.tenNguoi}` : ""}`, nhan: `${x.delta > 0 ? "+" : ""}${soVN(x.delta)} sao`, loai: x.delta > 0 ? "diem" : "xam" });
  }
  return out;
}
/** Ví cũ (con/:id/vi) → dòng dạng vi-sao. */
const tuViCu = (l: Diem[]): DongVi[] => l.map((x, i) => ({ id: `cu${i}`, delta: x.delta, loai: x.loai, lyDo: x.ly_do, nguoi: x.nguoi, tenNguoi: x.ten_nguoi ?? null, luc: x.created_at,
  kieu: x.loai === "vay" ? (x.delta > 0 ? "vay" : "hoan_vay") : x.loai === "tra_no" ? "tra_no" : x.loai === "doi_qua" || x.loai === "voucher" ? "doi_qua"
    : x.loai === "choi" || x.loai === "phien" || x.loai === "doi_gio" ? "choi" : x.delta > 0 ? "kiem" : "tru" }));
/** «13:43» (gioPhut thêm «21/11» cho ngày khác — ví đã ghi ngày ở trước). */
const gioNgayTrong = (iso: string) => { const t = new Date(iso); return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`; };
/** «Hôm nay» / «Hôm qua» / «3/11». */
const ngay = (iso: string) => {
  const t = new Date(iso), h = new Date();
  if (t.toDateString() === h.toDateString()) return "Hôm nay";
  h.setDate(h.getDate() - 1);
  return t.toDateString() === h.toDateString() ? "Hôm qua" : `${t.getDate()}/${t.getMonth() + 1}`;
};

export default function ViSao() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [vs, c, qua, cd, quyen] = await Promise.all([
      bm.goi<ViSaoT>(`con/${con}/vi-sao`).catch(() => null), bm.goi<{ ten: string }>(`con/${con}`),
      bm.goi<{ ds: Qua[] }>(`qua?con=${encodeURIComponent(con)}`), bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null), quyenToi(),
    ]);
    // máy chủ cũ: không có vi-sao ⇒ ví cũ
    const cu = vs ? null : await bm.goi<Vi & Partial<SaoCon>>(`con/${con}/vi`);
    return { bay: Date.now(), s: saoTu(vs ?? cu), bayNgay: vs?.bayNgay ?? null, lich: vs ? vs.lichSu : tuViCu(cu!.lichSu), ten: c.ten,
      qua: qua.ds.filter((x) => x.bat), phieu: (cd?.phieu ?? []).filter((p) => p.child_id === con), baMe: quyen === "ba_me" };
  });
  const [mo, setMo] = useState(false);
  const [vayTang, setVayTang] = useState<"vay" | "tang" | null>(null);   // #502: bảng «Cho vay · Tặng» (them-cblmebw3)
  const [dau, setDau] = useState<1 | -1>(1);
  const [so, setSo] = useState("10");
  const [lyDo, setLyDo] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Việc & quà" }} tieu="Ví sao"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const s = d.s, sao = s.sao, k = kieuSao(s), no = cauNo(s);
  const kiem = d.bayNgay?.saoKiem ?? d.lich.filter((x) => x.kieu === "kiem" && x.loai !== "tay" && x.loai !== "tang" && d.bay - new Date(x.luc).getTime() < 7 * 86_400_000).reduce((a, x) => a + x.delta, 0);
  const mauThe = k === "thuong" ? M.diemInk : MAU_NO.chu;
  const hang = hangVi(d.lich).slice(0, 40);
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/diem`, { delta: dau * (docSoNguyen(so) ?? 0), lyDo });
    setMo(false);
    bao(`Đã ${dau > 0 ? "cộng" : "trừ"} ${so} sao cho ${d.ten}`);
    setLyDo("");
    await tai();
  });
  return (
    <Man lui={{ chu: "Việc & quà" }} tieu={`Ví sao của ${d.ten}`} noi={noi} tai={tai}
      phai={d.baMe ? <Pressable onPress={() => setMo(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Nhan chu="± Điều chỉnh" /></Pressable> : undefined}>
      {/* thiết kế .vi: thẻ cao ~164 — «⭐ 30 sao» 50/800 trái; nợ ⇒ nền cảnh báo canhSoft #F0DCC8 chữ canh #983e04; Grow «xong» tràn góc phải dưới */}
      <View style={[{ minHeight: 164, padding: 20, borderRadius: 28, overflow: "hidden" },
        k === "thuong" ? { backgroundColor: M.the } : { backgroundColor: M.chonSoft }, KHOI.the]}
        accessible accessibilityLabel={`${soChinh(s)}${no ? `. ${no}` : ""}`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 100 }}>
          <Icon3D ten="sao" co={48} />
          {k === "vay" ? <Chu kieu="rat" co={24} mau={mauThe} so style={{ flexShrink: 1 }}>{soChinh(s)}</Chu> : <>
            <Chu kieu="tieu7" co={50} mau={k === "am" ? mauThe : M.chu} so style={{ lineHeight: 56, letterSpacing: -1 }}>{soVN(k === "am" ? 0 : sao)}</Chu>
            <Chu kieu="rat" co={22} mau={k === "am" ? mauThe : M.chu} style={{ marginTop: 10 }}>sao</Chu>
          </>}
        </View>
        {k === "thuong" ? <>
          <Chu kieu="rat" co={16} mau={mauThe} style={{ marginTop: 6 }}>{`= ${soVN(sao)} phút chơi`}</Chu>
          <Chu kieu="dam" co={13} mau={mauThe} style={{ marginTop: 4 }}>{`Tuần này kiếm ${kiem} sao`}</Chu>
        </> : <View style={{ paddingRight: 96 }}>
          <Chu kieu="rat" co={16} mau={mauThe} style={{ marginTop: 6 }}>{`Đang nợ Ba Mẹ ${soVN(s.no)} sao`}</Chu>
          <Chu kieu="dam" co={13} mau={mauThe} style={{ marginTop: 4 }}>Sao nhiệm vụ trả nợ trước</Chu>
          {d.bayNgay ? <Chu kieu="dam" co={13} mau={mauThe}>{`Tuần này: vay ${soVN(d.bayNgay.saoVay)} · đã trả ${soVN(d.bayNgay.saoTraNo)} sao`}</Chu> : null}
        </View>}
        <View pointerEvents="none" style={{ position: "absolute", right: -8, bottom: -22 }}><Rob ten="so-tay" co={118} /></View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.chinhSoft }}>
        <Icon3D ten="sao" co={32} />
        <Chu kieu="dam7" co={14} mau={M.chinhInk} style={{ flex: 1, lineHeight: 20 }}>1 sao = 1 phút chơi app «Tính phút». Hết sao thì con xin Ba Mẹ cho vay.</Chu>
      </View>

      {/* #502: Cho vay (cả «Chỉ trông con») · Tặng sao (chỉ «Như Ba Mẹ») */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Nut chu="Cho vay sao" loai="vien" rong bam={() => setVayTang("vay")} /></View>
        {d.baMe ? <View style={{ flex: 1 }}><Nut chu="Tặng sao" rong bam={() => setVayTang("tang")} /></View> : null}
      </View>

      <TieuMuc chu="Con đổi sao lấy quà" phai={{ chu: d.baMe ? "Sửa quà ›" : "Quà ›", bam: () => router.push({ pathname: "/vi/qua", params: { con, tab: "nha" } }) }} />
      <The>
        {d.phieu.map((p, i) => (
          <HangViec key={p.id} dau={i === 0} trai={<OLomIcon ic={icQua({ loai: p.loai, ten: p.ten }) as TenIcon} />} tieu={tenVoucher(p.ten)} phu={`Đã đổi ${p.diem} sao`} phai={<Nhan loai="canh" chu="Chờ Ba Mẹ trao" />}
            bam={() => router.push("/diem-qua" as never)} />
        ))}
        {d.qua.filter((q) => !d.phieu.some((p) => tenVoucher(p.ten) === tenVoucher(q.ten))).map((q, i) => (
          <HangViec key={q.id} dau={!d.phieu.length && i === 0} trai={<OLomIcon ic={icQua(q) as TenIcon} />} tieu={tenVoucher(q.ten)}
            phu={sao >= q.diem ? `Cần ${q.diem} sao · con tự đổi trên máy` : `Cần ${q.diem} sao · còn thiếu ${soVN(q.diem - sao)}`}
            phai={<Nhan loai={sao >= q.diem ? "ok" : "xam"} chu={sao >= q.diem ? "Đủ sao" : "Chưa đủ"} />} />
        ))}
        {!d.phieu.length && !d.qua.length ? <Chu co={14} mau={M.chu2}>Chưa có quà nào. Thêm quà để con có mục tiêu.</Chu> : null}
      </The>

      <TieuMuc chu="Sao vào, sao ra, vay và trả" />
      <The>
        {hang.length ? hang.map((x, i) => (
          <HangViec key={x.key} dau={i === 0} trai={<OLomIcon ic={x.ic} />} tieu={x.tieu} phu={x.phu} phai={<Nhan loai={x.loai} chu={x.nhan} />} />
        )) : <Chu co={14} mau={M.chu2}>{`Ví của ${d.ten} còn trống — sao đầu tiên đến khi con làm xong việc đầu tiên.`}</Chu>}
      </The>

      <BangChoVay mo={vayTang !== null} dong={() => setVayTang(null)} con={con} ten={d.ten} choTang={d.baMe} tabDau={vayTang ?? "vay"}
        xong={(k) => { tai(); router.push({ pathname: "/yeu-cau/xong", params: thamSoXongVay({ ...k, ten: d.ten, con }) } as never); }}
        tangXong={(k) => { bao(`Đã tặng ${d.ten} ${soVN(k.soSao)} sao${k.traNo > 0 ? ` · ${soVN(k.traNo)} sao trả nợ trước` : ""}`); tai(); }} />
      <BangTruot mo={mo} dong={() => setMo(false)} tieu={`Điều chỉnh sao của ${d.ten}`}>
        <ChonMot ds={[{ gia: 1 as const, chu: "Cộng sao" }, { gia: -1 as const, chu: "Trừ sao" }]} gia={dau} doi={setDau} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 120 }}><ONhap nhan="Số sao" value={so} onChangeText={(t) => setSo(soNguyenGo(t).slice(0, 5))} keyboardType="number-pad" loi={loiSoNguyen(so)} /></View>
          <View style={{ flex: 1 }}><ONhap nhan="Lý do" value={lyDo} onChangeText={setLyDo} placeholder={dau > 0 ? "Thưởng sinh nhật" : "Nói dối"} maxLength={120} /></View>
        </View>
        <Chu co={13} mau={M.chu3}>Mọi điều chỉnh tay được ghi lại trong ví và báo cáo.</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={`${dau > 0 ? "Cộng" : "Trừ"} ${so || 0} sao`} rong dangChay={dangChay} tat={!lyDo.trim() || !((docSoNguyen(so) ?? 0) >= 1)} bam={luu} />
      </BangTruot>
    </Man>
  );
}
