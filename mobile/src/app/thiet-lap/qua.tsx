// them-s416tfdj «Quà của X» (bước 3/5 Lần đầu; bàn v13 19/11, kèm them-u60j9p7w / them-x9x2u07e): 3 tab Tất cả · Ba Mẹ mua · Quà nhà.
//  · «Ba Mẹ mua» (voucher AiiCafe, sách AiiLab, Lego — tốn tiền): mỗi dòng chọn số lượng −/＋ «Đang có: N»; bấm tên ⇒ chi tiết them-hn2754ce (/thiet-lap/qua-mua).
//  · «Quà nhà» (không tốn tiền): cùng cách chọn số lượng; tab này có thêm khung «Thêm quà nhà» (tên + 50/100/200/300 sao + nút ＋ vàng = POST qua {ten, sao, apCho:[con]}).
//  · Nút cuối ghi tổng: «Xong, thêm N quà · trả X đ». Quà nhà / quà vật lý chọn ≥1 ⇒ POST qua/thu-vien {mau, con} (vào kho của con); quà TRẢ TIỀN chưa có cổng thanh toán ⇒
//    bảng «Mua quà qua AiiGrow» (nhắn AiiGrow) rồi đi tiếp. «Để sau, chọn quà sau» ⇒ Chơi bằng sao.
// 7 quà mặc định (N12) máy chủ đã gieo khi tạo Con (qua-bang-gia › gieoQuaMacDinh) — màn này không bỏ chúng.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { TheDs } from "@/lib/lan-dau-ds";
import type { NhomThuVien, MauQua } from "@/lib/s3";
import { layTl } from "@/lib/thiet-lap";
import { BangTruot, BaoLoi, ChoTai, Chu, F, IconNet, LopMen, M, Man, Nut, useHoanTac, useLam, useTai } from "@/lib/ui";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { dong, soCham } from "@/lib/voucher-lan-dau";

type Tab = "tat_ca" | "ba_me_mua" | "qua_nha";
type Qua = { id: string; ten: string; sao: number; mau: string | null; loai: string };
const GOI_Y = ["Xem phim", "Chọn món tối", "Đi công viên", "Đồ chơi nhỏ"];
const SAO = [50, 100, 200, 300];
/** Mã mẫu thư viện ⇒ mã voucher của màn chi tiết (them-hn2754ce). */
const CHI_TIET: Record<string, string> = { aiicafe_20k: "cafe20", aiicafe_50k: "cafe50", aiicafe_100k: "cafe100", sach_aiilab: "sach", workshop_aiilab: "workshop" };
/** Dòng phụ theo bàn: «20.000đ · 200 sao · QR 60 ngày». */
const phuMau = (m: MauQua) => [m.menhGia ? dong(m.menhGia) : null, `${soCham(m.sao)} sao`,
  m.loai === "voucher" && m.ma.startsWith("aiicafe") ? "QR 60 ngày" : m.chiCuoiTuan ? "Thứ 7, Chủ nhật" : m.moTa && !/^Ba Mẹ|^Có tồn/.test(m.moTa) ? m.moTa : m.ma === "lego" ? "còn hàng, hết thì ẩn" : null].filter(Boolean).join(" · ");

