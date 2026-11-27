// «Hôm nay» — Trang chủ Ba Mẹ (thiết kế chốt 14/11: bm-hang-ngay/14 «Trang chủ gọn: để ý + App & web», 02 «máy đang khoá», 04 «máy con mất mạng»,
// 13/03 nhà nhiều con — luật N8 docs/KE-HOACH-KHOP-THIET-KE-1411.md: Trang chủ KHÔNG lặp tab):
//  1. Thẻ con: đang làm gì (chip → máy) · SỐ SAO (15/11 #263–#266, lib/so-sao: «⭐ 30 sao» · «còn 10 sao = 10 phút chơi» + «Đang nợ Ba Mẹ 20 sao» ·
//     «⭐ −20 sao» + «Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước ›» → Ví sao) · «Khoá máy» rộng hết thẻ (#421 — cho vay chỉ ở thẻ «Con xin vay … sao»).
//     Máy đang khoá (them-0kwhgpq6): «Laptop, iPad đã khoá» · «Mở lại lúc HH:MM» · «Đang khoá · còn N sao = N phút ›» · «Mở khoá ngay» rộng hết thẻ (#421).
//     Dải avatar: viên sao dưới tên mỗi con (âm = viên cảnh báo). Bỏ vạch quỹ phút, «Giờ dùng máy» (bm2-gio đã bỏ).
//  2. «Cần Ba Mẹ để ý N» — CHỈ 1 mục gấp nhất + «Tất cả ›» (→ Thông báo): máy mất mạng (+ «Lấy mã mở máy») › lời xin của con (Không cho / Cho vay N sao;
//     máy đang khoá ⇒ «Xin mở khoá máy · chơi vẫn trừ sao» Không cho / Mở khoá)
//     › máy chưa được bảo vệ › quên PIN › cảnh báo › app mới chờ xếp. N = tổng các mục của con này.
//  3. «<Con> đã dùng gì hôm nay · Xem hết ›» (khớp bàn bm2-trang-chu@v35, #325): ≤ 4 app / web mới nhất (GET con/:id/hom-nay — cùng nguồn màn
//     «<Con> đã dùng gì» them-c95l1cwc): giờ · ô icon · tên + máy · viên «−39 sao» (Tính phút, 1 sao = 1 phút) / «10 phút» (Không tính phút).
//     Bỏ khối «App & web của <Con>» + ô «Tính phút» (bàn v29+ đã chuyển sang tab App & web) và chip «Roblox · Laptop ›» ở thẻ đầu (bàn không còn).
//  4. «<Con> vừa làm xong N · Việc & quà ›» (bàn v35 17/11: tab Nhiệm vụ đổi tên «Việc & quà») (≤ 3 việc chờ duyệt / tự cộng hôm nay) → màn bằng chứng;
//     «Xem và duyệt N việc».
// Máy đang khoá (them-0kwhgpq6@v9): thẻ đầu nền xám, Grow «ngu», nhãn «Laptop, iPad đã khoá» (không bấm), «… còn N sao = N phút ›» → Máy của con.
// Bỏ so với 05/11 (N8): danh sách nhiệm vụ hôm nay (tab Việc & quà), «Cài cho con», «Con khác»
// (chip đổi con ở đầu màn đã đủ; hồ sơ con mở từ tab Cả nhà / Báo cáo).
// Người trông giúp vẫn khoá máy / cho vay sao / trả lời lời xin (máy chủ cho phép — quyen.ts › trongGiupDuoc).
import { memo, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type AppChuaXep, type CanhBao, type GiaDinh, type PhienDang, type TuanThuMay } from "@/lib/api";
import { ChuongTb } from "@/lib/chuong-tb";
import { moLaiMay } from "@/lib/khoa-may";
import {
  BangKhoaMay, quyenToi, HangViec, hinhNv, IC_MAY, SaoVien, TieuMuc,
  type ChoDuyetMoi, type ConCt, type LuatDem, type NhiemVuMoi, type QuyCon,
} from "@/lib/hang-ngay";
import { tenMayXin, TheXin } from "@/lib/hom-nay-xin";
import { mayCuaCon } from "@/lib/may-nhieu-con";
import { mayCanDeY } from "@/lib/trang-thai-may";
import { cauNo, saoTu, soVN, VienSao } from "@/lib/so-sao";
import { DaiCon, OLomIcon } from "@/lib/ui-viec";
import { icDung, nhanDung, type HomNayDung } from "@/lib/da-dung";
import { type MucCanDeY } from "@/lib/s3";
import { tieuTheChinh } from "@/lib/tieu-the-chinh";
import { BaoLoi, CanhGiua, ChoTai, Chu, DauSach, gioPhut, IconNet, M, Man, Nhan, Nut, Rob, The, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";
import Svg, { Circle } from "react-native-svg";
import { HERO } from "@/lib/clay";
import { soHomNay } from "@/lib/so-hom-nay";

// Robot Grow 3D ở thẻ đầu (Bàn bm2-trang-chu v44 `.rob`: cao 104, sát mép phải, trên 8; máy khoá = Grow «ngủ», còn lại = Grow chỉ tay — #509).
// Chữ chừa 96 bên phải (Bàn `.trai{margin-right:96px}`) = phần Grow nằm trong thẻ.
const ROB_CO = 104, ROB_PHAI = 0, ROB_TREN = 8, CHUA_ROB = 96;
// máy khoá: nhãn «Laptop, iPad đã khoá» (cao 32) + khoảng 10 trên khối tiêu đề; không khoá: khối tiêu đề ở ngay lề trên thẻ (16)
const NHAN_CAO = 32;
/** nền thẻ lời xin (bàn .de-y) */
const NEN_XIN = M.chonSoft;
const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** Giờ máy tự khoá khi hết sao: bây giờ + số phút còn. */
const gioHetSao = (phut: number) => gioPhut(new Date(Date.now() + phut * 60000).toISOString());
const ngayHomNay = () => { const t = new Date(); return `${THU[t.getDay()]}, ${t.getDate()}/${t.getMonth() + 1}`; };
/** «21:30» → phút trong ngày. */

export default function HomNay() {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, cd, cb, choi, tt, luat, cdy, quyen] = await Promise.all([
      bm.goi<GiaDinh>("gia-dinh"), bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null), bm.goi<{ ds: CanhBao[] }>("canh-bao").catch(() => null),
      bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null),
      // app mới chưa xếp loại vẫn là việc chờ Ba Mẹ (issue #70 §2.3) ⇒ một mục «Cần Ba Mẹ để ý»; ds = luật để đếm «N app được mở»
      bm.goi<{ ds: LuatDem[]; chuaXep: AppChuaXep[] }>("luat").catch(() => null),
      // «Cần Ba Mẹ để ý» của máy chủ (mất mạng, quên PIN…) — máy chủ cũ không có ⇒ bỏ qua
      bm.goi<{ ds: MucCanDeY[]; soTheoCon?: Record<string, number>; soCaNha?: number }>("can-de-y").catch(() => null),
      quyenToi(),         // «＋ Thêm con» ở dải avatar chỉ cho Ba Mẹ (như tab Cả nhà)
    ]);
    return { quyen, g, cd, cb: (cb?.ds ?? []).filter((x) => !x.da_doc), choi: choi?.ds ?? [], tt: tt?.ds ?? [], luat: luat?.ds ?? [], appMoi: luat?.chuaXep ?? [], cdy: cdy?.ds ?? [], cdyOk: !!cdy?.soTheoCon, soTheoCon: cdy?.soTheoCon ?? {}, soCaNha: cdy?.soCaNha ?? 0 };
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
        {/* key theo danh sách con: thêm / bớt con ⇒ dựng lại (useTai giữ hàm tải của lần đầu) */}
        <DaiConTrangChu key={d.g.con.map((x) => x.id).join(",")} d={d} chon={c.id} doi={setChon} />
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
  // Trang chủ tải lại (kéo để tải, sau Khoá máy / Cho thêm giờ) ⇒ `d` đổi ⇒ tải lại trạng thái từng con (bỏ lần đầu: useTai đã tải)
  const dau = useRef(true);
  const taiQs = qs.tai;
  useEffect(() => { if (dau.current) { dau.current = false; return; } taiQs(); }, [d, taiQs]);
  const quy = Object.fromEntries(qs.d ?? []);
  // thiết kế bm2-trang-chu 15/11: dưới tên là VIÊN SAO (⭐ 35 sao · ⭐ −20 sao cảnh báo), icon trạng thái nhỏ góc dưới avatar
  const ic = Object.fromEntries(d.g.con.map((x) => {
    const q = quy[x.id];
    const dangChoi = d.choi.some((p) => p.con === x.id);
    const i: TenIcon | null = q?.khoa ? "khoa" : dangChoi ? "game" : null;
    return [x.id, i];
  }));
  return (
    <DaiCon ds={d.g.con} chon={chon} doi={(x) => doi(x.id)}
      so={Object.fromEntries(d.g.con.map((x) => [x.id, x.yeuCauCho]))} ic={ic}
      duoi={Object.fromEntries(d.g.con.map((x) => [x.id, <VienSao key={x.id} s={saoTu(x)} nho />]))}
      nhanSo="lời xin" them={d.quyen === "ba_me" ? () => router.push("/ho-so/them" as never) : undefined} />
  );
}

