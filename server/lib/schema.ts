// Lược đồ CSDL AiiGrow — chạy lại được (create … if not exists) mỗi lần mở DB. Thêm cột mới bằng `alter table … add column if not exists`.
// Tên cột tiếng Việt không dấu; trạng thái theo BRD Phụ lục A. Tiền (đồng) và điểm là số nguyên; giá điểm/phút lưu theo phần nghìn (int)
// để không lệch số thực (1 điểm/phút = 1000, 0,5 điểm/phút = 500).
export const SCHEMA = `
create table if not exists families (
  id text primary key,
  ten text not null default '',
  tz text not null default 'Asia/Ho_Chi_Minh',
  cau_hinh jsonb not null default '{}',
  quy_voucher int not null default 0,
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

create table if not exists children (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  ten text not null,
  nam_sinh int,
  avatar text not null default 'rob',
  nhom text not null default 'nhi',
  pin_hash text,
  cau_hinh jsonb not null default '{}',
  lich jsonb not null default '{}',
  chao_luc timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists devices (
  id text primary key,
  child_id text references children(id) on delete set null,
  family_id text not null references families(id) on delete cascade,
  platform text not null,
  name text not null,
  token_hash text not null unique,
  dung_chung boolean not null default false,
  status jsonb not null default '{}',
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists kid_sessions (
  id text primary key,
  child_id text not null references children(id) on delete cascade,
  device_id text references devices(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists pin_sai (
  khoa text primary key,
  so_lan int not null default 0,
  khoa_den timestamptz
);
create table if not exists pair_codes (
  code text primary key,
  family_id text not null references families(id) on delete cascade,
  child_id text references children(id) on delete cascade,
  platform text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  device_id text
);

create table if not exists tasks (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  ten text not null,
  mo_ta text not null default '',
  nhom text not null default 'khac',
  diem int not null,
  bang_chung text not null default 'anh',
  kieu text not null default 'thuong',
  toi_da_ngay int,
  toi_da_tuan int,
  phut_toi_thieu int not null default 0,
  tu_duyet boolean not null default false,
  giao_cho text references children(id) on delete cascade,
  han timestamptz,
  bat boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists submissions (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  child_id text not null references children(id) on delete cascade,
  trang_thai text not null default 'dang_lam',
  bat_dau_luc timestamptz not null default now(),
  nop_luc timestamptz,
  ghi_chu text,
  diem int,
  nghi_trung boolean not null default false,
  nguoi_duyet text references parents(id) on delete set null,
  duyet_luc timestamptz,
  ly_do text,
  loi_khen text,
  nguon text not null default 'con',
  ref text,
  created_at timestamptz not null default now()
);
create unique index if not exists submissions_ref on submissions(child_id, ref) where ref is not null;
create table if not exists evidence (
  id text primary key,
  submission_id text not null references submissions(id) on delete cascade,
  child_id text not null references children(id) on delete cascade,
  mime text not null,
  du_lieu bytea not null,
  bam text not null,
  chup_luc timestamptz not null default now()
);
create index if not exists evidence_bam on evidence(child_id, bam);

create table if not exists points (
  id text primary key,
  child_id text not null references children(id) on delete cascade,
  delta int not null,
  loai text not null,
  ly_do text not null,
  ref text,
  nguoi text,
  seq bigserial,
  created_at timestamptz not null default now()
);
create index if not exists points_con on points(child_id, created_at);

create table if not exists rewards (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  ten text not null,
  loai text not null,
  diem int not null,
  phut int,
  menh_gia int,
  ton_kho int,
  toi_da_thang int,
  chi_cuoi_tuan boolean not null default false,
  can_xac_nhan boolean not null default false,
  bat boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists redemptions (
  id text primary key,
  child_id text not null references children(id) on delete cascade,
  reward_id text references rewards(id) on delete set null,
  ten text not null,
  loai text not null,
  diem int not null,
  trang_thai text not null,
  xu_ly_boi text,
  xu_ly_luc timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists vouchers (
  id text primary key,
  ma text not null unique,
  family_id text not null references families(id) on delete cascade,
  child_id text references children(id) on delete set null,
  redemption_id text,
  menh_gia int not null,
  diem int not null,
  trang_thai text not null,
  het_han timestamptz not null,
  dung_luc timestamptz,
  quay text,
  created_at timestamptz not null default now()
);
create table if not exists quy_gd (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  so_tien int not null,
  loai text not null,
  ghi_chu text not null default '',
  ref text,
  nguoi text,
  created_at timestamptz not null default now()
);

create table if not exists app_rules (
  family_id text not null references families(id) on delete cascade,
  child_id text not null default '',
  muc text not null,
  ten text not null,
  loai text not null,
  nhom text not null default 'khac',
  het timestamptz,
  primary key (family_id, child_id, muc)
);
create table if not exists usage (
  device_id text not null,
  child_id text not null references children(id) on delete cascade,
  ngay text not null,
  muc text not null,
  loai text not null,
  phut int not null,
  primary key (device_id, ngay, muc)
);
create table if not exists play_sessions (
  id text primary key,
  child_id text not null references children(id) on delete cascade,
  device_id text,
  muc text not null,
  nhom text not null,
  gia_phan_nghin int not null,
  toi_da_phut int not null,
  bat_dau timestamptz not null default now(),
  nhip_cuoi timestamptz not null default now(),
  phut_dung real not null default 0,
  phan_nghin_tru int not null default 0,
  diem_tru int not null default 0,
  phut_thuong real not null default 0,
  trang_thai text not null default 'chay',
  ly_do_ket text,
  ket_thuc timestamptz,
  nghi_den timestamptz
);
create unique index if not exists play_mot_phien on play_sessions(child_id) where trang_thai in ('chay', 'tam');
create table if not exists requests (
  id text primary key,
  child_id text not null references children(id) on delete cascade,
  device_id text,
  loai text not null,
  phut int,
  gia_tri text,
  ly_do text not null default '',
  trang_thai text not null default 'cho',
  het_han timestamptz not null,
  tru_diem boolean,
  ngoai_le boolean not null default false,
  pham_vi text,
  phan_loai text,
  nguoi_duyet text,
  tu_dong boolean not null default false,
  ly_do_tu_choi text,
  xu_ly_luc timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists grants (
  id text primary key,
  child_id text not null references children(id) on delete cascade,
  request_id text,
  phut int not null,
  ngoai_le boolean not null default false,
  ngay text not null,
  created_at timestamptz not null default now()
);
create table if not exists exceptions (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  child_id text not null references children(id) on delete cascade,
  parent_id text,
  loai text not null,
  ref text,
  created_at timestamptz not null default now()
);
create table if not exists alerts (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  child_id text,
  device_id text,
  loai text not null,
  muc text not null,
  noi_dung text not null,
  chi_tiet jsonb not null default '{}',
  khoa text,
  da_doc boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists alerts_khoa on alerts(family_id, khoa) where khoa is not null;
create table if not exists events (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  child_id text,
  device_id text,
  loai text not null,
  chi_tiet jsonb not null default '{}',
  nguoi text,
  seq bigserial,
  created_at timestamptz not null default now()
);
create index if not exists events_gd on events(family_id, created_at);
create table if not exists badges (
  child_id text not null references children(id) on delete cascade,
  ma text not null,
  dat_luc timestamptz not null default now(),
  primary key (child_id, ma)
);
create table if not exists ho_tro (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  tu text not null,
  nguoi text,
  noi_dung text not null,
  seq bigserial,
  created_at timestamptz not null default now()
);
create table if not exists messages (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  child_id text not null references children(id) on delete cascade,
  parent_id text,
  noi_dung text not null,
  phan_hoi text,
  created_at timestamptz not null default now()
);
`;
// Ghi chú cột (giá trị hợp lệ):
// children.nhom: nhi (6–10) | teen (11–16). children.cau_hinh: ghi đè tham số mục 10 cho riêng Con (lib/cau-hinh.ts kẹp min–max).
// children.lich: { ngayHoc: Khung[], cuoiTuan: Khung[], ngu: Khung } — rỗng = theo gia đình / mặc định.
// devices.child_id null + dung_chung = máy dùng chung, chọn Con bằng PIN (FR-01.03).
// tasks.nhom: doc_sach | viec_nha | hoc_tap | van_dong | ky_nang | khac. tasks.bang_chung: anh | video | ghi_am | van_ban | tu_dong.
// tasks.kieu: thuong | mot_lan | thu_thach. submissions.trang_thai (Phụ lục A.1): dang_lam | cho_duyet | can_bo_sung | duoc_duyet | tu_choi |
//   het_han | huy. submissions.nguon: con | aiirob | ba_me (giao xong ghi tay). submissions.ref: mã bài AiiRob (một lần / bài).
// points.loai: nhiem_vu | phien | doi_qua | hoan | tay | chao_mung | voucher | ngoai_le.
// rewards.loai: phut | voucher | qua | dac_quyen | tiet_kiem. redemptions.trang_thai: giu (chờ Ba Mẹ trao) | da_trao | huy | xong.
// vouchers.trang_thai (Phụ lục A.4): cho_xac_nhan | da_phat_hanh | da_dung | het_han | thu_hoi. quy_gd.loai: nap | phat_hanh | hoan.
// app_rules.het: null = vĩnh viễn; có giá trị = phê duyệt «Lần này / Hôm nay» hết hạn lúc đó. usage.loai: hoc | giai_tri | he_thong | chua_phan_loai.
// app_rules.muc: tên miền (vd youtube.com) hoặc định danh app (vd roblox.exe, com.roblox.client); child_id '' = cả gia đình.
//   app_rules.loai: hoc | giai_tri | chan. app_rules.nhom: game | video_ngan | mxh | phim_gd | khac (giá điểm/phút theo nhóm).
// play_sessions.trang_thai (Phụ lục A.3): chay | tam | ket_thuc. requests.loai: them_gio | mo_web | cai_app | ngoai_le | ngoai_gio | khac.
//   requests.trang_thai (A.2): cho | dong_y | tu_choi | het_han | huy | da_thuc_thi. requests.pham_vi: lan_nay | hom_nay | vinh_vien.
// alerts.muc: thong_tin | chu_y | nghiem_trong. alerts.khoa: chặn báo trùng (vd «ngoai_le_mem:2026-W43:<con>»).