export default function ObQua() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const con = tl.conId;
  const [tab, setTab] = useState<Tab>("tat_ca");
  const [sl, setSl] = useState<Record<string, number>>({});
  const [hoi, setHoi] = useState(false);
  const { guiCham, noi } = useHoanTac();            // xoá quà đã điền: hoàn tác 8 giây trước khi gửi máy chủ
  const { lam, loi, dangChay, setLoi } = useLam();
  const { d, loi: loiTai, matMang, tai } = useTai(async () => {
    const [tv, q] = await Promise.all([bm.goi<{ nhom: NhomThuVien[] }>(`qua/thu-vien${con ? `?con=${encodeURIComponent(con)}` : ""}`),
      bm.goi<{ ds: Qua[] }>(`qua${con ? `?con=${encodeURIComponent(con)}` : ""}`)]);
    return { nhom: tv.nhom, rieng: q.ds.filter((x) => !x.mau && x.loai !== "voucher") };
  });
  const [daXoa, setDaXoa] = useState<string[]>([]);
  const sang = () => router.push("/thiet-lap/gio");
  const dsMua = d?.nhom.find((g) => g.ma === "ba_me_mua")?.ds ?? [];
  const dsNha = d?.nhom.find((g) => g.ma === "qua_nha")?.ds ?? [];
  const dat = (ma: string, n: number) => setSl((x) => ({ ...x, [ma]: Math.max(0, Math.min(9, n)) }));
  const chonMua = dsMua.filter((m) => (sl[m.ma] ?? 0) > 0);
  const chonNha = dsNha.filter((m) => (sl[m.ma] ?? 0) > 0);
  const tongQua = [...chonMua, ...chonNha].reduce((t, m) => t + (sl[m.ma] ?? 0), 0);
  const tongTien = chonMua.reduce((t, m) => t + (m.menhGia ?? 0) * (sl[m.ma] ?? 0), 0);
  const traTien = chonMua.filter((m) => (m.menhGia ?? 0) > 0);
  const xong = () => lam(async () => {
    // quà không tốn tiền + quà vật lý (không có giá voucher) vào kho của con; voucher trả tiền chờ cổng thanh toán
    const vao = [...chonNha, ...chonMua.filter((m) => !m.menhGia)].map((m) => m.ma).filter((ma) => !(dsNha.find((m) => m.ma === ma)?.daCo));
    if (vao.length) await bm.goi("qua/thu-vien", { mau: vao, ...(con ? { con } : {}) });
    if (traTien.length) setHoi(true); else sang();
  });
  const cauNut = tongQua ? `Xong, thêm ${tongQua} quà${tongTien ? ` · trả ${dong(tongTien)}` : ""}` : "Xong, sang chơi bằng sao";
  return (
    <Man dau={<DauMan ve="/thiet-lap/mau" phai={<ThanhBuoc5 dang={2} />} />} noi={noi}
      day={<><BaoLoi loi={loi} /><Nut chu={cauNut} rong dangChay={dangChay} bam={tongQua ? xong : sang} /><LienKet chu="Để sau, chọn quà sau" bam={sang} /></>}>
      <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: M.chu, marginLeft: 4 }}>Quà của {ten}</Text>
      <TabQua dang={tab} doi={setTab} />
      {!d ? <ChoTai loi={loiTai} matMang={matMang} tai={tai} /> : (
        <>
          {tab !== "qua_nha" ? (
            <Nhom ic="the_qua" chu="Ba Mẹ mua" phu="tốn tiền · mua thêm được">
              <TheDs le>
                {dsMua.map((m, i) => <DongQua key={m.ma} i={i} ten={m.ten} phu={phuMau(m)} n={sl[m.ma] ?? 0} dat={(n) => dat(m.ma, n)} tran={m.menhGia ? undefined : 1}
                  xem={CHI_TIET[m.ma] ? () => router.push({ pathname: "/thiet-lap/qua-mua", params: { ma: CHI_TIET[m.ma] } }) : undefined} />)}
              </TheDs>
            </Nhom>
          ) : null}
          {tab === "qua_nha" ? <ThemQuaNha con={con} lam={lam} setLoi={setLoi} dangChay={dangChay} tai={tai} /> : null}
          {tab !== "ba_me_mua" ? (
            <Nhom ic="nha" chu="Quà nhà" phu={tab === "qua_nha" ? `${dsNha.length + d.rieng.filter((q) => !daXoa.includes(q.id)).length} quà` : "không tốn tiền"}>
              <TheDs le>
                {dsNha.map((m, i) => <DongQua key={m.ma} i={i} ten={m.ten} phu={phuMau(m)} n={m.daCo ? Math.max(1, sl[m.ma] ?? 1) : sl[m.ma] ?? 0} dat={(n) => dat(m.ma, n)} khoa={m.daCo} tran={1} />)}
                {d.rieng.filter((q) => !daXoa.includes(q.id)).map((q, i) => (
                  <DongQua key={q.id} i={dsNha.length + i} ten={q.ten} phu={`${soCham(q.sao)} sao`} n={1}
                    dat={(n) => { if (n >= 1) return; setDaXoa((x) => [...x, q.id]); guiCham(`Đã xoá quà «${q.ten}»`, () => {
                      bm.goi(`qua/${q.id}/xoa`, {}).then(() => tai(), () => { setDaXoa((x) => x.filter((y) => y !== q.id)); setLoi(`Chưa xoá được quà «${q.ten}», thử lại nhé.`); tai(); });
                    }, () => setDaXoa((x) => x.filter((y) => y !== q.id))); }} tran={1} />
                ))}
              </TheDs>
            </Nhom>
          ) : null}
        </>
      )}
      <BangTruot mo={hoi} dong={() => setHoi(false)} tieu="Mua quà qua AiiGrow">
        <Chu co={14.5} mau={M.chu2}>Thanh toán trong app đang được chuẩn bị. Ba Mẹ nhắn AiiGrow để mua {traTien.map((m) => `${sl[m.ma]} × ${m.ten}`).join(", ")} ({dong(tongTien)}) — quà sẽ nằm sẵn trong kho của con.</Chu>
        <Nut chu="Nhắn AiiGrow" rong bam={() => { setHoi(false); router.push("/ho-tro"); }} />
        <Nut chu="Để sau, đi tiếp" loai="ma" rong bam={() => { setHoi(false); sang(); }} />
      </BangTruot>
    </Man>
  );
}

