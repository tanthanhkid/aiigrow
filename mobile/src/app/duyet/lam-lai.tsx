// «Nhờ con làm lại» — màn dự phòng khi mở thẳng bằng đường dẫn (bình thường là bảng trượt trên màn bằng chứng, app/duyet/[id].tsx — bàn 17/11
// them-nxclxlit@v3 / them-l0saosnz@v3). `?id=` = lượt nộp; `?gui=<lời nhắn>&luc=<ISO>` ⇒ kết quả «Đã nhắn <Con> làm lại» (them-4u3doee9@v3).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { type BangChung } from "@/lib/hang-ngay";
import { FormLamLai, KetQuaLamLai, type LuotLamLai } from "@/lib/lam-lai";
import { ChoTai, Man, useTai } from "@/lib/ui";

export default function NhoLamLai() {
  const { id, gui, luc } = useLocalSearchParams<{ id: string; gui?: string; luc?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [l, bc] = await Promise.all([bm.goi<LuotLamLai>(`luot/${id}`), bm.goi<{ ds: Pick<BangChung, "loai">[] }>(`luot/${id}/bang-chung`).catch(() => ({ ds: [], loi: true as const }))]);
    const vi = await bm.goi<{ soDu: number; sao?: number }>(`con/${l.child_id}/vi`).catch(() => null);
    return { l, ghiAm: bc.ds.some((b) => b.loai === "ghi_am") && !bc.ds.some((b) => b.loai === "anh"), viet: !("loi" in bc) && !bc.ds.length && !!l.ghi_chu, sao: vi ? (vi.sao ?? vi.soDu) : null };
  });
  const [daGui, setDaGui] = useState<{ nhan: string; luc: Date } | null>(gui !== undefined ? { nhan: gui, luc: luc ? new Date(luc) : new Date() } : null);
  if (!d) return <Man lui={{ chu: "Bằng chứng" }} tieu="Nhờ làm lại"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const l = d.l;
  if (daGui) return <KetQuaLamLai tenCon={l.ten_con} con={l.child_id} ghiAm={d.ghiAm} viet={d.viet} nhan={daGui.nhan} luc={daGui.luc} sao={d.sao} />;
  return (
    <Man lui={{ chu: "Bằng chứng" }} tieu={l.ten}>
      <FormLamLai l={l} ghiAm={d.ghiAm} viet={d.viet} daGui={(nhan) => setDaGui({ nhan, luc: new Date() })} huy={() => router.back()} />
    </Man>
  );
}
