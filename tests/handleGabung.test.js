const { pakrt, buatSheet, dasar, admin, teksTerakhir, semuaTeks, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
          ]),
          TelegramUser: buatSheet("TelegramUser", []),
        },
        extra || {}
      )
    )
  );
}

describe("handleGabung", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("di grup/chat non-DM ditolak", () => {
    setup();
    pakrt.handleGabung(-100123, "/gabung KK-001", "Budi", 77, "budi");
    expect(teksTerakhir()).toContain("hanya lewat DM");
    expect(baca("TelegramUser").length).toBe(0);
  });

  test("tanpa argumen -> petunjuk format", () => {
    setup();
    pakrt.handleGabung(77, "/gabung", "Budi", 77, "budi");
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("pengajuan sukses + DM ke semua admin", () => {
    admin();
    pakrt.setAdminIds([9, "10"]);
    setup();
    pakrt.handleGabung(77, "/gabung KK-001", "Budi", 77, "budi");
    const teks = semuaTeks();
    expect(teks[0]).toContain("Pengajuan terkirim");
    expect(teks[0]).toContain("KK-001");
    expect(teks.filter((t) => t.indexOf("Pengajuan Keterkaitan") >= 0).length).toBe(2);
    expect(teks.join("\n")).toContain("id_telegram");
    expect(teks.join("\n")).toContain("@budi");
    const rows = baca("TelegramUser");
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("menunggu");
    expect(rows[0].id_telegram).toBe("77");
  });

  test("notifikasi pengajuan juga dikirim ke admin tambahan", () => {
    pakrt.setAdminIds([]);
    setup({
      Setting: buatSheet("Setting", [
        { kunci: "admin_tambahan", nilai: "55", tipe: "teks", keterangan: "" },
      ]),
    });
    pakrt.handleGabung(77, "/gabung KK-001", "Budi", 77, "budi");
    const teks = semuaTeks();
    expect(teks[0]).toContain("Pengajuan terkirim");
    expect(teks.filter((t) => t.indexOf("Pengajuan Keterkaitan") >= 0).length).toBe(1);
  });

  test("pengajuan kedua tidak menambah baris & tidak DM ulang", () => {
    admin();
    pakrt.setAdminIds([9]);
    setup();
    pakrt.handleGabung(77, "/gabung KK-001", "Budi", 77, "budi");
    const setelahPertama = global.UrlFetchApp.fetch.mock.calls.length;
    pakrt.handleGabung(77, "/gabung KK-001", "Budi", 77, "budi");
    expect(teksTerakhir()).toContain("masih menunggu");
    expect(global.UrlFetchApp.fetch.mock.calls.length).toBe(setelahPertama + 1);
    expect(baca("TelegramUser").length).toBe(1);
  });

  test("akun yang sudah aktif diberi tahu", () => {
    admin();
    setup({
      TelegramUser: buatSheet("TelegramUser", [
        { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
      ]),
    });
    pakrt.handleGabung(77, "/gabung KK-001", "Budi", 77, "budi");
    expect(teksTerakhir()).toContain("sudah terhubung");
    expect(baca("TelegramUser").length).toBe(1);
  });

  test("KK tidak ditemukan / nonaktif -> error", () => {
    setup({
      Keluarga: buatSheet("Keluarga", [
        { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Pindah" },
      ]),
    });
    pakrt.handleGabung(77, "/gabung KK-001", "Budi", 77, "budi");
    expect(teksTerakhir()).toContain("tidak bisa dihubungkan");
    pakrt.handleGabung(77, "/gabung KK-999", "Budi", 77, "budi");
    expect(teksTerakhir()).toContain("tidak ditemukan");
    expect(baca("TelegramUser").length).toBe(0);
  });
});
