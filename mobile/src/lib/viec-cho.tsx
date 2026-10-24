// Việc chờ Ba Mẹ duyệt ngay tại chỗ (Trang chủ, bố cục 02 «Việc chờ lên đầu» — Thanh 24/10). Cùng API với tab Chờ duyệt và màn chi tiết, gửi
// NGAY (useLam, như màn chi tiết — không gửi trễ để khỏi mất khi tắt app):
//  • nhiệm vụ: Duyệt = `luot/:id/duyet` điểm mặc định (như «Duyệt cả» ở Chờ duyệt), Hoàn tác = `luot/:id/hoan-tac` (useHoanTac; máy chủ cho 30 giây);
//    ảnh nghi trùng ⇒ «Xem ảnh» mở màn duyệt, không duyệt mù. Từ chối = chọn lý do (như màn duyệt) rồi gửi `luot/:id/tu-choi`.
//  • yêu cầu thêm giờ / ngoại lệ / ngoài giờ: Duyệt = `yeu-cau/:id/dong-y` «Ngoại lệ — không trừ» đúng số phút Con xin (mặc định màn yêu cầu),
//    nhưng nếu máy chủ báo cảnh báo ngoại lệ (xemTruoc) thì mở màn yêu cầu để Ba Mẹ thấy cảnh báo TRƯỚC. Web / app / khác ⇒ «Xếp loại» mở màn yêu cầu.
//  • phiếu quà: Xác nhận / Đã trao như Chờ duyệt; Huỷ hoàn điểm hỏi lại (không hoàn tác được).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, tieuYc, type LuotCho, type YeuCau } from "./api";
import { BangTruot, BaoLoi, cauLoi, Chu, Dong, gioPhut, Icon, M, Nut, OChon, ONhap, The, useLam } from "./ui";

export type Phieu = { id: string; child_id: string; ten_con: string; ten: string; loai: string; diem: number; created_at: string };
export const IC_QUA: Record<string, readonly ["coc" | "qua" | "ban" | "xu", "cam" | "lam" | "tim" | "vang"]> = { voucher: ["coc", "cam"], qua: ["qua", "lam"], dac_quyen: ["ban", "tim"], tiet_kiem: ["xu", "vang"] };
/** Lý do từ chối nhiệm vụ — MỘT danh sách cho màn duyệt và Trang chủ. */
export const LY_DO_NV = [
  { chu: "Ảnh chưa rõ — chụp lại nhé", phu: "Con thấy nút «Chụp lại», nhiệm vụ vẫn mở", boSung: true },
  { chu: "Chưa xong — làm tiếp nhé", phu: "Nộp lại sau khi làm xong", boSung: true },
  { chu: "Không đúng nhiệm vụ", phu: "Đóng nhiệm vụ này, không cộng điểm", boSung: false },
];
/** Lý do chưa cho một yêu cầu — MỘT danh sách cho màn yêu cầu và Trang chủ. */
export const LY_DO_YC = ["Hôm nay chơi đủ rồi", "Làm nhiệm vụ để có thêm điểm nhé", "Trang này chưa phù hợp với con"];
/** Yêu cầu duyệt được bằng một chạm (chỉ cần số phút); loại khác cần chọn trên màn yêu cầu. */
export const ycMotCham = (y: Pick<YeuCau, "loai">) => y.loai === "them_gio" || y.loai === "ngoai_le" || y.loai === "ngoai_gio";

export type ViecCho = { k: "nv"; x: LuotCho } | { k: "yc"; x: YeuCau } | { k: "qua"; x: Phieu };
type Bao = (chu: string, hoan?: () => void) => void;

const tieu = (v: ViecCho) => (v.k === "yc" ? tieuYc(v.x) : v.x.ten);
const phu = (v: ViecCho) => v.k === "nv" ? `Nhiệm vụ · +${v.x.diem} điểm${v.x.nghi_trung ? " · ảnh giống lần trước" : ""}`
  : v.k === "yc" ? `Yêu cầu · “${v.x.ly_do}” · ${gioPhut(v.x.created_at)}` : `Quà · đổi ${v.x.diem} điểm · ${gioPhut(v.x.created_at)}`;
const moChiTiet = (v: ViecCho) => router.push(v.k === "nv" ? `/duyet/${v.x.id}` : v.k === "yc" ? `/yeu-cau/${v.x.id}` : "/cho-duyet");

