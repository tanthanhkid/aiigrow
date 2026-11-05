// «AiiGrow hỗ trợ» (thiết kế chốt bm-cai-dat/16 bm2-ho-tro): chat đơn giản với người thật của AiiGrow — lời chào của AiiGrow đầu cuộc chat,
// tin hai bên, 3 gợi ý nhanh trên ô soạn (bấm là gửi), nút «Hay gặp ›» ở đầu màn mở các câu hay hỏi (đọc ngay, có nút tới đúng màn).
// Tin tự tải lại mỗi 10 giây khi màn đang mở. GET/POST ho-tro.
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { KHOI, MEN } from "@/lib/clay";
import { NutVien } from "@/lib/ui-bm3";
import { BangTruot, BaoLoi, BongChat, ChoTai, Chu, gioPhut, M, Man, NhanMen, Nut, OChat, Rob, useLam, useTai } from "@/lib/ui";

type Tin = { id: string; tu: "ba_me" | "aiilab"; noi_dung: string; created_at: string };
const GOI_Y = ["iPad báo lỗi", "Ghép máy mới", "Đổi sao ra phút"];
const HAY_GAP: { hoi: string; dap: string; di?: { chu: string; toi: string } }[] = [
  { hoi: "Máy của con báo «cần sửa»", dap: "Máy chưa đủ quyền bảo vệ nên con tự tắt được. Mở máy đó trong «Máy của con» và làm theo các bước sửa.", di: { chu: "Xem máy của con", toi: "/may" } },
  { hoi: "Ghép thêm máy cho con", dap: "Vào «Máy của con» › «Ghép thêm máy», gửi link cài cho máy của con — mã 6 số dùng khi link không mở được.", di: { chu: "Mở Máy của con", toi: "/may" } },
  { hoi: "Đổi sao ra phút chơi", dap: "Con đổi sao trên máy của con: mỗi sao thành phút chơi, cộng vào giờ chơi hôm nay. Ba Mẹ không cần làm gì." },
  { hoi: "Con xin mở app, web lạ", dap: "Ở chế độ «Chỉ app được phép», app / web lạ con phải xin. Lời xin hiện ở Hôm nay và «App & web» — Ba Mẹ cho mở hoặc không.", di: { chu: "Mở App & web", toi: "/app-web" } },
  { hoi: "Mời người nhà cùng trông con", dap: "Tab Cả nhà › «Mời người nhà», gõ SĐT hoặc email và chọn quyền. Người được mời mở AiiGrow là thấy lời mời.", di: { chu: "Mời người nhà", toi: "/moi-nguoi-nha" } },
];

function TinAiiGrow({ noiDung, luc }: { noiDung: string; luc: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
      <View style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: M.chinhSoft, overflow: "hidden" }, KHOI.nho]}><Rob ten="chi" co={40} /></View>
      <BongChat noiDung={noiDung} luc={luc} />
    </View>
  );
}

export default function HoTro() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ tin: Tin[] }>("ho-tro"));
  const tenToi = useTai(() => bm.goi<{ baMe: { ten: string } }>("toi")).d?.baMe.ten ?? "Ba Mẹ";   // một lần, không theo vòng tải 10 giây
  const [nd, setNd] = useState("");
  const [faq, setFaq] = useState(false);
  const [mo, setMo] = useState<number | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  useEffect(() => { const t = setInterval(tai, 10_000); return () => clearInterval(t); }, [tai]);
  // gợi ý nhanh gửi riêng câu của nó — không xoá bản nháp Ba Mẹ đang gõ
  const gui = (chu?: string) => lam(async () => { await bm.goi("ho-tro", { noiDung: chu ?? nd }); if (chu === undefined) setNd(""); await tai(); });
  const dauTien = d?.tin[0]?.created_at;
  return (
    <Man lui={{ chu: "" }} tieu="AiiGrow hỗ trợ" phai={<NutVien chu="Hay gặp ›" bam={() => setFaq(true)} />} cuonCuoi day={
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} keyboardShouldPersistTaps="handled">
          {GOI_Y.map((g) => (
            <NhanMen key={g} onPress={() => gui(g)} disabled={dangChay} accessibilityRole="button" accessibilityLabel={`Gửi: ${g}`} muc="chip" sang men={MEN.sang}
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: M.the, justifyContent: "center", ...KHOI.nho }}>
              <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{g}</Chu>
            </NhanMen>
          ))}
        </ScrollView>
        <BaoLoi loi={loiLam} />
        <OChat gia={nd} doi={setNd} gui={() => gui()} dangChay={dangChay} nhan="Tin nhắn gửi AiiGrow" />
      </>
    }>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : (
        <>
          <Chu kieu="dam" co={12} mau={M.chu3} style={{ textAlign: "center" }}>{(() => { const t = dauTien ? new Date(dauTien) : new Date(); return `${t.toDateString() === new Date().toDateString() ? "Hôm nay " : ""}${gioPhut(t)}`; })()}</Chu>
          <TinAiiGrow noiDung={`Chào ${tenToi}! Mình là AiiGrow. ${tenToi} cần giúp gì ạ?`} luc="" />
          {d.tin.map((t) => t.tu === "aiilab" ? <TinAiiGrow key={t.id} noiDung={t.noi_dung} luc={gioPhut(t.created_at)} />
            : <BongChat key={t.id} toi noiDung={t.noi_dung} luc={gioPhut(t.created_at)} />)}
          {!d.tin.length ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>Người thật của AiiGrow trả lời, thường trong 5 phút.</Chu> : null}
        </>
      )}
      <BangTruot mo={faq} dong={() => { setFaq(false); setMo(null); }} tieu="Hay gặp">
        <View style={{ gap: 8 }}>
          {HAY_GAP.map((x, i) => (
            <NhanMen key={x.hoi} onPress={() => setMo(mo === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: mo === i }} muc="khoi" sang
              style={{ padding: 14, borderRadius: 22, backgroundColor: M.the, gap: 8, ...KHOI.nho }}>
              <Chu kieu="rat" co={15}>{`${x.hoi} ${mo === i ? "⌃" : "›"}`}</Chu>
              {mo === i ? (
                <>
                  <Chu co={14} mau={M.chu2}>{x.dap}</Chu>
                  {x.di ? <Nut chu={x.di.chu} nho loai="vien" bam={() => { setFaq(false); router.push(x.di!.toi as never); }} /> : null}
                </>
              ) : null}
            </NhanMen>
          ))}
        </View>
        <Nut chu="Vẫn cần hỏi? Nhắn AiiGrow" loai="ma" rong bam={() => { setFaq(false); setMo(null); }} />
      </BangTruot>
    </Man>
  );
}
