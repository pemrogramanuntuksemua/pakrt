const { pakrt, buatSheet, dasar, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function keluarga(rows) {
  return buatSheet("Keluarga", rows);
}

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: keluarga([
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2026-01" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif", mulai_iuran: "2026-03" },
            { id_kk: "KK-003", no_rumah: "A3", nama_kk: "Pindah", status: "Pindah", mulai_iuran: "2026-01" },
          ]),
          TarifIuran: buatSheet("TarifIuran", [
            { berlaku_mulai: "2026-01", nominal: 50000, keterangan: "awal" },
            { berlaku_mulai: "2026-03", nominal: 60000, keterangan: "naik" },
          ]),
        },
        extra || {}
      )
    )
  );
}

describe("ledger tagihan", () => {
  test("pastikanTagihan hanya membuat untuk KK billable & idempoten", () => {
    setup();
    const pertama = pakrt.pastikanTagihan("2026-02");
    expect(pertama).toBe(1);
    const kedua = pakrt.pastikanTagihan("2026-02");
    expect(kedua).toBe(0);
    const rows = baca("Tagihan");
    expect(rows.length).toBe(1);
    expect(rows[0].id_kk).toBe("KK-001");
    expect(rows[0].nominal).toBe(50000);
    expect(rows[0].status).toBe("belum");
  });

  test("KK baru masuk di tengah tahun ditagih sejak mulai_iuran", () => {
    setup();
    pakrt.pastikanTagihan("2026-03");
    const rows = baca("Tagihan");
    expect(rows.map((r) => r.id_kk).sort()).toEqual(["KK-001", "KK-002"]);
    expect(rows.every((r) => r.nominal === 60000)).toBe(true);
  });

  test("backfill beberapa bulan sekaligus", () => {
    setup();
    const jumlah = pakrt.backfillTagihan("2026-01", "2026-04");
    expect(jumlah).toBe(6); // Jan 1, Feb 1, Mar 2, Apr 2
    expect(baca("Tagihan").length).toBe(6);
    expect(pakrt.backfillTagihan("2026-01", "2026-04")).toBe(0);
  });

  test("tidak membuat tagihan masa depan", () => {
    setup();
    expect(pakrt.pastikanTagihan("2099-01")).toBe(0);
    expect(baca("Tagihan").length).toBe(0);
  });

  test("tidak membuat tagihan untuk periode tertutup", () => {
    setup({
      TutupBuku: buatSheet("TutupBuku", [
        {
          periode: "2026-02",
          jenis: "bulan",
          tarif: 50000,
          total_kk: 1,
          total_jiwa: 1,
          total_tagihan: 50000,
          total_terbayar: 0,
          total_masuk: 0,
          total_keluar: 0,
          saldo_awal: 0,
          saldo_akhir: 0,
        },
      ]),
    });
    expect(pakrt.pastikanTagihan("2026-02")).toBe(0);
  });

  test("hitung tunggakan per KK & total", () => {
    setup();
    pakrt.backfillTagihan("2026-01", "2026-03");
    expect(pakrt.hitungTunggakanKK("KK-001", "2026-03")).toBe(50000 + 50000 + 60000);
    expect(pakrt.hitungTunggakanKK("KK-002", "2026-03")).toBe(60000);
    expect(pakrt.hitungTunggakan("2026-03")).toBe(220000);
  });

  test("KK pindah tidak mendapat tagihan baru tapi riwayat tetap", () => {
    setup({
      Tagihan: buatSheet("Tagihan", [
        { periode: "2026-01", id_kk: "KK-003", no_rumah: "A3", nama_kk: "Pindah", nominal: 50000, status: "belum" },
      ]),
    });
    pakrt.pastikanTagihan("2026-01");
    pakrt.pastikanTagihan("2026-02");
    const rows = baca("Tagihan").filter((r) => r.id_kk === "KK-003");
    expect(rows.length).toBe(1);
    expect(rows[0].periode).toBe("2026-01");
  });
});
