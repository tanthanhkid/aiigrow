// them-79kgpij8 «Sửa quà» / «Tự đặt quà riêng» (thiết kế chốt 06/11, L14) + bảng «Xoá quà X?» (them-t49meex8): tên, hình (4–8 ô), giá −/+ 10 sao
// («Bảo Anh làm đủ việc được khoảng 60 sao/ngày → 2 ngày đổi được»), điều kiện bật/tắt (chỉ đổi cuối tuần · tối đa mỗi tháng N lần · số lượng có sẵn ·
// Ba Mẹ xác nhận khi trao), «Áp cho» từng Con, «Lưu quà X», «Xoá quà này». Tạo = POST qua {loai: qua, …}; sửa = POST qua/:id; xoá = POST qua/:id/xoa
// (phiếu đang giữ sao ⇒ hoàn sao cho con). docs/API.md «S3».
import { useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { type NhiemVuMoi } from "@/lib/hang-ngay";
import { buocGia, cauNgayDoi, HINH_CHON, icQua, saoMoiNgay, thanSuaQua, type QuaS3 } from "@/lib/s3";
import { BangTruot, BaoLoi, baoKhiVe, ChoTai, Chips, Chu, CongTac, Icon3D, M, Man, NhanMen, Nut, ONhap, The, useLam, useTai, type TenIcon } from "@/lib/ui";

const SO_LAN = [1, 2, 4, 8];

/** Một dòng điều kiện: tên + dòng phụ, công tắc bên phải; `duoi` = chọn số khi bật. */
function DongDk({ tieu, phu, bat, doi, dau, duoi }: { tieu: string; phu: string; bat: boolean; doi: (v: boolean) => void; dau?: boolean; duoi?: ReactNode }) {
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: dau ? 0 : 1, borderTopColor: "#efefec", gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}><Chu kieu="rat" co={15}>{tieu}</Chu><Chu co={13} mau={M.chu3}>{phu}</Chu></View>
        <CongTac bat={bat} doi={doi} nhan={tieu} />
      </View>
      {bat && duoi ? duoi : null}
    </View>
  );
}

/** Nút tròn −/+ 10 sao. */
const NutGia = ({ hg, s, doi }: { hg: 1 | -1; s: number; doi: (n: number) => void }) => (
  <Pressable onPress={() => doi(buocGia(s, hg))} accessibilityRole="button" accessibilityLabel={hg < 0 ? "Bớt 10 sao" : "Thêm 10 sao"} hitSlop={4}
    style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.nho }}>
    <Chu kieu="rat" co={24} mau={M.chinhInk}>{hg < 0 ? "−" : "+"}</Chu>
  </Pressable>
);

