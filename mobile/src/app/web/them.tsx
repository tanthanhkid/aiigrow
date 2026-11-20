// «Thêm web cho <con>» (bàn bm-ung-dung them-yzl99l3y@v9 — #262): TÌM TRƯỚC, làm hết trong 1 màn. Gõ địa chỉ (vd tiktok.com) ⇒ «Kết quả
// cho «…»»: chính tên miền đó + tên miền con / tương tự đã biết (bảng dưới + trang con đã vào 30 ngày, GET con/:id/web?ngay=30). Chạm ＋ ⇒ ngay dưới hiện
// «<trang> có tính phút không?» (Tính phút · Trả bằng sao | Không tính phút · Vào thoải mái) + lưu ý (trang 13+ khi con nhỏ hơn). «Thêm tiktok.com ·
// Tính phút» ⇒ POST con/:id/danh-sach {ds: [{nhom, muc, kieu: web}]} ⇒ về danh sách Web.
import { useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet, type ThongKeWeb } from "@/lib/api";
import { themVaoDs } from "@/lib/app-web";
import { bamChonThem, chuNutThem, datNhomThem, KetQuaThem, type ChonThem, type MucThem } from "@/lib/ds-chung";
import { OTim, icCuaApp, veHoac } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Man, Nut, useLam, useTai } from "@/lib/ui";

