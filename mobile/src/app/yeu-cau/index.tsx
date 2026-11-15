// «<Con> đang xin phép» (thiết kế chốt 15/11 — bm-con-xin/01 them-a4nqjrmp): mọi lời xin đang chờ của một Con, mỗi lời xin một thẻ (lib/hom-nay-xin).
// App / web chưa có trong danh sách: «YouTube chưa có trong danh sách» · Thêm · Tính phút (trừ sao, 1 sao = 1 phút) / Thêm · Không tính phút / Bỏ qua.
// Xin vay sao: «Xin Ba Mẹ cho vay 20 sao · Laptop · hết sao, muốn chơi tiếp», viên «−20 sao · Đang nợ Ba Mẹ 20 sao», Không cho / Cho vay 20 sao.
// «Đã trả lời hôm nay»: lời xin app / web Ba Mẹ đã bỏ qua hôm nay (GET con/:id/hom-nay › biChan «chua_cho»).
// Cuối màn: chế độ của con («Theo danh sách — Chỉ mở app, web Ba Mẹ đã thêm · Đổi ›» → App & web) + «Được mở N app».
// Mở từ Hôm nay / Báo cáo / Thông báo (?con=).
import { cheDoTu } from "@/lib/app-web";
import { router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { HangViec, soAppDuocMo, TieuMuc, type ChoDuyetMoi, type ConCt, type LuatDem, type QuyCon } from "@/lib/hang-ngay";
import { laAppWeb, tenMayXin, TheXin } from "@/lib/hom-nay-xin";
import { saoTu } from "@/lib/so-sao";
import { BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, M, Man, Nhan, Nut, The, useLam, useTai } from "@/lib/ui";
import type { HomNayDung } from "../da-dung/[con]";


export default function DangXin() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const cd = await bm.goi<ChoDuyetMoi>("cho-duyet");
    const id = con ?? cd.yeuCau[0]?.child_id;
    const [ct, qy, hn, luat] = id ? await Promise.all([bm.goi<ConCt>(`con/${id}`), bm.goi<QuyCon>(`con/${id}/quy`).catch(() => null),
      bm.goi<HomNayDung>(`con/${id}/hom-nay`).catch(() => null), bm.goi<{ ds: LuatDem[] }>("luat").catch(() => null)]) : [null, null, null, null];
    const soApp = id && luat ? soAppDuocMo(luat.ds, id) : null;
    return { id, ds: cd.yeuCau.filter((y) => !id || y.child_id === id), ct, qy, daTraLoi: (hn?.biChan ?? []).filter((x) => x.ly === "chua_cho"), soApp };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = <Nut chu="Xong, về Hôm nay" rong loai="vien" bam={() => router.replace("/hom-nay" as never)} />;
  if (!d) return <Man lui={{ chu: "Hôm nay" }} tieu="Con đang xin"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = d.ct?.ten ?? "Con";
  const sao = saoTu(d.qy?.soSao ?? (d.ct ? { soDu: d.ct.soDu, ...(typeof d.ct.sao === "number" ? { sao: d.ct.sao } : {}) } : null));
  const moHet = cheDoTu(d.ct) === "mo_het";
  return (
    <Man lui={{ chu: "Hôm nay" }} tieuLon={d.ds.length ? `${ten} đang xin phép` : `${ten} không xin gì`} tai={tai} vongTai day={ve}>
      {!d.ds.length ? <CanhGiua lv="canh-trong" tieu="Không có lời xin nào" loi={`Khi ${ten} xin vay sao hay xin thêm app, web vào danh sách, Grow báo Ba Mẹ ngay.`} /> : null}
      <BaoLoi loi={loiLam} />
      {d.ds.map((y) => (
        <The key={y.id}>
          <TheXin y={y} may={tenMayXin(y, d.ct?.may)} lam={(fn) => lam(fn)} dang={dangChay} sao={sao}
            truc={laAppWeb(y)} phu={laAppWeb(y) ? `${y.gia_tri} chưa có trong danh sách` : undefined} />
        </The>
      ))}

      {d.daTraLoi.length ? (
        <>
          <TieuMuc chu="Đã trả lời hôm nay" />
          <The style={{ paddingVertical: 4 }}>
            {d.daTraLoi.map((x, k) => (
              <HangViec key={`${x.ten}:${k}`} dau={k === 0} ic="khoa" mau="xam" tieu={x.ten}
                phu={`${gioPhut(x.luc)}${x.may ? ` · ${x.may.replace(/ của .*$/, "")}` : ""} · xin lại được`} phai={<Nhan chu="Đã bỏ qua" loai="xam" />} />
            ))}
          </The>
        </>
      ) : null}

      {d.ct && d.id ? (
        <The style={{ paddingVertical: 4 }}>
          <HangViec dau ic={moHet ? "mo_khoa" : "khien"} mau="lam" tieu={moHet ? "Mở hết" : "Theo danh sách"}
            phu={moHet ? "Không chặn, không tính phút" : "Chỉ mở app, web Ba Mẹ đã thêm"} phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Đổi ›</Chu>}
            bam={() => router.push(`/app-web?con=${d.id}` as never)} />
          {!moHet && d.soApp !== null ? <HangViec ic="luoi" mau="xanh" tieu={`Được mở ${d.soApp} app`} bam={() => router.push(`/app-web?con=${d.id}` as never)} /> : null}
        </The>
      ) : null}
    </Man>
  );
}
