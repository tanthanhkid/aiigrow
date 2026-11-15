// «Xin mở app» bản «Dịu» (con-dt-xin 01 cdt-xin-phep, BRD 6.4, FR-05.01, App & web 15/11 #262 #258): app / web ngoài danh sách điền sẵn từ màn
// chặn («YouTube · Chưa có trong danh sách»), «Ba Mẹ thêm vào danh sách · Nếu là app Tính phút: 1 sao = 1 phút · con đang có 18 sao», «Nhắn Ba
// Mẹ» chip sẵn + «Tự viết…» (không bắt buộc), «Xin Ba Mẹ mở YouTube», «Hết sao? Xin Ba Mẹ cho vay sao ›». Xin mở = xin THÊM VÀO DANH SÁCH (bỏ
// chọn 15 / 30 / 60 phút). App / web lạ ⇒ POST /api/kid/xin-duyet (web trong lưới an toàn ⇒ `web_cam` ⇒ «Trang này luôn bị chặn»). ≤ 3 lời chờ.
import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { TextInput, View } from "react-native";
import { LoiApi } from "@/lib/api";
import { guiXinMo, kid, taiSao, type YcTre } from "@/lib/api-tre";
import { soSao } from "@/lib/con-diu";
import { D, FD } from "@/lib/diu";
import { useLam, useTai } from "@/lib/ui";
import { CamXuc, ChonD, ChuD, IcO, LoiD, ManD, NutD, PillD, TheD } from "@/lib/ui-diu";
import { useTre } from "@/lib/ui-tre";

type Loai = "mo_web" | "cai_app" | "khac";
const TU_VIET = "__tu_viet";