// ---------------------------------------------------------------- M5 quầy AiiCafe + cổng admin (lib/admin.ts tự chạy khối này một lần)
// staff.vai: quay (Nhân viên AiiCafe — chỉ màn /quay) | admin (AiiLab — /admin, dùng được cả /quay). Tạo bằng scripts/tao-tai-khoan.ts
// (mật khẩu đọc từ biến môi trường, không nằm trong mã). he_thong: khoá 'tham_so' (mặc định hệ thống mục 10), 'allowlist_them' (mục thêm
// vào Allowlist hệ thống). mau_he_thong.loai: nhiem_vu | qua; nhom: nhi | teen | '' (quà). audit.hanh_dong: dang_nhap, nap_quy, quet_voucher…
export const SCHEMA_M5 = `
create table if not exists staff (
  id text primary key,
  ten_dang_nhap text not null unique,
  ten text not null,
  vai text not null,
  quay text not null default '',
  pass_hash text not null,
  sai_lien int not null default 0,
  khoa_den timestamptz,
  bat boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists staff_sessions (
  id text primary key,
  staff_id text not null references staff(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists audit (
  id text primary key,
  staff_id text,
  vai text,
  hanh_dong text not null,
  family_id text,
  chi_tiet jsonb not null default '{}',
  seq bigserial,
  created_at timestamptz not null default now()
);
create index if not exists audit_luc on audit(created_at);
create table if not exists he_thong (
  khoa text primary key,
  gia_tri jsonb not null default '{}',
  nguoi text,
  updated_at timestamptz not null default now()
);
create table if not exists mau_he_thong (
  id text primary key,
  loai text not null,
  nhom text not null default '',
  du_lieu jsonb not null,
  bat boolean not null default true,
  created_at timestamptz not null default now()
)
`;

