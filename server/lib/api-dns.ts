// API cho resolver DNS tự host: /api/dns/<đường>. Bearer = bí mật chung `AIIGROW_DNS_BI_MAT` (đặt ở cả máy chủ lẫn resolver). Chưa đặt
// ⇒ 503 (không mở đường nào). Resolver chỉ đọc chính sách + gửi nhật ký tóm tắt (tên miền + đếm); không đổi được điểm / quyền gì.
// Hợp đồng: docs/API.md (mục M4b kiểm soát mạng).
import { timingSafeEqual } from "node:crypto";
import { batLoi, docJson, json, loi } from "./api.ts";
import { bearer, sha } from "./auth.ts";
import { chinhSachTheoNhan, nhanNhatKy, quetMatTruyVan } from "./dns-gia-dinh.ts";
import { tomTatNhatKyNextDns } from "./ho-so-dns.ts";

const dungBiMat = (t: string | null) => {
  const bm = process.env.AIIGROW_DNS_BI_MAT;
  if (!bm || !t) return false;
  return timingSafeEqual(Buffer.from(sha(t)), Buffer.from(sha(bm)));
};

export async function xuLyDns(req: Request, p: string[]): Promise<Response> {
  try {
    if (!process.env.AIIGROW_DNS_BI_MAT) return loi("chua_cau_hinh", "Resolver DNS chưa được cấu hình trên máy chủ", 503);
    if (!dungBiMat(bearer(req))) return loi("khong_duoc_phep", "Sai bí mật resolver", 401);
    if (p[0] === "chinh-sach" && p[1] && req.method === "GET") return json(await chinhSachTheoNhan(p[1]));
    if (p[0] === "nhat-ky" && req.method === "POST") {
      const b = await docJson(req);
      // dạng tự host: {nhan, ds: [{tenMien, soLan, soLanChan, ngoaiGio}]} · dạng NextDNS: {nextdns: [{domain, status, device: {name}}]}
      if (Array.isArray(b.nextdns)) {
        let n = 0;
        for (const x of tomTatNhatKyNextDns(b.nextdns)) n += await nhanNhatKy(x.nhan, x.ds).catch(() => 0);
        return json({ nhan: n });
      }
      return json({ nhan: await nhanNhatKy(String(b.nhan ?? ""), b.ds) });
    }
    if (p[0] === "quet" && req.method === "POST") return json({ moiBao: await quetMatTruyVan(null) });
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
