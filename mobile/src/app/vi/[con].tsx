// «Ví sao của <Con>» (thiết kế 14/11 bm-sao-qua/01 them-1akngbxb; trước: 05/11 bm-hang-ngay/40, L1 L10): số sao lớn = bao nhiêu phút chơi, tuần này kiếm bao nhiêu sao, tỷ lệ đổi
// (10 sao = X phút, con tự đổi trên máy), quà con đổi bằng sao (chờ Ba Mẹ trao / còn thiếu bao nhiêu), «Sao vào, sao ra» (lịch sử ví).
// Giữ «± Điều chỉnh» tay của bản cũ (thiết kế không nói ⇒ giữ hành vi cũ) — chỉ Ba Mẹ, kèm lý do.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type Diem, type Qua } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { BangTruot, BaoLoi, ChoTai, ChonMot, Chu, gioPhut, Icon3D, M, Man, Nhan, Nut, ONhap, The, useHoanTac, useLam, useTai } from "@/lib/ui";
import { HangViec, quyenToi, TieuMuc, type ChoDuyetMoi, type QuyCon } from "@/lib/hang-ngay";

type Vi = { soDu: number; sao?: number; lichSu: Diem[] };
/** «Hôm nay» / «Hôm qua» / «3/11». */
const ngay = (iso: string) => {
  const t = new Date(iso), h = new Date();
  if (t.toDateString() === h.toDateString()) return "Hôm nay";
  h.setDate(h.getDate() - 1);
  return t.toDateString() === h.toDateString() ? "Hôm qua" : `${t.getDate()}/${t.getMonth() + 1}`;
};

