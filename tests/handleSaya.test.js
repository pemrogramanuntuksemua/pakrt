const { pakrt, buatSheet, dasar, admin, teksTerakhir, semuaTeks } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2024-01" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif", mulai_iuran: "2024-01" },
          ]),
          Tagihan: buatSheet("Tagihan", [
            { periode: "2024-01", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "belum" },
            { periode: "2024-02", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "lunas", tanggal_bayar: new Date(2024, 1, 9) },
            { periode: "2024-01", id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", nominal: 50000, status: "belum" },
          ]),
          TelegramUser: buatSheet("TelegramUser", []),
        },
        extra || {}
      )
    )
  );
}

describe("handleSaya", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("di grup/chat non-DM ditolak", () => {
    setup();
    pakrt.handleSaya(-100123, "/saya", "Budi", 77);
    expect(teksTerakhir()).toContain("hanya bisa dipakai lewat DM");
  });

  test("akun tanpa keterkaitan -> arahan /gabung", () => {
    setup();
    pakrt.handleSaya(77, "/saya", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("belum terhubung");
    expect(text).toContain("/gabung");
  });

  test("satu keterkaitan aktif -> tampilkan KK & ajakan /tagihan", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", username: "budi", nama: "Budi", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleSaya(77, "/saya", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("Akun Telegram Anda");
    expect(text).toContain("`77`");
    expect(text).toContain("KK-001");
    expect(text).toContain("Budi");
    expect(text).toContain("✅ aktif");
    expect(text).toContain("/tagihan");
  });

  test("beberapa keterkaitan dengan status berbeda ditampilkan semua", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "77", id_kk: "KK-002", status: "menunggu" },
      ]),
    });
    pakrt.handleSaya(77, "/saya", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("KK-001");
    expect(text).toContain("KK-002");
    expect(text).toContain("✅ aktif");
    expect(text).toContain("⏳ menunggu");
  });

  test("status ditolak & dicabut ditampilkan", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "ditolak" },
        { id_telegram: "77", id_kk: "KK-002", status: "dicabut" },
      ]),
    });
    pakrt.handleSaya(77, "/saya", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("❌ ditolak");
    expect(text).toContain("⛔ dicabut");
    expect(text).toContain("Menunggu verifikasi pengurus");
  });

  test("hanya menampilkan baris milik akun sendiri", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "88", id_kk: "KK-002", status: "aktif" },
      ]),
    });
    pakrt.handleSaya(77, "/saya", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("KK-001");
    expect(text).not.toContain("KK-002");
  });
});

describe("warga memakai /tagihan & /tunggakan", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("/tagihan di grup ditolak untuk non-admin", () => {
    setup();
    pakrt.handleTagihan(-100123, "/tagihan", "Budi", 77);
    expect(teksTerakhir()).toContain("hanya bisa dipakai lewat DM");
  });

  test("/tagihan tanpa argumen & satu KK -> rincian KK-nya", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleTagihan(77, "/tagihan", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("TAGIHAN KK-001 — Budi");
    expect(text).toContain("2024-01");
    expect(text).toContain("Total tunggakan: *Rp 50.000*");
  });

  test("/tagihan tanpa argumen & banyak KK -> ringkasan", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "77", id_kk: "KK-002", status: "aktif" },
      ]),
    });
    pakrt.handleTagihan(77, "/tagihan", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("terhubung ke 2 KK");
    expect(text).toContain("KK-001");
    expect(text).toContain("KK-002");
    expect(text).toContain("/tagihan <id_kk>");
  });

  test("/tagihan KK lain ditolak", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleTagihan(77, "/tagihan KK-002", "Budi", 77);
    expect(teksTerakhir()).toContain("hanya bisa melihat tagihan KK yang terhubung");
  });

  test("/tagihan KK sendiri via id_kk diizinkan", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleTagihan(77, "/tagihan KK-001", "Budi", 77);
    expect(teksTerakhir()).toContain("TAGIHAN KK-001");
  });

  test("/tagihan keterkaitan menunggu belum bisa dipakai", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    pakrt.handleTagihan(77, "/tagihan", "Budi", 77);
    expect(teksTerakhir()).toContain("belum terhubung");
  });

  test("/tunggakan tanpa argumen & satu KK -> tunggakan KK-nya", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleTunggakan(77, "/tunggakan", "Budi", 77);
    const text = teksTerakhir();
    expect(text).toContain("TUNGGAKAN KK-001");
    expect(text).toContain("2024-01");
    expect(text).toContain("Total: *Rp 50.000*");
  });

  test("/tunggakan KK lain ditolak", () => {
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleTunggakan(77, "/tunggakan KK-002", "Budi", 77);
    expect(teksTerakhir()).toContain("hanya bisa melihat tunggakan KK yang terhubung");
  });

  test("admin tetap melihat rekap global tanpa keterkaitan", () => {
    admin();
    setup();
    pakrt.handleTunggakan(1, "/tunggakan", "Pengurus", 1);
    const text = teksTerakhir();
    expect(text).toContain("TUNGGAKAN IURAN");
    expect(text).toContain("KK menunggak: *2*");
  });

  test("admin bebas melihat tagihan KK mana pun", () => {
    admin();
    setup();
    pakrt.handleTagihan(1, "/tagihan KK-002", "Pengurus", 1);
    expect(semuaTeks().join("\n")).toContain("TAGIHAN KK-002 — Siti");
  });
});
