const { pakrt, buatSheet, dasar, admin, teksTerakhir, semuaTeks, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif" },
          ]),
          TelegramUser: buatSheet("TelegramUser", []),
        },
        extra || {}
      )
    )
  );
}

function telegram(rows) {
  return buatSheet("TelegramUser", rows);
}

describe("handleVerifikasi / handleTolak / handleCabut", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("perintah non-admin ditolak", () => {
    setup();
    pakrt.handleVerifikasi(1, "/verifikasi KK-001", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
    pakrt.handleTolak(1, "/tolak KK-001", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
    pakrt.handleCabut(1, "/cabut KK-001", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("tanpa argumen -> petunjuk format", () => {
    admin();
    setup();
    pakrt.handleVerifikasi(1, "/verifikasi", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
    pakrt.handleTolak(1, "/tolak", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
    pakrt.handleCabut(1, "/cabut", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("/verifikasi <id_kk> mengaktifkan & memberi tahu pemohon", () => {
    admin();
    setup({
      TelegramUser: telegram([
        { id_telegram: "77", username: "budi", nama: "Budi", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    pakrt.handleVerifikasi(1, "/verifikasi KK-001", "Pengurus", 1);
    const teks = semuaTeks();
    expect(teks[0]).toContain("Pengajuan disetujui");
    expect(teks[0]).toContain("id_telegram: `77`");
    expect(teks[teks.length - 1]).toContain("kini terhubung ke KK *KK-001*");
    const row = baca("TelegramUser")[0];
    expect(row.status).toBe("aktif");
    expect(row.diverifikasi_oleh).toBe("Pengurus");
    expect(pakrt.getKkTerhubung("77").length).toBe(1);
  });

  test("/verifikasi <id_telegram> saat pengajuan ambigu", () => {
    admin();
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "menunggu" },
        { id_telegram: "11", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    pakrt.handleVerifikasi(1, "/verifikasi KK-001", "Pengurus", 1);
    expect(teksTerakhir()).toContain("lebih dari satu");
    expect(baca("TelegramUser").filter((r) => r.status === "aktif").length).toBe(0);

    pakrt.handleVerifikasi(1, "/verifikasi 11", "Pengurus", 1);
    expect(semuaTeks().join("\n")).toContain("Pengajuan disetujui");
    const rows = baca("TelegramUser");
    expect(rows.filter((r) => r.status === "aktif").length).toBe(1);
    expect(rows.filter((r) => r.id_telegram === "11")[0].status).toBe("aktif");
    expect(rows.filter((r) => r.id_telegram === "10")[0].status).toBe("menunggu");
  });

  test("/verifikasi akun sudah aktif / tidak ada pengajuan -> error", () => {
    admin();
    setup({
      TelegramUser: telegram([{ id_telegram: "10", id_kk: "KK-001", status: "aktif" }]),
    });
    pakrt.handleVerifikasi(1, "/verifikasi KK-001", "X", 1);
    expect(teksTerakhir()).toContain("sudah aktif");
    pakrt.handleVerifikasi(1, "/verifikasi KK-002", "X", 1);
    expect(teksTerakhir()).toContain("Tidak ada pengajuan");
  });

  test("/tolak menolak pengajuan & memberi tahu pemohon", () => {
    admin();
    setup({
      TelegramUser: telegram([
        { id_telegram: "77", username: "budi", nama: "Budi", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    pakrt.handleTolak(1, "/tolak KK-001", "Pengurus", 1);
    const teks = semuaTeks();
    expect(teks[0]).toContain("Pengajuan ditolak");
    expect(teks[teks.length - 1]).toContain("ditolak pengurus");
    const row = baca("TelegramUser")[0];
    expect(row.status).toBe("ditolak");
    expect(row.diverifikasi_oleh).toBe("Pengurus");
  });

  test("/tolak akun aktif -> arahkan /cabut", () => {
    admin();
    setup({
      TelegramUser: telegram([{ id_telegram: "10", id_kk: "KK-001", status: "aktif" }]),
    });
    pakrt.handleTolak(1, "/tolak KK-001", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan /cabut");
  });

  test("/cabut memutus semua akun aktif & memberi tahu masing-masing", () => {
    admin();
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "11", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "12", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    pakrt.handleCabut(1, "/cabut KK-001", "Pengurus", 1);
    const teks = semuaTeks();
    expect(teks[0]).toContain("Keterkaitan dicabut");
    expect(teks[0]).toContain("Jumlah akun: *2*");
    expect(teks.filter((t) => t.indexOf("telah dicabut pengurus") >= 0).length).toBe(2);
    const rows = baca("TelegramUser");
    expect(rows.filter((r) => r.status === "dicabut").length).toBe(2);
    expect(rows.filter((r) => r.status === "menunggu").length).toBe(1);
    expect(pakrt.getKkTerhubung("10")).toEqual([]);
  });

  test("/cabut tanpa keterkaitan aktif -> error", () => {
    admin();
    setup({
      TelegramUser: telegram([{ id_telegram: "10", id_kk: "KK-001", status: "menunggu" }]),
    });
    pakrt.handleCabut(1, "/cabut KK-001", "X", 1);
    expect(teksTerakhir()).toContain("Tidak ada keterkaitan aktif");
  });
});
