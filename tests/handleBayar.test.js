const { pakrt, buatSheet, dasar, admin, teksTerakhir, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2024-01" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Pindah", mulai_iuran: "2024-01" },
          ]),
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          ]),
          TarifIuran: buatSheet("TarifIuran", [
            { berlaku_mulai: "2024-01", nominal: 50000, keterangan: "awal" },
          ]),
          Tagihan: buatSheet("Tagihan", [
            { periode: "2024-09", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "belum" },
            { periode: "2024-10", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "belum" },
          ]),
        },
        extra || {}
      )
    )
  );
}

function netPerKantong() {
  const hasil = {};
  baca("Kas").forEach((j) => {
    hasil[j.alokasi] = (hasil[j.alokasi] || 0) + pakrt.efekKas(j);
  });
  return hasil;
}

describe("handleBayar", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("non-admin ditolak", () => {
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
    expect(baca("Tagihan").every((t) => t.status === "belum")).toBe(true);
  });

  test("membayar 2 periode: uang masuk kasrt dulu lalu ditransfer saat lunas", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09#2024-10", "Bendahara", 1);
    const tagihan = baca("Tagihan");
    expect(tagihan.every((t) => t.status === "lunas")).toBe(true);
    expect(tagihan.every((t) => t.dicatat_oleh === "Bendahara")).toBe(true);

    const kas = baca("Kas");
    expect(kas.length).toBe(8); // 2 masuk + 6 baris transfer
    expect(kas.filter((j) => j.jenis === "masuk").length).toBe(2);
    expect(kas.filter((j) => j.jenis === "pindah_keluar").length).toBe(2);
    expect(kas.filter((j) => j.jenis === "pindah_masuk").length).toBe(4);
    expect(kas.reduce((t, j) => t + pakrt.efekKas(j), 0)).toBe(100000);

    const refs = kas.map((j) => j.ref);
    expect(refs.filter((r) => r === "BYR-202409-KK001").length).toBe(4);
    expect(refs.filter((r) => r === "BYR-202410-KK001").length).toBe(4);
    expect(netPerKantong()).toEqual({ kasrt: 10000, dkmt: 10000, kamsih: 80000 });

    expect(teksTerakhir()).toContain("Pembagian kantong");
    expect(teksTerakhir()).toContain("Rp 100.000");
  });

  test("pembayaran kedua untuk periode sama ditolak", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09", "Bendahara", 1);
    pakrt.handleBayar(1, "/bayar KK-001#2024-09", "Bendahara", 1);
    expect(teksTerakhir()).toContain("sudah lunas");
    expect(baca("Kas").length).toBe(4);
  });

  test("periode masa depan ditolak", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2099-01", "Bendahara", 1);
    expect(teksTerakhir()).toContain("masa depan");
  });

  test("KK tidak billable -> tidak ditagih", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-002#2024-09", "Bendahara", 1);
    expect(teksTerakhir()).toContain("tidak ditagih");
  });

  test("default periode = bulan berjalan", () => {
    admin();
    setup();
    const sekarang = pakrt.periodeSekarang();
    pakrt.handleBayar(1, "/bayar KK-001", "Bendahara", 1);
    const tagihan = pakrt.cariTagihan("KK-001", sekarang);
    expect(tagihan).not.toBeNull();
    expect(tagihan.status).toBe("lunas");
  });

  test("cicilan 10rb + 10rb + 20rb + 10rb melunasi tagihan 50rb", () => {
    admin();
    setup();
    const jumlah = [10000, 10000, 20000, 10000];
    const status = [];
    jumlah.forEach((n) => {
      pakrt.handleBayar(1, "/bayar KK-001#2024-09=" + n, "Bendahara", 1);
      status.push(pakrt.cariTagihan("KK-001", "2024-09").status);
    });
    expect(status).toEqual(["sebagian", "sebagian", "sebagian", "lunas"]);
    expect(baca("Pembayaran").map((b) => b.nominal)).toEqual(jumlah);
    expect(baca("Pembayaran").map((b) => b.id_bayar)).toEqual([
      "BYR-202409-KK001",
      "BYR-202409-KK001-02",
      "BYR-202409-KK001-03",
      "BYR-202409-KK001-04",
    ]);
    expect(netPerKantong()).toEqual({ kasrt: 5000, dkmt: 5000, kamsih: 40000 });
    expect(pakrt.hitungRekapPeriode("2024-09").terbayar).toBe(50000);
    expect(pakrt.hitungRekapPeriode("2024-09").tunggakan).toBe(0);
    expect(teksTerakhir()).toContain("lunas ✅");
  });

  test("sisa tagihan ikut dihitung sebagai tunggakan saat masih sebagian", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09=10000", "Bendahara", 1);
    expect(pakrt.hitungTunggakanKK("KK-001", "2024-09")).toBe(40000);
    expect(pakrt.getBulanTunggakanKK("KK-001", "2024-09")).toBe(1);
    expect(pakrt.hitungRekapPeriode("2024-09").terbayar).toBe(10000);
    expect(pakrt.hitungRekapPeriode("2024-09").tunggakan).toBe(40000);
    expect(teksTerakhir()).toContain("Sisa: *Rp 40.000*");
  });

  test("pembayaran melebihi sisa ditolak tanpa mencatat apa pun", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09=40000", "Bendahara", 1);
    const sebelumKas = baca("Kas").length;
    pakrt.handleBayar(1, "/bayar KK-001#2024-09=20000", "Bendahara", 1);
    expect(teksTerakhir()).toContain("melebihi sisa tagihan");
    expect(baca("Pembayaran").length).toBe(1);
    expect(baca("Kas").length).toBe(sebelumKas);
  });

  test("tagihan periode tertutup boleh dilunasi tanpa mengubah snapshot", () => {
    admin();
    setup({
      TutupBuku: buatSheet("TutupBuku", [
        {
          periode: "2024-09",
          jenis: "bulan",
          tarif: 50000,
          total_kk: 1,
          total_jiwa: 1,
          total_tagihan: 50000,
          total_terbayar: 20000,
          total_masuk: 20000,
          total_keluar: 0,
          saldo_awal: 0,
          saldo_akhir: 20000,
        },
      ]),
      Tagihan: buatSheet("Tagihan", [
        { periode: "2024-09", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "sebagian" },
      ]),
      Pembayaran: buatSheet("Pembayaran", [
        { id_bayar: "BYR-202409-KK001", id_kk: "KK-001", periode: "2024-09", nominal: 20000, dicatat_oleh: "Bendahara", catatan: "Cicilan" },
      ]),
      Kas: buatSheet("Kas", [
        { tanggal: new Date(2024, 8, 5), keterangan: "Iuran", jenis: "masuk", nominal: 20000, alokasi: "kasrt", ref: "BYR-202409-KK001" },
      ]),
    });
    pakrt.handleBayar(1, "/bayar KK-001#2024-09=30000", "Bendahara", 1);
    expect(teksTerakhir()).toContain("lunas ✅");
    expect(pakrt.cariTagihan("KK-001", "2024-09").status).toBe("lunas");
    expect(baca("Pembayaran").length).toBe(2);
    expect(baca("Kas").filter((j) => j.ref === "BYR-202409-KK001-02").length).toBe(4);
    expect(baca("TutupBuku")[0].total_terbayar).toBe(20000);
    expect(pakrt.rekapEfektif("2024-09").terbayar).toBe(20000);
  });
});
