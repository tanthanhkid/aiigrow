// bm-app-web: phân loại ứng dụng / website ≤ 3 thao tác (FR-02.02): tìm → chọn loại → xong. Mục hệ thống (Office, AiiRob…) luôn dùng được.
import { useState } from "react";
import { View } from "react-native";
import { bm } from "@/lib/api";
import {
  BangTruot, BaoLoi, BieuTron, CanhGiua, ChoTai, ChonMot, Chu, Dong, Icon, M, Man, Nhan, Nhom, NhomTieu, Nut, OChon, ONhap, useHoanTac, useLam, useTai,
} from "@/lib/ui";

type Luat = { child_id: string; muc: string; ten: string; loai: "hoc" | "giai_tri" | "chan"; nhom: string };
type Ds = { ds: Luat[]; heThong: string[]; chuaXep: { muc: string; phut: number }[] };
const LOAI = { hoc: ["Học tập", "ok"], giai_tri: ["Giải trí", "diem"], chan: ["Chặn", "loi"] } as const;
const NHOM = [{ gia: "game", chu: "Trò chơi" }, { gia: "video_ngan", chu: "Video ngắn" }, { gia: "mxh", chu: "Mạng xã hội" }, { gia: "phim_gd", chu: "Phim giáo dục" }];

export default function AppWeb() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<Ds>("luat"));
  const [the, setThe] = useState<"chua" | "hoc" | "giai_tri" | "chan">("chua");
  const [tim, setTim] = useState("");
  const [xep, setXep] = useState<string | null>(null);
  const [loai, setLoai] = useState<"hoc" | "giai_tri" | "chan">("giai_tri");
  const [nhom, setNhom] = useState("game");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Ứng dụng"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const q = tim.trim().toLowerCase();
  const loc = <T extends { muc: string }>(ds: T[]) => (q ? ds.filter((x) => x.muc.includes(q)) : ds);
  const luu = () => lam(async () => {
    await bm.goi("luat", { muc: xep, loai, nhom });
    bao(`Đã xếp ${xep} vào ${LOAI[loai][0]}`);
    setXep(null);
    await tai();
  });
  const dsThe = the === "chua" ? loc(d.chuaXep).map((x) => ({ muc: x.muc, phu: `${x.phut} phút trên máy Con · chưa xếp` })) :
    loc(d.ds.filter((x) => x.loai === the)).map((x) => ({ muc: x.muc, phu: x.loai === "giai_tri" ? NHOM.find((n) => n.gia === x.nhom)?.chu ?? "Giải trí" : LOAI[x.loai][0] }));
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Ứng dụng" noi={noi}>
      <ONhap nhan="Tìm hoặc thêm app / trang web" value={tim} onChangeText={setTim} placeholder="youtube.com, roblox.exe…" autoCapitalize="none" />
      {q && !d.ds.some((x) => x.muc === q) ? <Nut chu={`Xếp «${q}»`} nho loai="vien" ic="cong" bam={() => setXep(q)} /> : null}
      <ChonMot ds={[{ gia: "chua" as const, chu: `Chưa xếp (${d.chuaXep.length})` }, { gia: "hoc" as const, chu: "Học tập" }, { gia: "giai_tri" as const, chu: "Giải trí" }, { gia: "chan" as const, chu: "Chặn" }]}
        gia={the} doi={setThe} />
      {dsThe.length ? (
        <Nhom>
          {dsThe.map((x, i) => <Dong key={x.muc} dau={i === 0} tieu={x.muc} phu={x.phu} trai={<BieuTron ic={x.muc.includes(".") && !x.muc.endsWith(".exe") ? "web" : "luoi"} />}
            phai={<Nhan loai={the === "chua" ? "canh" : LOAI[the][1]} chu={the === "chua" ? "Xếp" : "Đổi"} />} bam={() => setXep(x.muc)} />)}
        </Nhom>
      ) : the === "chua" ? <CanhGiua lv="xong" tieu="Không còn app nào chưa xếp" loi="App mới xuất hiện trên máy Con sẽ hiện ở đây." /> : <Chu co={14} mau={M.chu3}>Chưa có mục nào.</Chu>}
      <NhomTieu chu="Luôn được dùng (hệ thống)" />
      <Nhom>
        <Dong dau tieu="Word, Excel, PowerPoint" phu="Không tính điểm, Ba Mẹ không cần làm gì" trai={<BieuTron ic="luoi" mau="lam" />} phai={<Nhan chu="Học tập" />} />
        <Dong tieu="AiiRob" phu="Học cùng Rob · tự cộng điểm khi đạt" trai={<BieuTron ic="mu" mau="tim" />} phai={<Nhan chu="Học tập" />} />
      </Nhom>
      <BangTruot mo={!!xep} dong={() => setXep(null)} tieu={xep ?? ""}>
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