type DuLieu = { g: GiaDinh; cd: ChoDuyetMoi | null; cb: CanhBao[]; choi: PhienDang[]; tt: TuanThuMay[]; luat: LuatDem[]; appMoi: AppChuaXep[]; cdy: MucCanDeY[]; cdyOk: boolean; soTheoCon: Record<string, number>; soCaNha: number };
/** Một mục «Cần Ba Mẹ để ý» (không phải lời xin — lời xin vẽ bằng TheXin). */
type MucDeY = { id: string; ic: TenIcon; tieu: string; phu: string; nut: string; den: string; maMay?: string };

const BangCon = memo(function BangCon({ conId, d, taiLai, bao }: {
  conId: string; d: DuLieu; taiLai: () => void; bao: (chu: string, hoan?: () => void) => void;
}) {
  const c = d.g.con.find((x) => x.id === conId)!;
  const ct = useTai(() => bm.goi<ConCt>(`con/${conId}`));
  const qy = useTai(() => bm.goi<QuyCon>(`con/${conId}/quy`));
  // «<Con> đã dùng gì hôm nay» — máy chủ cũ chưa có con/:id/hom-nay ⇒ bỏ mục
  const hn = useTai(() => bm.goi<HomNayDung>(`con/${conId}/hom-nay`).catch(() => null));
  // «x/y việc · Đã làm» (Bàn bm2-trang-chu v44 ô số thứ hai): y = việc đang bật giao cho con này (hoặc cả nhà) — máy chủ cũ / lỗi ⇒ chỉ đếm việc đã thấy
  const nv = useTai(() => bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu").catch(() => null));
  const [bang, setBang] = useState<"khoa" | null>(null);
  const { lam, loi, dangChay } = useLam();
  const tai = () => { ct.tai(); qy.tai(); hn.tai(); nv.tai(); taiLai(); };

  const may = ct.d?.may ?? [];
  const q = qy.d?.quy;
  // sổ sao (lib/so-sao): con/:id/quy › soSao mới nhất, không có ⇒ gia-dinh › con[] (máy chủ cũ: soDu, không nợ)
  const s = saoTu(qy.d?.soSao ?? c);
  const khoa = !!ct.d?.khoaNgay || !!q?.khoa;

  // ---- 2. cần Ba Mẹ để ý (mục của con này; mục cả nhà — cảnh báo không gắn con — cũng tính)
  const xin0 = (d.cd?.yeuCau ?? []).filter((y) => y.child_id === conId);
  const cuaCon = (x: { con: string | null }) => !x.con || x.con === conId;
  const muc0: MucDeY[] = [];
  for (const m of c.matMang ?? []) muc0.push({ id: `mm:${m.mayId}`, ic: "wifi", tieu: `${m.ten.replace(/ của .*$/, "")} mất mạng`, phu: "Hết sao vẫn tự khoá · con cần mã",
    nut: "Lấy mã mở máy", den: `/may/${m.mayId}/ma-offline`, maMay: m.mayId });
  const sau0: MucDeY[] = [];
  for (const m of d.tt.filter((x) => mayCuaCon(x, conId) && mayCanDeY(x)))
    sau0.push({ id: `bv:${m.id}`, ic: IC_MAY[m.nen], tieu: `${m.ten} chưa được bảo vệ`, phu: m.baoVeCau ?? "Con tự tắt Grow được", nut: "Sửa ›", den: `/may/${m.id}` });
  // quên PIN: từ can-de-y; lời gọi đó lỗi ⇒ dựng lại từ cảnh báo loai quen_pin
  const quenPin = d.cdy.some((x) => x.loai === "quen_pin") ? d.cdy.filter((x) => x.loai === "quen_pin" && x.con === conId)
    : d.cb.filter((x) => x.loai === "quen_pin" && x.child_id === conId).slice(0, 1).map((x) => ({ id: x.id, tieu: x.noi_dung, den: `/ho-so/${conId}/pin` }));
  for (const x of quenPin) sau0.push({ id: `pin:${x.id}`, ic: "mo_khoa", tieu: x.tieu, phu: "Đặt PIN mới cho con", nut: "Đặt PIN ›", den: x.den });
  for (const x of d.cb.filter((a) => cuaCon({ con: a.child_id }) && a.loai !== "quen_pin" && a.canSua !== false && a.chiBiet !== true).slice(0, 3))
    sau0.push({ id: `cb:${x.id}`, ic: "canh_bao", tieu: x.noi_dung, phu: gioPhut(x.created_at), nut: "Xem ›", den: `/canh-bao/${x.id}` });
  // #508: Con CÀI app mới trên máy (máy chủ gửi qua «Cần Ba Mẹ để ý» — app_moi) ⇒ Ba Mẹ chọn Tính phút / Không tính phút
  for (const x of d.appMoi.length ? [] : d.cdy.filter((y) => y.loai === "app_moi" && (y.con === conId || !y.con))) sau0.push({ id: x.id, ic: "luoi", tieu: x.tieu, phu: x.phu, nut: "Chọn ›", den: x.den });
  if (d.appMoi.length) sau0.push({ id: "app-moi", ic: "luoi", tieu: `${d.appMoi.length} app mới chờ Ba Mẹ xếp`, phu: d.appMoi.slice(0, 2).map((x) => x.ten ?? x.muc).join(", "),
    nut: "Xếp ›", den: "/app-web" });
  // #727: MỘT nguồn đếm — máy chủ (can-de-y › demCanDeY): thẻ vẽ từ CHÍNH các dòng đó, số tiêu đề = soTheoCon của máy chủ = số thẻ hiện ra (cũng là số trên chuông, chấm tab).
  // Máy chủ cũ không có can-de-y ⇒ dựng như trước từ các nguồn lẻ.
  const hang = d.cdyOk ? d.cdy.filter((x) => x.loai !== "nop_bai" && cuaCon(x)) : null;
  const IC_DONG: Record<string, TenIcon> = { quen_pin: "mo_khoa", canh_bao: "canh_bao", app_moi: "luoi", chua_bao_ve: "khoa" };
  const muc: MucDeY[] = hang ? hang.filter((x) => x.loai === "mat_mang").map((x) => ({ id: x.id, ic: "wifi" as TenIcon, tieu: `${x.tieu.replace(/ của .*? mất mạng$/, " mất mạng")}`, phu: "Hết sao vẫn tự khoá · con cần mã",
    nut: "Lấy mã mở máy", den: x.den, maMay: x.may })) : muc0;
  const xinKhop = (x: MucCanDeY) => xin0.find((y) => `con_xin:${y.id}` === x.id);
  const xin = hang ? hang.filter((x) => x.loai === "con_xin").map(xinKhop).filter((y): y is NonNullable<typeof y> => !!y) : xin0;
  // lời xin máy chủ đếm mà danh sách Chờ duyệt chưa có (tải lệch nhịp) vẫn là MỘT thẻ — số và thẻ luôn bằng nhau
  const sau: MucDeY[] = hang ? hang.filter((x) => x.loai !== "mat_mang" && (x.loai !== "con_xin" || !xinKhop(x))).map((x) => ({ id: x.id, ic: IC_DONG[x.loai] ?? (x.loai === "con_xin" ? "web" : "canh_bao"), tieu: x.tieu, phu: x.phu, nut: `${x.nut} ›`, den: x.den })) : sau0;
  const soDeY = hang ? (d.soTheoCon[conId] ?? d.soCaNha) : muc.length + xin.length + sau.length;
  // gấp nhất trước: máy mất mạng (con đang kẹt) › lời xin (con đang chờ) › còn lại
  const dauTien: { loai: "muc"; m: MucDeY } | { loai: "xin" } | null = muc[0] ? { loai: "muc", m: muc[0] } : xin[0] ? { loai: "xin" } : sau[0] ? { loai: "muc", m: sau[0] } : null;

  // ---- 3. đã dùng gì hôm nay: 4 mục mới nhất
  const daDung = [...(hn.d?.dung ?? [])].sort((a, b) => (b.luc ? Date.parse(b.luc) : -Infinity) - (a.luc ? Date.parse(a.luc) : -Infinity) || 0).slice(0, 4);
  const veDaDung = () => router.push(`/da-dung/${conId}` as never);

  // ---- 4. vừa làm xong (chờ duyệt + tự cộng hôm nay), ≤ 3
  const nopCho = (d.cd?.nhiemVu ?? []).filter((x) => x.child_id === conId);
  const tuDong = (d.cd?.tuDong ?? []).filter((x) => x.child_id === conId);
  const xong = [
    ...nopCho.map((x) => ({ id: x.id, ten: x.ten, ic: hinhNv(x)[0], phu: `${x.so_ghi_am ? "Ghi âm" : x.so_anh ? `${x.so_anh} ảnh` : "Đã báo xong"} · ${gioPhut(x.nop_luc)}`,
      sao: x.sao ?? x.diem, den: `/duyet/${x.id}` })),
    ...tuDong.map((x) => ({ id: x.id, ten: x.ten, ic: "may_tinh" as TenIcon, phu: `Tự cộng sao · ${gioPhut(x.duyet_luc)}`, sao: x.diem, den: "/diem-qua" })),
  ];

  // ---- 1. thẻ con
  const xViec = c.nhiemVuXong ?? 0;
  const yViec = Math.max(xViec + nopCho.length, (nv.d?.ds ?? []).filter((x) => x.bat && (!x.lap_lai || x.lap_lai === "hang_ngay") && (!x.giao_cho || x.giao_cho === conId)).length);
  // tên máy trong viên trạng thái gọn ≤ 14 ký tự (tên máy dài sẽ lấn sang Grow); nhiều máy mất mạng ⇒ «Laptop +1»
  const gonTen = (t: string) => (t.length > 14 ? `${t.slice(0, 13)}…` : t);
  const matMangMay = (c.matMang ?? []).slice(0, 1).map((m) => gonTen(m.ten.replace(/ của .*$/, "")) + ((c.matMang?.length ?? 0) > 1 ? ` +${(c.matMang?.length ?? 1) - 1}` : ""));
  const mayKhoa = may.filter((m) => !m.dungChung || m.truc).map((m) => m.ten.replace(/ của .*$/, ""));
  const khoaDen = ct.d?.khoaDen ?? null;
  // bảng Khoá máy: máy đang chạy app gì (thiết kế 05 «Laptop ● Roblox · từ 19:02»)
  const dangTheoMay: Record<string, { chu: string; mo?: boolean }> = {};
  for (const m of may) {
    const p = d.choi.find((x) => x.con === conId && x.may === m.ten);
    if (p) dangTheoMay[m.id] = { chu: `● ${p.tenApp}`, mo: true };
  }
  // tiêu đề thẻ chính: khoá ⇒ giờ mở lại · con đang chơi ⇒ «Đang chơi <app>» · đã chơi phút nào hôm nay (cùng nguồn «Đã chơi»/«Đã dùng») ⇒ «Đã dùng N phút» · chưa chơi ⇒ «Chưa dùng máy»
  const dangChoi = d.choi.find((x) => x.con === conId) ?? null;
  // #700: một nguồn «đã chơi hôm nay» = phút đã trừ sao (máy chủ: hom-nay › choi.daChoi, quy › phutTruHomNay) — số nguyên như Hồ sơ Con, Màn hình, máy Con
  const daChoiPhut = soHomNay(hn.d?.choi, q?.phutTruHomNay ?? hn.d?.choi?.daDung ?? q?.daDung).daChoi;
  const tieuLon = tieuTheChinh({ khoa, mo: khoaDen, dangChoi: dangChoi?.tenApp, daChoiPhut, gio: gioPhut });
  const cheDo = ct.d?.cheDoChan === "mo_het" ? "Mở hết" : "Theo danh sách";
  const veVi = () => router.push(`/vi/${conId}` as never);
  // máy khoá: «… còn N sao = N phút ›» → Máy của con; còn lại → Ví sao
  const bamPhu = khoa ? () => router.push(`/may?con=${conId}` as never) : veVi;
  const phuSao = khoa ? `Đang khoá · còn ${soVN(s.phutCon)} sao = ${soVN(s.phutCon)} phút ›`
    : dangChoi ? (s.phutCon > 0 ? `Tự khoá lúc ${gioHetSao(s.phutCon)} ›` : "Hết sao · máy tự khoá ›")
    : s.phutCon > 0 ? `= ${soVN(s.phutCon)} phút chơi ›` : "Hết sao · con xin Ba Mẹ cho vay khi cần ›";

  return (
    <>
      {/* 1. thẻ chính (Bàn #492 bm2-trang-chu v44 · them-0kwhgpq6 · them-1mnk3mjz): trả lời «máy con lúc này ra sao», LUÔN có 2 nút (vàng + sáng) */}
      <The hero style={{ overflow: "visible" }}>
        <View style={{ position: "absolute", left: 24, top: 0 }} pointerEvents="none"><DauSach mau={HERO.phu} rong={16} cao={22} /></View>
        <View style={{ position: "absolute", right: ROB_PHAI, top: ROB_TREN }} pointerEvents="none"><Rob ten={khoa ? "ngu" : "chi"} co={ROB_CO} /></View>
        {/* chip trạng thái: máy khoá «Laptop, iPad · Đã khoá» (không bấm) — còn lại «Chặn: Theo danh sách ›» → tab App & web (Con mở được gì: App + Web) */}
        {khoa ? <ChipThe ic="khoa" nen="#1F2A44" dau={mayKhoa.length ? mayKhoa.join(", ") : "Máy"} cuoi="Đã khoá" />
          : matMangMay.length ? <ChipThe ic="wifi" icMau={HERO.phu} dau={matMangMay.join(", ")} cuoi="Mất mạng" cuoiMau={HERO.phu} />
          : <ChipThe ic="khien" dau="Chặn:" cuoi={`${cheDo}\u00A0›`} cuoiMau={HERO.phu} bam={() => router.push(`/chan?con=${conId}&k=${Date.now()}` as never)} nhanDoc={`Chặn: ${cheDo}`} gon />}
        <View style={{ marginTop: 10, marginRight: CHUA_ROB, minHeight: 30 }}>
          <Chu kieu="tieu7" co={24} so mau={khoa ? HERO.phu : HERO.chu} style={{ letterSpacing: -0.6 }}>{tieuLon}</Chu>
        </View>
        <Pressable onPress={bamPhu} accessibilityRole="button" style={{ minHeight: 36, paddingVertical: 6, paddingRight: 8, marginRight: CHUA_ROB - 8, justifyContent: "center", alignSelf: "stretch", minWidth: 0 }}>
          <Chu kieu="dam" co={13} mau={HERO.chu} style={{ flexShrink: 1, minWidth: 0 }}>{phuSao}</Chu>
        </Pressable>
        {cauNo(s) ? (
          <Pressable onPress={veVi} accessibilityRole="button" style={{ minHeight: 32, paddingVertical: 6, justifyContent: "center", marginRight: CHUA_ROB - 8 }}>
            <Chu kieu="rat" co={13} mau={HERO.chu}>{`${cauNo(s)} ›`}</Chu>
          </Pressable>
        ) : null}
        {!khoa ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <OSo vong={hn.d && daChoiPhut + hn.d.choi.conPhut > 0 ? daChoiPhut / (daChoiPhut + hn.d.choi.conPhut) : 0} mau={HERO.phu} ic="dongho" so={hn.d ? `${daChoiPhut} phút` : "–"} nhan="Đã chơi"
              bam={() => router.push("/bao-cao" as never)} />
            <OSo vong={yViec ? xViec / yViec : 0} mau="#5cb98f" ic="tick" so={yViec ? `${xViec}/${yViec} việc` : `${xViec} việc`} nhan="Đã làm" bam={() => router.push("/diem-qua" as never)} />
          </View>
        ) : null}
        {/* hai nút: vàng (Khoá mọi máy / Mở khoá ngay) + sáng (Thêm nhiệm vụ / Đổi giờ) */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            {khoa ? <Nut chu="Mở khoá ngay" ic="mo_khoa" ic3d nho sat rong motDong loai="vang" toi dangChay={dangChay} bam={() => lam(async () => { await moLaiMay(conId, c.ten, bao, tai); tai(); })} />
              : <Nut chu="Khoá mọi máy" ic="khoa" ic3d nho sat rong motDong loai="vang" toi nhanDoc={`Khoá máy của ${c.ten}`} tat={!ct.d} bam={() => setBang("khoa")} />}
          </View>
          <View style={{ flex: 1 }}>
            {khoa ? <Nut chu="Đổi giờ" ic="dongho" ic3d nho sat rong motDong loai="nho" bam={() => setBang("khoa")} />
              : <Nut chu="Thêm nhiệm vụ" ic="cong" nho sat rong motDong loai="nho" bam={() => router.push(`/giao-nv?con=${conId}` as never)} />}
          </View>
        </View>
        <BaoLoi loi={loi ?? ct.loi ?? qy.loi} />
      </The>

      {/* 2. cần Ba Mẹ để ý — 1 mục + Tất cả */}
      <TieuMuc chu="Cần Ba Mẹ để ý" so={soDeY} phai={{ chu: "Tất cả ›", bam: () => router.push("/thong-bao" as never) }} />
      {/* mục cần để ý: thẻ cảnh (Ánh kim: canhSoft #F0DCC8, thay đào #ffe6d6); lời xin — ô icon + tiêu đề một dòng + «Bỏ qua | Thêm · Tính phút» */}
      {/* #727: HIỆN ĐỦ mọi mục — số trên tiêu đề (soDeY) = đúng số thẻ ở đây (máy mất mạng › lời xin › còn lại) */}
      <The style={dauTien ? { backgroundColor: NEN_XIN, paddingVertical: 4 } : undefined}>
        {!dauTien ? <HangViec dau ic="tick" mau="xanh" tieu="Không có gì cần Ba Mẹ trả lời" /> : (
          <>
            {muc.map((m) => (
              <View key={m.id}>
                <HangViec dau={m.id === muc[0]?.id} ic={m.ic} mau="cam" tieu={m.tieu} phu={m.phu}
                  phai={m.maMay ? undefined : <Chu kieu="rat" co={14} mau={M.chinhInk}>{m.nut}</Chu>}
                  bam={() => router.push((m.maMay ? `/may/${m.maMay}` : m.den) as never)} />
                {m.maMay ? (
                  <View style={{ marginTop: 4, marginBottom: 6 }}>
                    <Nut chu="Lấy mã mở máy" ic="mo_khoa" ic3d rong bam={() => router.push({ pathname: "/may/[id]/ma-offline", params: { id: m.maMay! } })} />
                  </View>
                ) : null}
              </View>
            ))}
            {xin.map((y) => (
              <TheXin key={y.id} y={y} may={tenMayXin(y, may)} lam={(fn) => lam(fn)} dang={dangChay} sao={s} oIcon
                moKhoa={khoa ? async () => { await moLaiMay(conId, c.ten, bao, tai); } : undefined} />
            ))}
            {sau.map((m) => (
              <HangViec key={m.id} dau={!muc.length && !xin.length && m.id === sau[0]?.id} ic={m.ic} mau="cam" tieu={m.tieu} phu={m.phu}
                phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>{m.nut}</Chu>} bam={() => router.push(m.den as never)} />
            ))}
          </>
        )}
      </The>

      {/* 3. đã dùng gì hôm nay (bàn bm2-trang-chu@v35 .ls; máy khoá — them-0kwhgpq6 — không có mục này) — dòng Tính phút có máy → máy đó; còn lại → «<Con> đã dùng gì» */}
      {daDung.length && !khoa ? (
        <>
          <TieuMuc chu={`${c.ten} đã dùng gì hôm nay`} phai={{ chu: "Xem hết ›", bam: veDaDung }} />
          <The style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
            {daDung.map((x, k) => (
              <Pressable key={`${x.kieu}:${x.muc}`} accessibilityRole="button" accessibilityLabel={`${x.ten}, ${nhanDung(x).doc}`}
                onPress={() => (x.tinhGio && x.mayId ? router.push(`/may/${x.mayId}` as never) : veDaDung())}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, borderTopWidth: k ? 1.5 : 0, borderTopColor: M.vien }}>
                <Chu kieu="rat" co={13} mau={M.chu3} so style={{ width: 42 }}>{x.luc ? gioPhut(x.luc) : ""}</Chu>
                <OLomIcon ic={icDung(x)} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Chu kieu="rat" co={15} dong={1}>{x.ten}</Chu>
                  <Chu kieu="dam" co={12.5} mau={x.matMang ? M.canh : M.chu3} dong={1}>
                    {[x.matMang ? "● Mất mạng" : x.dangMo ? "● Đang mở" : null, (x.may ?? "").replace(/ của .*$/, "") || x.nen].filter(Boolean).join(" · ")}
                  </Chu>
                </View>
                <View style={{ alignSelf: "center" }}><Nhan chu={nhanDung(x).chu} loai={x.tinhGio ? "canh" : "xam"} /></View>
              </Pressable>
            ))}
          </The>
        </>
      ) : null}

      {/* 4. vừa làm xong */}
      {xong.length ? (
        <>
          <TieuMuc chu={`${c.ten} vừa làm xong`} so={xong.length} phai={{ chu: "Việc & quà ›", bam: () => router.push("/diem-qua" as never) }} />
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
    </>
  );
});

