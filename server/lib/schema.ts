// Lược đồ CSDL AiiGrow — chạy lại được (create … if not exists) mỗi lần mở DB. Thêm cột mới bằng `alter table … add column if not exists`.
// Mốc M0: gia đình, Ba Mẹ, OTP, phiên. Các bảng nghiệp vụ (Con, thiết bị, nhiệm vụ, ví điểm, phần thưởng, phiên chơi, yêu cầu, voucher…)
// thêm ở M1 — xem docs/KE-HOACH.md.
export const SCHEMA = `
create table if not exists families (
  id text primary key,
  ten text not null default '',
  tz text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now()
);
create table if not exists parents (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  dinh_danh text not null unique,
  ten text not null,
  vai text not null default 'chu',
  pass_hash text,
  sai_lien int not null default 0,
  khoa_den timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists otp (
  dinh_danh text primary key,
  ma_hash text not null,
  muc_dich text not null,
  het timestamptz not null,
  so_lan int not null default 0
);
create table if not exists sessions (
  id text primary key,
  parent_id text not null references parents(id) on delete cascade,
  expires_at timestamptz not null
);
`;
// parents.dinh_danh: email (chữ thường) hoặc SĐT 0xxxxxxxxx. parents.vai: chu (Chủ gia đình) | duyet (Thành viên phê duyệt) | xem.
// parents.sai_lien / khoa_den: khoá đăng nhập sau 5 lần sai (BRD mục 9). otp.muc_dich: dang_ky | quen_mk. sessions.id = sha256(token).
