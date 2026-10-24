// Thành viên gia đình (FR-01.04): Chủ gia đình mời Ba, Ông Bà với quyền Phê duyệt hoặc Chỉ xem; lời mời qua link / mã / QR, hết hạn sau
// 72 giờ, dùng một lần. Chủ đổi quyền, mời ra, huỷ lời mời. Thành viên khác chỉ xem danh sách.
import { useState } from "react";
import { Share, View } from "react-native";
import { bm } from "@/lib/api";
import { MaQr } from "@/lib/qr";
import {
  Avt, Bao, BangTruot, BaoLoi, BieuTron, Canh, ChoTai, ChonMot, Chu, Dong, gioPhut, M, MAU_CON, Man, Nhan, Nhom, NhomTieu, Nut, ONhap, The,
  useHoanTac, useLam, useTai,
} from "@/lib/ui";

type Vai = "chu" | "duyet" | "xem";
type TV = { id: string; ten: string; vai: Vai; dinh_danh: string; laToi: boolean };
type Moi = { id: string; vai: "duyet" | "xem"; tenGoi: string; het: string };
type DsTv = { ds: TV[]; loiMoi: Moi[]; toi: { id: string; vai: Vai }; hanGio: number };
type MoiMoi = { id: string; ma: string; lienKet: string; vai: "duyet" | "xem"; tenGoi: string; het: string };

const VAI: Record<Vai, string> = { chu: "Chủ gia đình", duyet: "Phê duyệt", xem: "Chỉ xem" };
const MO_TA = { duyet: "Duyệt nhiệm vụ, yêu cầu, đổi cấu hình như Ba Mẹ", xem: "Xem tình hình, nhận thông báo; không duyệt, không đổi gì" } as const;
const CHON_VAI = [{ gia: "duyet" as const, chu: "Phê duyệt" }, { gia: "xem" as const, chu: "Chỉ xem" }];

