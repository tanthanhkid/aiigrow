// API màn Con: /api/kid/<đường>. Bearer = phiên Con (đăng nhập PIN trên máy dùng chung / web Con) HOẶC token của thiết bị riêng của Con.
// Con chỉ thấy dữ liệu của chính mình; không thấy cấu hình nội bộ của Ba Mẹ, chỉ bảng quy tắc công khai (FR-06.05).
import { batLoi, docJson, json, loi } from "./api.ts";
import { bearer } from "./auth.ts";
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { lichCua, thamSo } from "./cau-hinh.ts";
import { conTuPhien, mayTuToken, type Con } from "./gia-dinh.ts";
import * as nv from "./nhiem-vu.ts";
import * as yc from "./yeu-cau.ts";
import * as pt from "./phan-thuong.ts";
import { lichSu } from "./vi.ts";
import { chaoMung, thanhTich } from "./thanh-tich.ts";
import { homNay } from "./bao-cao.ts";
import * as tre from "./choi-tre.ts";

export async function conGoi(req: Request): Promise<(Con & { device_id: string | null }) | null> {
  const t = bearer(req);
  if (!t) return null;
  const k = await conTuPhien(t);
  if (k) return k;
  const may = await mayTuToken(t);
  if (!may?.child_id) return null;
  const c = await one<Con>(`select * from children where id = $1`, [may.child_id]);
  return c ? { ...c, device_id: may.id } : null;
}

export async function xuLyCon(req: Request, p: string[]): Promise<Response> {
  try {
    const c = await conGoi(req);
    if (!c) return loi("chua_dang_nhap", "Nhập mã PIN để vào nhé", 401);
    const get = req.method === "GET", post = req.method === "POST", d = p.join("/");
    const b = post ? await docJson(req) : {};
    if (d === "toi" && get) {
      const loiKhen = await q(`select id, noi_dung, phan_hoi, created_at from messages where child_id = $1 order by created_at desc limit 5`, [c.id]);
      return json({ con: { id: c.id, ten: c.ten, nhom: c.nhom, avatar: c.avatar, daChao: !!c.chao_luc }, ...(await homNay(c.family_id, c.id)), loiKhen });
    }
    if (d === "chao" && post) return json({ diemChaoMung: await chaoMung(c.id) });
    if (d === "nhiem-vu" && get) return json({ ds: await nv.nvCuaCon(c.id) });
    if (p[0] === "nhiem-vu" && p[2] === "bat-dau" && post) return json({ luot: await nv.batDau(c.id, p[1]) });
    if (p[0] === "luot" && p[2] === "nop" && post) return json(await nv.nop(c.id, p[1], { anh: b.anh, ghiChu: b.ghiChu }));
    if (d === "luot" && get)
      return json({ ds: await q(`select s.id, s.trang_thai, s.diem, s.ly_do, s.loi_khen, s.nop_luc, t.ten from submissions s join tasks t on t.id = s.task_id
                                 where s.child_id = $1 order by s.created_at desc limit 30`, [c.id]) });
    if (d === "cua-hang" && get) return json(await pt.cuaHang(c.id));
    if (p[0] === "doi" && p[1] && post) return json(await pt.doiQua(c.id, p[1]));
    if (d === "vi-qua" && get) return json(await pt.viQua(c.id));
    if (d === "lich-su" && get) return json({ ds: await lichSu(c.id, 50) });
    if (d === "thanh-tich" && get) return json(await thanhTich(c.id));
    if (d === "yeu-cau" && get) return json({ ds: await yc.dsYcCuaCon(c.id), lyDoNhanh: yc.LY_DO_NHANH });
    if (d === "yeu-cau" && post) {
      const r = await yc.guiYeuCau(c.id, c.device_id, b);
      const tuDong = await yc.apQuyTacTuDong(c.family_id, r.id);
      return json({ ...r, trang_thai: tuDong ? "dong_y" : r.trang_thai });
    }
    if (p[0] === "yeu-cau" && p[2] === "huy" && post) { await yc.huyYeuCau(c.id, p[1]); return json({ ok: true }); }
    if (d === "quy-tac" && get) {
      const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [c.family_id]))!;
      const ts = thamSo(f.cau_hinh, c.cau_hinh);
      return json({ lich: lichCua(c.lich as never), tranNgay: ts.tran_ngay, tranTuan: ts.tran_tuan, phienToiDa: ts.phien_toi_da, nghiGiua: ts.nghi_giua,
        giaPhut: { game: ts.gia_game / 1000, video_ngan: ts.gia_video_ngan / 1000, mxh: ts.gia_mxh / 1000, phim_gd: ts.gia_phim_gd / 1000 },
        nhiemVu: (await nv.nvCuaCon(c.id)).map((x) => ({ ten: x.ten, diem: x.diem })), qua: (await pt.cuaHang(c.id)).qua.map((x) => ({ ten: x.ten, diem: x.diem })) });
    }
    if (p[0] === "loi-khen" && p[2] === "phan-hoi" && post) {
      const r = await q(`update messages set phan_hoi = $3 where id = $1 and child_id = $2 returning id`, [p[1], c.id, String(b.phanHoi ?? "").slice(0, 60)]);
      if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy lời khen", 404);
      return json({ ok: true });
    }
    // M3 màn Con: Nhà, trò chơi được phép, phiên giải trí mở từ app Con (lib/choi-tre.ts), đổi người
    if (d === "nha" && get) return json(await tre.nhaTre(c));
    if (d === "tro-choi" && get) return json({ ds: await tre.troChoi(c) });
    if (d === "phien/xet" && post) return json(await tre.xetTre(c, String(b.muc ?? "")));
    if (d === "phien/mo" && post) return json(await tre.moTre(c, String(b.muc ?? "")));
    if (d === "phien/nhip" && post) return json(await tre.nhipTre(c, String(b.id ?? ""), b.dangDung !== false));
    if (d === "phien/dung" && post) return json(await tre.dungTre(c, String(b.id ?? "")));
    if (d === "dang-xuat" && post) { await tre.raTre(bearer(req)!); return json({ ok: true }); }
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
