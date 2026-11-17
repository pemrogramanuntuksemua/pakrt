const { pakrt, buatSheet, dasar, baca } = require("./helpers/fixtures");
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
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
            { id_kk: "KK-002", nama: "Siti", hubungan: "Kepala Keluarga", jenis_kelamin: "P", status: "Aktif" },
          ]),
          TarifIuran: buatSheet("TarifIuran", [
            { berlaku_mulai: "2024-01", nominal: 50000, keterangan: "awal" },
          ]),
          Tagihan: buatSheet("Tagihan", [
            { periode: "2024-01", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "lunas" },
            { periode: "2024-01", id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", nominal: 50000, status: "belum" },
          ]),
          Kas: buatSheet("Kas", [
            { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 5000, alokasi: "kasrt" },
            { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 5000, alokasi: "dkmt" },
            { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 40000, alokasi: "kamsih" },
          ]),
        },
        extra || {}
      )
    )
  );
}

describe("tutup buku", () => {
  test("menutup bulan: snapshot total + per kantong", () => {
    setup();
    const hasil = pakrt.tutupBuku("2024-01", "Bendahara");
    expect(hasil.rekap.totalKK).toBe(2);
    expect(hasil.rekap.totalTagihan).toBe(100000);
    expect(hasil.rekap.terbayar).toBe(50000);
    expect(hasil.rekap.tunggakan).toBe(50000);
    expect(hasil.rekap.totalJiwa).toBe(2);

    const tb = baca("TutupBuku");
    expect(tb.length).toBe(1);
    expect(tb[0].periode).toBe("2024-01");
    expect(tb[0].jenis).toBe("bulan");
    expect(tb[0].total_masuk).toBe(50000);
    expect(tb[0].total_keluar).toBe(0);
    expect(tb[0].saldo_akhir).toBe(50000);

    const alokasi = baca("TutupBukuAlokasi");
    expect(alokasi.length).toBe(3);
    const totalAlokasi = alokasi.reduce((t, a) => t + Number(a.saldo_akhir), 0);
    expect(totalAlokasi).toBe(50000);
    expect(alokasi.filter((a) => a.kode === "kamsih")[0].saldo_akhir).toBe(40000);
    expect(pakrt.isPeriodeTertutup("2024-01")).toBe(true);
  });

  test("tutup dobel ditolak", () => {
    setup();
    pakrt.tutupBuku("2024-01", "Bendahara");
    expect(() => pakrt.tutupBuku("2024-01", "Bendahara")).toThrow(/sudah ditutup/);
  });

  test("transaksi di periode tertutup ditolak (soft lock)", () => {
    setup();
    pakrt.tutupBuku("2024-01", "Bendahara");
    expect(() =>
      pakrt.tambahKasManual("masuk", "kasrt", 1000, "Telat", "X", new Date(2024, 0, 20))
    ).toThrow(/ditutup/);
  });

  test("tutup buku tahunan ditolak jika ada bulan belum ditutup", () => {
    setup();
    pakrt.tutupBuku("2024-01", "Bendahara");
    expect(() => pakrt.tutupBuku("2024", "Bendahara")).toThrow(/belum ditutup/);
  });

  test("tutup buku tahunan setelah 12 bulan", () => {
    const bulan = [];
    const alokasi = [];
    for (let b = 1; b <= 12; b++) {
      const p = "2024-" + String(b).padStart(2, "0");
      bulan.push({
        periode: p,
        jenis: "bulan",
        tarif: 50000,
        total_kk: 2,
        total_jiwa: 2,
        total_tagihan: 100000,
        total_terbayar: 50000,
        total_masuk: 50000,
        total_keluar: 0,
        saldo_awal: 0,
        saldo_akhir: 50000,
      });
      alokasi.push(
        { periode: p, kode: "kasrt", saldo_awal: 0, masuk: 5000, keluar: 0, pindah_masuk: 0, pindah_keluar: 0, saldo_akhir: 5000 },
        { periode: p, kode: "dkmt", saldo_awal: 0, masuk: 5000, keluar: 0, pindah_masuk: 0, pindah_keluar: 0, saldo_akhir: 5000 },
        { periode: p, kode: "kamsih", saldo_awal: 0, masuk: 40000, keluar: 0, pindah_masuk: 0, pindah_keluar: 0, saldo_akhir: 40000 }
      );
    }
    setup({
      TutupBuku: buatSheet("TutupBuku", bulan),
      TutupBukuAlokasi: buatSheet("TutupBukuAlokasi", alokasi),
    });
    const hasil = pakrt.tutupBuku("2024", "Bendahara");
    expect(hasil.jenis).toBe("tahun");
    const tahunan = baca("TutupBuku").filter((t) => t.jenis === "tahun");
    expect(tahunan.length).toBe(1);
    expect(tahunan[0].periode).toBe("2024");
    expect(tahunan[0].total_tagihan).toBe(1200000);
    const alokasiTahun = baca("TutupBukuAlokasi").filter((a) => a.periode === "2024");
    expect(alokasiTahun.length).toBe(3);
    expect(alokasiTahun.reduce((t, a) => t + Number(a.saldo_akhir), 0)).toBe(50000);
  });
});
