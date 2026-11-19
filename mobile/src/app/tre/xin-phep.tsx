// «Xin mở app» bản «Dịu» (con-dt-xin 01 cdt-xin-phep, BRD 6.4, FR-05.01, App & web 15/11 #262 #258): app / web ngoài danh sách điền sẵn từ màn
// «chưa có trong danh sách» («YouTube · Chưa có trong danh sách»), «Ba Mẹ thêm vào danh sách · Nếu là app Tính phút: 1 sao = 1 phút · con đang có 18 sao», «Nhắn Ba
// Mẹ» chip sẵn + «Tự viết…» (không bắt buộc), «Xin Ba Mẹ mở YouTube», «Hết sao? Xin Ba Mẹ cho vay sao ›». Xin mở = xin THÊM VÀO DANH SÁCH (bỏ
// chọn 15 / 30 / 60 phút). App / web lạ ⇒ POST /api/kid/xin-duyet (máy chủ cũ trả `web_cam` ⇒ guiXinMo đổi thành «Ba Mẹ chưa thêm … lúc này»). ≤ 3 lời chờ.
// `?them=app|web` (#422 «Xin thêm app / web» từ Hôm nay — con-dt-xin 09 them-pj2ra3jh / 10 them-euz1k35r): hộp 2 thẻ «App trên máy» (lưới app phổ
// biến — điện thoại không đọc được app đã cài, máy chủ chưa có danh sách app của máy Con — + ô gõ tên app khác) / «Trang web» (ô «Địa chỉ trang web»),
// ô lời nhắn, «Ba Mẹ sẽ chọn nhóm» + 2 chip (chỉ thông tin), «Xin Ba Mẹ thêm <app>» / «Xin Ba Mẹ mở trang này» ⇒ xin-duyet kèm `kieu` ⇒ màn kết quả yeu-cau.
import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Pressable, TextInput, View } from "react-native";
import { LoiApi } from "@/lib/api";
import { guiXinMo, kid, taiSao, type YcTre } from "@/lib/api-tre";
import { soSao } from "@/lib/con-diu";
import { BONG_D, D, FD } from "@/lib/diu";
import { Icon, useLam, useTai, type TenIcon } from "@/lib/ui";
import { CamXuc, ChipD, ChonD, ChuD, IcO, LoiD, ManD, NutD, PhuD, PillD, TheD } from "@/lib/ui-diu";
import { useTre } from "@/lib/ui-tre";

type Loai = "mo_web" | "cai_app" | "khac";
const TU_VIET = "__tu_viet";

export default function XinPhep() {
  const p = useLocalSearchParams<{ loai?: string; gia?: string; tu?: string; them?: string }>();
  const { ten } = useTre();
  const loai0 = p.loai === "mo_web" || p.loai === "cai_app" || p.loai === "khac" ? (p.loai as Loai) : null;
  const [loai, setLoai] = useState<Loai>(loai0 ?? "cai_app");
  const [gia, setGia] = useState(p.gia ?? "");
  const [lyDo, setLyDo] = useState<string | null>(null);
  const [tuViet, setTuViet] = useState("");
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
        throw e;
      }
    }, { hangDoi: true }));
  if (day || cho >= 3) {
    return (
      <ManD lui={true} giua day={<NutD chu={`Xem yêu cầu của ${ten || "con"}`} bam={() => router.replace("/tre/yeu-cau")} />}>
        <CamXuc lv="cho" co={140} tieu={`Con đang có ${Math.max(cho, 3)} yêu cầu chờ`} phu="Đợi Ba Mẹ trả lời một yêu cầu rồi gửi tiếp nhé." />
      </ManD>
    );
  }
  if (p.them) return <XinThem the0={p.them === "web" ? "web" : "app"} gia0={p.gia ?? ""} day={() => setDay(true)} />;
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
        <TheD mong lom>
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
          <TheD mong lom>
            <TextInput value={tuViet} onChangeText={setTuViet} maxLength={100} autoFocus accessibilityLabel="Lời nhắn của con" placeholder="Con gõ ở đây…"
              placeholderTextColor={D.chu3} style={{ fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 28, padding: 0 }} />
          </TheD>
        ) : null}
      </View>
    </ManD>
  );
}

// ---------------------------------------------------------------- «Xin thêm app / web» (#422)

type The = "app" | "web";
/** App phổ biến của trẻ (bàn 09-them-pj2ra3jh) — điện thoại không liệt kê được app đã cài (iOS cấm, máy chủ chưa có danh sách app máy Con). */
const APP_PHO_BIEN = ["YouTube", "Roblox", "Minecraft", "Scratch", "Zalo", "CapCut"];
const O_NHAP = { fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 28, padding: 0, flex: 1 } as const;

function TheChon({ gia, doi }: { gia: The; doi: (v: The) => void }) {
  const ds: { gia: The; chu: string; ic: TenIcon }[] = [{ gia: "app", chu: "App trên máy", ic: "may_tinh" }, { gia: "web", chu: "Trang web", ic: "web" }];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 22, backgroundColor: D.lom, boxShadow: BONG_D.lom }}>
      {ds.map((x) => {
        const c = x.gia === gia;
        return (
          <Pressable key={x.gia} onPress={() => doi(x.gia)} accessibilityRole="tab" accessibilityState={{ selected: c }} accessibilityLabel={x.chu}
            style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              paddingHorizontal: 8, backgroundColor: c ? D.dem : "transparent" }}>
            <Icon ten={x.ic} co={20} mau={c ? D.sao : D.chu2} />
            <ChuD kieu="rat" co={15} mau={c ? D.sao : D.chu2} dong={1}>{x.chu}</ChuD>
          </Pressable>
        );
      })}
    </View>
  );
}