/** Tab 3 mục (bàn: rãnh lõm, mục đang chọn navy chữ vàng kem). */
function TabQua({ dang, doi }: { dang: Tab; doi: (t: Tab) => void }) {
  const ds: { ma: Tab; chu: string }[] = [{ ma: "tat_ca", chu: "Tất cả" }, { ma: "ba_me_mua", chu: "Ba Mẹ mua" }, { ma: "qua_nha", chu: "Quà nhà" }];
  return (
    <View style={{ flexDirection: "row", gap: 4, padding: 4, minHeight: 52, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom }} accessibilityRole="tablist">
      {ds.map((x) => {
        const on = x.ma === dang;
        return (
          <Pressable key={x.ma} onPress={() => doi(x.ma)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", borderRadius: 22 }, on && { backgroundColor: M.chinh, boxShadow: BONG.ngoc }]}>
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 14, color: on ? M.diem : M.chu3 }}>{x.chu}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Nhom({ ic, chu, phu, children }: { ic: "the_qua" | "nha"; chu: string; phu: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
        <IconNet ten={ic === "the_qua" ? "the_qua" : "nha"} co={20} mau={M.chinh} />
        <Chu kieu="rat" co={16} style={{ flex: 1 }}>{chu}</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu>
      </View>
      {children}
    </View>
  );
}

/** Một dòng quà: tên + dòng phụ + viên «Đang có: N» + nút − / ＋ (＋ vàng kim). `khoa` = quà đã có sẵn (chỉ hiện, không đổi số); `tran` = số tối đa. */
function DongQua({ i, ten, phu, n, dat, xem, khoa, tran = 9 }: { i: number; ten: string; phu: string; n: number; dat: (n: number) => void; xem?: () => void; khoa?: boolean; tran?: number }) {
  const nut = (chu: "−" | "＋", bam: () => void, tat: boolean, nhan: string) => (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={`${nhan} ${ten}`} hitSlop={4}
      style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: tat ? 0.4 : 1, overflow: "hidden" },
        chu === "＋" ? { backgroundColor: M.diem, boxShadow: BONG.vang } : { backgroundColor: M.the, boxShadow: BONG.nho }]}>
      {chu === "＋" ? <LopMen men={MEN.vang} bo={22} /> : null}
      <IconNet ten={chu === "＋" ? "cong" : "tru"} co={20} mau={M.chinh} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: M.ranh }}>
      <Pressable onPress={xem} disabled={!xem} accessibilityRole={xem ? "button" : undefined} accessibilityLabel={xem ? `Xem chi tiết ${ten}` : undefined} style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Chu kieu="rat" co={15.5} dong={2}>{ten}</Chu>
        <Chu kieu="dam" co={12.5} mau={M.chu2} dong={2}>{phu}</Chu>
        <View style={{ alignSelf: "flex-start", minHeight: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: "center", backgroundColor: n ? M.chinh : M.xamSoft, boxShadow: n ? undefined : BONG.nho }}>
          <Chu kieu="rat" co={12} mau={n ? M.diem : M.chinh} so>Đang có: {n}</Chu>
        </View>
      </Pressable>
      {nut("−", () => dat(n - 1), n <= 0 || (!!khoa && n <= 1), "Bớt 1")}
      {nut("＋", () => dat(n + 1), !!khoa || n >= tran, "Thêm 1")}
    </View>
  );
}

