const { pakrt, buatSheet, dasar, teksTerakhir } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

describe("handleWarga", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
  });

  test("sheet kosong -> 0 KK dan 0 jiwa", () => {
    setSpreadsheet({});
    pakrt.handleWarga(1, "/warga", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("KK aktif: *0*");
    expect(text).toContain("Total jiwa: *0*");
  });

  test("menghitung KK aktif dan jiwa dari Anggota", () => {
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
          { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif" },
          { id_kk: "KK-003", no_rumah: "A3", nama_kk: "Lama", status: "Pindah" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
          { id_kk: "KK-002", nama: "Siti", hubungan: "Kepala Keluarga", jenis_kelamin: "P", status: "Aktif" },
          { id_kk: "KK-003", nama: "Lama", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
        ]),
      })
    );
    pakrt.handleWarga(1, "/warga", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("KK aktif: *2*");
    expect(text).toContain("Total jiwa: *3*");
    expect(text).toContain("Laki-laki: 1 · Perempuan: 2");
  });

  test("/warga <id_kk> menampilkan detail KK dan anggota", () => {
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2026-01" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
        ]),
      })
    );
    pakrt.handleWarga(1, "/warga KK-001", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Budi");
    expect(text).toContain("Rina");
    expect(text).toContain("Anggota (2)");
  });

  test("identifier tidak ditemukan -> pesan error", () => {
    setSpreadsheet(dasar());
    pakrt.handleWarga(1, "/warga KK-999", "X", 1);
    expect(teksTerakhir()).toContain("tidak ditemukan");
  });
});
