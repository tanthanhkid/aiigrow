// con-pin «Ai đang dùng máy?» (FR-01.03): máy dùng chung nhiều Con — chạm tên mình rồi nhập PIN. Máy chưa ghép ⇒ nhập mã ghép 6 số Ba Mẹ đưa.
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Avt, BaoLoi, Canh, CanhGiua, ChoTai, Chu, Luoi2, M, MAU_CON, Ma6, Nut, cauLoi, useLam, useTai } from "@/lib/ui";
import { ManTre, OPin, useTre } from "@/lib/ui-tre";
import { may, nenMay } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

type HoSo = { id: string; ten: string; avatar: string };

export default function ChonHoSo() {
  const [coMay, setCoMay] = useState(may.co());
  return coMay ? <HoSoVaPin /> : <GhepMay xong={() => setCoMay(true)} />;
}

function GhepMay({ xong }: { xong: () => void }) {
  const [ma, setMa] = useState("");
  const { dangChay, loi, lam, setLoi } = useLam();
  const ghep = () => (ma.length < 6 ? setLoi("Nhập đủ 6 số Ba Mẹ đưa nhé") : lam(async () => {
    const r = await may.goi<{ token: string }>("ghep", { ma, nen: nenMay(), tenMay: "AiiGrow Kid" });
    await may.dat(r.token);
    xong();
  }));
  return (
    <ManTre day={<Nut chu="Ghép máy" ic="tick" rong bam={ghep} dangChay={dangChay} />}>
      <Canh lv="rob-goc" mau="vang" tieu="Ghép máy với AiiGrow" loi="Nhờ Ba Mẹ tạo mã ghép trong app, rồi nhập 6 số vào đây nhé." />
      <Ma6 gia={ma} doi={setMa} nhan="Mã ghép 6 số" />
      <BaoLoi loi={loi} />
    </ManTre>
  );
}

function HoSoVaPin() {
  const { vao } = useTre();
  const { d, loi, matMang, tai } = useTai(() => may.goi<{ con: HoSo[] }>("ho-so"));
  const [chon, setChon] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [sai, setSai] = useState<string | null>(null);
  const { dangChay, loi: loiVao, lam, setLoi } = useLam();
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ds = d?.con ?? [];
  const dangChon = chon ?? (ds.length === 1 ? ds[0].id : null);
  useEffect(() => {
    if (hen.current) clearTimeout(hen.current);
    if (!dangChon || pin.length < 4) return;
    // gõ đủ 4 số rồi dừng tay ⇒ tự vào (PIN 5–6 số: gõ tiếp, chưa gửi)
    hen.current = setTimeout(() => {
      lam(async () => {
        try {
          const r = await may.goi<{ phienCon: string }>("pin", { con: dangChon, pin });
          await vao(r.phienCon);
        } catch (e) {
          if (e instanceof LoiApi && (e.ma === "pin_sai" || e.ma === "pin_tam_khoa")) { setSai(cauLoi(e)); setPin(""); return; }
          throw e;
        }
      });
    }, 900);
    return () => { if (hen.current) clearTimeout(hen.current); };
  }, [dangChon, pin, lam, vao]);
  if (!d) return <ManTre><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  if (sai) {
    return (
      <ManTre>
        <CanhGiua lv="trong-loi" tieu={sai === "Mã PIN chưa đúng" ? "PIN chưa đúng" : sai} loi="Thử lại nhé. Quên PIN thì nhờ Ba Mẹ đặt lại trong app.">
          <Nut chu="Nhập lại" bam={() => { setSai(null); setLoi(null); }} />
        </CanhGiua>
      </ManTre>
    );
  }
  return (
    <ManTre>
      <Canh lv="rob-goc" mau="vang" tieu="Ai đang dùng máy?" loi="Chạm vào tên mình rồi nhập PIN nhé." />
      {!ds.length ? <Chu co={15} mau={M.chu2} style={{ textAlign: "center" }}>Máy này chưa có hồ sơ Con nào — nhờ Ba Mẹ thêm trong app nhé.</Chu> : null}
      <Luoi2>
        {ds.map((c, i) => {
          const dang = c.id === dangChon;
          return (
            <Pressable key={c.id} onPress={() => { setChon(c.id); setPin(""); }} accessibilityRole="radio" accessibilityState={{ checked: dang }}
              accessibilityLabel={c.ten}
              style={{ flexBasis: "46%", flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 26, minHeight: 120,
                backgroundColor: "#fff", borderWidth: dang ? 2 : 1, borderColor: dang ? M.chinh : M.vien,
                shadowColor: M.chu, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 }}>
              <Avt ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} co={60} />
              <Chu kieu="rat" co={19} dong={1}>{c.ten}</Chu>
            </Pressable>
          );
        })}
      </Luoi2>
      {dangChon ? <View style={{ marginTop: 6 }}><OPin gia={pin} doi={setPin} /></View> : null}
      {dangChay ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ textAlign: "center" }}>Đang mở…</Chu> : null}
      <BaoLoi loi={loiVao} />
    </ManTre>
  );
}
