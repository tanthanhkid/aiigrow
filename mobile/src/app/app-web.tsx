// bm-app-web: phân loại ứng dụng / website ≤ 3 thao tác (FR-02.02): tìm → chọn loại → xong. Mục hệ thống (Office, AiiRob…) luôn dùng được.
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type AppThay } from "@/lib/api";
import {
  BangTruot, BaoLoi, BieuTron, CanhGiua, ChoTai, ChonMot, Chu, Dong, Icon, M, Man, Nhan, Nhom, NhomTieu, Nut, OChon, ONhap, useHoanTac, useLam, useTai,
} from "@/lib/ui";

type Luat = { child_id: string; muc: string; ten: string; loai: "hoc" | "giai_tri" | "chan"; nhom: string };
type Ds = { ds: Luat[]; heThong: string[]; chuaXep: { muc: string; ten?: string; phut: number }[]; daThay?: AppThay[] };
const LOAI = { hoc: ["Học tập", "ok"], giai_tri: ["Giải trí", "diem"], chan: ["Chặn", "loi"] } as const;
const NHOM = [{ gia: "game", chu: "Trò chơi" }, { gia: "video_ngan", chu: "Video ngắn" }, { gia: "mxh", chu: "Mạng xã hội" }, { gia: "phim_gd", chu: "Phim giáo dục" }];

