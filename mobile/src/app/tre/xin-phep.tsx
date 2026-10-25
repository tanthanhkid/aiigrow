// con-xin-phep «Xin phép Ba Mẹ» (BRD 6.4, FR-05.01): mở trang web / thêm giờ / cài app — điền sẵn từ màn chặn, chọn lý do nhanh, 1 chạm gửi.
// Giới hạn ≤ 3 yêu cầu đang chờ: vượt ⇒ cảnh giữa màn giải thích + xem yêu cầu. Mất mạng ⇒ yêu cầu chờ gửi, tự đi khi có mạng.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { BaoLoi, Canh, CanhGiua, ChonMot, Chu, Icon, M, Nut, ONhap, useLam, useTai } from "@/lib/ui";
import { ChipMot, ManTre, OLon, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type YcTre } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

type Loai = "them_gio" | "mo_web" | "cai_app" | "khac";
const TIEU: Record<Loai, string> = { mo_web: "Xin mở trang web", them_gio: "Xin thêm giờ chơi", cai_app: "Xin cài ứng dụng", khac: "Xin Ba Mẹ" };
const TU_VIET = "__tu_viet";

export default function XinPhep() {
  const p = useLocalSearchParams<{ loai?: string; gia?: string; tu?: string }>();
  const { ten } = useTre();
  const coSan = (["them_gio", "mo_web", "cai_app", "khac"] as string[]).includes(p.loai ?? "") ? (p.loai as Loai) : null;
  const [loai, setLoai] = useState<Loai>(coSan ?? "them_gio");
  const [gia, setGia] = useState(p.gia ?? "");
  const [phut, setPhut] = useState(15);
  const [lyDo, setLyDo] = useState<string | null>("Để làm bài tập");
  const [tuViet, setTuViet] = useState("");
  const [day, setDay] = useState(false);
  const yc = useTai(() => kid.goi<{ ds: YcTre[]; lyDoNhanh: string[] }>("yeu-cau"));
  // Đổi điểm lấy thời gian ngay trong màn xin giờ (như RequestForm của khay Windows): có điểm, đang trong giờ chơi ⇒ khỏi chờ Ba Mẹ duyệt
  const nha = useTaiTre("nha", () => kid.goi<NhaTre>("nha"));
  const { dangChay, loi, lam, setLoi } = useLam();
  const cho = yc.d?.ds.filter((x) => x.trang_thai === "cho").length ?? 0;
  const nhanh = (yc.d?.lyDoNhanh ?? ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan"]).slice(0, 3);
  const lyDoGui = lyDo === TU_VIET ? tuViet.trim() : lyDo ?? "";
  const giaCoSan = !!p.gia && loai === coSan;
  const thieuGia = loai !== "them_gio" && !gia.trim();
  const gui = () => (thieuGia ? setLoi(loai === "mo_web" ? "Ghi trang web con muốn mở nhé" : loai === "cai_app" ? "Ghi tên ứng dụng nhé" : "Ghi điều con muốn xin nhé")
    : !lyDoGui ? setLoi("Chọn hoặc viết lý do ngắn để Ba Mẹ hiểu nhé") : lam(async () => {
    try {
      const r = await kid.goi<{ id: string }>("yeu-cau", { loai, lyDo: lyDoGui, ...(loai === "them_gio" ? { phut } : { giaTri: gia.trim() }) });
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "qua_nhieu_cho") { setDay(true); return; }
      throw e;
    }
  }, { hangDoi: true }));
  if (day || cho >= 3) {
    return (
      <ManTre tab="xin-phep">
        <CanhGiua lv="cho" tieu={`${ten} đã có ${Math.max(cho, 3)} yêu cầu đang chờ`} loi="Đợi Ba Mẹ trả lời một yêu cầu rồi gửi tiếp nhé.">
          <Nut chu={`Xem yêu cầu của ${ten}`} bam={() => router.replace("/tre/yeu-cau")} />
        </CanhGiua>
      </ManTre>
    );
  }
  return (
    <ManTre tab="xin-phep" lui={p.tu === "chan-web" ? { chu: "Quay lại", ve: `/tre/chan-web?url=${encodeURIComponent(p.gia ?? "")}` } : undefined}
      day={<><BaoLoi loi={loi} /><Nut chu="Gửi cho Ba Mẹ" ic="gui" rong bam={gui} dangChay={dangChay} /></>}>
      <Canh lv="chi" tieu={TIEU[loai]} loi={`Rob gửi Ba Mẹ ngay, Ba Mẹ trả lời là ${ten} biết liền.`} thap />
      {!coSan ? (
        <ChonMot ds={[{ gia: "them_gio" as Loai, chu: "Thêm giờ" }, { gia: "mo_web" as Loai, chu: "Mở trang web" }, { gia: "cai_app" as Loai, chu: "Cài app" }]}
          gia={loai} doi={(v) => { setLoai(v); setGia(""); }} />
      ) : null}
      {loai === "them_gio" ? (
        <View style={{ gap: 12 }}>
          {nha.d && nha.d.soDu > 0 && !nha.d.phien ? (
            <OLon ic="game" mau="vang" tieu="Đổi điểm lấy giờ chơi" phu={`${ten} có ${nha.d.soDu} điểm · chơi ngay, không cần chờ Ba Mẹ`}
              bam={() => router.push("/tre/choi")} />
          ) : null}
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{nha.d && nha.d.soDu > 0 && !nha.d.phien ? "Hoặc xin Ba Mẹ thêm bao lâu?" : "Thêm bao lâu?"}</Chu>
            <ChonMot ds={[15, 30, 60].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
          </View>
        </View>
      ) : giaCoSan ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: M.xamSoft, borderRadius: 16, paddingHorizontal: 14, minHeight: 52 }}>
          <Icon ten={loai === "mo_web" ? "web" : loai === "cai_app" ? "tai" : "tin"} />
          <Chu kieu="rat" co={16} style={{ flex: 1 }}>{gia}</Chu>
        </View>
      ) : (
        <ONhap nhan={loai === "mo_web" ? "Trang web nào?" : loai === "cai_app" ? "Ứng dụng nào?" : "Con muốn xin gì?"} value={gia} onChangeText={setGia}
          placeholder={loai === "mo_web" ? "vd scratch.mit.edu" : loai === "cai_app" ? "vd Minecraft" : ""} autoCapitalize="none" />
      )}
      <View>
        <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{`Vì sao ${ten} cần?`}</Chu>
        <ChipMot nhan={`Vì sao ${ten} cần?`} ds={[...nhanh.map((x) => ({ gia: x, chu: x })), { gia: TU_VIET, chu: "Tự viết…" }]} gia={lyDo} doi={setLyDo} />
      </View>
      {lyDo === TU_VIET ? <ONhap nhan="Lý do của con" value={tuViet} onChangeText={setTuViet} maxLength={100} autoFocus /> : null}
      <Pressable onPress={() => router.push("/tre/yeu-cau")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
        <Chu co={13} mau={M.chu3}>{`${ten} đang có ${cho}/3 yêu cầu chờ Ba Mẹ trả lời.`}<Chu kieu="rat" co={13} mau={M.chinhInk}> Xem</Chu></Chu>
      </Pressable>
    </ManTre>
  );
}
