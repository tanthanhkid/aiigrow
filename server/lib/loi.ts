// Lỗi nghiệp vụ trả về người dùng (batLoi ở api.ts đổi thành JSON {error, message} + status). Tách riêng để lib thuần
// (ai-danh-gia, bao-cao) không kéo theo auth.ts → next/headers khi chạy test bằng node --test.
export class LoiNghiepVu extends Error {
  ma: string;
  status: number;
  constructor(ma: string, msg: string, status = 400) {
    super(msg);
    this.ma = ma;
    this.status = status;
  }
}
