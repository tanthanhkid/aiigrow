// API agent thiết bị Con: /api/device/<đường>. Bearer = token thiết bị (ghép bằng mã 6 số). Token thiết bị KHÔNG gọi được API Ba Mẹ
// (khác bảng, khác hàm kiểm) — không có lệnh «mở khoá» hay «cộng điểm» nào ở đây: điểm, phiên, phê duyệt chỉ máy chủ quyết.
import { batLoi, docJson, json, loi } from "./api.ts";
import { bearer } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { conTuPhien, dangNhapPin, ghepMay, mayTuToken } from "./gia-dinh.ts";
import { dongBo } from "./may-con.ts";
import { buPhien, goCoMatKhau, hoiQrGhep, nhanSuKien, taoPhienWeb, taoQrGhep } from "./may-con.ts";
import { dungPhien, moPhien, nhip, xetMoPhien, lyDoChu } from "./phien.ts";
import { guiYeuCau } from "./yeu-cau.ts";
import { dsCon } from "./gia-dinh.ts";

export async function xuLyMay(req: Request, p: string[]): Promise<Response> {
  try {
    const d = p.join("/");
    if (d === "ghep" && req.method === "POST") {
      const b = await docJson(req);
      return json(await ghepMay(String(b.ma ?? ""), String(b.nen ?? ""), String(b.tenMay ?? "")));
    }
    // M4: ghép bằng QR (máy hiện QR, Ba Mẹ quét) — không cần Bearer
    if (d === "ghep-qr" && req.method === "POST") {
      const b = await docJson(req);
      return json(await taoQrGhep(process.env.AIIGROW_APP_URL || new URL(req.url).origin, String(b.nen ?? "windows"), String(b.tenMay ?? "")));
    }
    if (d === "ghep-qr/hoi" && req.method === "POST") { const b = await docJson(req); return json(await hoiQrGhep(String(b.ma ?? ""), String(b.bi ?? ""))); }
    const may = await (async () => { const t = bearer(req); return t ? mayTuToken(t) : undefined; })();
    if (!may) return loi("token_sai", "Thiết bị chưa ghép hoặc đã bị gỡ khỏi gia đình", 401);
    const b = await docJson(req);
    // Con đang dùng: máy riêng ⇒ chủ máy; máy dùng chung ⇒ phiên PIN gửi kèm header X-Phien-Con
    const phienCon = req.headers.get("x-phien-con");
    const k = phienCon ? await conTuPhien(phienCon) : undefined;
    const con = may.child_id ?? (k && k.family_id === may.family_id ? k.id : null);
    if (d === "dong-bo") return json(await dongBo(may, { ...b, conDangDung: con }));
    if (d === "ho-so") return json({ con: (await dsCon(may.family_id)).filter((c) => !may.child_id || c.id === may.child_id).map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar })) });
    if (d === "pin") return json({ phienCon: await dangNhapPin(may, String(b.con ?? ""), String(b.pin ?? "")) });
    // M4: sự kiện agent (gửi bù được, `ma` một lần) · gỡ agent bằng mật khẩu Ba Mẹ
    if (d === "su-kien") return json({ nhan: await nhanSuKien(may, con, b.ds) });
    if (d === "go") return json(await goCoMatKhau(may, b.dinhDanh, b.matKhau));
    if (!con) throw new LoiNghiepVu("chua_chon_con", "Chọn hồ sơ và nhập mã PIN trước", 409);
    if (d === "phien/xet") { const x = await xetMoPhien(con, String(b.muc ?? ""), { gioMaySai: b.gioMaySai === true, mayId: may.id }); return json({ ...x, cau: x.duoc ? null : lyDoChu(x) }); }
    if (d === "phien/mo") return json(await moPhien(con, may.id, String(b.muc ?? ""), { gioMaySai: b.gioMaySai === true }));
    if (d === "phien/nhip") return json(await nhip(con, String(b.id ?? ""), b.dangDung !== false));
    if (d === "phien/dung") { await dungPhien(con, String(b.id ?? ""), "con_dung"); return json({ ok: true }); }
    if (d === "yeu-cau") return json(await guiYeuCau(con, may.id, b));
    // M4: phiên Con cho khung Kid (WebView2) · bù phút chơi khi mất mạng
    if (d === "phien-web") return json(await taoPhienWeb(may, con));
    if (d === "phien/bu") return json(await buPhien(may, con, b));
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
