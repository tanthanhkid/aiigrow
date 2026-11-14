// «Hôm nay» — Trang chủ Ba Mẹ (thiết kế chốt 14/11: bm-hang-ngay/14 «Trang chủ gọn: để ý + đang chặn», 02 «máy đang khoá», 04 «máy con mất mạng»,
// 13/03 nhà nhiều con — luật N8 docs/KE-HOACH-KHOP-THIET-KE-1411.md: Trang chủ KHÔNG lặp tab):
//  1. Thẻ con: đang làm gì (chip → máy) · «<Con> còn chơi N phút» + vạch quỹ · «trong T phút hôm nay ›» (→ Giờ chơi) · «Khoá máy con» / «Cho thêm giờ»
//     (bảng trượt lib/hang-ngay). Máy đang khoá (02): «Laptop, iPad đã khoá» · «Mở lại lúc HH:MM» · «Mở khoá ngay» / «Đổi giờ».
//  2. «Cần Ba Mẹ để ý N» — CHỈ 1 mục gấp nhất + «Tất cả ›» (→ Thông báo): máy mất mạng (+ «Lấy mã mở máy») › lời xin của con (Không cho / Cho N phút)
//     › máy chưa được bảo vệ › quên PIN › cảnh báo › app mới chờ xếp. N = tổng các mục của con này.
//  3. «<Con> đang bị chặn gì»: chế độ chặn (Chặn app & web / Mở hết — «Đổi ›» → App & web), dải giờ trong ngày (Giờ học ✓ · Bây giờ: giờ chơi còn N ·
//     Giờ ngủ khoá HH:MM), «Web người lớn luôn bị chặn».
//  4. «<Con> vừa làm xong N» (≤ 3 việc chờ duyệt / tự cộng hôm nay) → màn bằng chứng; «Xem và duyệt N việc».
// Bỏ so với 05/11 (N8): danh sách nhiệm vụ hôm nay (tab Nhiệm vụ), «Hôm nay con dùng» (tab Báo cáo › Hôm nay con dùng gì), «Cài cho con», «Con khác»
// (chip đổi con ở đầu màn đã đủ; hồ sơ con mở từ tab Cả nhà / Báo cáo).
// Người trông giúp vẫn khoá máy / cho thêm giờ / trả lời lời xin (máy chủ cho phép — quyen.ts › trongGiupDuoc).
import { memo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type AppChuaXep, type CanhBao, type GiaDinh, type PhienDang, type TuanThuMay } from "@/lib/api";
import { ThanhClay } from "@/lib/bieu-do";
import { ChuongTb } from "@/lib/chuong-tb";
import { moLaiMay } from "@/lib/khoa-may";
import {
  BangKhoaMay, BangThemGio, quyenToi, soAppDuocMo, gioGon, HangViec, hinhNv, hoanTacThemGio, IC_MAY, SaoVien, TieuMuc,
  type ChoDuyetMoi, type ConCt, type LuatDem, type QuyCon,
} from "@/lib/hang-ngay";
import { tenMayXin, TheXin } from "@/lib/hom-nay-xin";
import { DaiCon } from "@/lib/ui-viec";
import { type MucCanDeY } from "@/lib/s3";
import { BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, Icon3D, M, Man, Nut, Rob, The, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

// Grow ở thẻ đầu: cỡ + lệch phải (âm = ló ra ngoài thẻ). Chữ chừa = phần Grow nằm trong thẻ − lề thẻ (16) + khoảng thở 10.
const ROB_CO = 100, ROB_PHAI = -6, ROB_TREN = 44, CHUA_ROB = ROB_CO + ROB_PHAI - 16 + 10;
// chip «đang làm gì» (cao 38) + lề trên thẻ 16 + khoảng 16 tới khối tiêu đề ⇒ khối tiêu đề bắt đầu ở 70 (đo từ mép thẻ)
const CHIP_CAO = 38, TIEU_TU = 16 + CHIP_CAO + 16;
const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ngayHomNay = () => { const t = new Date(); return `${THU[t.getDay()]}, ${t.getDate()}/${t.getMonth() + 1}`; };
/** «21:30» → phút trong ngày. */
const phutCua = (g: string | null | undefined) => { const m = /^(\d{1,2}):(\d{2})/.exec(g ?? ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

export default function HomNay() {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, cd, cb, choi, tt, luat, cdy, quyen] = await Promise.all([
      bm.goi<GiaDinh>("gia-dinh"), bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null), bm.goi<{ ds: CanhBao[] }>("canh-bao").catch(() => null),
      bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null),
      // app mới chưa xếp loại vẫn là việc chờ Ba Mẹ (issue #70 §2.3) ⇒ một mục «Cần Ba Mẹ để ý»; ds = luật để đếm «N app được mở»
      bm.goi<{ ds: LuatDem[]; chuaXep: AppChuaXep[] }>("luat").catch(() => null),
      // «Cần Ba Mẹ để ý» của máy chủ (mất mạng, quên PIN…) — máy chủ cũ không có ⇒ bỏ qua
      bm.goi<{ ds: MucCanDeY[] }>("can-de-y").catch(() => null),
      quyenToi(),         // «＋ Thêm con» ở dải avatar chỉ cho Ba Mẹ (như tab Cả nhà)
    ]);
    return { quyen, g, cd, cb: (cb?.ds ?? []).filter((x) => !x.da_doc), choi: choi?.ds ?? [], tt: tt?.ds ?? [], luat: luat?.ds ?? [], appMoi: luat?.chuaXep ?? [], cdy: cdy?.ds ?? [] };
  });
  const [chon, setChon] = useState<string | null>(null);
  const { bao, noi } = useHoanTac();
  const dau = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 4, marginTop: 4 }}>
      <Chu kieu="den" co={28} style={{ letterSpacing: -0.6 }}>Hôm nay</Chu>
      <Chu kieu="dam" co={14} mau={M.chu2} style={{ flex: 1, paddingTop: 6 }}>{ngayHomNay()}</Chu>
      <ChuongTb />
    </View>
  );
  if (!d) return <View style={{ flex: 1 }}><Man>{dau}<ChoTai loi={loi} matMang={matMang} tai={tai} /></Man></View>;
  if (!d.g.con.length) {
    return (
      <View style={{ flex: 1 }}>
        <Man>{dau}
          <CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con đầu tiên để bắt đầu.">
            <Nut chu="Thêm con" ic="cong" bam={() => router.push("/thiet-lap/ten-con" as never)} />
          </CanhGiua>
        </Man>
      </View>
    );
  }
  const c = d.g.con.find((x) => x.id === chon) ?? d.g.con[0];
  return (
    <View style={{ flex: 1 }}>
      <Man tai={tai} vongTai noi={noi}>
        {dau}
        {/* N9: nhà nhiều con — dải avatar tròn (thiết kế bm2-trang-chu 14/11: tên + «còn 18′» dưới, số lời xin góc trên, ＋ Thêm con cuối dải) */}
        {d.g.con.length > 1 ? <DaiConTrangChu d={d} chon={c.id} doi={setChon} /> : null}
        <BangCon key={c.id} conId={c.id} d={d} taiLai={tai} bao={bao} />
      </Man>
    </View>
  );
}

