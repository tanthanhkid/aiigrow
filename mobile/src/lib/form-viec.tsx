// Ô nhập «một việc» dùng chung cho «Tự đặt việc» (bm-hang-ngay/42, L9 Thêm việc riêng) và «Sửa việc» (38): tên + gợi ý, hình, giao con nào,
// số sao, lặp lại, giờ nhắc, cách báo xong, Ba Mẹ duyệt hay tự cộng sao. Gửi lên POST nhiem-vu / nhiem-vu/:id (docs/API.md S1).
import { Pressable, View } from "react-native";
import { BieuTron, Chips, Chu, CongTac, M, ONhap, The } from "./ui";
import { hinhNv } from "./hang-ngay";
import { TEN_NV_TOI_THIEU } from "./api";

export type FormViec = { ten: string; hinh: string; sao: number; lapLai: string; gioNhac: string; bangChung: string; duyet: boolean; giaoCho: string[] };
export const FORM_TRONG: FormViec = { ten: "", hinh: "choi", sao: 10, lapLai: "hang_ngay", gioNhac: "", bangChung: "anh", duyet: true, giaoCho: [] };

const GOI_Y = ["Tưới cây", "Gấp quần áo", "Dọn bàn học", "Rửa bát", "Đổ rác", "Nhảy dây 10 phút"];
const HINH = ["choi", "sach", "ban_chai", "cap", "cay", "bat", "ao", "ban_hoc", "day", "rau", "ngu", "but"];
const SAO = [5, 10, 20, 30];
const LAP = [{ gia: "hang_ngay", chu: "Mỗi ngày" }, { gia: "ngay_thuong", chu: "Thứ 2 – Thứ 6" }, { gia: "cuoi_tuan", chu: "Cuối tuần" }, { gia: "mot_lan", chu: "Một lần" }];
const NHAC = [{ gia: "", chu: "Không nhắc" }, { gia: "07:00", chu: "7:00" }, { gia: "17:00", chu: "17:00" }, { gia: "19:00", chu: "19:00" }, { gia: "20:00", chu: "20:00" }];
const BAO = [{ gia: "anh", chu: "Chụp ảnh" }, { gia: "ghi_am", chu: "Ghi âm" }, { gia: "van_ban", chu: "Viết" }, { gia: "xong", chu: "Bấm «Xong»" }];

export const tenHopLe = (ten: string) => [...ten.trim()].length >= TEN_NV_TOI_THIEU;

/** Thân gửi máy chủ (nhóm suy từ hình; `tu_duyet` = tắt «Ba Mẹ xem rồi mới cộng sao»). */
export const thanViec = (f: FormViec) => ({
  ten: f.ten.trim(), hinh: f.hinh, diem: f.sao, lap_lai: f.lapLai, gio_nhac: f.gioNhac || null, bang_chung: f.bangChung, tu_duyet: !f.duyet,
  nhom: ["sach", "but"].includes(f.hinh) ? "doc_sach" : ["cap", "ban_hoc"].includes(f.hinh) ? "hoc_tap" : ["day", "rau", "ngu", "ban_chai"].includes(f.hinh) ? "ky_nang" : "viec_nha",
  toi_da_ngay: f.lapLai === "mot_lan" ? null : 1,
});

function Muc({ chu, children }: { chu: string; children: React.ReactNode }) {
  return <View style={{ gap: 8 }}><Chu kieu="rat" co={15}>{chu}</Chu>{children}</View>;
}

export function NhapViec({ f, doi, con, motCon, goiY = true }: {
  f: FormViec; doi: (f: FormViec) => void; con: { id: string; ten: string }[];
  /** Sửa việc: một việc chỉ giao được MỘT Con hoặc cả nhà (giaoCho rỗng = cả nhà) */ motCon?: boolean; goiY?: boolean;
}) {
  const set = (x: Partial<FormViec>) => doi({ ...f, ...x });
  const ngan = f.ten.trim().length > 0 && !tenHopLe(f.ten);
  return (
    <>
      <ONhap nhan="Tên việc" value={f.ten} onChangeText={(t) => set({ ten: t })} placeholder="Tưới cây" maxLength={60}
        loi={ngan ? `Tên cần ít nhất ${TEN_NV_TOI_THIEU} ký tự để con hiểu việc cần làm` : null} />
      {goiY ? <Chips ds={GOI_Y.map((x) => ({ gia: x, chu: x }))} chon={[f.ten.trim()]} doi={(t) => set({ ten: t })} /> : null}
      <Muc chu="Hình của việc">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {HINH.map((h) => {
            const [ic, mau] = hinhNv({ hinh: h });
            const on = f.hinh === h;
            return (
              <Pressable key={h} onPress={() => set({ hinh: h })} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Hình ${h}`}
                style={[{ padding: 4, borderRadius: 30, borderWidth: 2, borderColor: on ? M.chinh : "transparent" }, on && { backgroundColor: "#eef5f2" }]}>
                <BieuTron ic={ic} mau={mau} />
              </Pressable>
            );
          })}
        </View>
      </Muc>
      {con.length > 1 || motCon ? (
        <Muc chu={motCon ? "Áp cho" : "Giao cho con nào?"}>
          <Chips ds={[...con.map((c) => ({ gia: c.id, chu: c.ten })), ...(motCon && con.length > 1 ? [{ gia: "", chu: "Cả nhà" }] : [])]}
            chon={motCon ? [f.giaoCho[0] ?? ""] : f.giaoCho}
            doi={(id) => set({ giaoCho: motCon ? (id ? [id] : []) : f.giaoCho.includes(id) ? f.giaoCho.filter((x) => x !== id) : [...f.giaoCho, id] })} />
        </Muc>
      ) : null}
      <Muc chu="Con nhận bao nhiêu sao?">
        <Chips ds={SAO.map((x) => ({ gia: x, chu: `${x}` }))} chon={[f.sao]} doi={(x) => set({ sao: x })} />
      </Muc>
      <Muc chu="Làm khi nào?">
        <Chips ds={LAP} chon={[f.lapLai]} doi={(x) => set({ lapLai: x })} />
      </Muc>
      <Muc chu="Grow nhắc con lúc">
        <Chips ds={NHAC} chon={[f.gioNhac]} doi={(x) => set({ gioNhac: x })} />
      </Muc>
      <Muc chu="Con báo xong bằng">
        <Chips ds={BAO} chon={[f.bangChung]} doi={(x) => set({ bangChung: x })} />
      </Muc>
      <The style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Chu kieu="rat">Ba Mẹ xem rồi mới cộng sao</Chu>
          <Chu co={13} mau={M.chu3}>Tắt thì con báo xong là nhận sao</Chu>
        </View>
        <CongTac nhan="Ba Mẹ xem rồi mới cộng sao" bat={f.duyet} doi={(v) => set({ duyet: v })} />
      </The>
    </>
  );
}