function OApp({ ten, chon, bam }: { ten: string; chon: boolean; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="radio" accessibilityState={{ checked: chon }} accessibilityLabel={ten}
      style={{ flexGrow: 1, flexBasis: "40%", minHeight: 52, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12,
        backgroundColor: D.the, borderWidth: 1.5, borderColor: chon ? D.vangVien : "transparent", boxShadow: BONG_D.phim }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: D.dem, alignItems: "center", justifyContent: "center" }}>
        <ChuD kieu="den" co={14} mau={D.sao}>{ten.charAt(0)}</ChuD>
      </View>
      <ChuD kieu="rat" co={15} dong={1} style={{ flex: 1, minWidth: 0 }}>{ten}</ChuD>
      {chon ? <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: D.dem, alignItems: "center", justifyContent: "center" }}>
        <Icon ten="tick" co={14} mau={D.sao} /></View> : null}
    </Pressable>
  );
}

const Nhan = ({ chu }: { chu: string }) => <ChuD kieu="rat" co={13.5} mau={D.chu2}>{chu}</ChuD>;

function XinThem({ the0, gia0, day }: { the0: The; gia0: string; day: () => void }) {
  const [the, setThe] = useState<The>(the0);
  const [chon, setChon] = useState<string | null>(the0 === "app" && gia0 ? gia0 : null);
  const [tenGo, setTenGo] = useState("");
  const [web, setWeb] = useState(the0 === "web" ? gia0 : "");
  const [loiNhan, setLoiNhan] = useState("");
  const { dangChay, loi, lam, setLoi } = useLam();
  const tenApp = tenGo.trim() || chon || "";
  const ds = chon && !APP_PHO_BIEN.includes(chon) ? [chon, ...APP_PHO_BIEN] : APP_PHO_BIEN;
  const gui = () => {
    const muc = the === "app" ? tenApp : web.trim();
    if (!muc) return setLoi(the === "app" ? "Chọn app hoặc gõ tên app nhé" : "Gõ địa chỉ trang web, ví dụ scratch.mit.edu");
    return lam(async () => {
      try {
        const r = await guiXinMo({ loai: the === "app" ? "cai_app" : "mo_web", muc, ten: the === "app" ? muc : undefined, lyDo: loiNhan.trim(), kieu: the });
        router.replace(`/tre/yeu-cau?moi=${r.id}`);
      } catch (e) {
        if (e instanceof LoiApi && e.ma === "qua_nhieu_cho") { day(); return; }
        throw e;
      }
    }, { hangDoi: true });
  };
  const oLoiNhan = (
    <TheD mong lom>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon ten="tin" co={20} mau={D.chu2} />
        <TextInput value={loiNhan} onChangeText={setLoiNhan} maxLength={100} accessibilityLabel="Lời nhắn cho Ba Mẹ"
          placeholder={the === "app" ? "Nhắn Ba Mẹ: con xem video vẽ tranh ạ" : "Con học làm game trên Scratch ạ"} placeholderTextColor={D.chu3} style={O_NHAP} />
      </View>
    </TheD>
  );
  return (
    <ManD lui={true} tieu="Xin thêm app / web"
      day={<><LoiD loi={loi} /><NutD chu={the === "app" ? `Xin Ba Mẹ thêm ${tenApp || "app này"}` : "Xin Ba Mẹ mở trang này"} ic="gui" bam={gui} dangChay={dangChay} /></>}>
      <PhuD chu="Chọn app trên điện thoại hoặc gõ địa chỉ trang web" co={14} />
      <TheChon gia={the} doi={(v) => { setThe(v); setLoi(null); }} />
      {the === "app" ? (
        <>
          <Nhan chu="App trên điện thoại" />
          <View accessibilityRole="radiogroup" accessibilityLabel="App trên điện thoại" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {ds.map((x) => <OApp key={x} ten={x} chon={!tenGo.trim() && chon === x} bam={() => { setChon(x); setTenGo(""); setLoi(null); }} />)}
          </View>
          <TheD mong lom>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon ten="tim_kiem" co={20} mau={D.chu2} />
              <TextInput value={tenGo} onChangeText={(v) => { setTenGo(v); setLoi(null); }} maxLength={60} accessibilityLabel="Tên app khác"
                placeholder="App khác? Gõ tên app" placeholderTextColor={D.chu3} style={O_NHAP} />
            </View>
          </TheD>
          {oLoiNhan}
        </>
      ) : (
        <>
          <Nhan chu="Địa chỉ trang web" />
          <TheD mong lom>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon ten="web" co={20} mau={D.chu2} />
              <TextInput value={web} onChangeText={(v) => { setWeb(v); setLoi(null); }} maxLength={200} autoCapitalize="none" autoCorrect={false}
                keyboardType="url" accessibilityLabel="Địa chỉ trang web" placeholder="scratch.mit.edu" placeholderTextColor={D.chu3} style={O_NHAP} />
            </View>
          </TheD>
          <ChuD co={13} mau={D.chu2}>Gõ địa chỉ trang con muốn vào, ví dụ scratch.mit.edu</ChuD>
          <Nhan chu="Lời nhắn cho Ba Mẹ" />
          {oLoiNhan}
        </>
      )}
      <Nhan chu="Ba Mẹ sẽ chọn nhóm" />
      <View style={{ gap: 8, alignItems: "flex-start" }}>
        <ChipD ic="sao" chu="Tính phút · 1 sao = 1 phút" />
        <ChipD ic="tick" chu="Không tính phút" />
      </View>
    </ManD>
  );
}