/** Khung «Thêm quà nhà» (them-u60j9p7w): ô tên, 4 gợi ý, 4 mốc sao, nút ＋ vàng kim. */
function ThemQuaNha({ con, lam, setLoi, dangChay, tai }: { con?: string; lam: (f: () => Promise<unknown>) => void; setLoi: (s: string | null) => void; dangChay: boolean; tai: () => unknown }) {
  const [ten, setTen] = useState("");
  const [sao, setSao] = useState(100);
  const them = () => lam(async () => {
    const t = ten.trim();
    if ([...t].length < 2) throw new Error("Điền tên quà con muốn.");
    setLoi(null);
    await bm.goi("qua", { ten: t, sao, loai: t === "Đồ chơi nhỏ" ? "qua" : "dac_quyen", ...(con ? { apCho: [con] } : {}) });
    setTen("");
    await tai();
  });
  const chip = (on: boolean) => ({ minHeight: 44, borderRadius: 22, paddingHorizontal: 18, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 4,
    backgroundColor: on ? M.chinh : M.the, boxShadow: on ? BONG.ngoc : BONG.nho });
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
        <IconNet ten="cong" co={20} mau={M.chinh} /><Chu kieu="rat" co={16} style={{ flex: 1 }}>Thêm quà nhà</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>không tốn tiền</Chu>
      </View>
      <View style={{ borderRadius: 24, backgroundColor: M.the, padding: 16, gap: 10, ...KHOI.the }}>
        <View style={{ minHeight: 52, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom, justifyContent: "center", paddingHorizontal: 18 }}>
          <TextInput value={ten} onChangeText={setTen} placeholder="Quà con muốn, ví dụ: Đi ăn kem" placeholderTextColor={M.chu3} maxLength={60} accessibilityLabel="Quà con muốn"
            style={{ fontFamily: F.dam, fontSize: 15.5, color: M.chu, paddingVertical: 10, outlineStyle: "none" } as never} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {GOI_Y.map((g) => <Pressable key={g} onPress={() => setTen(g)} accessibilityRole="button" style={chip(false)}><Chu kieu="rat" co={14}>{g}</Chu></Pressable>)}
        </View>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }} accessibilityRole="radiogroup">
          {SAO.map((s) => (
            <Pressable key={s} onPress={() => setSao(s)} accessibilityRole="radio" accessibilityState={{ checked: sao === s }} accessibilityLabel={`${s} sao`}
              style={[chip(sao === s), { flex: 1, paddingHorizontal: 0 }]}>
              <IconNet ten="sao" co={12} mau={M.diem} /><Chu kieu="rat" co={13.5} mau={sao === s ? M.diem : M.chu} so>{s}</Chu>
            </Pressable>
          ))}
          <Pressable onPress={them} disabled={dangChay || !ten.trim()} accessibilityRole="button" accessibilityLabel="Thêm quà nhà"
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: M.diem, overflow: "hidden", boxShadow: BONG.vang, opacity: ten.trim() ? 1 : 0.5 }}>
            <LopMen men={MEN.vang} bo={20} /><IconNet ten="cong" co={20} mau={M.chinh} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
