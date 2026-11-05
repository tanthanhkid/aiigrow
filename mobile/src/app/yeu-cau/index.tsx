// «<Con> đang xin N» (thiết kế chốt 05/11 — bm-hang-ngay 19 «Con xin dùng (chờ duyệt)»): mọi lời xin đang chờ của một Con, mỗi lời xin một thẻ
// «Không cho / Cho N phút» (lib/hom-nay-xin). Câu «Con có S sao, tự đổi được P phút nếu Ba Mẹ không cho» từ quỹ hôm nay (con/:id/quy).
// Mở từ Hôm nay «Tất cả ›» (?con=). «Đã trả lời hôm nay»: chưa có API danh sách lời xin đã xử lý cho Ba Mẹ ⇒ chưa hiện (ghi lệch trong PR).
import { router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { type ChoDuyetMoi, type ConCt, type QuyCon } from "@/lib/hang-ngay";
import { laAppWeb, laThemGio, tenMayXin, TheXin } from "@/lib/hom-nay-xin";
import { BaoLoi, CanhGiua, ChoTai, Chu, Dong, M, Man, Nhom, Nut, The, useLam, useTai } from "@/lib/ui";

export default function DangXin() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const cd = await bm.goi<ChoDuyetMoi>("cho-duyet");
    const id = con ?? cd.yeuCau[0]?.child_id;
    const [ct, qy] = id ? await Promise.all([bm.goi<ConCt>(`con/${id}`), bm.goi<QuyCon>(`con/${id}/quy`).catch(() => null)]) : [null, null];
    return { ds: cd.yeuCau.filter((y) => !id || y.child_id === id), ct, qy };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = <Nut chu="Xong, về Hôm nay" rong loai="vien" bam={() => router.replace("/hom-nay" as never)} />;
  if (!d) return <Man lui={{ chu: "Hôm nay" }} tieu="Con đang xin"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = d.ct?.ten ?? "Con";
  const q = d.qy;
  const phutDoi = q && q.quy.doiSao.bat ? Math.min(Math.floor((q.sao * q.quy.tyLe.phut) / 10), q.quy.doiSao.conDoiDuoc) : 0;
  return (
    <Man lui={{ chu: "Hôm nay" }} tieuLon={d.ds.length ? `${ten} đang xin ${d.ds.length}` : `${ten} không xin gì`} tai={tai} vongTai day={ve}>
      {!d.ds.length ? <CanhGiua lv="canh-trong" tieu="Không có lời xin nào" loi={`Khi ${ten} xin thêm giờ hay xin mở app, Rob báo Ba Mẹ ngay.`} /> : null}
      <BaoLoi loi={loiLam} />
      {d.ds.map((y) => (
        <The key={y.id}>
          <TheXin y={y} may={tenMayXin(y, d.ct?.may)} lam={(fn) => lam(fn)} dang={dangChay}
            phu={laAppWeb(y) ? `${y.gia_tri} chưa có trong app được phép` : laThemGio(y) && phutDoi ? `Con có ${q!.sao} sao, tự đổi được ${phutDoi} phút nếu Ba Mẹ không cho.` : undefined} />
        </The>
      ))}
      {d.ct ? (
        <Nhom>
          <Dong dau tieu={`Xem app & web ${ten} được dùng`} bam={() => router.push((con ? `/app-web?con=${con}` : "/app-web") as never)} />
        </Nhom>
      ) : null}
      {q ? <Chu co={13} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Hôm nay ${ten} còn ${q.quy.conPhut} phút trong ${q.quy.tongPhut} phút chơi.`}</Chu> : null}
    </Man>
  );
}
