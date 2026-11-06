// «Đổi sao lấy giờ chơi» bản «Dịu» (con-dt-gio 02 cdt-choi, con-dt-android 02–04, con-dt-ngay 15 — L2): «Con đang có 40 sao · 10 sao = 10 phút»,
// chip 10 / 20 / 30 sao, «Giờ chơi sau khi đổi 18 → 28 phút», đổi ngay không cần chờ Ba Mẹ (POST /api/kid/doi-sao {phut}) ⇒ «−10 sao · +10 phút
// chơi!». Chọn quá số sao đang có ⇒ «Chưa đủ sao · Cần 40 sao · con có 30». Giờ ngủ / Ba Mẹ khoá / giờ học ⇒ màn khoá (chỉ xin ngoại lệ).
// (Đường /tre/choi cũ = «Dùng điểm để chơi?» đã bỏ 05/11 — nay là màn đổi sao, agent-android vẫn mở đường này.)
import { useState } from "react";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { LoiApi } from "@/lib/api";
import { kid, lyDoKhoa, type QuyCon } from "@/lib/api-tre";
import { chipDoiSao } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { Icon3D, laMatMang, useLam } from "@/lib/ui";
import { ChoD, ChonD, ChuD, LoiD, ManD, NutD, SaoD, TheD, TieuD, VongD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

export default function DoiSao() {
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("quy", () => kid.goi<QuyCon>("quy"));
  const [chon, setChon] = useState(10);
  const [xong, setXong] = useState<{ phut: number; sao: number; truoc: number; con: number; tru: number } | null>(null);
  const [thieu, setThieu] = useState(false);
  const { dangChay, loi: loiLam, lam } = useLam();
  if (!d) return <ManD lui={true} tieu="Đổi sao lấy giờ chơi"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const q = d.quy;
  const ly = lyDoKhoa(q);
  if (ly) return <Redirect href={`/tre/gio-ngu?ly=${ly}`} />;
  const tl = `${q.tyLe.sao} sao = ${q.tyLe.phut} phút`;

  if (xong) {
    return (
      <ManD giua day={<><NutD chu="Chơi ngay" ic="game" bam={() => router.replace("/tre/nha")} /><NutD chu="Về Hôm nay" loai="chu" bam={() => router.replace("/tre/nha")} /></>}>
        <View style={{ alignItems: "center", gap: 6 }}>
          <SaoD chu={`−${xong.tru} sao · còn ${xong.sao}`} />
          <TieuD chu={`+${xong.phut} phút chơi!`} giua />
          <VongD ti={q.tongPhut + xong.phut ? xong.con / (q.tongPhut + xong.phut) : 1} so={String(xong.con)} don="phút" co={160} day={14} />
          <ChuD kieu="rat" co={15} mau={D.chu2} giua>{`Giờ chơi còn lại ${xong.truoc} → ${xong.con} phút`}</ChuD>
          <ChuD co={14} mau={D.xanhD} giua>Đổi xong ngay, không cần chờ Ba Mẹ.</ChuD>
        </View>
      </ManD>
    );
  }
  if (!q.doiSao.bat) {
    return (
      <ManD lui={true} tieu="Đổi sao lấy giờ chơi" day={<NutD chu="Xin Ba Mẹ thêm giờ" bam={() => router.replace("/tre/them-gio")} />}>
        <ChuD co={15} mau={D.chu2}>Ba Mẹ đang tắt đổi sao lấy giờ. Con xin Ba Mẹ thêm giờ nhé.</ChuD>
      </ManD>
    );
  }
  const chips = chipDoiSao(d.sao, q.tyLe, q.doiSao.conDoiDuoc);
  const c = chips.find((x) => x.sao === chon) ?? chips[0];
  const duSao = Math.floor(d.sao / Math.max(1, q.tyLe.sao)) * q.tyLe.sao;      // số sao lớn nhất đổi được tròn bội tỷ lệ
  if (thieu) {
    const duPhut = Math.floor((duSao * q.tyLe.phut) / Math.max(1, q.tyLe.sao));
    return (
      <ManD lui={() => setThieu(false)} phai={<SaoD chu={`${d.sao} sao`} />} giua day={<>
        <NutD chu="Làm nhiệm vụ kiếm sao" ic="sao" bam={() => router.replace("/tre/nhiem-vu")} />
        {duSao > 0 ? <NutD chu={`Đổi ${duSao} sao`} loai="phu" bam={() => { setChon(duSao); setThieu(false); }} /> : null}
        <NutD chu="Xin Ba Mẹ" loai="chu" bam={() => router.replace("/tre/them-gio")} />
      </>}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Icon3D ten="sao" co={90} />
          <TieuD chu="Chưa đủ sao" giua />
          <ChuD kieu="rat" co={16} mau={D.chu2} giua>{`Cần ${c.sao} sao · con có ${d.sao}`}</ChuD>
          <ChuD co={14.5} mau={D.chu2} giua>{`Thiếu ${c.sao - d.sao} sao — làm thêm nhiệm vụ nhé.${duPhut ? ` Hoặc đổi ${duSao} sao lấy ${duPhut} phút.` : ""}`}</ChuD>
        </View>
      </ManD>
    );
  }
  const doi = () => {
    if (c.thieu) { setThieu(true); return; }
    lam(async () => {
      try {
        const r = await kid.goi<{ phut?: number; sao?: number; soDu?: number; conPhut?: number }>("doi-sao", { phut: c.phut });
        const phut = r.phut ?? c.phut;
        setXong({ phut, sao: r.soDu ?? d.sao - c.sao, truoc: q.conPhut, con: r.conPhut ?? q.conPhut + phut, tru: r.sao ?? c.sao });
      } catch (e) {
        if (e instanceof LoiApi && e.ma === "khong_them_gio") { await tai(); return; }
        if (laMatMang(e)) throw new LoiApi("mat_mang", `Mất mạng — chưa đổi được, sao của ${ten} không bị trừ.`, 0);
        throw e;
      }
    });
  };
  return (
    <ManD lui={true} tieu="Đổi sao lấy giờ chơi" day={<><LoiD loi={loiLam} />
      <NutD chu={`Đổi ${c.sao} sao lấy ${c.phut} phút`} bam={doi} dangChay={dangChay} tat={c.quaHan && !c.thieu} />
      <NutD chu="Đổi quà" loai="chu" bam={() => router.push("/tre/cua-hang")} />
    </>}>
      <TheD vang>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="sao" co={56} />
          <View style={{ flex: 1 }}>
            <ChuD kieu="rat" co={13.5} mau={D.saoInk}>Con đang có</ChuD>
            <ChuD kieu="den" co={32} mau={D.saoInk} so>{`${d.sao} sao`}</ChuD>
          </View>
          <ChuD kieu="rat" co={13} mau={D.saoInk}>{tl}</ChuD>
        </View>
      </TheD>
      <ChuD kieu="den" co={15}>Con muốn đổi</ChuD>
      <ChonD nhan="Con muốn đổi bao nhiêu sao" ds={chips.map((x) => ({ gia: x.sao, chu: `${x.sao} sao` }))} gia={c.sao} doi={setChon} />
      <TheD>
        <ChuD kieu="rat" co={14} mau={D.chu2}>Giờ chơi sau khi đổi</ChuD>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <ChuD kieu="den" co={28} mau={D.chu3} so>{String(q.conPhut)}</ChuD>
          <ChuD kieu="den" co={22} mau={D.chu3}>→</ChuD>
          <ChuD kieu="den" co={34} mau={D.xanhD} so>{String(q.conPhut + c.phut)}</ChuD>
          <ChuD kieu="rat" co={15} mau={D.chu2}>phút</ChuD>
        </View>
        <ChuD kieu="rat" co={13.5} mau={c.thieu ? D.loi : D.xanhD}>
          {c.thieu ? `Chưa đủ sao · còn thiếu ${c.sao - d.sao} sao` : c.quaHan ? `Hôm nay con còn đổi được ${q.doiSao.conDoiDuoc} phút thôi`
            : `Còn ${d.sao - c.sao} sao · không cần chờ Ba Mẹ`}
        </ChuD>
      </TheD>
      {q.choXinThem ? <NutD chu="Xin Ba Mẹ thêm giờ ›" loai="chu" bam={() => router.push("/tre/them-gio")} /> : null}
    </ManD>
  );
}
