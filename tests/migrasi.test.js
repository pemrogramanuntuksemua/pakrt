const { pakrt, dasar } = require("./helpers/fixtures");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function kasLama(rows) {
  return createMockSheet([["tanggal", "keterangan", "jenis", "nominal"]].concat(rows || []), { name: "Kas" });
}

describe("migrasiKasAlokasi", () => {
  test("menambah header alokasi/ref dan mengisi default kasrt", () => {
    const kas = kasLama([
      [new Date(2024, 0, 5), "Iuran", "masuk", 50000],
      [new Date(2024, 0, 6), "ATK", "keluar", 10000],
    ]);
    setSpreadsheet({ Kas: kas });

    const hasil = pakrt.migrasiKasAlokasi();

    expect(hasil.diubah).toBe(2);
    expect(hasil.dryRun).toBe(false);
    expect(kas._data[0]).toEqual(["tanggal", "keterangan", "jenis", "nominal", "alokasi", "ref"]);
    const rows = pakrt.getKas();
    expect(rows.length).toBe(2);
    expect(rows.every((j) => j.alokasi === "kasrt")).toBe(true);
    expect(rows.every((j) => j.ref.indexOf("LEGACY-") === 0)).toBe(true);
  });

  test("dryRun tidak mengubah sheet", () => {
    const kas = kasLama([[new Date(2024, 0, 5), "Iuran", "masuk", 50000]]);
    setSpreadsheet({ Kas: kas });

    const hasil = pakrt.migrasiKasAlokasi(true);

    expect(hasil.dryRun).toBe(true);
    expect(hasil.diubah).toBe(1);
    expect(kas._data[0]).toEqual(["tanggal", "keterangan", "jenis", "nominal"]);
    expect(kas._data[1].length).toBe(4);
  });

  test("baris yang sudah punya alokasi tidak ditimpa", () => {
    const kas = createMockSheet(
      [
        ["tanggal", "keterangan", "jenis", "nominal", "alokasi", "ref"],
        [new Date(2024, 0, 5), "Iuran", "masuk", 5000, "dkmt", "BYR-1"],
        [new Date(2024, 0, 6), "Iuran", "masuk", 50000, "", ""],
      ],
      { name: "Kas" }
    );
    setSpreadsheet({ Kas: kas });

    const hasil = pakrt.migrasiKasAlokasi();

    expect(hasil.diubah).toBe(1);
    expect(hasil.dilewati).toBe(1);
    const rows = pakrt.getKas();
    expect(rows[0].alokasi).toBe("dkmt");
    expect(rows[0].ref).toBe("BYR-1");
    expect(rows[1].alokasi).toBe("kasrt");
  });

  test("tab Kas tidak ada -> pesan", () => {
    setSpreadsheet({});
    const hasil = pakrt.migrasiKasAlokasi();
    expect(hasil.pesan).toContain("tidak ada");
    expect(hasil.diubah).toBe(0);
  });
});

function wargaLama(rows) {
  return createMockSheet(
    [["nama", "no_hp", "no_rumah", "jenis_kelamin", "alamat", "catatan"]].concat(rows || []),
    { name: "Warga" }
  );
}

describe("migrasiWarga", () => {
  test("memindahkan Warga lama ke Keluarga + Anggota", () => {
    const warga = wargaLama([
      ["Budi", "0812", "A1", "L", "Jl. Mawar", ""],
      ["Siti", "0813", "A2", "P", "Jl. Melati", "catatan"],
    ]);
    setSpreadsheet(dasar({ Warga: warga }));

    const hasil = pakrt.migrasiWarga();

    expect(hasil.dibuat).toBe(2);
    expect(hasil.error).toBe(0);
    const keluarga = pakrt.getKeluarga();
    expect(keluarga.length).toBe(2);
    expect(keluarga.map((k) => k.id_kk)).toEqual(["KK001", "KK002"]);
    expect(keluarga[0].nama_kk).toBe("Budi");
    expect(keluarga[0].no_rumah).toBe("A1");
    const anggota = pakrt.bacaTabel("Anggota").rows;
    expect(anggota.length).toBe(2);
    expect(anggota[0].hubungan).toBe("Kepala Keluarga");
    expect(anggota[1].jenis_kelamin).toBe("P");
    expect(warga.getName()).toBe("Warga_lama");
  });

  test("baris duplikat & tidak lengkap dilewati/dihitung error", () => {
    const warga = wargaLama([
      ["Budi", "0812", "A1", "L", "", ""],
      ["", "0813", "A2", "P", "", ""],
    ]);
    setSpreadsheet(dasar({ Warga: warga }));

    pakrt.migrasiWarga();
    const ulang = pakrt.migrasiWarga();

    expect(ulang.dibuat).toBe(0);
    expect(ulang.dilewati).toBe(1);
    expect(ulang.error).toBe(1);
    expect(pakrt.getKeluarga().length).toBe(1);
  });

  test("dryRun hanya menghitung", () => {
    const warga = wargaLama([["Budi", "0812", "A1", "L", "", ""]]);
    setSpreadsheet(dasar({ Warga: warga }));

    const hasil = pakrt.migrasiWarga(true);

    expect(hasil.dryRun).toBe(true);
    expect(hasil.dibuat).toBe(1);
    expect(pakrt.getKeluarga().length).toBe(0);
    expect(warga.getName()).toBe("Warga");
  });

  test("tab Warga tidak ada -> pesan", () => {
    setSpreadsheet(dasar());
    const hasil = pakrt.migrasiWarga();
    expect(hasil.pesan).toContain("tidak ada");
  });
});
