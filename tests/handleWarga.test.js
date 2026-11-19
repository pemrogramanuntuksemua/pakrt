const { pakrt, buatSheet, dasar, teksTerakhir } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

describe("handleWarga", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
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

  test("/warga <id_kk> menampilkan detail untuk admin", () => {
    pakrt.setAdminIds([1]);
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2026-01", no_hp: "0812" },
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
    expect(text).toContain("0812");
    expect(text).toContain("Anggota (2)");
  });

  test("non-admin tanpa keterkaitan hanya melihat kartu ringkas tanpa No HP", () => {
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", no_hp: "0812" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
        ]),
      })
    );
    pakrt.handleWarga(1, "/warga KK-001", "X", 77);
    const text = teksTerakhir();
    expect(text).toContain("Jumlah anggota: 1");
    expect(text).not.toContain("0812");
    expect(text).toContain("/gabung KK-001");
  });

  test("akun terhubung di DM melihat kartu ringkas + nama anggota", () => {
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", no_hp: "0812", alamat: "Jl. Mawar", mulai_iuran: "2026-01" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
        ]),
        TelegramUser: buatSheet("TelegramUser", [
          { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
        ]),
      })
    );
    pakrt.handleWarga(1, "/warga KK-001", "X", 77);
    const text = teksTerakhir();
    expect(text).toContain("Anggota:*");
    expect(text).toContain("• Budi");
    expect(text).toContain("• Rina");
    expect(text).toContain("Jumlah anggota: 2");
    expect(text).toContain("Ketik /tagihan atau /tunggakan");
    expect(text).not.toContain("0812");
    expect(text).not.toContain("Jl. Mawar");
    expect(text).not.toContain("Mulai iuran");
    expect(text).not.toContain("Tunggakan:");
    expect(text).toContain("Kepala Keluarga");
    expect(text).not.toContain("/gabung");
  });

  test("akun terhubung di grup tidak menampilkan nama anggota", () => {
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", no_hp: "0812" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
        ]),
        TelegramUser: buatSheet("TelegramUser", [
          { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
        ]),
      })
    );
    pakrt.handleWarga(-100123, "/warga KK-001", "X", 77);
    const text = teksTerakhir();
    expect(text).toContain("Jumlah anggota: 2");
    expect(text).toContain("hanya ditampilkan lewat DM");
    expect(text).not.toContain("Rina");
    expect(text).not.toContain("0812");
  });

  test("admin di grup hanya melihat kartu ringkas tanpa No HP & nama", () => {
    pakrt.setAdminIds([1]);
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", no_hp: "0812" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
        ]),
      })
    );
    pakrt.handleWarga(-100123, "/warga KK-001", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Jumlah anggota: 2");
    expect(text).toContain("hanya ditampilkan lewat DM");
    expect(text).not.toContain("Rina");
    expect(text).not.toContain("0812");
  });

  test("nama anggota nonaktif tidak ditampilkan", () => {
    setSpreadsheet(
      dasar({
        Keluarga: buatSheet("Keluarga", [
          { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
        ]),
        Anggota: buatSheet("Anggota", [
          { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
          { id_kk: "KK-001", nama: "Almarhum", hubungan: "Ayah", jenis_kelamin: "L", status: "Meninggal" },
        ]),
        TelegramUser: buatSheet("TelegramUser", [
          { id_telegram: "77", id_kk: "KK-001", status: "aktif" },
        ]),
      })
    );
    pakrt.handleWarga(1, "/warga KK-001", "X", 77);
    const text = teksTerakhir();
    expect(text).toContain("Jumlah anggota: 2");
    expect(text).toContain("• Budi");
    expect(text).toContain("• Rina");
    expect(text).not.toContain("Almarhum");
  });

  test("identifier tidak ditemukan -> pesan error", () => {
    setSpreadsheet(dasar());
    pakrt.handleWarga(1, "/warga KK-999", "X", 1);
    expect(teksTerakhir()).toContain("tidak ditemukan");
  });
});
