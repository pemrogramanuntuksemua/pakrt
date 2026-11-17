const { pakrt, buatSheet, dasar, baca } = require("./helpers/fixtures");
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
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "", tanggal_lahir: "", status: "Aktif" },
            { id_kk: "KK-001", nama: "Rina", hubungan: "Istri", jenis_kelamin: "P", tanggal_lahir: "2010-05-01", status: "Aktif" },
            { id_kk: "KK-002", nama: "Siti", hubungan: "Kepala Keluarga", jenis_kelamin: "P", tanggal_lahir: "1985-02-02", status: "Aktif" },
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

describe("ubahAnggota", () => {
  test("mengisi jenis kelamin & tanggal lahir kepala keluarga", () => {
    setup();
    const hasil = pakrt.ubahAnggota("KK-001", "Budi", {
      jenis_kelamin: "l",
      tanggal_lahir: "1990-01-01",
    });
    expect(hasil.perubahan.jenis_kelamin).toBe("L");
    expect(hasil.perubahan.tanggal_lahir).toBe("1990-01-01");
    const row = anggota("Budi");
    expect(row.jenis_kelamin).toBe("L");
    expect(row.tanggal_lahir).toBe("1990-01-01");
  });

  test("menerima alias laki-laki / perempuan", () => {
    setup();
    pakrt.ubahAnggota("KK-001", "Rina", { jenis_kelamin: "perempuan" });
    expect(anggota("Rina").jenis_kelamin).toBe("P");
  });

  test("jenis kelamin tidak valid -> error", () => {
    setup();
    expect(() => pakrt.ubahAnggota("KK-001", "Budi", { jenis_kelamin: "X" })).toThrow(
      /harus L atau P/
    );
  });

  test("tanggal lahir tidak valid -> error, '-' mengosongkan", () => {
    setup();
    expect(() => pakrt.ubahAnggota("KK-001", "Budi", { tanggal_lahir: "kemarin" })).toThrow(
      /tidak valid/
    );
    pakrt.ubahAnggota("KK-001", "Rina", { tanggal_lahir: "-" });
    expect(anggota("Rina").tanggal_lahir).toBe("");
  });

  test("rename anggota biasa tidak menyentuh nama KK", () => {
    setup();
    pakrt.ubahAnggota("KK-001", "Rina", { nama: "Rina Wati" });
    expect(anggota("Rina Wati")).toBeDefined();
    expect(pakrt.cariKeluarga("KK-001").nama_kk).toBe("Budi");
  });

  test("rename kepala keluarga menyinkronkan Keluarga.nama_kk", () => {
    setup();
    pakrt.ubahAnggota("KK-001", "Budi", { nama: "Budi Santoso" });
    expect(anggota("Budi Santoso")).toBeDefined();
    expect(pakrt.cariKeluarga("KK-001").nama_kk).toBe("Budi Santoso");
  });

  test("rename ke nama yang sudah dipakai -> error", () => {
    setup();
    expect(() => pakrt.ubahAnggota("KK-001", "Rina", { nama: "Budi" })).toThrow(
      /sudah dipakai/
    );
  });

  test("menjadikan anggota kedua sebagai kepala keluarga -> error", () => {
    setup();
    expect(() =>
      pakrt.ubahAnggota("KK-001", "Rina", { hubungan: "Kepala Keluarga" })
    ).toThrow(/sudah punya kepala keluarga/);
  });

  test("status dinormalisasi & divalidasi", () => {
    setup();
    pakrt.ubahAnggota("KK-001", "Rina", { status: "pindah" });
    expect(anggota("Rina").status).toBe("Pindah");
    expect(() => pakrt.ubahAnggota("KK-001", "Rina", { status: "hilang" })).toThrow(
      /Status harus/
    );
  });

  test("nama tidak ditemukan -> error berisi daftar anggota", () => {
    setup();
    expect(() => pakrt.ubahAnggota("KK-001", "Tono", { status: "Pindah" })).toThrow(
      /tidak ditemukan.*Budi, Rina/
    );
  });

  test("nama ganda dalam satu KK -> error", () => {
    setup({
      Anggota: buatSheet("Anggota", [
        { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", status: "Aktif" },
        { id_kk: "KK-001", nama: "Andi", hubungan: "Anak", status: "Aktif" },
        { id_kk: "KK-001", nama: "Andi", hubungan: "Anak", status: "Aktif" },
      ]),
    });
    expect(() => pakrt.ubahAnggota("KK-001", "Andi", { status: "Pindah" })).toThrow(
      /lebih dari satu|Ada 2 anggota/
    );
  });

  test("tanpa perubahan -> error", () => {
    setup();
    expect(() => pakrt.ubahAnggota("KK-001", "Budi", {})).toThrow(/Tidak ada perubahan/);
  });
});