// ================================================================ M4b — độ bền máy con (chỉ thêm). Tạo lười trong lib/tuan-thu.ts
// (bangM4b) để không đổi chuỗi SCHEMA chung. Mỗi câu một lệnh, ngăn bằng dòng trống + «;».
// tuan_thu_may: nhịp cuối + vấn đề tuân thủ của từng máy (van_de: [{loai, tru, ...}]), mở khẩn cấp do Ba Mẹ cấp (có hạn),
//   tài khoản quản trị Ba Mẹ đã xác nhận là của mình (admin_tin_cay). tat_luc: agent báo tắt/ngủ sạch ⇒ im lặng sau đó không phải «ngoài vòng».
// lenh_may: lệnh máy chủ ⇒ agent (loai: go). trang_thai: cho | xong | huy (Ba Mẹ xoá hẳn máy / máy đã gỡ). Giữ cả khi máy đã xoá (token_hash) ⇒ agent báo «xong» lần hai vẫn ok.
// goi_cai: token ghép nhúng trong gói cài (một lần, có hạn, chỉ lưu băm).
export const SCHEMA_M4B = [
  `create table if not exists tuan_thu_may (
    device_id text primary key references devices(id) on delete cascade,
    family_id text not null references families(id) on delete cascade,
    nhip_cuoi timestamptz,
    phien_ban text,
    nhip jsonb not null default '{}',
    van_de jsonb not null default '[]',
    diem int not null default 100,
    tat_luc timestamptz,
    ngoai_vong_tu timestamptz,
    mo_khan_cap_den timestamptz,
    mo_khan_cap_nguoi text,
    mo_khan_cap_ly_do text,
    admin_tin_cay jsonb not null default '[]',
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists lenh_may (
    id text primary key,
    family_id text not null references families(id) on delete cascade,
    device_id text not null,
    token_hash text not null,
    loai text not null,
    trang_thai text not null default 'cho',
    nguoi text,
    created_at timestamptz not null default now(),
    xong_luc timestamptz
  )`,
  `create index if not exists lenh_may_cho on lenh_may(device_id) where trang_thai = 'cho'`,
  `create table if not exists goi_cai (
    token_hash text primary key,
    family_id text not null references families(id) on delete cascade,
    child_id text,
    platform text not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    device_id text,
    nguoi text,
    created_at timestamptz not null default now()
  )`,
  // Mã mở offline: bí mật chung cấp lúc ghép máy để agent tự tính/kiểm mã TOTP khi mất mạng (lib/ma-offline.ts).
  `alter table devices add column if not exists offline_secret text`,
  // Chế độ agent do Ba Mẹ chọn từ xa (lib/lenh-may.ts › datCheDo): giam-sat = chỉ ghi lại, không chặn · chan = chặn thật.
  // Agent-win đọc `dong-bo.windows.cheDo` (giá trị máy chủ thắng CheDo cục bộ) — chỉ gửi khi che_do_ba_me (dưới).
  `alter table devices add column if not exists che_do text not null default 'giam-sat'`,
  // che_do_ba_me: Ba Mẹ đã chọn chế độ chưa. Chưa ⇒ máy chủ không gửi cheDo (agent giữ chế độ đang chạy) và app hiện chế độ agent báo
  // (status.cheDo) — máy cũ cài sẵn «chặn» không bị hiện nhầm «giám sát» hay lặng lẽ tụt về giám sát.
  `alter table devices add column if not exists che_do_ba_me boolean not null default false`,
  // grants.cua_so_den: «thêm giờ» duyệt cho lời xin từ MÁY WINDOWS = cửa sổ mở tự do tới giờ này (lib/yeu-cau.ts › dongY), đẩy xuống agent qua
  // dong-bo.windows (mode tu_do + grantEndsAt). Phút của cửa sổ KHÔNG còn tính vào «thưởng» của phiên điểm (tránh dùng hai lần). Null = thưởng như cũ.
  `alter table grants add column if not exists cua_so_den timestamptz`,
  // Giám sát WEB (agent đọc lịch sử trình duyệt của Con, lib/web.ts): CHỈ tên miền (gốc, bỏ www) + số lần mở + số giây ở trang theo ngày —
  // không lưu URL đầy đủ, tiêu đề trang hay nội dung. Agent gửi TỔNG của ngày (greatest ⇒ gửi lại không cộng đôi). Giữ 90 ngày.
  // child_id có thể rỗng: máy dùng chung khi chưa biết Con nào đang dùng.
  `create table if not exists web_nhat_ky (
    device_id text not null references devices(id) on delete cascade,
    child_id text,
    ngay text not null,
    ten_mien text not null,
    so_lan int not null default 0,
    giay int not null default 0,
    lan_cuoi timestamptz,
    primary key (device_id, ngay, ten_mien)
  )`,
  `create index if not exists web_nhat_ky_con on web_nhat_ky(child_id, ngay)`,
];

