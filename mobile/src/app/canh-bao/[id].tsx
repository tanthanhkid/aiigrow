// Chi tiết một cảnh báo (thiết kế chốt 14/11, bm-hang-ngay/10–12) — một khuôn: hình máy + biểu tượng, tiêu đề, «giờ · máy · chi tiết», viên kết quả
// (vd «Grow đã chặn, con không xem được»), «Ba Mẹ nên biết» (lần thứ mấy trong tuần + lần trước, lời khuyên), các nút theo loại:
//  · 10 trang bị chặn (loại có «web», người lớn, cờ bạc): «Xem <Con> dùng gì hôm nay» · «Xem <máy>» · «Đã biết»
//  · 11 Grow bị tắt (may_dung_dich_vu, may_thu_go, may_ngoai_vong < 1 ngày): «Khoá <máy>» · «Xem <máy>» · «Ba Mẹ tắt đấy, bỏ qua»
//  · 12 máy mất liên lạc > 1 ngày (may_ngoai_vong, matNhipPhut ≥ 1440): «Thường do» 3 lý do · «Kiểm tra <máy> cùng con» · «Xem <máy>»
//  · giờ máy bị đổi (lech_gio — bm-duyet/05 cũ, giữ): «Chuyện gì đã xảy ra» + mở khoá sau khi nói chuyện hoặc để khoá.
//  · 15/11 nợ quá 1.000 sao (no_qua_1000 — thiết kế them-5twxl6hf «Cảnh báo nợ sao», #266): thẻ đào «<Con> đã nợ quá 1.000 sao · 19:41 · đang nợ 1.020 · vượt
//    mốc sau lần cho vay 30 sao», «Ví sao của <Con> −1.020 sao», «Ba Mẹ nên biết» (không chặn cho vay · sao nhiệm vụ trả nợ trước · 7 ngày qua vay / trả),
//    «Giao thêm nhiệm vụ để trả nợ» · «Xem ví sao» · «Cho vay thêm» (bảng them-y1r1eidm) · «Đã biết».
// Máy của cảnh báo: chi_tiet.mayId nếu có, không thì dò tên máy trong câu cảnh báo (GET canh-bao chưa trả device_id). AiiGrow không đọc nội dung của con.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type CanhBao, type GiaDinh, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { HangViec, IC_MAY, quyenToi } from "@/lib/hang-ngay";
import { BangKhoa } from "@/lib/khoa-may";
import { BangChoVay, MAU_NO, saoTu, soVN, thamSoXongVay, VienSao, type SaoCon } from "@/lib/so-sao";
import { BaoLoi, ChoTai, Chu, gioPhut, Icon3D, M, Man, Nut, The, TickDong, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ngayGio = (iso: string) => { const t = new Date(iso); return `${THU[t.getDay()]} ${t.getDate()}/${t.getMonth() + 1}, ${gioPhut(iso)}`; };
const TIEU: Record<string, (ten: string) => string> = {
  lech_gio: (t) => `Giờ trên máy của ${t} bị đổi`, ngung_chay: (t) => `AiiGrow trên máy ${t} bị tắt`, go_may: (t) => `Có người gỡ AiiGrow trên máy của ${t}`,
  may_thu_go: (t) => `Có người thử gỡ Grow trên máy của ${t}`, tai_khoan_la: (t) => `Tài khoản lạ trên máy ${t}`, offline_lau: (t) => `Máy của ${t} không báo về lâu`,
  may_go_chan_hosts: (t) => `Đã gỡ chặn web ngoài AiiGrow trên máy của ${t}`, may_chuyen_nha: (t) => `Máy của ${t} đã ghép sang tài khoản khác`, may_ngoai_vong: (t) => `Máy của ${t} chưa được bảo vệ đủ`, safe_mode: (t) => `Máy của ${t} vào Safe Mode`, bang_chung_trung: (t) => `Ảnh của ${t} giống ảnh cũ`,
};
/** Cảnh báo về web bị chặn (loại có «web» — người lớn, cờ bạc, luôn chặn). */
const laWeb = (x: Pick<CanhBao, "loai">) => /web|nguoi_lon|co_bac/.test(x.loai);
const phutMatNhip = (x: CanhBao) => Number(x.chi_tiet.matNhipPhut ?? x.chi_tiet.vangPhut ?? 0) || 0;
/** Kiểu màn theo thiết kế 14/11. */
function kieuCua(x: CanhBao): "web" | "tat" | "mat_lien_lac" | "lech_gio" | "khac" {
  if (laWeb(x)) return "web";
  if (x.loai === "lech_gio") return "lech_gio";
  if (x.loai === "may_ngoai_vong" || x.loai === "offline_lau") return phutMatNhip(x) >= 1440 || x.loai === "offline_lau" ? "mat_lien_lac" : "tat";
  if (x.loai === "may_dung_dich_vu" || x.loai === "ngung_chay" || x.loai === "may_thu_go") return "tat";
  return "khac";
}

export default function ChiTietCanhBao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ds, g, q, tt] = await Promise.all([bm.goi<{ ds: CanhBao[] }>("canh-bao"), bm.goi<GiaDinh>("gia-dinh"), quyenToi(),
      bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null)]);
    const x = ds.ds.find((y) => y.id === id);
    if (!x) return { x: null };
    const mayDs = tt?.ds ?? [];
    const idMay = typeof x.chi_tiet.mayId === "string" ? x.chi_tiet.mayId : typeof x.chi_tiet.may_id === "string" ? x.chi_tiet.may_id : null;
    const may = (idMay ? mayDs.find((m) => m.id === idMay) : null)
      ?? [...mayDs].sort((a, b) => b.ten.length - a.ten.length).find((m) => x.noi_dung.includes(m.ten) || (typeof x.chi_tiet.may === "string" && x.chi_tiet.may === m.ten)) ?? null;
    // cùng loại, cùng máy (hoặc cùng con) trong 7 ngày ⇒ «Lần thứ N trong tuần · Lần trước: …»
    const tuan = Date.now() - 7 * 86_400_000;
    const cung = ds.ds.filter((y) => kieuCua(y) === kieuCua(x) && y.child_id === x.child_id && Date.parse(y.created_at) >= tuan
      && (!may || y.noi_dung.includes(may.ten)))
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const thu = cung.findIndex((y) => y.id === x.id);
    return { x: { ...x, ten: g.con.find((c) => c.id === x.child_id)?.ten ?? "Con", xem: q === "trong_giup" }, may,
      lanThu: thu >= 0 ? thu + 1 : 1, lanTruoc: thu > 0 ? cung[thu - 1].created_at : null, sauDo: cung.length - 1 - Math.max(thu, 0) };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const [khoa, setKhoa] = useState(false);
  const { bao, noi } = useHoanTac();
  if (!d?.x) return <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo"><ChoTai loi={loi ?? (d ? "Cảnh báo này không còn — có thể Ba Mẹ khác đã xem." : null)} matMang={matMang} tai={tai} /></Man>;
  const x = d.x;
  if (x.loai === "no_qua_1000" && x.child_id) return <CanhBaoNo id={id} x={{ ...x, child_id: x.child_id }} />;
  const may = d.may;
  const kieu = kieuCua(x);
  const tenMay = may ? may.ten.replace(/ của .*$/, "") : typeof x.chi_tiet.may === "string" ? x.chi_tiet.may.replace(/ của .*$/, "") : "máy";
  const icMay: TenIcon = may ? IC_MAY[may.nen] : "laptop";
  const daBiet = () => lam(async () => { await bm.goi(`canh-bao/${id}/doc`, {}); router.back(); });
  const xemMay = may ? () => router.push(`/may/${may.id}` as never) : undefined;
  const lech = x.loai === "lech_gio" ? Math.round(Math.abs(Number(x.chi_tiet.lechGiay ?? 0)) / 60) : 0;
  const luc = typeof x.chi_tiet.luc === "string" ? x.chi_tiet.luc : x.created_at;
  const matPhut = phutMatNhip(x);

  const tieuMan = kieu === "web" ? "Trang bị chặn" : kieu === "tat" ? "Grow bị tắt" : kieu === "mat_lien_lac" ? `${tenMay} mất liên lạc` : "Cảnh báo";
  const tieu = kieu === "web" ? `${x.ten} mở trang web ${/nguoi_lon/.test(x.loai) ? "người lớn" : "bị chặn"}`
    : kieu === "tat" ? `Có người tắt Grow trên ${tenMay}`
    : kieu === "mat_lien_lac" ? `${tenMay} của ${x.ten} im hơn ${matPhut >= 2880 ? `${Math.floor(matPhut / 1440)} ngày` : "1 ngày"}`
    : TIEU[x.loai]?.(x.ten) ?? `Cảnh báo về ${x.ten}`;
  const phu = kieu === "mat_lien_lac" ? `Lần cuối: ${ngayGio(may?.lanCuoi ?? new Date(Date.parse(x.created_at) - matPhut * 60_000).toISOString())}`
    : [gioPhut(luc), may || kieu === "web" ? tenMay : null, kieu === "web" ? "trình duyệt" : kieu === "tat" && typeof x.chi_tiet.cach === "string" ? x.chi_tiet.cach : null]
      .filter(Boolean).join(" · ");
  // viên kết quả
  const vien = kieu === "web" ? "Grow đã chặn, con không xem được"
    : kieu === "tat" ? (may && may.trangThai !== "ngoai_vong" ? `Grow đã tự bật lại${may.lanCuoi ? ` lúc ${gioPhut(may.lanCuoi)}` : ""}` : "Grow chưa báo về lại — giải trí trên máy này đang khoá")
    : null;
  const lanCau = d.lanThu <= 1 ? "Lần đầu trong tuần" : `Lần thứ ${d.lanThu} trong tuần`;
  const lanPhu = d.lanTruoc ? `Lần trước: ${ngayGio(d.lanTruoc)}` : kieu === "web" && !d.sauDo ? `Chưa thấy lại sau ${gioPhut(luc)}` : undefined;

  return (
    <Man lui={{ chu: "Cảnh báo" }} tieu={tieuMan} noi={noi} day={<>
      <BaoLoi loi={loiLam} />
      {x.loai === "lech_gio" && x.child_id && !x.xem ? (
        <Nut chu="Đã nói chuyện · mở khoá trò chơi" rong dangChay={dangChay} bam={() => lam(async () => {
          await bm.goi(`con/${x.child_id}/khoa`, { khoa: false });
          await bm.goi(`canh-bao/${id}/doc`, {});
          router.back();
        })} />
      ) : kieu === "web" && x.child_id ? <Nut chu={`Xem ${x.ten} dùng gì hôm nay`} rong bam={() => router.push(`/da-dung/${x.child_id}` as never)} />
        : kieu === "tat" && x.child_id && !x.xem ? <Nut chu={`Khoá ${tenMay}`} ic="khoa" loai="huy" rong bam={() => setKhoa(true)} />
        : kieu === "mat_lien_lac" ? <Nut chu={`Kiểm tra ${tenMay} cùng con`} ic="tablet" rong dangChay={dangChay}
          bam={() => lam(async () => { await bm.goi(`canh-bao/${id}/doc`, {}); if (may) router.replace(`/may/${may.id}` as never); else router.back(); })} />
        : x.child_id ? <Nut chu={`Xem lịch sử ${x.ten} dùng máy`} rong bam={() => router.push(`/man-hinh/${x.child_id}` as never)} /> : null}
      {xemMay && kieu !== "lech_gio" && kieu !== "khac" ? <Nut chu={`Xem ${tenMay}`} loai="vien" rong bam={xemMay} /> : null}
      {kieu === "mat_lien_lac" ? null
        : <Nut chu={x.loai === "lech_gio" ? "Để khoá, đã xem" : kieu === "tat" ? "Ba Mẹ tắt đấy, bỏ qua" : "Đã biết"} loai={kieu === "web" || kieu === "tat" ? "ma" : "vien"} rong dangChay={dangChay} bam={daBiet} />}
    </>}>
      {/* đầu màn: hình máy / web + biểu tượng, tiêu đề, giờ · máy, viên kết quả */}
      <View style={{ alignItems: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 28, backgroundColor: kieu === "web" ? M.chinhSoft : M.canhSoft, ...KHOI.the }}>
        <View>
          <Icon3D ten={kieu === "web" ? "web" : icMay} co={72} />
          <View style={{ position: "absolute", right: -10, bottom: -6 }}>
            <Icon3D ten={kieu === "web" ? "khien" : kieu === "mat_lien_lac" ? "wifi" : "canh_bao"} co={34} />
          </View>
        </View>
        <Chu kieu="rat" co={20} style={{ textAlign: "center" }}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={14} mau={M.chu2} style={{ textAlign: "center" }}>{phu}</Chu> : null}
        {vien ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingLeft: 8, paddingRight: 14, borderRadius: 18, backgroundColor: M.the, boxShadow: BONG.nho }}>
            <Icon3D ten="khien" co={20} /><Chu kieu="rat" co={13.5} mau={M.chinhInk}>{vien}</Chu>
          </View>
        ) : null}
      </View>

      {kieu === "web" || kieu === "tat" ? (
        <>
          <Chu kieu="rat" co={16} style={{ marginHorizontal: 4, marginTop: 4 }}>Ba Mẹ nên biết</Chu>
          <The dem style={{ paddingVertical: 4 }}>
            {kieu === "tat" ? <HangViec dau ic="dong_ho_cat" mau="cam" tieu={`Grow không trông máy${matPhut ? ` ${matPhut} phút` : " một lúc"}`} phu="Lúc đó không đếm giờ, không chặn web" /> : null}
            <HangViec dau={kieu === "web"} ic="lap" mau="lam" tieu={lanCau} phu={lanPhu} />
            {kieu === "web" ? <HangViec ic="tin" mau="xanh" tieu="Hỏi con nhẹ nhàng, đừng la" phu="«Con thấy trang đó ở đâu?»" /> : null}
          </The>
        </>
      ) : kieu === "mat_lien_lac" ? (
        <>
          <Chu kieu="rat" co={16} style={{ marginHorizontal: 4, marginTop: 4 }}>Thường do</Chu>
          <The dem style={{ paddingVertical: 4 }}>
            <HangViec dau ic="tia" mau="vang" tieu={`${tenMay} hết pin hoặc tắt máy`} phu="Sạc rồi mở lại là xong" />
            <HangViec ic="wifi" mau="lam" tieu="Tắt Wi-Fi, bật chế độ máy bay" phu="Grow vẫn chặn, nhưng chưa gửi được giờ" />
            <HangViec ic="x" mau="cam" tieu="Cấu hình AiiGrow bị gỡ" phu="Phải cài lại cùng con" />
          </The>
        </>
      ) : x.loai === "lech_gio" ? (
        <The dem style={{ gap: 2 }}>
          <Chu kieu="rat" co={15.5}>Chuyện gì đã xảy ra</Chu>
          <TickDong trang="x" chu={`Giờ máy bị chỉnh lệch ${lech} phút`} phu="Đổi giờ có thể làm sao bị trừ sai" />
          <TickDong chu="App chơi đã khoá" phu="App học vẫn mở" />
          <TickDong chu={`${x.ten} thấy lời nhắn «Giờ máy chưa đúng, con nhờ Ba Mẹ chỉnh lại nhé»`} />
          <TickDong chu="Phút chơi vẫn trừ sao theo giờ thật" phu="Không bị cộng thêm" />
        </The>
      ) : (
        <The dem style={{ gap: 8 }}>
          <Chu co={14.5} mau={M.chu2}>{x.noi_dung}</Chu>
          {xemMay ? <HangViec ic={icMay} mau="xam" tieu={`Trên ${tenMay} của ${x.ten}`} bam={xemMay} /> : null}
        </The>
      )}
      {x.child_id ? <BangKhoa mo={khoa} dong={() => setKhoa(false)} con={x.child_id} ten={x.ten}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} /> : null}
    </Man>
  );
}

