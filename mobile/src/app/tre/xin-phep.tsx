// con-xin-phep «Xin phép Ba Mẹ» (BRD 6.4, FR-05.01, thiết kế 05/11 con-xin / con-bi-chan): thêm giờ / mở app / mở trang web — điền sẵn từ
// màn chặn, lời nhắn KHÔNG bắt buộc, 1 chạm gửi. App / web lạ ⇒ «Xin Ba Mẹ duyệt» (POST /api/kid/xin-duyet — không trừ sao; web người lớn /
// cờ bạc / bạo lực luôn chặn ⇒ báo ngay). Thêm giờ: đổi sao ngay (màn Thêm giờ) hoặc xin Ba Mẹ; giờ ngủ / khoá / học ⇒ chỉ xin ngoại lệ.
// Giới hạn ≤ 3 yêu cầu đang chờ: vượt ⇒ cảnh giữa màn giải thích + xem yêu cầu. Mất mạng ⇒ yêu cầu chờ gửi, tự đi khi có mạng.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { Bao, BaoLoi, Canh, CanhGiua, ChonMot, Chu, Icon, M, Nut, ONhap, useLam, useTai } from "@/lib/ui";
import { ChipMot, ManTre, OLon, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, laMaApp, lyDoKhoa, type NhaTreSao, type YcTre } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

type Loai = "them_gio" | "mo_web" | "cai_app" | "khac";
const TIEU: Record<Loai, string> = { mo_web: "Xin mở trang web", them_gio: "Xin thêm giờ chơi", cai_app: "Xin Ba Mẹ duyệt app", khac: "Xin Ba Mẹ" };
const TU_VIET = "__tu_viet";