// ================================================================ M4b kiểm soát MẠNG (chỉ thêm). Tạo lười trong lib/dns-gia-dinh.ts.
// dns_gia_dinh: nhà cung cấp DNS của gia đình (tu_host | nextdns) + mã hồ sơ NextDNS do Ba Mẹ tự nhập (không lưu khoá API).
// dns_thiet_bi: thiết bị đi qua resolver lọc — loai: agent (máy có AiiGrow, device_id) | tv | console | khac («máy con loại mạng»).
//   nhan: nhãn ngắn trong hostname DoT / đường DoH để resolver biết thiết bị. truy_van_cuoi: lần cuối resolver thấy truy vấn.
// dns_nhat_ky: nhật ký TÓM TẮT — chỉ tên miền + số lần (+ số lần bị chặn) theo ngày; không lưu URL, nội dung, giờ từng truy vấn.
export const SCHEMA_M4B_MANG = [
  `create table if not exists dns_gia_dinh (
    family_id text primary key references families(id) on delete cascade,
    nha_cung_cap text not null default 'tu_host',
    ho_so_ngoai text,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists dns_thiet_bi (
    id text primary key,
    family_id text not null references families(id) on delete cascade,
    child_id text,
    device_id text unique,
    ten text not null,
    loai text not null,
    mac text,
    nhan text not null unique,
    truy_van_cuoi timestamptz,
    mat_bao_luc timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists dns_nhat_ky (
    thiet_bi_id text not null references dns_thiet_bi(id) on delete cascade,
    ngay text not null,
    ten_mien text not null,
    so_lan int not null default 0,
    so_lan_chan int not null default 0,
    ngoai_gio int not null default 0,
    primary key (thiet_bi_id, ngay, ten_mien)
  )`,
];

