// bm-admin-ho-tro: hộp thư hỗ trợ cho quản trị AiiLab (Ba Mẹ có cờ admin, server kiểm lại ở /api/m/admin/ho-tro). Danh sách gia đình → chat → trả lời.
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { bm } from "@/lib/api";
import { Avt, BaoLoi, BongChat, CanhGiua, ChoTai, Chu, Dong, gioPhut, M, Man, Nhan, Nhom, OChat, useLam, useTai } from "@/lib/ui";

type Dong1 = { family_id: string; ten: string; tu: string; noi_dung: string; created_at: string; chua_tra_loi: boolean };
type Tin = { id: string; tu: "ba_me" | "aiilab"; noi_dung: string; created_at: string };

export default function AdminHoTro() {
  const [fam, setFam] = useState<Dong1 | null>(null);
  return fam ? <Chat fam={fam} ve={() => setFam(null)} /> : <DanhSach chon={setFam} />;
}

function DanhSach({ chon }: { chon: (f: Dong1) => void }) {
  const { d, loi, matMang, tai, dangTai } = useTai(() => bm.goi<{ ds: Dong1[] }>("admin/ho-tro"));
  useEffect(() => { const t = setInterval(tai, 15_000); return () => clearInterval(t); }, [tai]);
  const cho = d?.ds.filter((x) => x.chua_tra_loi).length ?? 0;
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="Hộp thư hỗ trợ" tai={tai} dangTai={dangTai}>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : !d.ds.length ? (
        <CanhGiua lv="canh-trong" tieu="Chưa có tin nào" loi="Khi gia đình nhắn AiiLab, tin hiện ở đây." />
      ) : (
        <>
          <Chu co={13} mau={M.chu3}>{cho ? `${cho} gia đình đang chờ trả lời` : "Đã trả lời hết"}</Chu>
          <Nhom>
            {d.ds.map((x, i) => (
              <Dong key={x.family_id} dau={i === 0} tieu={x.ten} phu={`${x.tu === "aiilab" ? "AiiLab: " : ""}${x.noi_dung} · ${gioPhut(x.created_at)}`}
                trai={<Avt ten={x.ten} mau="#0f6b5c" />} phai={x.chua_tra_loi ? <Nhan loai="canh" chu="Chờ trả lời" /> : <Nhan loai="xam" chu="Đã trả lời" />} bam={() => chon(x)} />
            ))}
          </Nhom>
        </>
      )}
    </Man>
  );
}

function Chat({ fam, ve }: { fam: Dong1; ve: () => void }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ ten: string; tin: Tin[] }>(`admin/ho-tro/${fam.family_id}`));
  const [nd, setNd] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  useEffect(() => { const t = setInterval(tai, 10_000); return () => clearInterval(t); }, [tai]);
  useEffect(() => { const h = BackHandler.addEventListener("hardwareBackPress", () => { ve(); return true; }); return () => h.remove(); }, [ve]);   // Back Android ⇒ về danh sách
  const gui = () => lam(async () => { await bm.goi(`admin/ho-tro/${fam.family_id}`, { noiDung: nd }); setNd(""); await tai(); });
  return (
    <Man lui={{ chu: "Hộp thư", bam: ve }} tieu={fam.ten} cuonCuoi day={
      <>
        <BaoLoi loi={loiLam} />
        <OChat gia={nd} doi={setNd} gui={gui} dangChay={dangChay} nhan={`Trả lời ${fam.ten}`} />
      </>
    }>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : d.tin.map((t) => <BongChat key={t.id} toi={t.tu !== "ba_me"} noiDung={t.noi_dung} luc={gioPhut(t.created_at)} style={t.tu === "ba_me" ? { alignSelf: "flex-start" } : undefined} />)}
    </Man>
  );
}