export default function XinPhep() {
  const p = useLocalSearchParams<{ loai?: string; gia?: string; tu?: string }>();
  const { ten } = useTre();
  const coSan = (["them_gio", "mo_web", "cai_app", "khac"] as string[]).includes(p.loai ?? "") ? (p.loai as Loai) : null;
  const [loai, setLoai] = useState<Loai>(coSan ?? "them_gio");
  const [gia, setGia] = useState(p.gia ?? "");
  const [phut, setPhut] = useState(15);
  const [lyDo, setLyDo] = useState<string | null>(null);
  const [webCam, setWebCam] = useState(false);
  const [tuViet, setTuViet] = useState("");
  const [day, setDay] = useState(false);
  const yc = useTai(() => kid.goi<{ ds: YcTre[]; lyDoNhanh: string[] }>("yeu-cau"));
  // Đổi sao lấy giờ ngay (màn Thêm giờ) — chỉ gợi ý khi thêm giờ được: Ba Mẹ bật đổi sao, có sao, không giờ ngủ / khoá / giờ học
  const nha = useTaiTre("nha", () => kid.goi<NhaTreSao>("nha"));
  const n = nha.d;
  const khoa = lyDoKhoa(n?.quy);
  const doiDuoc = !!n?.quy && !khoa && n.quy.doiSao.bat && (n.sao ?? n.soDu) > 0;
  const { dangChay, loi, lam, setLoi } = useLam();
  const cho = yc.d?.ds.filter((x) => x.trang_thai === "cho").length ?? 0;
  const nhanh = (yc.d?.lyDoNhanh ?? ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan"]).slice(0, 3);
  const lyDoGui = lyDo === TU_VIET ? tuViet.trim() : lyDo ?? "";
  const giaCoSan = !!p.gia && loai === coSan;
  const thieuGia = loai !== "them_gio" && !gia.trim();
  const gui = () => (thieuGia ? setLoi(loai === "mo_web" ? "Ghi trang web con muốn mở nhé" : loai === "cai_app" ? "Ghi tên app nhé" : "Ghi điều con muốn xin nhé")
    : lam(async () => {
    try {
      // web lạ / mã app thật: «Xin Ba Mẹ duyệt» (đã xin rồi ⇒ máy chủ trả lại lời xin đang chờ). Tên app gõ tay («Minecraft») ⇒ yeu-cau cai_app
      // (xin-duyet sẽ hiểu tên trần là tên miền).
      const r = loai === "mo_web" || (loai === "cai_app" && laMaApp(gia.trim()))
        ? await kid.goi<{ id: string }>("xin-duyet", { muc: gia.trim(), ten: gia.trim(), lyDo: lyDoGui })
        : await kid.goi<{ id: string }>("yeu-cau", { loai, lyDo: lyDoGui, ...(loai === "them_gio" ? { phut } : { giaTri: gia.trim() }) });
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "qua_nhieu_cho") { setDay(true); return; }
      if (e instanceof LoiApi && e.ma === "web_cam") { setWebCam(true); return; }
      if (e instanceof LoiApi && e.ma === "chi_ngoai_le") { router.replace(`/tre/ngoai-le${khoa ? `?ly=${khoa}` : ""}`); return; }
      throw e;
    }
  }, { hangDoi: true }));
  if (webCam) {
    return (
      <ManTre tab="xin-phep">
        <CanhGiua lv="trong-loi" tieu="Trang này luôn bị chặn" loi={`AiiGrow chặn trang này để an toàn cho ${ten}. Ba Mẹ cũng không mở được.`}>
          <Nut chu="Về Hôm nay" bam={() => router.replace("/tre/nha")} />
        </CanhGiua>
      </ManTre>
    );
  }
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
      day={loai === "them_gio" && khoa ? undefined : <><BaoLoi loi={loi} /><Nut chu={loai === "them_gio" ? `Xin Ba Mẹ thêm ${phut} phút` : loai === "khac" ? "Gửi cho Ba Mẹ" : `Xin Ba Mẹ mở ${gia.trim() || (loai === "mo_web" ? "trang này" : "app này")}`} ic="gui" rong bam={gui} dangChay={dangChay} /></>}>
      <Canh lv="chi" tieu={TIEU[loai]} loi={`Rob gửi Ba Mẹ ngay, Ba Mẹ trả lời là ${ten} biết liền.`} thap />
      {!coSan ? (
        <ChonMot ds={[{ gia: "them_gio" as Loai, chu: "Thêm giờ" }, { gia: "cai_app" as Loai, chu: "Mở app" }, { gia: "mo_web" as Loai, chu: "Mở trang web" }]}
          gia={loai} doi={(v) => { setLoai(v); setGia(""); }} />
      ) : null}
      {loai === "them_gio" && khoa ? (
        <View style={{ gap: 12 }}>
          <Bao loai="canh" ic="trang_ngu" tieu={khoa === "gio_ngu" ? "Đang giờ ngủ" : khoa === "ba_me_khoa" ? "Ba Mẹ đang khoá máy" : "Đang giờ học"}
            loi="Lúc này không thêm giờ được — con xin Ba Mẹ mở ngoại lệ nhé." />
          <Nut chu="Xin Ba Mẹ mở ngoại lệ" ic="tin" rong bam={() => router.push(`/tre/ngoai-le?ly=${khoa}`)} />
        </View>
      ) : loai === "them_gio" ? (
        <View style={{ gap: 12 }}>
          {doiDuoc ? (
            <OLon ic="sao" mau="vang" tieu="Dùng sao lấy giờ chơi" phu={`${ten} có ${n!.sao ?? n!.soDu} sao · ${n!.quy!.tyLe.sao} sao = ${n!.quy!.tyLe.phut} phút, không cần chờ Ba Mẹ`}
              bam={() => router.push("/tre/them-gio")} />
          ) : null}
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{doiDuoc ? "Hoặc xin Ba Mẹ thêm bao lâu?" : "Thêm bao lâu?"}</Chu>
            <ChonMot ds={[15, 30, 60].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
          </View>
        </View>
      ) : giaCoSan ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: M.xamSoft, borderRadius: 16, paddingHorizontal: 14, minHeight: 52 }}>
          <Icon ten={loai === "mo_web" ? "web" : loai === "cai_app" ? "tai" : "tin"} />
          <Chu kieu="rat" co={16} style={{ flex: 1 }}>{gia}</Chu>
        </View>
      ) : (
        <ONhap nhan={loai === "mo_web" ? "Trang web nào?" : loai === "cai_app" ? "App nào?" : "Con muốn xin gì?"} value={gia} onChangeText={setGia}
          placeholder={loai === "mo_web" ? "vd scratch.mit.edu" : loai === "cai_app" ? "vd Minecraft" : ""} autoCapitalize="none" />
      )}
      {loai === "them_gio" && khoa ? null : (
        <>
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{loai === "khac" ? "Nhắn Ba Mẹ" : "Nhắn Ba Mẹ (không bắt buộc)"}</Chu>
            <ChipMot nhan="Nhắn Ba Mẹ" ds={[...nhanh.map((x) => ({ gia: x, chu: x })), { gia: TU_VIET, chu: "Tự viết…" }]} gia={lyDo}
              doi={(v) => setLyDo(v === lyDo ? null : v)} />
          </View>
          {lyDo === TU_VIET ? <ONhap nhan="Lời nhắn của con" value={tuViet} onChangeText={setTuViet} maxLength={100} autoFocus /> : null}
        </>
      )}
      <Pressable onPress={() => router.push("/tre/yeu-cau")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
        <Chu co={13} mau={M.chu3}>{`${ten} đang có ${cho}/3 yêu cầu chờ Ba Mẹ trả lời.`}<Chu kieu="rat" co={13} mau={M.chinhInk}> Xem</Chu></Chu>
      </Pressable>
    </ManTre>
  );
}