// ================================================================ Thành viên gia đình + thông báo trong app (chỉ thêm). Tạo lười trong
// lib/thanh-vien.ts (bangTvTb) — không đổi chuỗi SCHEMA chung.
// loi_moi: lời mời Ba / Mẹ / Ông Bà vào gia đình (FR-01.04) — mã một lần, hạn 72 giờ, CHỈ lưu băm; vai: duyet | xem.
// ba_me_tb: thiết lập thông báo của TỪNG Ba Mẹ (FR-08.01): đọc đến lúc nào, giờ yên lặng {bat, tu, den}, nhóm tắt [].
// parents.vai = 'roi': thành viên đã bị chủ gia đình mời ra — giữ dòng để lịch sử «ai duyệt» còn tên, mọi phiên bị xoá.
export const SCHEMA_TV_TB = [
  `create table if not exists loi_moi (
    id text primary key,
    family_id text not null references families(id) on delete cascade,
    ma_hash text not null unique,
    vai text not null,
    ten_goi text not null default '',
    nguoi text,
    het timestamptz not null,
    dung_luc timestamptz,
    dung_boi text,
    huy_luc timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists ba_me_tb (
    parent_id text primary key references parents(id) on delete cascade,
    doc_den timestamptz,
    yen_lang jsonb not null default '{}',
    tat jsonb not null default '[]',
    updated_at timestamptz not null default now()
  )`,
  // dong_bang_chuoi: ngày Ba Mẹ «đóng băng» chuỗi ngày của Con (FR-03.06, tối đa 1 lần/tuần) — ngày đó không làm đứt chuỗi.
  `create table if not exists dong_bang_chuoi (
    child_id text not null references children(id) on delete cascade,
    ngay text not null,
    nguoi text,
    created_at timestamptz not null default now(),
    primary key (child_id, ngay)
  )`,
];
