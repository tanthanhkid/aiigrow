// «<Con> đang xin phép» (thiết kế chốt 14/11 — bm-con-xin/01 them-a4nqjrmp): mọi lời xin đang chờ của một Con, mỗi lời xin một thẻ
// «Không cho / Cho N phút» (lib/hom-nay-xin). App / web lạ: «YouTube chưa nằm trong N app được mở». Thêm giờ: viên «S sao · Con tự đổi sao ra phút được».
// «Đã trả lời hôm nay»: lời xin app / web Ba Mẹ đã không cho hôm nay (GET con/:id/hom-nay › biChan «chua_cho»).
// Cuối màn: chế độ chặn của con («Chặn app & web — App, web mới con phải xin Ba Mẹ · Đổi ›» → App & web) + «Được mở N app».
// Mở từ Hôm nay / Báo cáo / Thông báo (?con=).
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { HangViec, SaoVien, soAppDuocMo, TieuMuc, type ChoDuyetMoi, type ConCt, type LuatDem, type QuyCon } from "@/lib/hang-ngay";
import { laAppWeb, laThemGio, tenMayXin, TheXin } from "@/lib/hom-nay-xin";
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
  const q = d.qy;
  const moHet = d.ct?.cheDoChan === "mo_het";
  return (
    <Man lui={{ chu: "Hôm nay" }} tieuLon={d.ds.length ? `${ten} đang xin phép` : `${ten} không xin gì`} tai={tai} vongTai day={ve}>
      {!d.ds.length ? <CanhGiua lv="canh-trong" tieu="Không có lời xin nào" loi={`Khi ${ten} xin thêm giờ hay xin mở app, Grow báo Ba Mẹ ngay.`} /> : null}
      <BaoLoi loi={loiLam} />
      {d.ds.map((y) => (
        <The key={y.id}>
          <TheXin y={y} may={tenMayXin(y, d.ct?.may)} lam={(fn) => lam(fn)} dang={dangChay}
            phu={laAppWeb(y) ? `${y.gia_tri} chưa nằm trong ${d.soApp ?? "các"} app được mở` : undefined} />
          {laThemGio(y) && q && q.quy.doiSao.bat && q.sao ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <SaoVien n={q.sao} nho />
              <Chu co={13} mau={M.chu3}>Con tự đổi sao ra phút được</Chu>
            </View>
          ) : null}
        </The>
      ))}

      {d.daTraLoi.length ? (
        <>
          <TieuMuc chu="Đã trả lời hôm nay" />
          <The style={{ paddingVertical: 4 }}>
            {d.daTraLoi.map((x, k) => (
              <HangViec key={`${x.ten}:${k}`} dau={k === 0} ic="khoa" mau="xam" tieu={x.ten}
                phu={`${gioPhut(x.luc)}${x.may ? ` · ${x.may.replace(/ của .*$/, "")}` : ""}`} phai={<Nhan chu="Chưa cho" loai="xam" />} />
            ))}
          </The>
        </>
      ) : null}

      {d.ct && d.id ? (
        <The style={{ paddingVertical: 4 }}>
          <HangViec dau ic={moHet ? "mo_khoa" : "khien"} mau="lam" tieu={moHet ? "Mở hết" : "Chặn app & web"}
            phu={moHet ? "Không chặn app, web nào" : "App, web mới con phải xin Ba Mẹ"} phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Đổi ›</Chu>}
            bam={() => router.push(`/app-web?con=${d.id}` as never)} />
          {!moHet && d.soApp !== null ? <HangViec ic="luoi" mau="xanh" tieu={`Được mở ${d.soApp} app`} bam={() => router.push(`/app-web?con=${d.id}` as never)} /> : null}
        </The>
      ) : null}
      {q ? <Chu co={13} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Hôm nay ${ten} còn ${q.quy.conPhut} phút trong ${q.quy.tongPhut} phút chơi.`}</Chu> : null}
    </Man>
  );
}