export default function SuaQua() {
  const { id, con: conSan } = useLocalSearchParams<{ id?: string; con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [qua, g, nv] = await Promise.all([bm.goi<{ ds: QuaS3[] }>("qua"), bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu").catch(() => null)]);
    return { q: id ? qua.ds.find((x) => x.id === id) ?? null : null, con: g.con, nv: nv?.ds ?? [] };
  });
  const [ten, setTen] = useState<string | null>(null);
  const [hinh, setHinh] = useState<string | null | undefined>(undefined);
  const [sao, setSao] = useState<number | null>(null);
  const [cuoiTuan, setCuoiTuan] = useState<boolean | null>(null);
  const [toiDa, setToiDa] = useState<number | null | undefined>(undefined);
  const [tonKho, setTonKho] = useState<number | null | undefined>(undefined);
  const [xacNhan, setXacNhan] = useState<boolean | null>(null);
  const [apCho, setApCho] = useState<string[] | null>(null);
  const [xoa, setXoa] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = id ? "Sửa quà" : "Tự đặt quà riêng";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const q = d.q;
  if (id && !q) {
    return (
      <Man lui={{ chu: "" }} tieu={tieu}>
        <Chu co={14.5} mau={M.chu2}>Quà này không còn — có thể đã bị xoá trên máy khác.</Chu>
        <Nut chu="Về danh sách quà" loai="vien" rong bam={() => router.back()} />
      </Man>
    );
  }
  const moiCon = d.con.map((c) => c.id);
  const t = ten ?? q?.ten ?? "";
  // quà cũ chưa có hình (cột mới) ⇒ giữ null, icon vẫn đoán theo tên; chỉ gửi hình khi Ba Mẹ chọn. Quà mới mặc định «kem».
  const h = hinh === undefined ? (q ? q.hinh : "kem") : hinh;
  const s = sao ?? q?.sao ?? 100;
  const ct = cuoiTuan ?? q?.chiCuoiTuan ?? false;
  const td = toiDa === undefined ? q?.toiDaThang ?? null : toiDa;
  const tk = tonKho === undefined ? q?.tonKho ?? null : tonKho;
  const xn = xacNhan ?? q?.canXacNhan ?? false;
  const ap = apCho ?? (q?.apCho ?? (conSan && !q ? [conSan] : moiCon));
  // «Bảo Anh làm đủ việc được khoảng 60 sao/ngày → 2 ngày đổi được» — theo Con đang xem (hoặc Con đầu tiên được áp)
  const conXem = d.con.find((c) => c.id === conSan) ?? d.con.find((c) => ap.includes(c.id)) ?? d.con[0];
  const ghi = conXem ? cauNgayDoi(conXem.ten, s, saoMoiNgay(d.nv, conXem.id)) : null;
  const ok = t.trim().length > 0 && ap.length > 0;
  const hinhDs = [...new Set([...(h ? [h] : []), ...HINH_CHON])];
  const icHienTai = icQua({ hinh: h, loai: q?.loai ?? "qua", ten: t });
  const luu = () => lam(async () => {
    const than = thanSuaQua({ ten: t, sao: s, hinh: h, chiCuoiTuan: ct, toiDa: td, tonKho: tk, canXacNhan: xn, apCho: ap, moiCon }, !q);
    if (q) await bm.goi(`qua/${q.id}`, than);
    else await bm.goi("qua", than);
    baoKhiVe(q ? `Đã lưu quà «${t.trim()}»` : `Đã thêm quà «${t.trim()}» · ${s} sao`);
    router.back();
  });
  const xoaQua = () => lam(async () => {
    if (!q) return;
    const r = await bm.goi<{ hoanPhieu?: number; hoanSao?: number }>(`qua/${q.id}/xoa`, {});
    setXoa(false);
    baoKhiVe(r.hoanSao ? `Đã xoá quà «${q.ten}» · hoàn ${r.hoanSao} sao cho con` : `Đã xoá quà «${q.ten}»`);
    router.back();
  });
  return (
    <Man lui={{ chu: "" }} tieu={tieu}
      day={<><BaoLoi loi={xoa ? null : loiLam} />
        <Nut chu={`Lưu quà ${t.trim() || ""}`.trim()} rong dangChay={dangChay} tat={!ok} bam={luu} />
        {q ? <Nut chu="Xoá quà này" loai="huy" rong bam={() => setXoa(true)} /> : null}</>}>
      <ONhap nhan="Tên quà" value={t} onChangeText={setTen} placeholder="Đi ăn kem" maxLength={60} />

      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Hình quà</Chu>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }} accessibilityRole="radiogroup">
          {hinhDs.map((x) => {
            const on = h ? x === h : icQua({ hinh: x, loai: "qua" }) === icHienTai;
            return (
              <NhanMen key={x} onPress={() => setHinh(x)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Hình ${x}`} muc="chip" sang={!on}
                style={[{ width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: on ? "#eef5f2" : M.the },
                  on ? { boxShadow: `0px 0px 0px 2.5px ${M.chinh}` } : KHOI.nho]}>
                <Icon3D ten={icQua({ hinh: x, loai: "qua" }) as TenIcon} co={34} />
              </NhanMen>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Giá</Chu>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <NutGia hg={-1} s={s} doi={setSao} />
          <View style={{ flex: 1, minHeight: 56, borderRadius: 20, backgroundColor: M.diemSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: BONG.lom }}>
            <Icon3D ten="sao" co={24} /><Chu kieu="rat" co={20} mau={M.diemInk} so>{`${s.toLocaleString("vi-VN").replace(/,/g, ".")} sao`}</Chu>
          </View>
          <NutGia hg={1} s={s} doi={setSao} />
        </View>
        {ghi ? <Chu co={13} mau={M.chu3} style={{ paddingHorizontal: 4 }}>{ghi}</Chu> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Điều kiện</Chu>
        <The sat>
          <DongDk dau tieu="Chỉ đổi cuối tuần" phu="Thứ 7 và Chủ nhật" bat={ct} doi={setCuoiTuan} />
          <DongDk tieu="Tối đa mỗi tháng" phu={td ? `${td} lần · bấm số để đổi` : "Con đổi bao nhiêu lần cũng được"} bat={!!td} doi={(v) => setToiDa(v ? td ?? 4 : null)}
            duoi={<Chips ds={[...new Set([...SO_LAN, td ?? 4])].sort((a, b) => a - b).map((n) => ({ gia: n, chu: `${n} lần` }))} chon={[td ?? 4]} doi={(n) => setToiDa(n)} />} />
          <DongDk tieu="Số lượng có sẵn" phu={tk !== null ? `Còn ${tk} · hết thì con không đổi được` : "Hết thì con không đổi được"} bat={tk !== null} doi={(v) => setTonKho(v ? tk ?? 1 : null)}
            duoi={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Nut chu="−" nho loai="vien" tat={(tk ?? 0) <= 0} bam={() => setTonKho(Math.max(0, (tk ?? 1) - 1))} nhanDoc="Bớt 1" />
                <Chu kieu="rat" co={18} so style={{ minWidth: 40, textAlign: "center" }}>{String(tk ?? 0)}</Chu>
                <Nut chu="+" nho loai="vien" bam={() => setTonKho(Math.min(999, (tk ?? 0) + 1))} nhanDoc="Thêm 1" />
              </View>
            } />
          <DongDk tieu="Ba Mẹ xác nhận khi trao" phu="Trao xong mới trừ sao" bat={xn} doi={setXacNhan} />
        </The>
      </View>

      {!d.con.length ? <Chu kieu="dam" co={13.5} mau={M.loi}>Thêm hồ sơ con trước (Cả nhà › Thêm con), rồi đặt quà cho con.</Chu> : null}
      {d.con.length ? (
        <View style={{ gap: 8 }}>
          <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Áp cho</Chu>
          <Chips ds={d.con.map((c) => ({ gia: c.id, chu: c.ten }))} chon={ap}
            doi={(cid) => setApCho(ap.includes(cid) ? ap.filter((x) => x !== cid) : [...ap, cid])} />
          {!ap.length ? <Chu kieu="dam" co={13} mau={M.loi}>Chọn ít nhất một con.</Chu> : null}
        </View>
      ) : null}

      <BangTruot mo={xoa} dong={() => setXoa(false)} tieu={`Xoá quà ${q?.ten ?? ""}?`}>
        <Chu co={14.5} mau={M.chu2}>Con sẽ không thấy quà này trên máy nữa. Sao con đã có không bị mất.</Chu>
        {q?.dangGiu ? <Chu co={14} mau={M.chu2}>{`${q.dangGiu} phiếu đang chờ trao sẽ được huỷ và hoàn sao cho con.`}</Chu> : null}
        <BaoLoi loi={loiLam} />
        <Nut chu={`Xoá quà ${q?.ten ?? ""}`} loai="huy" rong dangChay={dangChay} bam={xoaQua} />
        <Nut chu="Giữ lại quà" loai="ma" rong bam={() => setXoa(false)} />
      </BangTruot>
    </Man>
  );
}