/**
 * Dải avatar Trang chủ (thiết kế bm2-trang-chu 14/11 .cac-con): số lời xin góc trên, ICON TRẠNG THÁI nhỏ góc dưới (🎮 đang chơi «còn 18′» ·
 * 📖 «đang học» · 🔒 «đã khoá» · 🌙 «chưa dùng» / «đang ngủ»), ＋ Thêm con cuối dải. Trạng thái lấy từ con/:id/quy từng con (+ phiên đang chơi).
 */
function DaiConTrangChu({ d, chon, doi }: { d: DuLieu & { quyen?: string }; chon: string; doi: (id: string) => void }) {
  const qs = useTai(() => Promise.all(d.g.con.map((x) => bm.goi<QuyCon>(`con/${x.id}/quy`).then((r) => [x.id, r.quy] as const, () => [x.id, null] as const))),
    `tab:hom-nay:quy:${d.g.con.map((x) => x.id).join(",")}`);
  const quy = Object.fromEntries(qs.d ?? []);
  const tt = Object.fromEntries(d.g.con.map((x) => {
    const q = quy[x.id], con = q?.conPhut ?? x.conPhut ?? Math.max(0, x.tranNgay - x.phutChoi);
    const dangChoi = d.choi.some((p) => p.con === x.id);
    const [ic, chu]: [TenIcon | null, string] = q?.khoa ? ["khoa", "đã khoá"] : dangChoi ? ["game", `còn ${con}′`] : q?.dangHoc ? ["sach", "đang học"]
      : q?.dangNgu ? ["trang_ngu", "đang ngủ"] : !x.phutChoi ? ["trang_ngu", "chưa dùng"] : [null, `còn ${con}′`];
    return [x.id, { ic, chu }];
  }));
  return (
    <DaiCon ds={d.g.con} chon={chon} doi={(x) => doi(x.id)}
      so={Object.fromEntries(d.g.con.map((x) => [x.id, x.yeuCauCho]))}
      phu={Object.fromEntries(d.g.con.map((x) => [x.id, tt[x.id].chu]))} ic={Object.fromEntries(d.g.con.map((x) => [x.id, tt[x.id].ic]))}
      nhanSo="lời xin" them={d.quyen === "ba_me" ? () => router.push("/ho-so/them" as never) : undefined} />
  );
}