/** Thẻ «N việc chờ Ba Mẹ» với nút Duyệt / Từ chối từng việc. `ds` đã lọc theo Con đang xem; `xem` (Chỉ xem) ⇒ ẩn nút, chạm dòng để xem. */
export function TheViecCho({ ds, ten, xem, tai, bao, toiDa = 3 }: {
  ds: ViecCho[]; ten: string; xem: boolean; tai: () => void; bao: Bao; toiDa?: number;
}) {
  const hl = useLam();
  const hlHuy = useLam();                                          // bảng Huỷ phiếu: lỗi nằm trong bảng, không treo lên thẻ
  const [dang, setDang] = useState<string | null>(null);          // việc đang gửi — chỉ nút của việc đó quay
  const [tuChoi, setTuChoi] = useState<ViecCho | null>(null);
  const [lyDo, setLyDo] = useState(0);
  const [lyDoYc, setLyDoYc] = useState(LY_DO_YC[0]);
  const [huyQua, setHuyQua] = useState<Phieu | null>(null);
  // yêu cầu (có hạn) lên trước, rồi nhiệm vụ, quà; trong nhóm theo thời gian gửi
  const thu = { yc: 0, nv: 1, qua: 2 } as const;
  const luc = (v: ViecCho) => (v.k === "nv" ? v.x.nop_luc : v.x.created_at);
  const con = [...ds].sort((a, b) => thu[a.k] - thu[b.k] || luc(a).localeCompare(luc(b)));
  const chay = (v: ViecCho, fn: () => Promise<unknown>, hangDoi?: boolean) => { setDang(v.x.id); return hl.lam(fn, { hangDoi }); };

  const duyet = (v: ViecCho) => {
    if (v.k === "nv") {
      const x = v.x;
      if (x.nghi_trung) return moChiTiet(v);
      return chay(v, async () => {
        await bm.goi(`luot/${x.id}/duyet`, {});
        bao(`Đã duyệt «${x.ten}» · +${x.diem} điểm cho ${ten}`, () => {
          bm.goi(`luot/${x.id}/hoan-tac`, {}).then(tai, (e) => { bao(`Chưa hoàn tác được: ${cauLoi(e)}`); tai(); });
        });
        tai();
      }, true);
    }
    if (v.k === "yc") {
      const y = v.x;
      if (!ycMotCham(y)) return moChiTiet(v);
      const p = y.phut ?? 15;
      return chay(v, async () => {
        const ct = await bm.goi<{ xemTruoc?: { mucCanhBao: string } }>(`yeu-cau/${y.id}`);
        if (ct.xemTruoc && ct.xemTruoc.mucCanhBao !== "khong") { moChiTiet(v); return; }   // có cảnh báo ngoại lệ ⇒ Ba Mẹ xem trên màn yêu cầu
        await bm.goi(`yeu-cau/${y.id}/dong-y`, { truDiem: false, phut: p });
        bao(`Đã cho ${ten} thêm ${p} phút (ngoại lệ)`);
        tai();
      }, true);
    }
    const x = v.x;
    return chay(v, async () => {
      await bm.goi(`phieu/${x.id}/xac-nhan`, {});
      bao(x.loai === "voucher" ? `Đã xác nhận «${x.ten}» cho ${ten}` : `Đã trao «${x.ten}» cho ${ten}`);
      tai();
    });
  };
  const tuChoiNgay = (v: ViecCho) => {
    if (v.k === "qua") { hlHuy.setLoi(null); return setHuyQua(v.x); }
    setLyDo(v.k === "nv" ? 1 : 0);
    setLyDoYc(LY_DO_YC[0]);
    setTuChoi(v);
  };
  const guiTuChoi = () => {
    const v = tuChoi;
    if (!v) return;
    setTuChoi(null);
    if (v.k === "nv") {
      const l = LY_DO_NV[lyDo];
      chay(v, async () => { await bm.goi(`luot/${v.x.id}/tu-choi`, { lyDo: l.chu, boSung: l.boSung }); bao(`Đã gửi «${l.chu}» cho ${ten}`); tai(); });
    } else if (v.k === "yc") {
      const l = lyDoYc.trim();
      chay(v, async () => { await bm.goi(`yeu-cau/${v.x.id}/tu-choi`, { lyDo: l }); bao(`Đã trả lời ${ten}: ${l}`); tai(); });
    }
  };
  const chuDuyet = (v: ViecCho) => v.k === "yc" ? (ycMotCham(v.x) ? "Duyệt" : "Xếp loại") : v.k === "qua" ? (v.x.loai === "voucher" ? "Xác nhận" : "Đã trao")
    : v.x.nghi_trung ? "Xem ảnh" : "Duyệt";

  const hienRa = con.slice(0, toiDa);
  return (
    <The style={{ overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 }}>
        {con.length ? (
          <View style={{ minWidth: 28, height: 28, paddingHorizontal: 6, borderRadius: 14, backgroundColor: M.loi, alignItems: "center", justifyContent: "center" }}>
            <Chu kieu="rat" co={14} mau="#fff" so>{String(con.length)}</Chu>
          </View>
        ) : <Icon ten="tick" mau={M.chinh} />}
        <Chu kieu="rat" co={16} style={{ flex: 1 }}>{con.length ? "việc chờ Ba Mẹ" : "Không có việc nào chờ"}</Chu>
        {con.length > toiDa ? (
          <Pressable onPress={() => router.push("/cho-duyet")} accessibilityRole="button" accessibilityLabel={`Xem tất cả ${con.length} việc chờ`}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 8 }}>
            <Chu kieu="rat" co={14} mau={M.chinhInk}>Xem tất cả</Chu><Icon ten="phai" mau={M.chinhInk} co={16} />
          </Pressable>
        ) : null}
      </View>
      {con.length ? hienRa.map((v) => (
        <Dong key={v.x.id} tieu={tieu(v)} phu={phu(v)} bam={() => moChiTiet(v)}
          phai={xem ? undefined : (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Nut chu={chuDuyet(v)} nho
                dangChay={hl.dangChay && dang === v.x.id} tat={hl.dangChay && dang !== v.x.id} bam={() => { duyet(v); }} nhanDoc={`${chuDuyet(v)}: ${tieu(v)}`} />
              <Nut chu={v.k === "qua" ? "Huỷ" : "Từ chối"} nho loai="vien" tat={hl.dangChay} bam={() => tuChoiNgay(v)} nhanDoc={`${v.k === "qua" ? "Huỷ" : "Từ chối"}: ${tieu(v)}`} />
            </View>
          )} />
      )) : (
        <Dong tieu="Khi Con nộp hay xin phép, Rob báo Ba Mẹ ngay" phu="Xem hộp Chờ duyệt" bam={() => router.push("/cho-duyet")} />
      )}
      {hl.loi ? <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}><BaoLoi loi={hl.loi} /></View> : null}

      <BangTruot mo={!!tuChoi} dong={() => setTuChoi(null)} tieu={tuChoi?.k === "nv" ? `${ten} cần làm gì thêm?` : `Vì sao chưa cho ${ten}?`}>
        {tuChoi?.k === "nv" ? (
          <>
            <View style={{ gap: 8 }}>
              {LY_DO_NV.map((x, i) => <OChon key={x.chu} chon={lyDo === i} bam={() => setLyDo(i)} tieu={x.chu} phu={x.phu} />)}
            </View>
            <Chu co={13} mau={M.chu3}>{`${ten} không bị trừ điểm. Rob nói với ${ten} bằng giọng vui.`}</Chu>
          </>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              {LY_DO_YC.map((x) => <OChon key={x} chon={lyDoYc === x} bam={() => setLyDoYc(x)} tieu={x} />)}
            </View>
            <ONhap nhan="Hoặc tự viết" value={lyDoYc} onChangeText={setLyDoYc} maxLength={120} />
          </>
        )}
        <Nut chu={`Gửi cho ${ten}`} rong tat={tuChoi?.k === "yc" && !lyDoYc.trim()} bam={guiTuChoi} />
      </BangTruot>

      {huyQua ? (
        <BangTruot mo dong={() => setHuyQua(null)} tieu={`Huỷ «${huyQua.ten}»?`}>
          <Chu>{`${ten} được hoàn ${huyQua.diem} điểm. Không hoàn tác được.`}</Chu>
          <BaoLoi loi={hlHuy.loi} />
          <Nut chu="Huỷ phiếu, hoàn điểm" loai="huy" rong dangChay={hlHuy.dangChay} bam={async () => {
            const x = huyQua;
            if (await hlHuy.lam(async () => { await bm.goi(`phieu/${x.id}/huy`, {}); bao(`Đã huỷ «${x.ten}», hoàn ${x.diem} điểm cho ${ten}`); tai(); })) setHuyQua(null);
          }} />
          <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={() => setHuyQua(null)} /></View>
        </BangTruot>
      ) : null}
    </The>
  );
}
