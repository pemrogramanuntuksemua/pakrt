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

  test("membayar 2 periode: status lunas + 6 baris kas per kantong", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09#2024-10", "Bendahara", 1);
    const tagihan = baca("Tagihan");
    expect(tagihan.every((t) => t.status === "lunas")).toBe(true);
    expect(tagihan.every((t) => t.dicatat_oleh === "Bendahara")).toBe(true);

    const kas = baca("Kas");
    expect(kas.length).toBe(6);
    expect(kas.every((j) => j.jenis === "masuk")).toBe(true);
    expect(kas.reduce((t, j) => t + Number(j.nominal), 0)).toBe(100000);

    const refs = kas.map((j) => j.ref);
    expect(refs.filter((r) => r === "BYR-202409-KK001").length).toBe(3);
    expect(refs.filter((r) => r === "BYR-202410-KK001").length).toBe(3);

    const perKantong = {};
    kas.forEach((j) => {
      perKantong[j.alokasi] = (perKantong[j.alokasi] || 0) + Number(j.nominal);
    });
    expect(perKantong).toEqual({ kasrt: 10000, dkmt: 10000, kamsih: 80000 });

    expect(teksTerakhir()).toContain("Pembagian kantong");
    expect(teksTerakhir()).toContain("Rp 100.000");
  });

  test("pembayaran kedua untuk periode sama ditolak", () => {
    admin();
    setup();
    pakrt.handleBayar(1, "/bayar KK-001#2024-09", "Bendahara", 1);
    pakrt.handleBayar(1, "/bayar KK-001#2024-09", "Bendahara", 1);
    expect(teksTerakhir()).toContain("sudah lunas");
    expect(baca("Kas").length).toBe(3);
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
});
