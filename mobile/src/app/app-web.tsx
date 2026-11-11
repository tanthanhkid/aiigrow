// «App & web của <con>» (thiết kế chốt bm-hang-ngay/56 them-8h2msmht, đích của «Đổi chế độ» ở bm-ung-dung/01): 2 chế độ chặn (Mở hết / Chỉ app
// được phép — S2 L4, POST con/:id/che-do-chan), hàng vàng «Con đang xin mở …», «Được dùng · N app» (công tắc tắt = không cho dùng), «Luôn chặn»
// (web người lớn, cờ bạc — không tắt được; app Ba Mẹ đã chặn). Không còn «Giám sát / Chặn thật», không «Học tập / Giải trí — trừ điểm»:
// app được dùng chỉ khác nhau ở «Tính vào giờ chơi» hay «Không tính giờ». Luật lấy từ GET luat (luật riêng Con + luật cả nhà).
// Tương thích: `?xep=<muc>&ten=` (thẻ «app mới» ở Trang chủ) ⇒ mở thẳng màn một app.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type ConChiTiet, type GiaDinh, type YeuCau } from "@/lib/api";
import { HangVang, MucTieu, NhanGio, NhanLuon, OIcon, TheCheDo, gomTheoTen, hoanLuat, icCuaApp, khoaTen, luatCuaCon, laWeb, phuXin, tieuXin, type CheDoChan, type LuatApp, type LuatTruoc } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, ChonMot, CongTac, Dong, Man, Nhom, cauLoi, useHoanTac, useLam, useTai } from "@/lib/ui";