/** Tên miền con / tên miền đi kèm đã biết của các trang hay gặp (mở một trang mà quên trang đi kèm thì con vẫn vào được / vẫn hỏng). */
const HO: Record<string, { ten: string; mien: [string, string][]; tuoi?: number }> = {
  tiktok: { ten: "TikTok", tuoi: 13, mien: [["tiktok.com", "Trang chính TikTok"], ["m.tiktok.com", "TikTok bản cho điện thoại"], ["vm.tiktok.com", "Link chia sẻ video TikTok"], ["tiktokv.com", "Phát video TikTok"]] },
  youtube: { ten: "YouTube", tuoi: 13, mien: [["youtube.com", "Trang chính YouTube"], ["m.youtube.com", "YouTube bản cho điện thoại"], ["youtu.be", "Link chia sẻ video YouTube"], ["youtubekids.com", "YouTube cho trẻ em"]] },
  facebook: { ten: "Facebook", tuoi: 13, mien: [["facebook.com", "Trang chính Facebook"], ["m.facebook.com", "Facebook bản cho điện thoại"], ["fb.com", "Link rút gọn Facebook"], ["messenger.com", "Tin nhắn Facebook"]] },
  instagram: { ten: "Instagram", tuoi: 13, mien: [["instagram.com", "Trang chính Instagram"], ["cdninstagram.com", "Ảnh, video Instagram"]] },
  roblox: { ten: "Roblox", mien: [["roblox.com", "Trang chính Roblox"], ["web.roblox.com", "Roblox trên web"], ["rbxcdn.com", "Hình, tệp game Roblox"]] },
  discord: { ten: "Discord", tuoi: 13, mien: [["discord.com", "Trang chính Discord"], ["discord.gg", "Link mời Discord"], ["discordapp.com", "Discord bản cũ"]] },
  scratch: { ten: "Scratch", mien: [["scratch.mit.edu", "Lập trình Scratch"]] },
  khanacademy: { ten: "Khan Academy", mien: [["khanacademy.org", "Học Toán, Khoa học"], ["kastatic.org", "Bài giảng Khan Academy"]] },
  zalo: { ten: "Zalo", mien: [["zalo.me", "Trang chính Zalo"], ["chat.zalo.me", "Zalo trên web"]] },
  netflix: { ten: "Netflix", mien: [["netflix.com", "Phim Netflix"], ["nflxvideo.net", "Phát phim Netflix"]] },
};
const tenMien = (t: string) => t.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];
const hopLe = (m: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(m);
/** «m.tiktok.com» ⇒ «tiktok»: nhãn đứng trước đuôi (bỏ đuôi 2 tầng .com.vn). */
const goc = (m: string) => { const p = m.split("."); const bo = p.length > 2 && p[p.length - 2].length <= 3 ? 2 : 1; return p[p.length - 1 - bo] ?? p[0]; };
type Trang = { muc: string; phu: string };

export default function ThemWeb() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ct, w] = await Promise.all([bm.goi<ConChiTiet>(`con/${con}`), bm.goi<ThongKeWeb>(`con/${con}/web?ngay=30`).catch(() => null)]);
    return { ten: ct.ten, tuoi: ct.namSinh ? new Date().getFullYear() - ct.namSinh : null, w };
  });
  const [go, setGo] = useState("");
  const [chon, setChon] = useState<ChonThem>(new Map());
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac(`/web/${con}`);
  const luat = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of d?.w?.luat ?? []) if (l.nguon === "gia_dinh") m.set(l.tenMien, l.trangThai);
    for (const l of d?.w?.luat ?? []) if (l.nguon === "con") m.set(l.tenMien, l.trangThai);
    return m;
  }, [d]);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Thêm web"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

  const muc = tenMien(go);
  const da = d.w?.top ?? [];
  const ketQua = (): Trang[] => {
    if (muc.length < 2) return [];
    const ra = new Map<string, string>();
    const ho = HO[hopLe(muc) ? goc(muc) : muc] ?? Object.entries(HO).find(([k]) => k.startsWith(muc.replace(/\..*$/, "")) && muc.length >= 3)?.[1];
    if (hopLe(muc)) ra.set(muc, ho?.mien.find(([m]) => m === muc)?.[1] ?? (da.some((t) => t.tenMien === muc) ? "Con đã vào trang này" : "Trang web"));
    for (const [m, phu] of ho?.mien ?? []) if (!ra.has(m)) ra.set(m, phu);
    const k = hopLe(muc) ? goc(muc) : muc;
    for (const t of da) if (!ra.has(t.tenMien) && k.length >= 3 && t.tenMien.includes(k)) ra.set(t.tenMien, `Con đã vào ${t.soLan} lần`);
    return [...ra].slice(0, 12).map(([m, phu]) => ({ muc: m, phu }));
  };
  const kq = ketQua();
  const luuY = (m: string) => {
    const ho = HO[goc(m)], tt = luat.get(m);
    return [ho?.tuoi && d.tuoi !== null && d.tuoi < ho.tuoi ? `${ho.ten} dành cho từ ${ho.tuoi} tuổi.` : null,
      tt === "cho_phep" || tt === "hoc" ? "Trang này đang ở nhóm «Không tính phút»." : tt === "giai_tri" ? "Trang này đang ở nhóm «Tính phút»." : null]
      .filter(Boolean).join(" ");
  };
  const mt = (t: Trang): MucThem => ({ k: t.muc, ten: t.muc, phu: t.phu, ic: icCuaApp(t.muc), luuY: luuY(t.muc) || undefined,
    nhom: ["hoc", "cho_phep"].includes(luat.get(t.muc) ?? "") ? "khong_tinh_phut" : "tinh_phut" });
  const luu = () => lam(async () => {
    await themVaoDs(con, [...chon.values()].map(({ m, nhom }) => ({ nhom, muc: m.k, kieu: "web" as const })));
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Thêm web cho ${d.ten}`} dau={<View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
      <OTim gia={go} doi={setGo} goiY="Gõ địa chỉ: vuihoc.vn, tiktok.com…" nhan="Địa chỉ trang web" url khongKinh />
    </View>} day={<>
      <BaoLoi loi={loiLam} />
      <Nut thu chu={chuNutThem(chon, "trang")} rong dangChay={dangChay} tat={!chon.size} bam={luu} />
    </>}>
      <KetQuaThem go={go} kq={kq.map(mt)} chon={chon} doi={(m) => setChon(bamChonThem(m))} datNhom={(m, n) => setChon(datNhomThem(m, n))}
        trong="Gõ đủ địa chỉ trang, vd tiktok.com."
        chuaGo={muc.length >= 2 ? "Gõ đủ địa chỉ trang, vd tiktok.com." : `Gõ địa chỉ trang web ${d.ten} được vào. Dán được cả đường link — mọi trang con theo cùng nhóm.`} />
    </Man>
  );
}