export default function XinPhep() {
  const p = useLocalSearchParams<{ loai?: string; gia?: string; tu?: string }>();
  const { ten } = useTre();
  const loai0 = p.loai === "mo_web" || p.loai === "cai_app" || p.loai === "khac" ? (p.loai as Loai) : null;
  const [loai, setLoai] = useState<Loai>(loai0 ?? "cai_app");
  const [gia, setGia] = useState(p.gia ?? "");
  const [lyDo, setLyDo] = useState<string | null>(null);
  const [tuViet, setTuViet] = useState("");
  const [webCam, setWebCam] = useState(false);
  const [day, setDay] = useState(false);
  const yc = useTai(() => kid.goi<{ ds: YcTre[]; lyDoNhanh: string[] }>("yeu-cau"));
  const sao = useTai(() => taiSao().catch(() => null));
  const { dangChay, loi, lam, setLoi } = useLam();
  if (p.loai === "them_gio") return <Redirect href="/tre/them-gio" />;
  const cho = yc.d?.ds.filter((x) => x.trang_thai === "cho").length ?? 0;
  const nhanh = (yc.d?.lyDoNhanh ?? ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan"]).slice(0, 2);
  const coSan = !!p.gia && loai === loai0;
  const tenMuc = gia.trim();
  const loiNhan = (lyDo === TU_VIET ? tuViet.trim() : lyDo ?? "").trim();
  const gui = () => (!tenMuc ? setLoi(loai === "mo_web" ? "Ghi trang web con muốn mở nhé" : loai === "cai_app" ? "Ghi tên app nhé" : "Ghi điều con muốn xin nhé")
    : lam(async () => {
      try {
        const r = await guiXinMo({ loai, muc: tenMuc, lyDo: loiNhan });
        router.replace(`/tre/yeu-cau?moi=${r.id}`);
      } catch (e) {
        if (e instanceof LoiApi && e.ma === "qua_nhieu_cho") { setDay(true); return; }
        if (e instanceof LoiApi && e.ma === "web_cam") { setWebCam(true); return; }
        throw e;
      }
    }, { hangDoi: true }));
  if (webCam) return <Redirect href={`/tre/chan-web?url=${encodeURIComponent(tenMuc)}&cam=1`} />;
  if (day || cho >= 3) {
    return (
      <ManD lui={true} giua day={<NutD chu={`Xem yêu cầu của ${ten || "con"}`} bam={() => router.replace("/tre/yeu-cau")} />}>
        <CamXuc lv="cho" co={140} tieu={`Con đang có ${Math.max(cho, 3)} yêu cầu chờ`} phu="Đợi Ba Mẹ trả lời một yêu cầu rồi gửi tiếp nhé." />
      </ManD>
    );
  }
  const tenNut = loai === "khac" ? "Gửi cho Ba Mẹ" : `Xin Ba Mẹ mở ${tenMuc || (loai === "mo_web" ? "trang này" : "app này")}`;
  return (
    <ManD lui={p.tu === "chan-web" ? `/tre/chan-web?url=${encodeURIComponent(p.gia ?? "")}` : true} tieu={loai === "mo_web" ? "Xin mở trang web" : loai === "khac" ? "Xin Ba Mẹ" : "Xin mở app"}
      day={<><LoiD loi={loi} /><NutD chu={tenNut} ic="gui" bam={gui} dangChay={dangChay} />
        <NutD chu="Hết sao? Xin Ba Mẹ cho vay sao ›" loai="chu" bam={() => router.replace("/tre/them-gio")} /></>}>
      {!loai0 ? <ChonD nhan="Con muốn xin gì" ds={[{ gia: "cai_app" as Loai, chu: "Mở app" }, { gia: "mo_web" as Loai, chu: "Trang web" }, { gia: "khac" as Loai, chu: "Khác" }]}
        gia={loai} doi={(v) => { setLoai(v); setGia(""); }} /> : null}
      {coSan ? (
        <TheD>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IcO ic={loai === "mo_web" ? "web" : "game"} co={52} />
            <View style={{ flex: 1 }}>
              <ChuD kieu="den" co={18} dong={1}>{tenMuc}</ChuD>
              <PillD chu="Chưa có trong danh sách" />
            </View>
          </View>
        </TheD>
      ) : (
        <TheD mong>
          <ChuD kieu="rat" co={13} mau={D.chu2}>{loai === "mo_web" ? "Trang web nào?" : loai === "cai_app" ? "App nào?" : "Con muốn xin gì?"}</ChuD>
          <TextInput value={gia} onChangeText={setGia} autoCapitalize="none" accessibilityLabel="Tên app hoặc trang web"
            placeholder={loai === "mo_web" ? "vd scratch.mit.edu" : loai === "cai_app" ? "vd Minecraft" : ""} placeholderTextColor={D.chu3}
            style={{ fontFamily: FD.rat, fontSize: 17, color: D.chu, minHeight: 32, padding: 0 }} />
        </TheD>
      )}
      {loai !== "khac" ? (
        <TheD mong>
          <ChuD kieu="rat" co={15}>Ba Mẹ thêm vào danh sách</ChuD>
          <ChuD co={13.5} mau={D.chu2}>{`Nếu là ${loai === "mo_web" ? "trang" : "app"} Tính phút: 1 sao = 1 phút${sao.d ? ` · con đang có ${soSao(sao.d.sao)}` : ""}`}</ChuD>
        </TheD>
      ) : null}
      <ChuD kieu="den" co={15}>Nhắn Ba Mẹ</ChuD>
      <View style={{ gap: 8 }}>
        {[...nhanh, TU_VIET].map((x) => (
          <NutD key={x} chu={x === TU_VIET ? "Tự viết…" : x} loai={lyDo === x ? "chinh" : "phu"} nho bam={() => setLyDo(lyDo === x ? null : x)} />
        ))}
        {lyDo === TU_VIET ? (
          <TheD mong>
            <TextInput value={tuViet} onChangeText={setTuViet} maxLength={100} autoFocus accessibilityLabel="Lời nhắn của con" placeholder="Con gõ ở đây…"
              placeholderTextColor={D.chu3} style={{ fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 28, padding: 0 }} />
          </TheD>
        ) : null}
      </View>
    </ManD>
  );
}
