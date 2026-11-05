// «Thêm giờ chơi» (thiết kế 05/11 con-xin, con-het-gio — L2/L3): còn bao nhiêu phút trong quỹ hôm nay, rồi hai cách:
//   • Dùng sao 15 / 30 / 60 phút (10 sao = 10 phút, Ba Mẹ đặt tỷ lệ) — đổi ngay, cộng vào quỹ hôm nay (POST /api/kid/doi-sao);
//   • Xin Ba Mẹ 15 / 30 / 60 phút + lời nhắn không bắt buộc (POST /api/kid/yeu-cau {loai: them_gio}).
// Giờ ngủ / Ba Mẹ khoá / giờ học ⇒ không thêm giờ được, chuyển sang màn chỉ «Xin Ba Mẹ mở ngoại lệ». Mất mạng ⇒ chưa đổi, không trừ sao.
import { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { BaoLoi, Canh, CanhGiua, ChoTai, ChonMot, Chu, M, Nut, ONhap, The, laMatMang, useLam } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, lyDoKhoa, saoChoPhut, type QuyCon } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

const PHUT = [15, 30, 60];
type Cach = "sao" | "xin";
const LUI = { chu: "Hôm nay", ve: "/tre/nha" };

const DongSo = ({ chu, so, dam, mau }: { chu: string; so: string; dam?: boolean; mau?: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
    <Chu co={15} kieu={dam ? "rat" : "thuong"}>{chu}</Chu>
    <Chu kieu="rat" co={15} so mau={mau}>{so}</Chu>
  </View>
);

export default function ThemGio() {
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("quy", () => kid.goi<QuyCon>("quy"));
  const [cach, setCach] = useState<Cach | null>(null);
  const [phut, setPhut] = useState(15);
  const [nhan, setNhan] = useState("");
  const [daDoi, setDaDoi] = useState<{ phut: number; sao: number; conPhut: number } | null>(null);
  const { dangChay, loi: loiLam, lam, setLoi } = useLam();
  useEffect(() => { setLoi(null); }, [cach, phut, setLoi]);
  if (!d) return <ManTre lui={LUI}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const q = d.quy;
  const ly = lyDoKhoa(q);
  if (ly) return <Redirect href={`/tre/gio-ngu?ly=${ly}`} />;
  if (daDoi) {
    return (
      <ManTre lui={LUI}>
        <DiemTren n={daDoi.sao} />
        <CanhGiua lv="xong" tieu={`Đã đổi: +${daDoi.phut} phút chơi`} loi={`Giờ chơi còn ${daDoi.conPhut} phút. ${ten} còn ${daDoi.sao} sao.`}>
          <Nut chu="Về Hôm nay" bam={() => router.replace("/tre/nha")} />
        </CanhGiua>
      </ManTre>
    );
  }
  const coSao = q.doiSao.bat;
  const coXin = q.choXinThem;
  const dang: Cach | null = cach ?? (coSao ? "sao" : coXin ? "xin" : null);
  const can = saoChoPhut(q, phut);
  const thieu = Math.max(0, can - d.sao);
  const quaToiDa = phut > q.doiSao.conDoiDuoc;
  const doi = () => lam(async () => {
    try {
      const r = await kid.goi<{ phut: number; soDu: number; conPhut: number }>("doi-sao", { phut });
      setDaDoi({ phut: r.phut, sao: r.soDu, conPhut: r.conPhut });
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "khong_them_gio") { await tai(); return; }
      if (laMatMang(e)) throw new LoiApi("mat_mang", `Mất mạng — chưa đổi được, sao của ${ten} không bị trừ.`, 0);
      throw e;
    }
  });
  const xin = () => lam(async () => {
    try {
      const r = await kid.goi<{ id: string }>("yeu-cau", { loai: "them_gio", phut, lyDo: nhan.trim() });
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "chi_ngoai_le") { await tai(); return; }
      throw e;
    }
  }, { hangDoi: true });
  const nutDay = dang === "sao"
    ? thieu > 0 ? <Nut chu="Làm nhiệm vụ lấy thêm sao" ic="sao" rong bam={() => router.replace("/tre/nhiem-vu")} />
      : <Nut chu={`Đổi ${can} sao lấy ${phut} phút`} loai="vang" ic="sao" rong tat={quaToiDa} bam={doi} dangChay={dangChay} />
    : dang === "xin" ? <Nut chu={`Xin Ba Mẹ thêm ${phut} phút`} ic="gui" rong bam={xin} dangChay={dangChay} />
      : null;
  return (
    <ManTre lui={LUI} day={<><BaoLoi loi={loiLam} />{nutDay}</>}>
      <DiemTren n={d.sao} />
      <Canh lv={q.conPhut > 0 ? "cho" : "nghi"} mau="vang" tieu={q.conPhut > 0 ? `Giờ chơi còn ${q.conPhut} phút` : "Hết giờ chơi hôm nay"}
        loi={`Đã chơi ${q.daDung} / ${q.tongPhut} phút. App học không tính giờ.`} thap />
      {!dang ? (
        <CanhGiua lv="chi" tieu="Hôm nay không thêm giờ được" loi="Ba Mẹ đã tắt đổi sao và xin thêm giờ. Mai chơi tiếp nhé!">
          <Nut chu="Làm nhiệm vụ" loai="vien" bam={() => router.replace("/tre/nhiem-vu")} />
        </CanhGiua>
      ) : (
        <>
          {coSao && coXin ? (
            <ChonMot ds={[{ gia: "sao" as Cach, chu: "Dùng sao" }, { gia: "xin" as Cach, chu: "Xin Ba Mẹ" }]} gia={dang} doi={setCach} />
          ) : null}
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{dang === "sao" ? "Con đổi bao nhiêu phút?" : "Con xin thêm bao lâu?"}</Chu>
            <ChonMot ds={PHUT.map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
          </View>
          {dang === "sao" ? (
            <The dem style={{ gap: 8 }}>
              <DongSo chu={`Sao của ${ten}`} so={`${d.sao} sao`} />
              <DongSo chu={`Đổi ${phut} phút`} so={`−${can} sao`} />
              <View style={{ height: 1, backgroundColor: M.vien }} />
              {thieu > 0 ? <DongSo chu="Chưa đủ sao" so={`còn thiếu ${thieu} sao`} dam mau={M.canh} />
                : <DongSo chu={`Còn ${d.sao - can} sao · giờ chơi thành`} so={`${q.conPhut + phut} phút`} dam />}
              <Chu co={13} mau={M.chu3}>{`${q.tyLe.sao} sao = ${q.tyLe.phut} phút chơi.`}</Chu>
              {quaToiDa ? <Chu co={13} mau={M.canh}>{q.doiSao.conDoiDuoc > 0 ? `Hôm nay con còn đổi được ${q.doiSao.conDoiDuoc} phút thôi.` : `Hôm nay con đã đổi đủ ${q.doiSao.toiDaNgay} phút rồi.`}</Chu> : null}
            </The>
          ) : (
            <ONhap nhan="Nhắn Ba Mẹ (không bắt buộc)" value={nhan} onChangeText={setNhan} maxLength={100} placeholder="vd con làm nốt bài với bạn ạ" />
          )}
          {dang === "sao" && coXin ? <Nut chu="Hoặc xin Ba Mẹ thêm giờ ›" loai="ma" rong bam={() => setCach("xin")} /> : null}
          {dang === "xin" && coSao ? <Nut chu="Hoặc đổi sao lấy giờ ›" loai="ma" rong bam={() => setCach("sao")} /> : null}
        </>
      )}
    </ManTre>
  );
}
