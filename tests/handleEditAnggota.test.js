const { pakrt, buatSheet, dasar, admin, teksTerakhir, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
          ]),
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "", tanggal_lahir: "", status: "Aktif" },
            { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", tanggal_lahir: "2010-05-01", status: "Aktif" },
          ]),
        },
        extra || {}
      )
    )
  );
}

function anggota(nama) {
  return baca("Anggota").filter((a) => a.nama === nama)[0];
}

describe("handleEditAnggota", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("non-admin ditolak", () => {
    setup();
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi#jk=L", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("format salah -> petunjuk", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(1, "/editanggota", "X", 1);
    expect(teksTerakhir()).toContain("Format Salah");
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi", "X", 1);
    expect(teksTerakhir()).toContain("Format Salah");
  });

  test("mengisi jk & tanggal lahir kepala keluarga", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi#jk=L#lahir=1990-01-01", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Anggota diperbarui");
    expect(text).toContain("KK-001");
    expect(text).toContain("Budi");
    expect(text).toContain("jenis_kelamin");
    expect(text).toContain("L");
    expect(text).toContain("1990-01-01");
    expect(anggota("Budi").jenis_kelamin).toBe("L");
    expect(anggota("Budi").tanggal_lahir).toBe("1990-01-01");
  });

  test("alias jenis_kelamin & tanggal_lahir diterima", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(
      1,
      "/editanggota KK-001#Rina#jenis_kelamin=P#tanggal_lahir=2011-03-04",
      "X",
      1
    );
    expect(anggota("Rina").jenis_kelamin).toBe("P");
    expect(anggota("Rina").tanggal_lahir).toBe("2011-03-04");
  });

  test("kolom tidak dikenal -> error", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi#warna=merah", "X", 1);
    expect(teksTerakhir()).toContain("tidak dikenal");
  });

  test("segmen tanpa '=' -> error", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi#jk", "X", 1);
    expect(teksTerakhir()).toContain("kolom=nilai");
  });

  test("nama tidak ditemukan -> error", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Tono#status=Pindah", "X", 1);
    expect(teksTerakhir()).toContain("tidak ditemukan");
  });

  test("rename kepala keluarga menyinkronkan nama KK", () => {
    admin();
    setup();
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi#nama=Budi Santoso", "X", 1);
    expect(teksTerakhir()).toContain("Budi Santoso");
    expect(pakrt.cariKeluarga("KK-001").nama_kk).toBe("Budi Santoso");
  });

  test("catatan '-' mengosongkan catatan", () => {
    admin();
    setup({
      Anggota: buatSheet("Anggota", [
        { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", status: "Aktif", catatan: "lama" },
      ]),
    });
    pakrt.handleEditAnggota(1, "/editanggota KK-001#Budi#catatan=-", "X", 1);
    expect(anggota("Budi").catatan).toBe("");
  });
});