export default function AppWeb() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<Ds>("luat?thay=1"));
  // Trang chủ / Chờ duyệt bấm «Giải trí» ⇒ mở sẵn bảng xếp cho app đó để Ba Mẹ chọn nhóm (Trò chơi, Video ngắn…)
  const ts = useLocalSearchParams<{ xep?: string; ten?: string }>();
  const [the, setThe] = useState<"chua" | "thay" | "hoc" | "giai_tri" | "chan">("chua");
  const [tim, setTim] = useState("");
  const [xep, setXepMuc] = useState<{ muc: string; ten: string } | null>(ts.xep ? { muc: ts.xep, ten: ts.ten || ts.xep } : null);
  const setXep = (muc: string | null, ten?: string) => setXepMuc(muc ? { muc, ten: ten || muc } : null);
  const [loai, setLoai] = useState<"hoc" | "giai_tri" | "chan">("giai_tri");
  const [nhom, setNhom] = useState("game");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Ứng dụng"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const q = tim.trim().toLowerCase();
  const loc = <T extends { muc: string; ten?: string }>(ds: T[]) => (q ? ds.filter((x) => x.muc.includes(q) || (x.ten ?? "").toLowerCase().includes(q)) : ds);
  const luu = () => lam(async () => {
    // đã có luật ⇒ giữ tên nhà mình đặt (vd «Khan»), không ghi đè bằng tên tự sinh của «Đã thấy»
    // chưa có tên dễ hiểu (gõ tay, tên miền) ⇒ không gửi ten: máy chủ lấy mục đã chuẩn hoá, không lưu nguyên chữ gõ (vd URL đầy đủ)
    await bm.goi("luat", { muc: xep!.muc, ten: d!.ds.find((x) => x.muc === xep!.muc && !x.child_id)?.ten ?? (xep!.ten !== xep!.muc ? xep!.ten : undefined), loai, nhom });
    bao(`Đã xếp ${xep!.ten} vào ${LOAI[loai][0]}`);
    setXep(null);
    await tai();
  });
  const daThay = d.daThay ?? [];
  const tenCuaMuc = (muc: string) => d.ds.find((x) => x.muc === muc)?.ten ?? d.chuaXep.find((x) => x.muc === muc)?.ten ?? daThay.find((x) => x.muc === muc)?.ten ?? muc;
  const dsThe = the === "chua" ? loc(d.chuaXep).map((x) => ({ muc: x.muc, ten: x.ten ?? x.muc, phu: `${x.phut} phút trên máy Con · chưa xếp` })) :
    the === "thay" ? loc(daThay).map((x) => ({ muc: x.muc, ten: x.ten, xep: x.loai === "chua_xep", phu: `${x.phut} phút trong 30 ngày · ${x.loai === "chua_xep" ? "chưa xếp" : LOAI[x.loai][0]}` })) :
    loc(d.ds.filter((x) => x.loai === the)).map((x) => ({ muc: x.muc, ten: tenCuaMuc(x.muc), phu: x.loai === "giai_tri" ? NHOM.find((n) => n.gia === x.nhom)?.chu ?? "Giải trí" : LOAI[x.loai][0] }));
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Ứng dụng" noi={noi}>
      <ONhap nhan="Tìm app hoặc trang web (vd Edge, YouTube)" value={tim} onChangeText={setTim} placeholder="Edge, Roblox, youtube.com…" autoCapitalize="none" />
      {q && ![...d.ds, ...d.chuaXep, ...daThay].some((x) => x.muc === q || (x.ten ?? "").toLowerCase().includes(q)) ?   /* «edge» đã khớp Microsoft Edge ở danh sách ⇒ không mời gõ tay một tên tệp không có */ <Nut chu={`Gõ tay: xếp «${q}»`} nho loai="vien" ic="cong" bam={() => setXep(q)} /> : null}
      <ChonMot ds={[{ gia: "chua" as const, chu: `Chưa xếp (${d.chuaXep.length})` }, ...(daThay.length ? [{ gia: "thay" as const, chu: `Đã thấy (${daThay.length})` }] : []), { gia: "hoc" as const, chu: "Học tập" }, { gia: "giai_tri" as const, chu: "Giải trí" }, { gia: "chan" as const, chu: "Chặn" }]}
        gia={the} doi={setThe} />
      {dsThe.length ? (
        <Nhom>
          {dsThe.map((x, i) => <Dong key={x.muc} dau={i === 0} tieu={x.ten} phu={x.ten !== x.muc ? `${x.phu} · ${x.muc}` : x.phu} trai={<BieuTron ic={x.muc.includes(".") && !x.muc.endsWith(".exe") ? "web" : "luoi"} />}
            phai={<Nhan loai={the === "chua" || the === "thay" ? "canh" : LOAI[the][1]} chu={the === "chua" || ("xep" in x && x.xep) ? "Xếp" : "Đổi"} />} bam={() => setXep(x.muc, x.ten)} />)}
        </Nhom>
      ) : the === "chua" ? <CanhGiua lv="xong" tieu="Không còn app nào chưa xếp" loi="App mới xuất hiện trên máy Con sẽ hiện ở đây." />
        : the === "thay" ? <Chu co={14} mau={M.chu3}>{q ? "Không có app nào khớp — gõ tên tệp (vd msedge.exe) để thêm tay." : "Máy Con chưa báo app nào."}</Chu> : <Chu co={14} mau={M.chu3}>Chưa có mục nào.</Chu>}
      <NhomTieu chu="Luôn được dùng (hệ thống)" />
      <Nhom>
        <Dong dau tieu="Word, Excel, PowerPoint" phu="Không tính điểm, Ba Mẹ không cần làm gì" trai={<BieuTron ic="luoi" mau="lam" />} phai={<Nhan chu="Học tập" />} />
        <Dong tieu="AiiRob" phu="Học cùng Rob · tự cộng điểm khi đạt" trai={<BieuTron ic="mu" mau="tim" />} phai={<Nhan chu="Học tập" />} />
      </Nhom>
      <BangTruot mo={!!xep} dong={() => setXep(null)} tieu={xep?.ten ?? ""}>
        <View style={{ gap: 8 }}>
          <OChon chon={loai === "hoc"} bam={() => setLoai("hoc")} trai={<BieuTron ic="mu" />} tieu="Học tập — miễn phí" phu="Không trừ điểm, dùng cả giờ học" />
          <OChon chon={loai === "giai_tri"} bam={() => setLoai("giai_tri")} trai={<BieuTron ic="game" mau="vang" />} tieu="Giải trí — trừ điểm" phu="Chỉ trong giờ chơi" />
          <OChon chon={loai === "chan"} bam={() => setLoai("chan")} trai={<BieuTron ic="khoa" mau="do" />} tieu="Chặn hoàn toàn" phu="Con không mở được" />
        </View>
        {loai === "giai_tri" ? <ChonMot ds={NHOM} gia={nhom} doi={setNhom} /> : null}
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Icon ten="dongho" mau={M.chu3} co={16} />
          <Chu co={13} mau={M.chu3}>Có hiệu lực trên máy Con ở lần đồng bộ kế (≤ 10 giây khi online).</Chu></View>
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu phân loại" rong dangChay={dangChay} bam={luu} />
      </BangTruot>
    </Man>
  );
}