/** Ô số trên thẻ navy (Bàn bm2-trang-chu v44 `.o`: cao 52, vòng tiến độ 34 + icon, số 16 đậm + nhãn 11,5). `vong` 0..1. */
function OSo({ vong, mau, ic, so, nhan, bam }: { vong: number; mau: string; ic: TenIcon; so: string; nhan: string; bam: () => void }) {
  const C = 2 * Math.PI * 15, t = Math.max(0, Math.min(1, vong));
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${so}, ${nhan}`}
      style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 52, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0px 0px 0px 1px rgba(244,199,106,0.22)" }}>
      <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
        <Svg width={34} height={34} viewBox="0 0 36 36" style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={18} cy={18} r={15} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
          {t > 0 ? <Circle cx={18} cy={18} r={15} fill="none" stroke={mau} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${C * t} ${C}`} /> : null}
        </Svg>
        <IconNet ten={ic} co={15} mau={mau} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="tieu7" co={16} so dong={1} mau={HERO.chu}>{so}</Chu>
        <Chu kieu="dam" co={11.5} dong={1} mau={HERO.chu} style={{ opacity: 0.8 }}>{nhan}</Chu>
      </View>
    </Pressable>
  );
}

/** Viên trạng thái đầu thẻ navy (Bàn `.chan`: cao 30, bo 15, icon vàng + «<máy> · <trạng thái>»). Chừa chỗ cho Grow bên phải; chữ quá dài thì «…» ở phần đầu. */
function ChipThe({ ic, icMau = HERO.chu, nen = "rgba(255,255,255,0.12)", dau, cuoi, cuoiMau = HERO.chu, bam, nhanDoc, gon }: {
  ic: TenIcon; icMau?: string; nen?: string; dau: string; cuoi: string; cuoiMau?: string; bam?: () => void; nhanDoc?: string; gon?: boolean;
}) {
  const trong = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: NHAN_CAO, paddingLeft: 8, paddingRight: 12, borderRadius: 16, backgroundColor: nen, maxWidth: "100%" }}>
      <IconNet ten={ic} co={17} mau={icMau} />
      <Chu kieu="rat" co={13.5} dong={1} mau={HERO.chu} style={{ flexShrink: 1, minWidth: 0 }}>{dau}</Chu>
      <Chu kieu="rat" co={13.5} mau={cuoiMau} style={{ flexShrink: 0, marginLeft: -2 }}>{gon ? cuoi : `· ${cuoi}`}</Chu>
    </View>
  );
  return (
    <View style={{ alignSelf: "stretch", marginRight: CHUA_ROB, flexDirection: "row" }}>
      {bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={nhanDoc} style={{ maxWidth: "100%" }}>{trong}</Pressable> : trong}
    </View>
  );
}