type ViSaoNgan = SaoCon & { ten: string; bayNgay?: { saoVay: number; saoTraNo: number } };
type LuotNgan = { id: string; child_id: string; ten: string; diem: number; sao?: number };

/** Màn «Cảnh báo nợ sao» (thiết kế them-5twxl6hf). */
function CanhBaoNo({ id, x }: { id: string; x: CanhBao & { child_id: string; ten: string } }) {
  const con = x.child_id;
  const { d, tai } = useTai(async () => {
    const [vi, cd] = await Promise.all([bm.goi<ViSaoNgan>(`con/${con}/vi-sao?gioiHan=1`).catch(() => null),
      bm.goi<{ nhiemVu: LuotNgan[] }>("cho-duyet").catch(() => null)]);
    return { vi, viec: (cd?.nhiemVu ?? []).find((v) => v.child_id === con) ?? null };
  });
  const { lam, loi, dangChay } = useLam();
  const [vay, setVay] = useState(false);
  const noLuc = Number(x.chi_tiet.no ?? 0) || 0, noTruoc = Number(x.chi_tiet.no_truoc ?? 0) || 0, vuot = x.chi_tiet.vuot_moc !== false;
  const s = d?.vi ? saoTu(d.vi) : saoTu({ sao: -noLuc, no: noLuc, phutCon: 0 });
  const khoan = noLuc - noTruoc;
  const daBiet = () => lam(async () => { await bm.goi(`canh-bao/${id}/doc`, {}); router.back(); });
  const viec = d?.viec, saoViec = viec ? viec.sao ?? viec.diem : 0;
  const bay = d?.vi?.bayNgay;
  return (
    <Man lui={{ chu: "Thông báo" }} tieu="Cảnh báo nợ sao" tai={tai} day={<>
      <BaoLoi loi={loi} />
      <Nut chu="Giao thêm nhiệm vụ để trả nợ" ic="sao" ic3d rong bam={() => router.push(`/giao-nv?con=${con}` as never)} />
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <View style={{ flexGrow: 1, flexBasis: 140 }}><Nut chu="Xem ví sao" loai="vien" rong bam={() => router.push(`/vi/${con}` as never)} /></View>
        <View style={{ flexGrow: 1, flexBasis: 140 }}><Nut chu="Cho vay thêm" ic="sao" ic3d loai="vien" rong bam={() => setVay(true)} /></View>
      </View>
      <Nut chu="Đã biết" loai="ma" rong dangChay={dangChay} bam={daBiet} />
    </>}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 28, backgroundColor: MAU_NO.nen, ...KHOI.the }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#f3d6b8", alignItems: "center", justifyContent: "center" }}>
          <Icon3D ten="sao" co={48} />
          <View style={{ position: "absolute", right: -8, bottom: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
            boxShadow: BONG.nho }}><Icon3D ten="canh_bao" co={20} /></View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={18}>{x.noi_dung.replace(/ \(đang nợ [\d.]+\)$/, "")}</Chu>
          <Chu kieu="dam" co={13} mau={MAU_NO.chu}>
            {`${gioPhut(x.created_at)} · đang nợ ${soVN(noLuc || s.no)}${khoan > 0 ? ` · ${vuot ? "vượt mốc" : "nhắc lại"} sau lần cho vay ${soVN(khoan)} sao` : ""}`}
          </Chu>
        </View>
      </View>
      <HangViec dau tieu={`Ví sao của ${x.ten}`} phai={<VienSao s={s} />} bam={() => router.push(`/vi/${con}` as never)} nhanDoc={`Xem ví sao của ${x.ten}`} />
      <Chu kieu="rat" co={16} style={{ marginHorizontal: 4, marginTop: 4 }}>Ba Mẹ nên biết</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="khoa" mau="cam" tieu="Không chặn việc cho vay" phu="Còn nợ trên 1.000, mỗi lần cho vay thêm Grow sẽ nhắc lại" />
        <HangViec ic="tick" mau="xanh" tieu="Sao nhiệm vụ trả nợ trước"
          phu={viec ? `Duyệt «${viec.ten}» ${soVN(saoViec)} sao ⇒ còn nợ ${soVN(Math.max(0, s.no - saoViec))}` : "Mỗi sao con kiếm được trả nợ trước, hết nợ mới cộng"} />
        {bay ? <HangViec ic="lich" mau="lam" tieu={`7 ngày qua: vay ${soVN(bay.saoVay)}, trả ${soVN(bay.saoTraNo)} sao`}
          phu={bay.saoVay > bay.saoTraNo ? `Nợ tăng ${soVN(bay.saoVay - bay.saoTraNo)} sao trong tuần` : `Nợ giảm ${soVN(bay.saoTraNo - bay.saoVay)} sao trong tuần`} /> : null}
      </The>
      <BangChoVay mo={vay} dong={() => setVay(false)} con={con} ten={x.ten}
        xong={(k) => { tai(); router.push({ pathname: "/yeu-cau/xong", params: thamSoXongVay({ ...k, ten: x.ten, con }) } as never); }} />
    </Man>
  );
}
