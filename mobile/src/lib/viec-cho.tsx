// Việc chờ Ba Mẹ duyệt ngay tại chỗ (Trang chủ, bố cục 02 «Việc chờ lên đầu» — Thanh 24/10). Cùng API với tab Chờ duyệt và màn chi tiết:
//  • nhiệm vụ: Duyệt = `luot/:id/duyet` điểm mặc định (như «Duyệt cả» ở Chờ duyệt), Hoàn tác = `luot/:id/hoan-tac` (máy chủ cho 30 giây);
//    Từ chối = chọn lý do (như màn duyệt) rồi gửi `luot/:id/tu-choi` sau 8 giây — trong 8 giây đó bấm Hoàn tác là không gửi.
//  • yêu cầu thêm giờ / ngoại lệ / ngoài giờ: Duyệt = `yeu-cau/:id/dong-y` «Ngoại lệ — không trừ» đúng số phút Con xin (mặc định của màn
//    yêu cầu), gửi sau 8 giây. Mở web / cài app / khác cần chọn Học tập–Giải trí, phạm vi ⇒ «Xếp loại» mở màn yêu cầu, không đoán.
//  • phiếu quà: Xác nhận / Đã trao gửi sau 8 giây; Huỷ hoàn điểm hỏi lại như Chờ duyệt (không hoàn tác được).
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
type GuiCham = (chu: string, lam: () => void, huy?: () => void) => void;

const tieu = (v: ViecCho) => (v.k === "yc" ? tieuYc(v.x) : v.x.ten);
const phu = (v: ViecCho) => v.k === "nv" ? `Nhiệm vụ · +${v.x.diem} điểm${v.x.nghi_trung ? " · ảnh giống lần trước" : ""}`
  : v.k === "yc" ? `Yêu cầu · “${v.x.ly_do}” · ${gioPhut(v.x.created_at)}` : `Quà · đổi ${v.x.diem} điểm · ${gioPhut(v.x.created_at)}`;
const moChiTiet = (v: ViecCho) => router.push(v.k === "nv" ? `/duyet/${v.x.id}` : v.k === "yc" ? `/yeu-cau/${v.x.id}` : "/cho-duyet");

/** Thẻ «N việc chờ Ba Mẹ» với nút Duyệt / Từ chối từng việc. `ds` đã lọc theo Con đang xem; `xem` (Chỉ xem) ⇒ ẩn nút, chạm dòng để xem. */
export function TheViecCho({ ds, ten, xem, tai, bao, guiCham, toiDa = 3 }: {
  ds: ViecCho[]; ten: string; xem: boolean; tai: () => void; bao: Bao; guiCham: GuiCham; toiDa?: number;
}) {
  const hl = useLam();
  const [dang, setDang] = useState<string | null>(null);          // việc đang gửi — chỉ nút của việc đó quay
  const [an, setAn] = useState<string[]>([]);                     // đã bấm, đang chờ gửi / chờ tải lại ⇒ ẩn khỏi thẻ
  const [tuChoi, setTuChoi] = useState<ViecCho | null>(null);
  const [lyDo, setLyDo] = useState(0);
  const [lyDoYc, setLyDoYc] = useState(LY_DO_YC[0]);
  const [huyQua, setHuyQua] = useState<Phieu | null>(null);
  const con = ds.filter((v) => !an.includes(v.x.id));
  const anDi = (id: string) => setAn((a) => [...a, id]);
  const hien = (id: string) => setAn((a) => a.filter((x) => x !== id));
  /** Gửi sau 8 giây (useHoanTac.guiCham): Hoàn tác trong lúc chờ ⇒ không gửi gì; gửi hỏng ⇒ nói ra và hiện lại việc. */
  const cham = (v: ViecCho, chu: string, goi: () => Promise<unknown>) => {
    hl.setLoi(null);
    anDi(v.x.id);
    guiCham(chu, () => { goi().then(tai, (e) => { hien(v.x.id); bao(`Chưa gửi được «${tieu(v)}»: ${cauLoi(e)}`); tai(); }); }, () => hien(v.x.id));
  };
  const chay = (v: ViecCho, fn: () => Promise<unknown>) => { setDang(v.x.id); return hl.lam(fn); };

  const duyet = (v: ViecCho) => {
    if (v.k === "nv") {
      const x = v.x;
      return chay(v, async () => {
        await bm.goi(`luot/${x.id}/duyet`, {});
        anDi(x.id);
        bao(`Đã duyệt «${x.ten}» · +${x.diem} điểm cho ${ten}`, () => {
          hien(x.id);
          bm.goi(`luot/${x.id}/hoan-tac`, {}).then(tai, (e) => { bao(`Chưa hoàn tác được: ${cauLoi(e)}`); tai(); });
        });
        tai();
      });
    }
    if (v.k === "yc") {
      if (!ycMotCham(v.x)) return moChiTiet(v);
      const p = v.x.phut ?? 15;
      return cham(v, `Đã cho ${ten} thêm ${p} phút (ngoại lệ)`, () => bm.goi(`yeu-cau/${v.x.id}/dong-y`, { truDiem: false, phut: p }));
    }
    const x = v.x;
    return cham(v, x.loai === "voucher" ? `Đã xác nhận «${x.ten}» cho ${ten}` : `Đã trao «${x.ten}» cho ${ten}`, () => bm.goi(`phieu/${x.id}/xac-nhan`, {}));
  };
  const tuChoiNgay = (v: ViecCho) => {
    if (v.k === "qua") return setHuyQua(v.x);
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
      cham(v, `Đã gửi «${l.chu}» cho ${ten}`, () => bm.goi(`luot/${v.x.id}/tu-choi`, { lyDo: l.chu, boSung: l.boSung }));
    } else if (v.k === "yc") {
      const l = lyDoYc.trim();
      cham(v, `Đã trả lời ${ten}: ${l}`, () => bm.goi(`yeu-cau/${v.x.id}/tu-choi`, { lyDo: l }));
    }
  };

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
              <Nut chu={v.k === "yc" && !ycMotCham(v.x) ? "Xếp loại" : v.k === "qua" ? (v.x.loai === "voucher" ? "Xác nhận" : "Đã trao") : "Duyệt"} nho
                dangChay={hl.dangChay && dang === v.x.id} tat={hl.dangChay && dang !== v.x.id} bam={() => { duyet(v); }} nhanDoc={`Duyệt: ${tieu(v)}`} />
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
          <BaoLoi loi={hl.loi} />
          <Nut chu="Huỷ phiếu, hoàn điểm" loai="huy" rong dangChay={hl.dangChay} bam={async () => {
            const x = huyQua;
            setDang(x.id);
            if (await hl.lam(async () => { await bm.goi(`phieu/${x.id}/huy`, {}); bao(`Đã huỷ «${x.ten}», hoàn ${x.diem} điểm cho ${ten}`); tai(); })) setHuyQua(null);
          }} />
          <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={() => setHuyQua(null)} /></View>
        </BangTruot>
      ) : null}
    </The>
  );
}