export default function ThanhVien() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<DsTv>("thanh-vien"));
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const { bao, noi } = useHoanTac();
  const [mo, setMo] = useState<null | "moi" | { tv: TV } | { moi: Moi }>(null);
  const [vai, setVai] = useState<"duyet" | "xem">("duyet");
  const [tenGoi, setTenGoi] = useState("");
  const [vuaTao, setVuaTao] = useState<MoiMoi | null>(null);
  const dong = () => { setMo(null); setLoi(null); };
  if (!d) return <Man lui={{ chu: "Gia đình" }} tieu="Thành viên"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const laChu = d.toi.vai === "chu";
  const taoMoi = () => lam(async () => {
    const r = await bm.goi<MoiMoi>("thanh-vien/moi", { vai, tenGoi: tenGoi.trim() });
    setVuaTao(r); setMo(null); setTenGoi(""); await tai();
  });
  const chiaSe = (r: MoiMoi) => Share.share({ message: `Mời ${r.tenGoi || "Ba/Mẹ"} vào gia đình trên AiiGrow (quyền ${VAI[r.vai]}). Mở link: ${r.lienKet} — hoặc nhập mã ${r.ma}. Mã hết hạn sau ${d.hanGio} giờ.` })
    .catch(() => {});
  return (
    <Man lui={{ chu: "Gia đình" }} tieu="Thành viên" noi={noi}
      day={laChu ? <Nut chu="Mời thành viên" ic="cong" rong bam={() => { setVuaTao(null); setMo("moi"); }} /> : undefined}>
      <Canh lv="canh-cac-con" thap tieu="Cả nhà cùng đồng hành" loi={laChu ? "Mời Ba, Ông Bà duyệt cùng hoặc chỉ xem tình hình. Mọi lần duyệt đều ghi rõ ai duyệt." : "Chủ gia đình mời và đổi quyền thành viên."} />
      {vuaTao ? (
        <The dem style={{ gap: 12, alignItems: "center" }}>
          <Chu kieu="rat" co={17}>{`Lời mời ${vuaTao.tenGoi ? `cho ${vuaTao.tenGoi} ` : ""}· ${VAI[vuaTao.vai]}`}</Chu>
          <MaQr noiDung={vuaTao.lienKet} co={180} />
          <Chu kieu="rat" co={26} so style={{ letterSpacing: 2 }}>{vuaTao.ma}</Chu>
          <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>{`Người được mời quét QR, mở link hoặc nhập mã ở màn «Có mã mời». Hết hạn ${gioPhut(vuaTao.het)}, dùng một lần.`}</Chu>
          <Nut chu="Gửi lời mời" ic="gui" rong bam={() => chiaSe(vuaTao)} />
        </The>
      ) : null}
      <NhomTieu chu={`Người lớn (${d.ds.length})`} />
      <Nhom>
        {d.ds.map((x, i) => (
          <Dong key={x.id} dau={i === 0} tieu={x.laToi ? `${x.ten} (Ba/Mẹ)` : x.ten} phu={x.vai === "chu" ? x.dinh_danh : MO_TA[x.vai]}
            trai={<Avt ten={x.ten} mau={MAU_CON[(i + 2) % MAU_CON.length]} />}
            phai={<Nhan chu={VAI[x.vai]} loai={x.vai === "chu" ? "ok" : x.vai === "duyet" ? "lam" : "xam"} />}
            bam={laChu && x.vai !== "chu" ? () => { setMo({ tv: x }); } : undefined} />
        ))}
      </Nhom>
      {d.loiMoi.length ? (
        <View style={{ gap: 12 }}>
          <NhomTieu chu="Lời mời đang chờ" />
          <Nhom>
            {d.loiMoi.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={x.tenGoi || "Lời mời chưa đặt tên"} phu={`${VAI[x.vai]} · hết hạn ${gioPhut(x.het)}`}
                trai={<BieuTron ic="gui" mau="vang" />} phai={laChu ? <Nhan chu="Huỷ" loai="xam" /> : undefined}
                bam={laChu ? () => setMo({ moi: x }) : undefined} />
            ))}
          </Nhom>
        </View>
      ) : null}
      {!laChu ? <Bao loai="lam" ic="khien" tieu={`Quyền của Ba/Mẹ: ${VAI[d.toi.vai]}`} loi={d.toi.vai === "xem" ? MO_TA.xem : MO_TA.duyet} /> : null}

      <BangTruot mo={mo === "moi"} dong={dong} tieu="Mời thành viên">
        <ONhap nhan="Gọi là gì trong nhà?" value={tenGoi} onChangeText={setTenGoi} placeholder="Ba Huy, Bà nội…" maxLength={30} />
        <Chu kieu="rat" co={14}>Quyền</Chu>
        <ChonMot ds={CHON_VAI} gia={vai} doi={setVai} />
        <Chu co={13} mau={M.chu3}>{MO_TA[vai]}. Lời mời hết hạn sau {d.hanGio} giờ.</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu="Tạo lời mời" rong dangChay={dangChay} bam={taoMoi} />
      </BangTruot>
      {mo && typeof mo === "object" && "tv" in mo ? (
        <BangTruot mo dong={dong} tieu={mo.tv.ten}>
          <Chu kieu="rat" co={14}>Quyền</Chu>
          <ChonMot ds={CHON_VAI} gia={mo.tv.vai === "xem" ? "xem" : "duyet"} doi={(v) => lam(async () => {
            await bm.goi(`thanh-vien/${mo.tv.id}/vai`, { vai: v }); dong(); bao(`${mo.tv.ten}: ${VAI[v]}`); await tai();
          })} />
          <Chu co={13} mau={M.chu3}>{MO_TA[mo.tv.vai === "xem" ? "xem" : "duyet"]}.</Chu>
          <BaoLoi loi={loiLam} />
          <Nut chu={`Mời ${mo.tv.ten} ra khỏi gia đình`} loai="huy" rong dangChay={dangChay} bam={() => lam(async () => {
            await bm.goi(`thanh-vien/${mo.tv.id}/moi-ra`, {}); dong(); bao(`${mo.tv.ten} không còn trong gia đình`); await tai();
          })} />
        </BangTruot>
      ) : null}
      {mo && typeof mo === "object" && "moi" in mo ? (
        <BangTruot mo dong={dong} tieu="Huỷ lời mời này?">
          <Chu mau={M.chu2}>{`Mã mời ${mo.moi.tenGoi ? `cho ${mo.moi.tenGoi} ` : ""}sẽ không dùng được nữa. Muốn mời lại thì tạo lời mời mới.`}</Chu>
          <BaoLoi loi={loiLam} />
          <Nut chu="Huỷ lời mời" loai="huy" rong dangChay={dangChay} bam={() => lam(async () => {
            await bm.goi(`thanh-vien/moi/${mo.moi.id}/huy`, {}); dong(); bao("Đã huỷ lời mời"); setVuaTao(null); await tai();
          })} />
        </BangTruot>
      ) : null}
    </Man>
  );
}