export default function AppWeb() {
  const ts = useLocalSearchParams<{ con?: string; xep?: string; ten?: string }>();
  const [chonCon, setChonCon] = useState<string | undefined>(ts.con);
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, luat, cd, xem] = await Promise.all([
      bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: LuatApp[] }>("luat"), bm.goi<{ yeuCau: YeuCau[] }>("cho-duyet").catch(() => ({ yeuCau: [] as YeuCau[] })), laChiXem(),
    ]);
    return { g, luat: luat.ds, yc: cd.yeuCau, xem };
  });
  const conId = chonCon ?? d?.g.con[0]?.id;
  const conRef = useRef(conId);
  const ct = useTai(() => (conRef.current ? bm.goi<ConChiTiet & { cheDoChan?: CheDoChan }>(`con/${conRef.current}`) : Promise.resolve(null)));
  // useTai giữ hàm tải của lần dựng đầu ⇒ hàm tải đọc con qua ref; đổi con thì cập nhật ref rồi tải lại
  useEffect(() => { conRef.current = conId; if (conId) ct.tai(); }, [conId]);       // eslint-disable-line react-hooks/exhaustive-deps
  const { lam, loi: loiLam } = useLam();
  const { bao, noi } = useHoanTac();
  useEffect(() => {
    // app mới của cả nhà (không kèm con) ⇒ luật cả nhà, như luồng xếp loại cũ
    if (ts.xep && conId) router.replace({ pathname: "/ung-dung/app", params: { con: conId, muc: ts.xep, ten: ts.ten ?? ts.xep, ...(ts.con ? {} : { caNha: "1" }) } });
  }, [ts.xep, ts.ten, ts.con, conId]);

  if (!d) return <Man lui={{ chu: "" }} tieu="App & web"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const con = d.g.con.find((c) => c.id === conId);
  if (!con) return <Man lui={{ chu: "" }} tieu="App & web"><ChoTai loi="Chưa có hồ sơ con nào — thêm con ở tab Cả nhà." tai={tai} /></Man>;
  const cd = ct.d?.id === con.id ? ct.d : null;
  // chưa tải xong chi tiết con ⇒ chưa biết chế độ: không chọn ô nào, không cho bấm (tránh bấm trùng chế độ đoán sai rồi bị bỏ qua)
  const cheDo: CheDoChan | null = cd ? cd.cheDoChan ?? "chi_app_duoc_phep" : null;
  const luat = luatCuaCon(d.luat, con.id).filter((l) => !laWeb(l.muc));
  // mỗi app một dòng dù có nhiều định danh; app có định danh nào bị chặn thì nằm ở «Luôn chặn»
  const nhomApp = gomTheoTen(luat);
  const duocDung = nhomApp.filter((g) => g.every((l) => l.loai !== "chan")).map((g) => g[0]);
  const daChan = nhomApp.filter((g) => g.some((l) => l.loai === "chan")).map((g) => g.find((l) => l.loai === "chan")!);
  const xin = d.yc.filter((y) => y.child_id === con.id && (y.loai === "cai_app" || y.loai === "mo_web"));
  const may = cd?.may ?? [];

  const doiCheDo = (v: CheDoChan) => lam(async () => {
    await bm.goi(`con/${con.id}/che-do-chan`, { cheDo: v });
    await ct.tai();
    bao(v === "mo_het" ? `${con.ten} mở được mọi app (trừ web người lớn)` : `${con.ten} chỉ dùng app được phép`);
  });
  // đặt cho MỌI định danh cùng tên của app (chặn Roblox = chặn cả roblox.exe, robloxplayerbeta.exe, com.roblox.client…)
  const datLoai = (l: LuatApp, loai: LuatApp["loai"]) => lam(async () => {
    const ds = luat.filter((x) => khoaTen(x) === khoaTen(l));
    const kq = await Promise.all(ds.map((x) => bm.goi<{ truoc: LuatTruoc }>("luat", { con: con.id, muc: x.muc, ten: x.ten, loai, nhom: x.nhom ?? undefined })
      .then((r) => ({ muc: x.muc, truoc: r.truoc }))));
    await tai();
    bao(loai === "chan" ? `Đã chặn ${l.ten}` : `${con.ten} dùng lại được ${l.ten}`,
      () => { Promise.all(kq.map((k) => hoanLuat(con.id, k.muc, k.truoc, loai))).then(() => tai(), (e) => { tai(); bao(`Chưa hoàn tác được: ${cauLoi(e)}`); }); });
  });
  const moApp = (l: LuatApp) => router.push({ pathname: "/ung-dung/app", params: { con: con.id, muc: l.muc, ten: l.ten } });
  const xemTungApp = () => (may.length === 1 ? router.push({ pathname: "/ung-dung/[may]", params: { may: may[0].id } }) : router.push(`/may?con=${con.id}`));

  return (
    <Man lui={{ chu: "" }} tieu={`App & web của ${con.ten}`} noi={noi} tai={tai} vongTai>
      {d.g.con.length > 1 ? <ChonMot ds={d.g.con.map((c) => ({ gia: c.id, chu: c.ten }))} gia={con.id} doi={setChonCon} /> : null}
      <TheCheDo cheDo={cheDo} doi={d.xem || !cd ? undefined : doiCheDo} />
      <BaoLoi loi={loiLam} />
      {xin.map((y) => <HangVang key={y.id} tieu={tieuXin(y)} phu={phuXin(y)} bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />)}

      <MucTieu chu={`Được dùng · ${duocDung.length} app`} phai={may.length ? { chu: "Xem từng app ›", bam: xemTungApp } : undefined} />
      {duocDung.length ? (
        <Nhom>
          {duocDung.map((l, i) => (
            <Dong key={l.muc} dau={i === 0} tieu={l.ten || l.muc} phu={l.loai === "giai_tri" ? "Tính vào giờ chơi" : "Không tính giờ"} trai={<OIcon ic={icCuaApp(`${l.ten} ${l.muc}`)} />}
              phai={d.xem ? <NhanGio tinh={l.loai === "giai_tri"} /> : <CongTac bat nhan={`${l.ten}: đang cho dùng`} doi={() => datLoai(l, "chan")} />} bam={() => moApp(l)} />
          ))}
        </Nhom>
      ) : (
        <Nhom><Dong dau tieu="Chưa cho app nào" phu={cheDo === "mo_het" ? "Đang mở hết — chỉ web người lớn bị chặn" : "Con mở app nào cũng phải xin Ba Mẹ"} trai={<OIcon ic="luoi" />}
          bam={may.length ? xemTungApp : undefined} /></Nhom>
      )}

      <MucTieu chu="Luôn chặn" />
      <Nhom>
        <Dong dau tieu="Web người lớn, cờ bạc" phu="AiiGrow tự cập nhật" trai={<OIcon ic="khien" />} phai={<NhanLuon />} bam={() => router.push("/web/luon-chan")} />
        {daChan.map((l) => (
          <Dong key={l.muc} tieu={l.ten || l.muc} phu={cheDo === "mo_het" ? "Đang Mở hết nên tạm dùng được" : l.child_id ? "Ba Mẹ chặn" : "Ba Mẹ chặn cả nhà"} trai={<OIcon ic={icCuaApp(`${l.ten} ${l.muc}`)} />}
            phai={d.xem ? undefined : <CongTac bat={false} nhan={`${l.ten}: đang chặn`} doi={() => datLoai(l, "giai_tri")} />} bam={() => moApp(l)} />
        ))}
      </Nhom>
      <View style={{ marginTop: 4 }}>
        <Nhom>
          <Dong dau tieu="Trang web" phu="Trang được phép, trang đã chặn" trai={<OIcon ic="web" />} bam={() => router.push(`/web/${con.id}`)} />
        </Nhom>
      </View>
    </Man>
  );
}
