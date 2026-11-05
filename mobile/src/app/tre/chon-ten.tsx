// «Ai đang dùng máy?» (FR-01.03, thiết kế 05/11 L5 — bỏ PIN): máy dùng chung nhiều Con — chạm tên mình là vào (POST /api/device/chon-con).
// Máy chưa ghép ⇒ nhập mã ghép 6 số Ba Mẹ đưa.
import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { usePhien } from "@/lib/phien";
import { Avt, BaoLoi, Canh, ChoTai, Chu, Luoi2, M, MAU_CON, Ma6, Nut, useLam, useTai } from "@/lib/ui";
import { ManTre, useTre } from "@/lib/ui-tre";
import { may, nenMay } from "@/lib/api-tre";

type HoSo = { id: string; ten: string; avatar: string };

export default function ChonHoSo() {
  const [coMay, setCoMay] = useState(may.co());
  return coMay ? <ChonTen /> : <GhepMay xong={() => setCoMay(true)} />;
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
      {Platform.OS !== "web" ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>Máy đã cài AiiGrow Con? Mở app đó rồi chạm «Nhiệm vụ & quà» — không cần mã.</Chu> : null}
      <VeBaMe />
    </ManTre>
  );
}

function ChonTen() {
  const { vao } = useTre();
  const { d, loi, matMang, tai } = useTai(() => may.goi<{ con: HoSo[] }>("ho-so"));
  const [chon, setChon] = useState<string | null>(null);
  const { dangChay, loi: loiVao, lam } = useLam();
  const ds = d?.con ?? [];
  // chạm tên là vào (không PIN — thiết kế 05/11)
  const chonCon = (id: string) => {
    setChon(id);
    lam(async () => {
      const r = await may.goi<{ phienCon: string }>("chon-con", { con: id });
      await vao(r.phienCon);
    });
  };
  if (!d) return <ManTre><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  return (
    <ManTre>
      <Canh lv="rob-goc" mau="vang" tieu="Ai đang dùng máy?" loi="Chạm vào tên mình là vào nhé." />
      {!ds.length ? <Chu co={15} mau={M.chu2} style={{ textAlign: "center" }}>Máy này chưa có hồ sơ Con nào — nhờ Ba Mẹ thêm trong app nhé.</Chu> : null}
      <Luoi2>
        {ds.map((c, i) => {
          const dang = c.id === chon;
          return (
            <Pressable key={c.id} onPress={() => chonCon(c.id)} disabled={dangChay} accessibilityRole="button" accessibilityState={{ selected: dang, busy: dang && dangChay }}
              accessibilityLabel={`Mình là ${c.ten}`}
              style={{ flexBasis: "46%", flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 26, minHeight: 120,
                backgroundColor: "#fff", borderWidth: dang ? 2 : 1, borderColor: dang ? M.chinh : M.vien,
                shadowColor: M.chu, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 }}>
              <Avt ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} co={60} />
              <Chu kieu="rat" co={19} dong={1}>{c.ten}</Chu>
            </Pressable>
          );
        })}
      </Luoi2>
      {dangChay ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ textAlign: "center" }}>Đang mở…</Chu> : null}
      <BaoLoi loi={loiVao} />
      <VeBaMe />
    </ManTre>
  );
}

/** App native: lối Ba Mẹ đăng nhập lại (luôn qua mật khẩu / OTP — Con không tự vào app Ba Mẹ). Web (khung Kid trên máy tính) không hiện. */
function VeBaMe() {
  const { co } = usePhien();
  if (Platform.OS === "web" || co) return null;
  return (
    <Pressable onPress={() => router.push("/dang-nhap")} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
      <Chu co={13} mau={M.chu3}>Ba Mẹ? <Chu kieu="rat" co={13} mau={M.chinhInk}>Đăng nhập app Ba Mẹ</Chu></Chu>
    </Pressable>
  );
}
