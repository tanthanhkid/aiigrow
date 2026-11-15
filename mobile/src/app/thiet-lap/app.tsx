// them-mdujxlg2 «<Con> dùng app thế nào?» (thiết kế chốt 15/11 — #262, gộp màn chọn chế độ cũ them-35vyl4cx): hai thẻ chọn chế độ «Mở hết · Mở mọi app,
// mọi web · Không tính phút» | «Theo danh sách · Chỉ mở app, web Ba Mẹ đã thêm». Theo danh sách ⇒ thanh tìm «🔍 Tìm app trên máy con… + Thêm» (⇒ them-at57ypdc),
// «Đã thêm N app · M tính phút — App khác: con xin Ba Mẹ», danh mục chia nhóm (lib/danh-muc-lan-dau.ts) mỗi nhóm «Chọn tất cả» + «● Thêm vào nhóm …»;
// dòng đã thêm hiện viên «● Không tính phút» / «● Tính phút» (nhóm «Giải trí» = Tính phút). Không chọn sẵn.
// «Tiếp: chọn web cho con» ⇒ them-3xbscpzm. Mở hết ⇒ lưu một lần (POST thiet-lap) rồi sang Ghép máy. App gửi theo TÊN + nhom (docs/API.md › thiet-lap).
import { useCallback, useMemo, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { DM_APP, type MucDm } from "@/lib/danh-muc-lan-dau";
import { luuThietLap, napCaiDatCon } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { boDau, ChonCheDo, DauNhom, DongChon, DongDem, DongVaoNhom, tenNhomDm, theoNhom, ThanhTimGia, TheDs, tinhGioDm } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type AppChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, M, Man, Nut, useLam } from "@/lib/ui";

type CheDo = "chi_app_duoc_phep" | "mo_het";

export default function ChonApp() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [apps, setApps] = useState<AppChon[]>(tl.apps ?? []);
  const [cheDo, setCheDo] = useState<CheDo>(tl.cheDoChan ?? "chi_app_duoc_phep");
  const daBam = useRef(!!tl.cheDoChan);        // Ba Mẹ đã chọn (lần này hoặc trước) ⇒ chế độ nạp từ máy chủ không được đè
  const { lam, loi, dangChay } = useLam();
  useFocusEffect(useCallback(() => {
    setApps(layTl().apps ?? []);                // quay về từ «Thêm app» ⇒ đọc lại
    // đi lại Lần đầu cho Con đã có chế độ ⇒ hiện đúng chế độ đang có — chỉ khi Ba Mẹ chưa bấm chọn
    napCaiDatCon().then(() => { const n = layTl().cheDoChan; if (n && !daBam.current) setCheDo(n); }).catch(() => {});
  }, []));
  const nhom = useMemo(() => theoNhom(DM_APP), []);
  const moHet = cheDo === "mo_het";
  const chonCheDo = (v: CheDo) => { daBam.current = true; setCheDo(v); datTl({ cheDoChan: v }); };
  const co = (t: string) => apps.some((a) => boDau(a.ten) === boDau(t));
  const doi = (ds: MucDm[], bat: boolean) => {
    const k = new Set(ds.map((x) => boDau(x.ten)));
    const moi = [...apps.filter((a) => !k.has(boDau(a.ten))), ...(bat ? ds.map((x) => ({ ten: x.ten, tinhGio: tinhGioDm(x) })) : [])];
    setApps(moi);
    datTl({ apps: moi });
  };
  const tinh = (a: AppChon) => "tinhGio" in a && a.tinhGio;
  // nhãn nhóm của một dòng = nhóm ĐÃ LƯU của app đó (Ba Mẹ có thể đã đổi ở «Thêm app»); app theo mã (không có tinhGio) ⇒ nhóm của danh mục
  const nhomDa = (t: string, macDinh: ReturnType<typeof nhomCua>) => { const a = apps.find((x) => boDau(x.ten) === boDau(t)); return a && "tinhGio" in a ? nhomCua(a.tinhGio) : macDinh; };
  const soTinh = apps.filter(tinh).length;
  // app Ba Mẹ gõ thêm (ngoài danh mục) — hiện đầu danh sách để bỏ được
  const rieng = apps.filter((a) => !DM_APP.some((x) => boDau(x.ten) === boDau(a.ten)));
  const tiep = () => {
    datTl({ cheDoChan: cheDo, apps });
    if (!moHet) { router.push("/thiet-lap/web"); return; }
    lam(async () => {
      const con = await luuThietLap();
      router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
    }, { hangDoi: true });
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/gio" phai={<ThanhBuoc5 dang={4} ic="khien" />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={moHet ? "Tiếp: ghép máy của con" : "Tiếp: chọn web cho con"} rong dangChay={dangChay} bam={tiep} /></>}>
      <Chu kieu="rat" co={24} style={{ letterSpacing: -0.5 }}>{`${ten} dùng app thế nào?`}</Chu>
      <ChonCheDo gia={cheDo} doi={chonCheDo} />
      {moHet ? (
        <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>{`${ten} mở được mọi app, mọi trang web, không tính phút. AiiGrow chỉ lo nhiệm vụ, sao và quà. Đổi sang «Theo danh sách» lúc nào cũng được ở tab App & web.`}</Chu>
      ) : <>
        <ThanhTimGia chu="🔍 Tìm app trên máy con…" nhan="Tìm hoặc thêm app trên máy con" bam={() => router.push("/thiet-lap/them-app")} />
        <DongDem trai={`Đã thêm ${apps.length} app · ${soTinh} tính phút`} phai="App khác: con xin Ba Mẹ" />
        {rieng.length ? (
          <View style={{ gap: 6 }}>
            <DauNhom chu="➕ Ba Mẹ thêm" />
            <TheDs>{rieng.map((a, i) => <DongChon key={a.ten} dau={!i} e="📱" ten={a.ten} phu="Ba Mẹ gõ tên" chon nhom={nhomCua(tinh(a))} bam={() => {
              const moi = apps.filter((x) => x !== a); setApps(moi); datTl({ apps: moi });
            }} />)}</TheDs>
          </View>
        ) : null}
        {nhom.map((g) => {
          const het = g.ds.every((x) => co(x.ten));
          const n = nhomCua(tinhGioDm(g.ds[0]));
          return (
            <View key={g.nhom} style={{ gap: 6 }}>
              <DauNhom chu={`${g.eN} ${tenNhomDm(g.nhom)}`} het={het} bam={() => doi(g.ds, !het)} />
              <DongVaoNhom nhom={n} />
              <TheDs>{g.ds.map((x, i) => <DongChon key={x.ten} dau={!i} e={x.e} ten={x.ten} phu={x.phu} chon={co(x.ten)} nhom={nhomDa(x.ten, n)} bam={() => doi([x], !co(x.ten))} />)}</TheDs>
            </View>
          );
        })}
        <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: TikTok, Facebook, Instagram, YouTube bản thường — chỉ dành cho từ 13 tuổi.</Chu>
      </>}
    </Man>
  );
}
