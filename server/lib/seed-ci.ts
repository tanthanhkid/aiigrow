// Dữ liệu thử cho CI (docs/CI-RA-LOI.md): MỘT nhà Ba Mẹ đủ trạng thái để kiểm app Ba Mẹ bằng máy chủ thật —
// 3 con, máy con đã ghép, việc chờ duyệt, quà, con đang nợ sao, lời xin mở web / cài app đang chờ.
// Đi qua đúng các API app Ba Mẹ / agent gọi (xuLyM / xuLyCon / xuLyMay) như lib/api.test.ts ⇒ dữ liệu luôn khớp lược đồ hiện hành.
//
// Đăng nhập KHÔNG OTP cho CI = mật khẩu thường (POST /api/m/dang-nhap) + token phiên in ra — KHÔNG có đường cửa sau nào trên máy chủ.
// Chỉ chạy khi choPhepSeedCi() đúng: AIIGROW_CI_LOGIN=1 VÀ không phải production (NODE_ENV, AIIGROW_BAT_BUOC_DB)
// VÀ CSDL là PGlite hoặc Postgres ở máy cục bộ (localhost / 127.0.0.1 / ::1) ⇒ chạy nhầm với DATABASE_URL prod là bị chặn trước khi mở DB.
/** Lý do KHÔNG được seed (null = được). Đọc env truyền vào để test được. */
export function lyDoChanSeedCi(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.AIIGROW_CI_LOGIN !== "1") return "thiếu AIIGROW_CI_LOGIN=1";
  if (env.NODE_ENV === "production") return "NODE_ENV=production";
  if (env.AIIGROW_BAT_BUOC_DB === "1") return "AIIGROW_BAT_BUOC_DB=1 (máy chủ thật)";
  if (env.DATABASE_URL) {
    let host = "";
    try { host = new URL(env.DATABASE_URL).hostname.replace(/^\[|\]$/g, ""); } catch { return "DATABASE_URL không đọc được"; }
    if (!["localhost", "127.0.0.1", "::1"].includes(host)) return `DATABASE_URL trỏ máy ngoài (${host}) — chỉ seed Postgres cục bộ`;
  }
  return null;
}

const CI_MAT_KHAU_MD = "aiigrow-ci-123";

type KetQuaSeed = {
  dinhDanh: string; matKhau: string; token: string; giaDinh: string;
  con: { id: string; ten: string }[]; may: { con: string; token: string; ten: string }[];
  luotChoDuyet: string[]; yeuCauCho: string[]; conNo: string;
};

