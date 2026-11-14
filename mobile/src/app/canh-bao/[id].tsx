// Chi tiết một cảnh báo (thiết kế chốt 14/11, bm-hang-ngay/10–12) — một khuôn: hình máy + biểu tượng, tiêu đề, «giờ · máy · chi tiết», viên kết quả
// (vd «Grow đã chặn, con không xem được»), «Ba Mẹ nên biết» (lần thứ mấy trong tuần + lần trước, lời khuyên), các nút theo loại:
//  · 10 trang bị chặn (loại có «web», người lớn, cờ bạc): «Xem <Con> dùng gì hôm nay» · «Xem <máy>» · «Đã biết»
//  · 11 Grow bị tắt (may_dung_dich_vu, may_thu_go, may_ngoai_vong < 1 ngày): «Khoá <máy>» · «Xem <máy>» · «Ba Mẹ tắt đấy, bỏ qua»
//  · 12 máy mất liên lạc > 1 ngày (may_ngoai_vong, matNhipPhut ≥ 1440): «Thường do» 3 lý do · «Kiểm tra <máy> cùng con» · «Xem <máy>»
//  · giờ máy bị đổi (lech_gio — bm-duyet/05 cũ, giữ): «Chuyện gì đã xảy ra» + mở khoá sau khi nói chuyện hoặc để khoá.
// Máy của cảnh báo: chi_tiet.mayId nếu có, không thì dò tên máy trong câu cảnh báo (GET canh-bao chưa trả device_id). AiiGrow không đọc nội dung của con.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type CanhBao, type GiaDinh, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { HangViec, IC_MAY, quyenToi } from "@/lib/hang-ngay";
import { BangKhoa } from "@/lib/khoa-may";
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
          <TickDong trang="x" chu={`Giờ máy bị chỉnh lệch ${lech} phút`} phu="Đổi giờ có thể làm giờ chơi bị tính sai" />
          <TickDong chu="App chơi đã khoá" phu="App học vẫn mở" />
          <TickDong chu={`${x.ten} thấy lời nhắn «Giờ máy chưa đúng, con nhờ Ba Mẹ chỉnh lại nhé»`} />
          <TickDong chu="Giờ chơi vẫn tính theo giờ thật" phu="Không bị cộng thêm" />
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