type DuLieu = { g: GiaDinh; cd: ChoDuyetMoi | null; cb: CanhBao[]; choi: PhienDang[]; tt: TuanThuMay[]; luat: LuatDem[]; appMoi: AppChuaXep[]; cdy: MucCanDeY[] };
/** Một mục «Cần Ba Mẹ để ý» (không phải lời xin — lời xin vẽ bằng TheXin). */
type MucDeY = { id: string; ic: TenIcon; tieu: string; phu: string; nut: string; den: string; maMay?: string };

const BangCon = memo(function BangCon({ conId, d, taiLai, bao }: {
  conId: string; d: DuLieu; taiLai: () => void; bao: (chu: string, hoan?: () => void) => void;
}) {
  const c = d.g.con.find((x) => x.id === conId)!;
  const ct = useTai(() => bm.goi<ConCt>(`con/${conId}`));
  const qy = useTai(() => bm.goi<QuyCon>(`con/${conId}/quy`));
  const [bang, setBang] = useState<"khoa" | "gio" | null>(null);
  const { lam, loi, dangChay } = useLam();
  const tai = () => { ct.tai(); qy.tai(); taiLai(); };

  const may = ct.d?.may ?? [];
  const choi = d.choi.find((p) => p.con === conId);
  const dangMo = may.find((m) => m.truc);
  const q = qy.d?.quy;
  const sao = qy.d?.sao ?? c.soDu;
  const phutDoi = q && q.doiSao.bat ? Math.min(Math.floor((sao * q.tyLe.phut) / 10), q.doiSao.conDoiDuoc) : 0;
  const khoa = !!ct.d?.khoaNgay || !!q?.khoa;
  const conPhut = q?.conPhut ?? c.conPhut ?? 0, tongPhut = q?.tongPhut ?? c.tranNgay;

  // ---- 2. cần Ba Mẹ để ý (mục của con này; mục cả nhà — cảnh báo không gắn con — cũng tính)
  const xin = (d.cd?.yeuCau ?? []).filter((y) => y.child_id === conId);
  const cuaCon = (x: { con: string | null }) => !x.con || x.con === conId;
  const muc: MucDeY[] = [];
  for (const m of c.matMang ?? []) muc.push({ id: `mm:${m.mayId}`, ic: "wifi", tieu: `${m.ten.replace(/ của .*$/, "")} mất mạng`, phu: "Grow vẫn khoá đúng giờ · con cần mã",
    nut: "Lấy mã mở máy", den: `/may/${m.mayId}/ma-offline`, maMay: m.mayId });
  const sau: MucDeY[] = [];
  for (const m of d.tt.filter((x) => (x.con === conId || x.dungChung) && x.baoVe && x.baoVe !== "day_du" && !x.dangGo))
    sau.push({ id: `bv:${m.id}`, ic: IC_MAY[m.nen], tieu: `${m.ten} chưa được bảo vệ`, phu: m.baoVeCau ?? "Con tự tắt Grow được", nut: "Sửa ›", den: `/may/${m.id}` });
  // quên PIN: từ can-de-y; lời gọi đó lỗi ⇒ dựng lại từ cảnh báo loai quen_pin
  const quenPin = d.cdy.some((x) => x.loai === "quen_pin") ? d.cdy.filter((x) => x.loai === "quen_pin" && x.con === conId)
    : d.cb.filter((x) => x.loai === "quen_pin" && x.child_id === conId).slice(0, 1).map((x) => ({ id: x.id, tieu: x.noi_dung, den: `/ho-so/${conId}/pin` }));
  for (const x of quenPin) sau.push({ id: `pin:${x.id}`, ic: "mo_khoa", tieu: x.tieu, phu: "Đặt PIN mới cho con", nut: "Đặt PIN ›", den: x.den });
  for (const x of d.cb.filter((a) => cuaCon({ con: a.child_id }) && a.loai !== "quen_pin").slice(0, 3))
    sau.push({ id: `cb:${x.id}`, ic: "canh_bao", tieu: x.noi_dung, phu: gioPhut(x.created_at), nut: "Xem ›", den: `/canh-bao/${x.id}` });
  if (d.appMoi.length) sau.push({ id: "app-moi", ic: "luoi", tieu: `${d.appMoi.length} app mới chờ Ba Mẹ xếp`, phu: d.appMoi.slice(0, 2).map((x) => x.ten ?? x.muc).join(", "),
    nut: "Xếp ›", den: "/app-web" });
  const soDeY = muc.length + xin.length + sau.length;
  // gấp nhất trước: máy mất mạng (con đang kẹt) › lời xin (con đang chờ) › còn lại
  const dauTien: { loai: "muc"; m: MucDeY } | { loai: "xin" } | null = muc[0] ? { loai: "muc", m: muc[0] } : xin[0] ? { loai: "xin" } : sau[0] ? { loai: "muc", m: sau[0] } : null;

  // ---- 3. đang bị chặn gì
  const moHet = ct.d?.cheDoChan === "mo_het";
  const soApp = soAppDuocMo(d.luat, conId);
  const bayGio = new Date().getHours() * 60 + new Date().getMinutes();
  const hocDen = phutCua(q?.gioHoc?.den);
  const hocHomNay = !!q?.gioHoc && q.gioHoc.thu.includes(new Date().getDay());
  const hocXong = hocHomNay && hocDen !== null && bayGio >= hocDen;

  // ---- 4. vừa làm xong (chờ duyệt + tự cộng hôm nay), ≤ 3
  const nopCho = (d.cd?.nhiemVu ?? []).filter((x) => x.child_id === conId);
  const tuDong = (d.cd?.tuDong ?? []).filter((x) => x.child_id === conId);
  const xong = [
    ...nopCho.map((x) => ({ id: x.id, ten: x.ten, ic: hinhNv(x)[0], phu: `${x.so_ghi_am ? "Ghi âm" : x.so_anh ? `${x.so_anh} ảnh` : "Đã báo xong"} · ${gioPhut(x.nop_luc)}`,
      sao: x.sao ?? x.diem, den: `/duyet/${x.id}` })),
    ...tuDong.map((x) => ({ id: x.id, ten: x.ten, ic: "may_tinh" as TenIcon, phu: `Tự cộng sao · ${gioPhut(x.duyet_luc)}`, sao: x.diem, den: "/diem-qua" })),
  ];

  // ---- 1. thẻ con
  const mayKhoa = may.filter((m) => !m.dungChung || m.truc).map((m) => m.ten.replace(/ của .*$/, ""));
  const chipChu = khoa ? `${mayKhoa.length ? mayKhoa.join(", ") : "Máy"} đã khoá` : choi ? `${choi.tenApp}${choi.may ? ` · ${choi.may.replace(/ của .*$/, "")}` : ""}`
    : q?.dangHoc ? "Đang giờ học" : dangMo ? `${dangMo.ten.replace(/ của .*$/, "")} đang mở` : may.length ? "Máy đang tắt" : "Chưa ghép máy";
  const chipIc: TenIcon = khoa ? "khoa" : choi ? "game" : q?.dangHoc ? "sach" : dangMo ? IC_MAY[dangMo.nen] : "laptop";
  const mayDang = choi?.may ? may.find((m) => m.ten === choi.may) ?? dangMo : dangMo;
  const khoaDen = ct.d?.khoaDen ?? null;
  // bảng Khoá máy: máy đang chạy app gì (thiết kế 05 «Laptop ● Roblox · từ 19:02»)
  const dangTheoMay: Record<string, { chu: string; mo?: boolean }> = {};
  for (const m of may) {
    const p = d.choi.find((x) => x.con === conId && x.may === m.ten);
    if (p) dangTheoMay[m.id] = { chu: `● ${p.tenApp}`, mo: true };
  }
  // thiết kế bm2-trang-chu 14/11: một dòng to «Còn 18 phút chơi» (không «<Con> còn chơi» + số riêng)
  const tieuNho = khoa ? null : q?.dangNgu ? `${c.ten} đang giờ ngủ` : null;
  const tieuLon = khoa ? (khoaDen ? `Mở lại lúc ${gioPhut(khoaDen)}` : "Khoá tới khi Ba Mẹ mở") : q?.dangNgu ? `Mở lại lúc ${gioGon(q.gioNgu.den)}`
    : conPhut ? null : `${c.ten} hết giờ chơi hôm nay`;
  const phuGio = khoa ? `Đang khoá · còn ${conPhut} phút chơi ›` : `trong ${tongPhut} phút hôm nay ›`;

  return (
    <>
      {/* 1. thẻ con */}
      <The style={{ backgroundColor: M.chinhSoft, minHeight: 236, overflow: "visible" }}>
        <View style={{ position: "absolute", right: ROB_PHAI, top: ROB_TREN }} pointerEvents="none"><Rob ten={khoa ? "nghi" : q?.dangNgu ? "ngu" : "chi"} co={ROB_CO} /></View>
        <Pressable onPress={() => router.push((mayDang ? `/may/${mayDang.id}` : `/may?con=${conId}`) as never)} accessibilityRole="button"
          style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, minHeight: CHIP_CAO, paddingLeft: 8, paddingRight: 12, borderRadius: 19, backgroundColor: M.the, maxWidth: "72%" }}>
          {choi && !khoa ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M.chinh }} /> : null}
          <Icon3D ten={chipIc} co={20} mau={M.chu2} />
          <Chu kieu="dam" co={14} dong={1} style={{ flexShrink: 1 }}>{`${chipChu} ›`}</Chu>
        </Pressable>
        {/* máy đang khoá: không có vạch quỹ ⇒ câu «Đang khoá · còn N phút chơi ›» (cả bề ngang) lên cao, ở khổ 320 đè Grow «nghi» (cổng DE-ANH)
            ⇒ khối tiêu đề cao tối thiểu tới đáy Grow. Tiêu đề số «Còn N phút chơi» (.so strong 800, giãn −1) KHÔNG đè Grow (cổng DE-ANH) ⇒ Grow 100 + chữ 26: một dòng từ khổ 375 khi số phút 1–2 chữ số (3 chữ số / chữ hệ thống to thì xuống dòng) */}
        <View style={{ marginTop: 16, marginRight: CHUA_ROB, minHeight: khoa ? ROB_TREN + ROB_CO - TIEU_TU : undefined }}>
          {tieuNho ? <Chu kieu="dam" co={14} mau={M.chu2}>{tieuNho}</Chu> : null}
          {tieuLon ? <Chu kieu="den" co={26} so style={{ letterSpacing: -0.6 }}>{tieuLon}</Chu>
            : <Chu kieu="den" co={26} so style={{ letterSpacing: -1 }}>{`Còn ${conPhut} phút chơi`}</Chu>}
        </View>
        {!khoa && tongPhut ? (
          <View style={{ marginTop: 8, marginRight: CHUA_ROB - 24 }}>
            <ThanhClay ti={Math.max(0, Math.min(1, conPhut / tongPhut))} cao={10} nhanDoc={`Còn ${conPhut} trên ${tongPhut} phút`} />
          </View>
        ) : null}
        <Pressable onPress={() => router.push(`/gio/${conId}` as never)} accessibilityRole="button" style={{ minHeight: 36, justifyContent: "center", alignSelf: "flex-start" }}>
          <Chu kieu="dam" co={14} mau={M.chinhInk}>{phuGio}</Chu>
        </Pressable>
        {/* 2 nút chia đều bề ngang; máy hẹp (320) không đủ 2 × 140 ⇒ xuống hàng, mỗi nút một dòng chữ (cổng NUT-2-DONG). Nhãn + icon 3D theo thiết kế 14/11 */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <View style={{ flexGrow: 1, flexBasis: 140 }}>
            {khoa ? <Nut chu="Mở khoá ngay" ic="mo_khoa" ic3d sat rong dangChay={dangChay} bam={() => lam(async () => { await moLaiMay(conId, c.ten, bao, tai); tai(); })} />
              : <Nut chu="Khoá máy" ic="khoa" ic3d sat rong nhanDoc={`Khoá máy của ${c.ten}`} tat={!ct.d} bam={() => setBang("khoa")} />}
          </View>
          <View style={{ flexGrow: 1, flexBasis: 140 }}>
            {khoa ? <Nut chu="Đổi giờ" ic="dongho" ic3d sat rong loai="vien" tat={!ct.d} bam={() => setBang("khoa")} />
              : <Nut chu="Cho thêm giờ" ic="dongho" ic3d sat rong loai="vien" bam={() => setBang("gio")} />}
          </View>
        </View>
        <BaoLoi loi={loi ?? ct.loi ?? qy.loi} />
      </The>

      {/* 2. cần Ba Mẹ để ý — 1 mục + Tất cả */}
      <TieuMuc chu="Cần Ba Mẹ để ý" so={soDeY} phai={{ chu: "Tất cả ›", bam: () => router.push("/thong-bao" as never) }} />
      <The>
        {!dauTien ? <HangViec dau ic="tick" mau="xanh" tieu="Không có gì cần Ba Mẹ trả lời" /> : dauTien.loai === "xin" ? (
          <TheXin y={xin[0]} may={tenMayXin(xin[0], may)} lam={(fn) => lam(fn)} dang={dangChay} />
        ) : (
          <>
            <HangViec dau ic={dauTien.m.ic} mau="cam" tieu={dauTien.m.tieu} phu={dauTien.m.phu}
              phai={dauTien.m.maMay ? undefined : <Chu kieu="rat" co={14} mau={M.chinhInk}>{dauTien.m.nut}</Chu>}
              bam={() => router.push((dauTien.m.maMay ? `/may/${dauTien.m.maMay}` : dauTien.m.den) as never)} />
            {dauTien.m.maMay ? (
              <View style={{ marginTop: 4, marginBottom: 6 }}>
                <Nut chu="Lấy mã mở máy" ic="mo_khoa" rong bam={() => router.push({ pathname: "/may/[id]/ma-offline", params: { id: dauTien.m.maMay! } })} />
              </View>
            ) : null}
          </>
        )}
      </The>

      {/* 3. đang bị chặn gì */}
      <TieuMuc chu={`${c.ten} đang bị chặn gì`} />
      <The>
        <HangViec dau ic={moHet ? "mo_khoa" : "khien"} mau="lam" tieu={moHet ? "Mở hết" : "Chặn app & web"}
          phu={moHet ? "Chỉ chặn web người lớn" : `${soApp} app được mở · app mới phải xin`}
          phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Đổi ›</Chu>} bam={() => router.push(`/app-web?con=${conId}` as never)} />
        {q ? (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {q.gioHoc && hocHomNay ? (
              <MocGio ic="sach" tieu="Giờ học" phu={`${gioGon(q.gioHoc.tu)}–${gioGon(q.gioHoc.den)}${hocXong ? " ✓" : ""}`} nay={q.dangHoc} mo={hocXong}
                bam={() => router.push(`/gio/hoc?con=${conId}` as never)} />
            ) : null}
            <MocGio ic="game" tieu="Giờ chơi" phu={khoa ? "đang khoá" : `còn ${conPhut} phút`} nay={!q.dangHoc && !q.dangNgu}
              bam={() => router.push(`/gio/${conId}` as never)} />
            <MocGio ic="trang_ngu" tieu="Giờ ngủ" phu={`khoá ${gioGon(q.gioNgu.tu)}`} nay={q.dangNgu} bam={() => router.push(`/gio/ngu?con=${conId}` as never)} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
          <Icon3D ten="khien" co={18} mau={M.chu2} />
          <Chu kieu="dam" co={13.5} mau={M.chu2}>Web người lớn luôn bị chặn</Chu>
        </View>
      </The>

      {/* 4. vừa làm xong */}
      {xong.length ? (
        <>
          <TieuMuc chu={`${c.ten} vừa làm xong`} so={xong.length} phai={{ chu: "Nhiệm vụ ›", bam: () => router.push("/diem-qua" as never) }} />
          <The>
            {xong.slice(0, 3).map((x, k) => (
              <HangViec key={x.id} dau={k === 0} ic={x.ic} mau="xanh" tieu={x.ten} phu={x.phu} phai={<SaoVien n={x.sao} nho />} bam={() => router.push(x.den as never)}
                nhanDoc={`Xem ${x.ten}`} />
            ))}
            {nopCho.length ? (
              <View style={{ marginTop: 8 }}>
                <Nut chu={`Xem và duyệt ${nopCho.length} việc`} rong ic="sao" bam={() => router.push(`/duyet?con=${conId}` as never)} />
              </View>
            ) : null}
          </The>
        </>
      ) : null}

      <BangKhoaMay mo={bang === "khoa"} dong={() => setBang(null)} con={conId} ten={c.ten} may={may} dang={dangTheoMay}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
      <BangThemGio mo={bang === "gio"} dong={() => setBang(null)} con={conId} ten={c.ten} sao={sao} phutDoiDuoc={phutDoi} conPhut={conPhut}
        xong={(chu, grant) => { bao(chu, () => { hoanTacThemGio(grant).then(tai, () => { bao("Đã quá 60 giây — không hoàn tác được"); tai(); }); }); tai(); }} />
    </>
  );
});

/** Một mốc trong dải giờ hôm nay (thiết kế 14 «.truc»): «Bây giờ» = mốc đang áp; mốc đã qua (Giờ học ✓) mờ đi. */
function MocGio({ ic, tieu, phu, nay, mo, bam }: { ic: TenIcon; tieu: string; phu: string; nay?: boolean; mo?: boolean; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu} ${phu}${nay ? ", bây giờ" : ""}`}
      style={{ flex: 1, minHeight: 72, padding: 10, borderRadius: 18, gap: 2, opacity: mo ? 0.7 : 1,
        backgroundColor: nay ? M.chinhSoft : M.nen, borderWidth: nay ? 1.5 : 0, borderColor: M.chinh }}>
      {nay ? <Chu kieu="rat" co={11} mau={M.chinhInk}>Bây giờ</Chu> : null}
      <Icon3D ten={ic} co={20} mau={M.chu2} />
      <Chu kieu="rat" co={13.5}>{tieu}</Chu>
      <Chu co={12} mau={M.chu3} dong={1}>{phu}</Chu>
    </Pressable>
  );
}