export default function ViSao() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [vi, c, quy, qua, cd, quyen] = await Promise.all([
      bm.goi<Vi>(`con/${con}/vi`), bm.goi<{ ten: string }>(`con/${con}`), bm.goi<QuyCon>(`con/${con}/quy`).catch(() => null),
      bm.goi<{ ds: Qua[] }>(`qua?con=${encodeURIComponent(con)}`), bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null), quyenToi(),
    ]);
    return { bay: Date.now(), vi, ten: c.ten, quy, qua: qua.ds.filter((x) => x.bat), phieu: (cd?.phieu ?? []).filter((p) => p.child_id === con),
      baMe: quyen === "ba_me" };
  });
  const [mo, setMo] = useState(false);
  const [dau, setDau] = useState<1 | -1>(1);
  const [so, setSo] = useState("10");
  const [lyDo, setLyDo] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Nhiệm vụ" }} tieu="Ví sao"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const sao = d.vi.sao ?? d.vi.soDu;
  const tyLe = d.quy?.quy.tyLe.phut ?? 10;
  const phut = Math.floor((Math.max(0, sao) * tyLe) / 10);
  const kiem = d.vi.lichSu.filter((x) => x.delta > 0 && x.loai !== "hoan" && d.bay - new Date(x.created_at).getTime() < 7 * 86_400_000).reduce((a, x) => a + x.delta, 0);
  const tuDoi = d.quy?.quy.doiSao.bat !== false;
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/diem`, { delta: dau * Number(so), lyDo });
    setMo(false);
    bao(`Đã ${dau > 0 ? "cộng" : "trừ"} ${so} sao cho ${d.ten}`);
    setLyDo("");
    await tai();
  });
  return (
    <Man lui={{ chu: "Nhiệm vụ" }} tieu={`Ví sao của ${d.ten}`} noi={noi} tai={tai}
      phai={d.baMe ? <Pressable onPress={() => setMo(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Nhan chu="± Điều chỉnh" /></Pressable> : undefined}>
      <View style={[{ alignItems: "center", gap: 4, padding: 20, borderRadius: 30, backgroundColor: M.diemSoft }, KHOI.the]}>
        <Icon3D ten="sao" co={56} mau={M.diemInk} />
        <Chu kieu="rat" co={30} mau={M.diemInk} so style={{ textAlign: "center" }}>{`${sao} sao = ${phut} phút chơi`}</Chu>
        <Chu co={13.5} mau={M.diemInk}>{`Tuần này kiếm ${kiem} sao`}</Chu>
      </View>
      <Chu co={14} mau={M.chu2} style={{ marginHorizontal: 4 }}>
        {tuDoi ? `10 sao đổi được ${tyLe} phút chơi. Con tự đổi trên máy, không cần xin Ba Mẹ.` : `10 sao = ${tyLe} phút chơi. Con tự đổi sao đang tắt — bật ở «Giờ chơi».`}
      </Chu>

      <TieuMuc chu="Con đổi sao lấy quà" phai={{ chu: d.baMe ? "Sửa quà ›" : "Quà ›", bam: () => router.push({ pathname: "/vi/qua", params: { con, tab: "nha" } }) }} />
      <The>
        {d.phieu.map((p, i) => (
          <HangViec key={p.id} dau={i === 0} ic="qua" mau="cam" tieu={p.ten} phu={`Đã đổi ${p.diem} sao`} phai={<Nhan loai="canh" chu="Chờ Ba Mẹ trao" />}
            bam={() => router.push("/diem-qua" as never)} />
        ))}
        {d.qua.filter((q) => !d.phieu.some((p) => p.ten === q.ten)).map((q, i) => (
          <HangViec key={q.id} dau={!d.phieu.length && i === 0} ic="qua" mau={sao >= q.diem ? "xanh" : "xam"} tieu={q.ten}
            phu={sao >= q.diem ? `Cần ${q.diem} sao · con tự đổi trên máy` : `Cần ${q.diem} sao · còn thiếu ${q.diem - Math.max(0, sao)}`}
            phai={<Nhan loai={sao >= q.diem ? "ok" : "xam"} chu={sao >= q.diem ? "Đủ sao" : "Chưa đủ"} />} />
        ))}
        {!d.phieu.length && !d.qua.length ? <Chu co={14} mau={M.chu2}>Chưa có quà nào. Thêm quà để con có mục tiêu.</Chu> : null}
      </The>

      <TieuMuc chu="Sao vào, sao ra" />
      <The>
        {d.vi.lichSu.length ? d.vi.lichSu.slice(0, 40).map((x, i) => (
          <HangViec key={i} dau={i === 0} ic={x.delta > 0 ? "sao" : x.loai === "doi_qua" ? "qua" : "dongho"} mau={x.delta > 0 ? "vang" : "xam"}
            tieu={x.ly_do} phu={`${ngay(x.created_at)} · ${gioPhut(x.created_at)}${x.ten_nguoi ? ` · ${x.ten_nguoi}` : ""}`}
            phai={<Chu kieu="rat" so mau={x.delta > 0 ? M.chinh : M.chu}>{`${x.delta > 0 ? "+" : "−"}${Math.abs(x.delta)}`}</Chu>} />
        )) : <Chu co={14} mau={M.chu2}>{`Ví của ${d.ten} còn trống — sao đầu tiên đến khi con làm xong việc đầu tiên.`}</Chu>}
      </The>

      <BangTruot mo={mo} dong={() => setMo(false)} tieu={`Điều chỉnh sao của ${d.ten}`}>
        <ChonMot ds={[{ gia: 1 as const, chu: "Cộng sao" }, { gia: -1 as const, chu: "Trừ sao" }]} gia={dau} doi={setDau} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 120 }}><ONhap nhan="Số sao" value={so} onChangeText={(t) => setSo(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><ONhap nhan="Lý do" value={lyDo} onChangeText={setLyDo} placeholder={dau > 0 ? "Thưởng sinh nhật" : "Nói dối"} maxLength={120} /></View>
        </View>
        <Chu co={13} mau={M.chu3}>Mọi điều chỉnh tay được ghi lại trong ví và báo cáo.</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={`${dau > 0 ? "Cộng" : "Trừ"} ${so || 0} sao`} rong dangChay={dangChay} tat={!lyDo.trim() || !(Number(so) >= 1)} bam={luu} />
      </BangTruot>
    </Man>
  );
}