/** Tạo nhà thử. `dinhDanh` khác nhau cho mỗi lượt nếu cần nhiều nhà (mặc định 0900000001). Gọi lại với cùng số ⇒ lỗi da_co_tai_khoan. */
export async function seedCi(o: { dinhDanh?: string; matKhau?: string; env?: NodeJS.ProcessEnv } = {}): Promise<KetQuaSeed> {
  const chan = lyDoChanSeedCi(o.env ?? process.env);
  if (chan) throw new Error(`seed CI bị chặn: ${chan}`);
  const { xuLyM } = await import("./api-m.ts");
  const { xuLyCon } = await import("./api-con.ts");
  const { xuLyMay } = await import("./api-may.ts");
  const goi = async (f: typeof xuLyM, duong: string, tok?: string, body?: unknown) => {
    const r = await f(new Request(`http://ci/api/${duong}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), duong.split("/"));
    const j = await r.json();
    if (r.status !== 200) throw new Error(`seed CI: ${duong} → ${r.status} ${JSON.stringify(j)}`);
    return j;
  };
  const m = (d: string, tok?: string, b?: unknown) => goi(xuLyM, d, tok, b);
  const k = (d: string, tok: string, b?: unknown) => goi(xuLyCon, d, tok, b);
  const dv = (d: string, tok?: string, b?: unknown) => goi(xuLyMay, d, tok, b);
  const anh = (hat: string) => ({ mime: "image/png", base64: Buffer.from(`\x89PNG-ci-${hat}`).toString("base64") });

  const dinhDanh = o.dinhDanh ?? "0900000001", matKhau = o.matKhau ?? CI_MAT_KHAU_MD;
  // đăng ký như app: mã OTP chế độ thử (không phải production — đã chặn ở trên) trả thẳng trong phản hồi
  const otp = await m("otp", undefined, { dinhDanh });
  await m("dang-ky", undefined, { dinhDanh, ma: otp.ma, ten: "Mẹ Lan", matKhau });
  // đăng nhập bằng mật khẩu — đúng đường app dùng, không OTP
  const token = (await m("dang-nhap", undefined, { dinhDanh, matKhau })).token as string;
  const nam = new Date().getFullYear();
  const ten = ["Nguyễn Ngọc Bảo Anh", "Bill", "Na"];
  const con = [
    { id: (await m("con", token, { ten: ten[0], namSinh: nam - 9 })).id as string, ten: ten[0] },
    { id: (await m("con", token, { ten: ten[1], namSinh: nam - 13, nhom: "teen" })).id as string, ten: ten[1] },
    { id: (await m("con", token, { ten: ten[2], namSinh: nam - 6 })).id as string, ten: ten[2] },
  ];
  await m("nhiem-vu/mau", token, { nhom: "nhi" });
  await m("qua/mau", token, {});
  // máy con đã ghép: Bảo Anh (Windows), Bill (Windows), Na (Android)
  const may: KetQuaSeed["may"] = [];
  for (const [i, nen, tenMay] of [[0, "windows", "Laptop của Bảo Anh"], [1, "windows", "Laptop của Bill"], [2, "android", "Máy tính bảng của Na"]] as const) {
    const { ma } = await m("ma-ghep", token, { con: con[i].id, nen });
    const g = await dv("ghep", undefined, { ma, nen, tenMay });
    await dv("dong-bo", g.token, { clientTime: new Date().toISOString(), status: { quyen: { dich_vu: true, appLocker: true } } });
    may.push({ con: con[i].id, token: g.token, ten: tenMay });
  }
  const [mayAnh, mayBill, mayNa] = may.map((x) => x.token);
  // việc chờ duyệt: Bảo Anh nộp 2 việc, Na nộp 1
  const luotChoDuyet: string[] = [];
  // chỉ việc không đòi thời gian tối thiểu (nộp ngay được — việc có phut_toi_thieu bị chặn chua_du_gio)
  const dsNv = ((await k("nhiem-vu", mayAnh)).ds as { id: string; ten: string; phut_toi_thieu?: number }[]).filter((x) => !x.phut_toi_thieu);
  if (dsNv.length < 3) throw new Error(`seed CI: bộ việc mẫu chỉ có ${dsNv.length} việc nộp ngay được (cần 3)`);
  for (const [tok, nv, hat] of [[mayAnh, dsNv[0], "a1"], [mayAnh, dsNv[1], "a2"], [mayNa, dsNv[2], "n1"]] as const) {
    const { luot } = await k(`nhiem-vu/${nv.id}/bat-dau`, tok, {});
    await k(`luot/${luot}/nop`, tok, { anh: [anh(hat)] });
    luotChoDuyet.push(luot);
  }
  // Bill đang nợ sao: xin thêm giờ 15 phút ⇒ Ba Mẹ đồng ý (trừ điểm) = cho vay 15 sao
  const vay = await k("yeu-cau", mayBill, { loai: "them_gio", phut: 15, lyDo: "Con xây dở nhà" });
  await m(`yeu-cau/${vay.id}/dong-y`, token, { truDiem: true });
  // lời xin đang chờ: Bảo Anh xin mở web, Bill xin cài app
  const yeuCauCho = [
    (await k("yeu-cau", mayAnh, { loai: "mo_web", giaTri: "scratch.mit.edu", lyDo: "Để làm bài tập" })).id as string,
    (await k("yeu-cau", mayBill, { loai: "cai_app", giaTri: "Minecraft", lyDo: "Chơi cùng lớp" })).id as string,
  ];
  const { one } = await import("./db.ts");
  const giaDinh = (await one<{ family_id: string }>(`select family_id from parents where dinh_danh = $1`, [dinhDanh]))!.family_id;
  return { dinhDanh, matKhau, token, giaDinh, con, may, luotChoDuyet, yeuCauCho, conNo: con[1].id };
}
