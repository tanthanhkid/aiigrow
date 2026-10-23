// bm-duyet-xong: vừa duyệt — số dư mới, còn chờ, và toast «Hoàn tác» (rút lại trong vài giây, Con không bị báo tiêu cực).
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm, type LuotCho, type YeuCau, tieuYc } from "@/lib/api";
import { BieuTron, Canh, Dong, gioPhut, Man, Nhan, Nhom, NhomTieu, Nut, useHoanTac, useTai } from "@/lib/ui";

export default function DuyetXong() {
  const p = useLocalSearchParams<{ luot: string; con: string; ten: string; diem: string; nv: string; khen?: string }>();
  const { d } = useTai(async () => ({
    vi: await bm.goi<{ soDu: number }>(`con/${p.con}/vi`), cho: await bm.goi<{ nhiemVu: LuotCho[]; yeuCau: YeuCau[]; phieu?: unknown[] }>("cho-duyet"),
  }));
  const { bao, noi } = useHoanTac();
  useEffect(() => {
    bao(`Đã cộng ${p.diem} điểm cho ${p.ten}`, async () => {
      try { await bm.goi(`luot/${p.luot}/hoan-tac`, {}); router.replace(`/duyet/${p.luot}`); } catch { /* quá hạn hoàn tác: giữ nguyên */ }
    });
  }, [bao, p.diem, p.ten, p.luot]);
  const soDu = d?.vi.soDu;
  return (
    <Man noi={noi} day={<Nut chu="Về hộp chờ duyệt" rong bam={() => router.replace("/cho-duyet")} />}>
      <Canh lv="xong" tieu={`+${p.diem} điểm cho ${p.ten}!`} loi={p.khen ? `${p.ten} vừa thấy lời khen “${p.khen}”.` : `${p.ten} vừa thấy hiệu ứng ăn mừng.`} />
      <Nhom>
        <Dong dau tieu={`Ví của ${p.ten}`} phu={soDu !== undefined ? `${soDu - Number(p.diem)} → ${soDu} điểm` : "Đang tải…"} trai={<BieuTron ic="xu" mau="vang" />}
          phai={soDu !== undefined ? <Nhan loai="diem" chu={String(soDu)} /> : undefined} bam={() => router.push(`/vi/${p.con}`)} />
        <Dong tieu="Nhật ký" phu={`${p.nv} – +${p.diem} điểm – duyệt ${gioPhut(new Date())}`} trai={<BieuTron ic="lich" />} />
      </Nhom>
      {d && d.cho.nhiemVu.length + d.cho.yeuCau.length + (d.cho.phieu?.length ?? 0) ? (
        <>
          <NhomTieu chu="Còn chờ" />
          <Nhom>
            {d.cho.nhiemVu.slice(0, 3).map((x, i) => <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={`${x.ten_con} · ${gioPhut(x.nop_luc)}`}
              trai={<BieuTron ic="sao" />} phai={<Nhan loai="diem" chu={`+${x.diem}`} />} bam={() => router.replace(`/duyet/${x.id}`)} />)}
            {d.cho.yeuCau.slice(0, 2).map((y) => <Dong key={y.id} tieu={tieuYc(y)} phu={`${y.ten_con} · ${gioPhut(y.created_at)}`}
              trai={<BieuTron ic="tin" mau="cam" />} phai={<Nhan loai="canh" chu="Yêu cầu" />} bam={() => router.replace(`/yeu-cau/${y.id}`)} />)}
          </Nhom>
        </>
      ) : null}
    </Man>
  );
}
