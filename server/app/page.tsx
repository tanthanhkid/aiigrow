// Trang gốc máy chủ: chỉ là cửa vào. App Ba Mẹ / màn Con là app Expo (mobile/); quầy AiiCafe ở /quay, quản trị ở /admin (mốc M5).
export default function TrangGoc() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px" }}>
      <img src="/logo.svg" alt="AiiGrow" width={160} />
      <h1 style={{ fontSize: 24 }}>Lớn lên bằng yêu thương, nhận bằng nỗ lực</h1>
      <p>Máy chủ AiiGrow đang chạy. Ba Mẹ dùng app AiiGrow trên điện thoại hoặc trình duyệt.</p>
    </main>
  );
}
