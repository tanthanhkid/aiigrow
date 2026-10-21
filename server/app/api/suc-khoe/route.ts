// GET /api/suc-khoe — máy chủ sống + mở được CSDL (dùng cho bản thử / theo dõi).
import { json, batLoi } from "@/lib/api.ts";
import { one } from "@/lib/db.ts";

export async function GET() {
  try {
    await one(`select 1 as ok`);
    return json({ ok: true, ten: "AiiGrow", luc: new Date().toISOString() });
  } catch (e) {
    return batLoi(e);
  }
}
