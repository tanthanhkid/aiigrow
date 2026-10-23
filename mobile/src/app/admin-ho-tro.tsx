// bm-admin-ho-tro: hộp thư hỗ trợ cho quản trị AiiLab (Ba Mẹ có cờ admin, server kiểm lại ở /api/m/admin/ho-tro). Danh sách gia đình → chat → trả lời.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { Avt, BaoLoi, CanhGiua, ChoTai, Chu, Dong, gioPhut, M, Man, Nhan, Nhom, Nut, OChat, useLam, useTai } from "@/lib/ui";

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
                trai={<Avt ten={x.ten} mau="#0b7a6e" />} phai={x.chua_tra_loi ? <Nhan loai="canh" chu="Chờ trả lời" /> : <Nhan loai="xam" chu="Đã trả lời" />} bam={() => chon(x)} />
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
  const gui = () => lam(async () => { await bm.goi(`admin/ho-tro/${fam.family_id}`, { noiDung: nd }); setNd(""); await tai(); });
  return (
    <Man tieu={fam.ten} cuonCuoi phai={<Nut chu="Hộp thư" loai="ma" nho bam={ve} />} day={
      <>
        <BaoLoi loi={loiLam} />
        <OChat gia={nd} doi={setNd} gui={gui} dangChay={dangChay} nhan={`Trả lời ${fam.ten}`} />
      </>
    }>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : d.tin.map((t) => t.tu === "ba_me" ? (
        <View key={t.id} style={{ alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: M.vien, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, borderBottomLeftRadius: 6, maxWidth: "78%" }}>
          <Chu>{t.noi_dung}</Chu><Chu co={12} mau={M.chu3}>{gioPhut(t.created_at)}</Chu>
        </View>
      ) : (
        <View key={t.id} style={{ alignSelf: "flex-end", backgroundColor: M.chinh, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, borderBottomRightRadius: 6, maxWidth: "78%" }}>
          <Chu mau="#fff">{t.noi_dung}</Chu><Chu co={12} mau="#ffffff">{gioPhut(t.created_at)}</Chu>
        </View>
      ))}
    </Man>
  );
}
