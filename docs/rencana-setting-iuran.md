# Rencana: Setting, Warga (KK + Anggota), Tagihan, dan Tutup Buku — Pakrt

Tanggal: 2026-11-17 (revisi: model warga dua entitas + ledger tagihan + kas multi-kantong)
Repo: `pakrt` (Google Apps Script + Google Sheets + Telegram Bot)

## 1. Ringkasan keputusan

| Topik | Keputusan |
|---|---|
| Format sheet setting | Key–value per baris: `kunci \| nilai \| tipe \| keterangan` |
| Model warga | Dua entitas terpisah: `Keluarga` (KK) dan `Anggota` |
| Satu rumah | Boleh lebih dari satu KK; kunci utama `id_kk`, `no_rumah` hanya atribut |
| Data anggota | Nama, hubungan, jenis kelamin, tanggal lahir, status, catatan |
| Dasar iuran | Per KK (anggota tidak punya tagihan) |
| Histori tarif | Sheet `TarifIuran` dengan `berlaku_mulai` |
| Sumber tagihan | **Ledger `Tagihan`**: satu baris per KK per periode |
| Backfill awal | Generate tagihan sejak `2026-01` sampai periode berjalan |
| Pencatatan kas dari iuran | `/bayar` mengubah status tagihan + menulis beberapa baris `Kas` Masuk, satu per kantong |
| Kantong kas | `AlokasiIuran` (kode, nama, nominal, `sisa`); nominal tetap + satu penampung sisa |
| Kode kantong | `kasrt` (Kas RT), `dkmt` (Dana Kematian), `kamsih` (Keamanan & Kebersihan) — huruf kecil, maks 8 karakter |
| Realokasi antar kantong | `/pindahkas` — dua baris `pindah_keluar`/`pindah_masuk` dengan `ref` sama |
| Kas lama tanpa alokasi | Dimigrasikan ke `kasrt` oleh `migrasiKasAlokasi` |
| Pembayaran sebagian | Belum didukung; status `belum` → `lunas` |
| Tutup buku | Bulanan (`YYYY-MM`) + rekap tahunan (`YYYY`) |
| Rekap target vs tunggakan | `/rekap` (default bulan berjalan), dihitung dari `Tagihan` |
| Daftar KK | `/daftar` — semua KK aktif + no rumah + kepala keluarga + tunggakan |
| Inisialisasi sheet | Fungsi di editor Apps Script: `initSheets()`, `resetSheetSkema()`, `resetSemuaSheet()` |
| Backup sebelum reset | Salin file ke Drive: `pakrt-backup-YYYYMMDD-HHmm` |
| Command setting | `/setting` dan `/set` (admin) |

Prinsip utama:

1. **Setting mengatur periode berjalan, snapshot tutup buku membekukan masa lalu.**
2. **KK adalah unit administrasi & tagihan; anggota adalah unit sensus.** Satu KK = satu tagihan, berapa pun jumlah anggotanya.
3. **Tagihan adalah catatan kewajiban, bukan hasil hitung ulang.** Riwayat utang tidak boleh berubah karena status KK hari ini berubah.

## 2. Struktur sheet final

### 2.1 `Setting`

| Kolom | Isi |
|---|---|
| `kunci` | identifier snake_case, unik, diproteksi |
| `nilai` | nilai aktif |
| `tipe` | `teks` / `angka` / `boolean` |
| `keterangan` | penjelasan untuk pengurus |

Contoh isi:

| kunci | nilai | tipe | keterangan |
|---|---|---|---|
| `iuran_bulanan` | 50000 | angka | Tarif aktif periode berjalan |
| `jatuh_tempo_hari` | 10 | angka | Tanggal jatuh tempo tiap bulan |
| `nama_rt` | RT 001 / RW 005 | teks | Header pesan bot |
| `reminder_aktif` | FALSE | boolean | Pengingat iuran (tahap lanjut) |
| `iuran_mulai_default` | 2026-01 | teks | Periode awal untuk KK tanpa `mulai_iuran` |
| `backfill_mulai` | 2026-01 | teks | Periode awal generate tagihan |

Aturan baca:

- Nilai dibaca sekali per eksekusi (`getSettings()`), bukan per handler.
- Kunci tidak dikenal → fallback ke `DEFAULT_SETTINGS` di kode, tanpa error.
- Konversi tipe mengikuti kolom `tipe`; nilai kosong → pakai default.

### 2.2 `Keluarga` (kepala keluarga)

| Kolom | Isi | Catatan |
|---|---|---|
| `id_kk` | `KK-001`, `KK-002`, ... | kunci utama, dibuat otomatis |
| `no_rumah` | `A1`, `B7` | boleh duplikat (satu rumah >1 KK) |
| `nama_kk` | nama kepala keluarga | denormalisasi dari `Anggota`, untuk tampilan cepat |
| `no_hp` | nomor HP KK | |
| `alamat` | alamat lengkap | |
| `status` | `Aktif` / `Pindah` | default `Aktif` |
| `mulai_iuran` | `YYYY-MM` | default `Setting.iuran_mulai_default` |
| `catatan` | catatan bebas | |

Contoh:

| id_kk | no_rumah | nama_kk | no_hp | alamat | status | mulai_iuran | catatan |
|---|---|---|---|---|---|---|---|
| KK-001 | A1 | Budi Santoso | 0812... | Jl. Melati 1 | Aktif | 2026-01 | |
| KK-002 | A1 | Siti Aminah | 0813... | Jl. Melati 1 (kontrakan) | Aktif | 2026-07 | Satu rumah 2 KK |

### 2.3 `Anggota` (anggota keluarga)

| Kolom | Isi | Catatan |
|---|---|---|
| `id_kk` | `KK-001` | referensi ke `Keluarga` |
| `nama` | nama lengkap | |
| `hubungan` | `Kepala Keluarga` / `Istri` / `Suami` / `Anak` / `Orang Tua` / `Famili Lain` | wajib |
| `jenis_kelamin` | `L` / `P` | untuk statistik |
| `tanggal_lahir` | `YYYY-MM-DD` (teks) | untuk statistik usia |
| `status` | `Aktif` / `Pindah` / `Meninggal` | default `Aktif` |
| `catatan` | catatan bebas | |

Contoh:

| id_kk | nama | hubungan | jenis_kelamin | tanggal_lahir | status | catatan |
|---|---|---|---|---|---|---|
| KK-001 | Budi Santoso | Kepala Keluarga | L | 1985-04-12 | Aktif | |
| KK-001 | Rina | Istri | P | 1988-09-02 | Aktif | |
| KK-001 | Dimas | Anak | L | 2014-01-20 | Aktif | |

Aturan:

- **Kepala keluarga juga punya baris di `Anggota`** dengan `hubungan = Kepala Keluarga`. Jadi `total_jiwa` cukup menghitung baris anggota aktif, tanpa penambahan manual.
- Setiap `id_kk` wajib punya **tepat satu** baris `Kepala Keluarga`; penambahan kedua ditolak.
- `nama_kk` di `Keluarga` adalah denormalisasi untuk tampilan. Saat KK dibuat lewat bot, keduanya ditulis sekaligus. Perubahan manual di Sheet bisa membuat keduanya berbeda — didokumentasikan, dan bisa ditambah audit `/cekkk` di tahap lanjut.
- Anggota dengan `status != Aktif` tidak dihitung, tapi barisnya tidak dihapus (riwayat).

### 2.4 `TarifIuran`

| berlaku_mulai | nominal | keterangan |
|---|---|---|
| 2026-01 | 50000 | Tarif awal |
| 2026-07 | 60000 | Kenaikan mulai Juli |

- `berlaku_mulai` disimpan sebagai **teks** `YYYY-MM`.
- Tarif efektif periode X = baris dengan `berlaku_mulai <= X` terbaru.
- Tidak ada baris yang cocok → fallback `Setting.iuran_bulanan`.

### 2.5 `AlokasiIuran` (kantong kas)

| kode | nama | nominal | sisa | keterangan |
|---|---|---|---|---|
| `kasrt` | Kas RT | 0 | TRUE | Penampung selisih tarif, operasional |
| `dkmt` | Dana Kematian | 5000 | FALSE | Santunan warga |
| `kamsih` | Keamanan & Kebersihan | 40000 | FALSE | Honor petugas |

- Satu baris per kantong; `kode` unik, huruf kecil, tanpa spasi, maksimal 8 karakter.
- Kode sengaja dibuat pendek karena diketik langsung di chat: `kasrt`, `dkmt`, `kamsih`.
  Nama panjang untuk tampilan ada di kolom `nama`.
- Kode yang sudah dipakai di `Kas.alokasi` tidak boleh di-rename tanpa migrasi; bot menolak
  perubahan `kode` jika sudah ada transaksi yang memakainya.
- Tepat **satu** baris bertanda `sisa = TRUE`; nominalnya dihitung otomatis:
  `sisa = tarif periode − Σ nominal non-sisa`.
- Σ nominal non-sisa harus ≤ tarif periode. Jika tidak, `/bayar` ditolak dengan pesan jelas.
- Saat tarif naik, hanya kantong `sisa` yang berubah. Contoh tarif 50.000 → 60.000:
  `dkmt` tetap 5.000, `kamsih` tetap 40.000, `kasrt` otomatis 15.000.
- Alokasi bersifat **berlaku sekarang**, bukan per periode. Pembayaran periode lama memakai alokasi saat dibayar; nominal yang benar-benar diterima tersimpan sebagai snapshot di baris `Kas`.

### 2.6 `Tagihan` (ledger tagihan / buku iuran)

| Kolom | Isi |
|---|---|
| `periode` | `YYYY-MM`, teks |
| `id_kk` | `KK-001` |
| `no_rumah` | snapshot saat tagihan dibuat |
| `nama_kk` | snapshot saat tagihan dibuat |
| `nominal` | tarif efektif periode tersebut |
| `status` | `belum` / `lunas` / `bebas` / `batal` |
| `tanggal_bayar` | diisi saat lunas |
| `dicatat_oleh` | nama admin/bendahara |
| `catatan` | catatan bebas |

Contoh (Budi menunggak Jan–Mei, Juni lunas):

| periode | id_kk | no_rumah | nama_kk | nominal | status | tanggal_bayar | dicatat_oleh | catatan |
|---|---|---|---|---|---|---|---|---|
| 2026-01 | KK-003 | A12 | Budi Santoso | 50000 | belum | | | |
| 2026-02 | KK-003 | A12 | Budi Santoso | 50000 | belum | | | |
| 2026-03 | KK-003 | A12 | Budi Santoso | 50000 | belum | | | |
| 2026-04 | KK-003 | A12 | Budi Santoso | 50000 | belum | | | |
| 2026-05 | KK-003 | A12 | Budi Santoso | 50000 | belum | | | |
| 2026-06 | KK-003 | A12 | Budi Santoso | 60000 | lunas | 2026-06-05 | Bendahara | |

Aturan:

- Satu baris per `id_kk` per `periode`. Duplikat ditolak (dicek sebelum menulis).
- Baris yang sudah ada **tidak pernah** dihapus atau dihitung ulang karena perubahan data KK. Inilah yang menjaga riwayat utang.
- `bebas` = dibebaskan, `nominal = 0`. `batal` = tagihan tidak berlaku (mis. salah generate).
- `no_rumah` dan `nama_kk` disalin sebagai snapshot agar laporan lama tetap terbaca walau data KK berubah.
- Tunggakan **hanya** membaca sheet ini: `Σ nominal where id_kk = X and status = 'belum' and periode <= periodeBerjalan`.

### 2.7 `Kas` (multi-kantong)

| tanggal | keterangan | jenis | nominal | alokasi | ref | dicatat_oleh |
|---|---|---|---|---|---|---|
| 2026-11-03 | Iuran 2026-11 - Budi (KK-001) | masuk | 5000 | `kasrt` | `BYR-202611-KK001` | Bendahara |
| 2026-11-03 | Iuran 2026-11 - Budi (KK-001) | masuk | 5000 | `dkmt` | `BYR-202611-KK001` | Bendahara |
| 2026-11-03 | Iuran 2026-11 - Budi (KK-001) | masuk | 40000 | `kamsih` | `BYR-202611-KK001` | Bendahara |

Kolom:

| Kolom | Isi |
|---|---|
| `tanggal` | tanggal uang masuk/keluar |
| `keterangan` | deskripsi transaksi |
| `jenis` | `masuk` / `keluar` / `pindah_masuk` / `pindah_keluar` |
| `nominal` | jumlah untuk kantong tersebut |
| `alokasi` | kode kantong dari `AlokasiIuran` |
| `ref` | pengelompokan baris; satu pembayaran iuran = satu `ref` |
| `dicatat_oleh` | nama admin/bendahara |

Aturan:

- Satu transaksi iuran ditulis menjadi **beberapa baris**, satu per kantong, dengan `ref` sama.
- Saldo kantong = Σ `masuk` + Σ `pindah_masuk` − Σ `keluar` − Σ `pindah_keluar`.
- Total kas = Σ saldo semua kantong.
- `pindah_masuk`/`pindah_keluar` selalu berpasangan dengan `ref` yang sama, sehingga total kas tidak berubah.
- Pengeluaran wajib menyebut `alokasi`; saldo kantong tidak boleh minus.
- Baris lama tanpa `alokasi` dimigrasikan ke `kasrt` oleh `migrasiKasAlokasi()`.

### 2.8 `TutupBuku`

| periode | jenis | tarif | total_kk | total_jiwa | total_tagihan | total_terbayar | total_masuk | total_keluar | saldo_awal | saldo_akhir | ditutup_oleh | ditutup_pada |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10 | bulan | 50000 | 50 | 168 | 2500000 | 2400000 | 2550000 | 350000 | 1200000 | 3400000 | Budi | 2026-11-01 09:12 |

- `periode` teks: `YYYY-MM` untuk bulanan, `YYYY` untuk tahunan.
- Satu baris per periode; tutup dobel ditolak.
- `total_jiwa` hanya referensi demografi, bukan dasar tagihan.
- `total_masuk`/`total_keluar` tidak menghitung `pindah_masuk`/`pindah_keluar`; nilainya = Σ kolom `masuk`/`keluar` di `TutupBukuAlokasi`.
- Rekap tahunan = agregasi 12 snapshot bulanan.

### 2.9 `TutupBukuAlokasi` (snapshot per kantong)

| periode | kode | saldo_awal | masuk | keluar | pindah_masuk | pindah_keluar | saldo_akhir |
|---|---|---|---|---|---|---|---|
| 2026-11 | `kasrt` | 1200000 | 250000 | 150000 | 100000 | 0 | 1400000 |
| 2026-11 | `dkmt` | 800000 | 150000 | 0 | 0 | 0 | 950000 |
| 2026-11 | `kamsih` | 400000 | 800000 | 800000 | 0 | 100000 | 300000 |

- Ditulis bersamaan dengan baris `TutupBuku`, satu baris per kantong.
- `saldo_awal` kantong = `saldo_akhir` kantong tersebut pada snapshot sebelumnya (0 jika belum ada).
- Jumlah `saldo_akhir` semua kantong harus sama dengan `TutupBuku.saldo_akhir`.
- Snapshot kantong yang sudah ditutup tidak berubah, meski ada realokasi setelahnya.

### 2.10 Sheet lama

- `Kas`: kolom `alokasi` dan `ref` ditambahkan oleh `migrasiKasAlokasi()`; baris lama diisi `kasrt`.
- `Pengumuman`: tidak berubah struktur.
- `Warga`: dimigrasikan ke `Keluarga`/`Anggota` lalu di-rename menjadi `Warga_lama` (tidak dihapus).

## 3. Aturan bisnis

### 3.1 Tarif

- Tarif efektif ditentukan per periode, bukan per transaksi.
- `/set iuran_bulanan 60000` → upsert `TarifIuran` untuk periode berjalan (atau periode argumen ketiga), sekaligus memperbarui `Setting.iuran_bulanan`.
- Tagihan periode tersebut yang masih `belum` ikut diperbarui nominalnya; yang sudah `lunas` tidak diubah.
- Perubahan tarif untuk periode yang sudah ditutup **ditolak**; arahkan ke periode berjalan/berikutnya.
- Perubahan tarif tidak mengubah snapshot `TutupBuku`.
- Pembagian ke kantong diatur di `AlokasiIuran`. Saat tarif berubah, kantong bertanda `sisa` otomatis menyesuaikan; kantong nominal tetap tidak berubah.
- `/set` ditolak jika Σ nominal non-sisa melebihi tarif baru.

### 3.2 KK billable

KK dihitung wajib iuran pada periode X jika:

1. `Keluarga.status = Aktif`, dan
2. `mulai_iuran <= X` (atau default `iuran_mulai_default`).

Jika `mulai_iuran` kosong dan default kosong → dianggap wajib sejak `Setting.backfill_mulai`.
Anggota **tidak pernah** dihitung untuk tagihan.

### 3.3 Generate tagihan (`pastikanTagihan`)

`pastikanTagihan(periode)` idempoten dan dipanggil malas saat `/bayar`, `/tunggakan`, `/tagihan`, `/kas`, dan `/tutupbuku`:

1. Tentukan tarif efektif periode.
2. Ambil daftar KK billable periode tersebut.
3. Baca `Tagihan` periode itu, kumpulkan `id_kk` yang sudah punya baris.
4. Untuk KK billable yang belum punya baris → tulis baris baru `status = belum`.
5. KK yang tidak lagi aktif tidak mendapat baris baru; baris lama tetap ada.

Backfill awal: `backfillTagihan(Setting.backfill_mulai, periodeBerjalan)` — memanggil `pastikanTagihan` untuk tiap periode. Aman dijalankan berulang (idempoten).

Konsekuensi yang disepakati:

- Tagihan yang sudah dibuat **tidak berubah** saat warga pindah, `mulai_iuran` diedit, atau tarif naik.
- Penyesuaian manual (bebas/batal) dilakukan lewat kolom `status` di sheet.
- Tagihan periode berjalan bisa menyesuaikan tarif baru selama masih `belum` (lihat 3.1).

### 3.4 Penghitungan jiwa

- `total_kk` = jumlah baris `Keluarga` dengan `status = Aktif`.
- `total_jiwa` = jumlah baris `Anggota` dengan `status = Aktif` yang `id_kk`-nya merujuk KK aktif.
- `anggotaPerKK(id)` = jumlah anggota aktif milik KK tersebut (termasuk kepala keluarga).
- Anggota yatim (id_kk tidak ditemukan) diabaikan dan dilaporkan sebagai peringatan saat `/warga` dijalankan admin.

### 3.5 Identitas & resolver

- `id_kk` dibuat otomatis: `KK-` + nomor urut 3 digit, dihitung dari `max` yang ada.
- Pembuatan `id_kk` dibungkus `LockService` agar tidak duplikat saat dua request bersamaan.
- `cariKeluarga(identifier)` mencoba berurutan:
  1. `id_kk` (contoh `KK-001`)
  2. `no_rumah`, hanya jika hasilnya **unik**
  3. `nama_kk`, hanya jika hasilnya **unik**
  4. Jika ambigu → balas daftar kandidat dan minta pakai `id_kk`.

### 3.6 Pembayaran

`/bayar <identifier> <periode...>`:

1. Resolusi KK via `cariKeluarga`.
2. `pastikanTagihan(periode)` untuk setiap periode yang diminta.
3. Cari baris `Tagihan` untuk KK + periode dengan `status = belum`.
4. Tolak jika baris tidak ada (KK tidak billable di periode itu) atau sudah `lunas`/`bebas`/`batal`.
5. Ubah baris jadi `lunas`, isi `tanggal_bayar = now` dan `dicatat_oleh = senderName`.
6. Hitung pembagian kantong dari `AlokasiIuran` (lihat 3.13).
7. Tulis **satu baris `Kas` Masuk per kantong** dengan `ref` sama: `Iuran <periode> - <nama_kk> (<id_kk>)`.
8. Balas ringkasan total nominal dan rincian per kantong.

`/bayar` adalah **satu-satunya cara resmi** mencatat iuran. `/tambahkas masuk` manual tetap boleh, tetapi tidak mengubah status tagihan — dokumentasikan di README dan `/start`.

### 3.7 Kas vs akrual

| Laporan | Basis |
|---|---|
| Tunggakan / status tagihan | `Tagihan.periode` (akrual) |
| Saldo kas total & per kantong | `Kas.tanggal` (kas) |
| Tutup buku | `TutupBuku` + `TutupBukuAlokasi` |

Contoh: bayar Oktober pada 3 November → `Tagihan.periode = 2026-10` menjadi lunas, sedangkan baris `Kas` (per kantong) masuk di November.

### 3.8 Tutup buku bulanan

`/tutupbuku 2026-10`:

1. Tolak jika bukan admin.
2. Tolak jika periode sudah ada di `TutupBuku`.
3. `pastikanTagihan(2026-10)`.
4. Baca semua baris `Tagihan` periode itu yang `status != batal`.
5. `tarif` = tarif efektif periode tersebut.
6. `total_kk` = jumlah baris tersebut (termasuk `bebas`).
7. `total_jiwa` = jumlah anggota aktif dari KK pada baris tersebut.
8. `total_tagihan` = Σ `nominal` baris tersebut.
9. `total_terbayar` = Σ `nominal` baris `lunas`.
10. `total_masuk`/`total_keluar` = Σ `Kas` dengan tanggal di dalam periode, **tanpa** baris `pindah_masuk`/`pindah_keluar`.
11. `saldo_awal` = `saldo_akhir` snapshot terakhir sebelum periode ini (0 jika belum ada).
12. `saldo_akhir` = `saldo_awal + total_masuk - total_keluar`.
13. Hitung snapshot per kantong dari `Kas` (termasuk pindah) → tulis ke `TutupBukuAlokasi`.
14. Tulis baris `TutupBuku` + semua baris `TutupBukuAlokasi`, lalu balas ringkasan.

Validasi: Σ `saldo_akhir` seluruh kantong harus sama dengan `TutupBuku.saldo_akhir`. Jika tidak, batalkan penulisan dan laporkan selisihnya.

Tunggakan periode tersebut = `total_tagihan - total_terbayar`, dan itu **tidak** dikurangkan dari saldo kas.

### 3.9 Tutup buku tahunan

`/tutupbuku 2026`:

- Tolak jika ada bulan yang belum ditutup; tampilkan daftar bulan yang kurang.
- Jika lengkap: jumlahkan `total_tagihan`, `total_terbayar`, `total_masuk`, `total_keluar` dari 12 snapshot.
- `saldo_awal` = `saldo_awal` Januari, `saldo_akhir` = `saldo_akhir` Desember.
- `total_kk`/`total_jiwa` = nilai pada bulan terakhir yang tersedia.
- Jumlahkan juga `TutupBukuAlokasi` per kantong: `saldo_awal` Januari, `saldo_akhir` Desember, serta total masuk/keluar/pindah sepanjang tahun.
- Tulis baris `jenis = tahun` di `TutupBuku` dan baris per kantong di `TutupBukuAlokasi`.

### 3.10 Soft lock

- `handleTambahKas` menolak transaksi yang tanggalnya jatuh di periode yang sudah ditutup.
- Edit manual di Google Sheets tidak bisa dicegah kode; snapshot tetap jadi pembanding.
- Opsional tahap lanjut: `/cekkas <periode>` untuk mendeteksi selisih snapshot vs `Kas`.

### 3.11 Rekap target vs tunggakan

`/rekap` menjawab "berapa yang seharusnya masuk vs berapa yang sudah/belum masuk", berbeda dari `/kas` yang menjawab "berapa uang yang ada".

Argumen:

| Pemakaian | Arti |
|---|---|
| `/rekap` | bulan berjalan |
| `/rekap 2026-11` | bulan tertentu |
| `/rekap 2026` | Januari s.d. bulan berjalan (atau s.d. Desember bila tahun sudah lewat) |
| `/rekap 2026-01 2026-11` | rentang bebas |

Rumus per periode, seluruhnya dari `Tagihan`:

```
target     = Σ nominal where status != 'batal'
terbayar   = Σ nominal where status = 'lunas'
tunggakan  = Σ nominal where status = 'belum'
dibebaskan = count where status = 'bebas'
```

- `total_kk` = jumlah baris `Tagihan` periode itu yang `status != batal`
- `lunas_kk` / `belum_kk` = jumlah baris per status
- `jiwa_terdampak` = jumlah anggota aktif dari KK yang masih `belum`
- `penunggak` = agregasi `nominal belum` per `id_kk`, urut terbesar, tampilkan 5 teratas

Aturan:

- `pastikanTagihan` dipanggil untuk setiap periode dalam rentang, tetapi **dibatasi sampai periode berjalan**; tidak ada tagihan masa depan yang dibuat.
- Rentang dibatasi maksimal 24 periode agar satu command tidak memicu ratusan pembacaan sheet.
- `batal` tidak masuk target; `bebas` masuk hitungan KK tetapi nominal 0.
- `/rekap` selalu menampilkan **kondisi terkini** dari `Tagihan`, termasuk periode yang sudah ditutup. Pelunasan telat setelah tutup buku akan menaikkan angka rekap, sementara snapshot `TutupBuku` tetap seperti saat ditutup. Beri penanda `🔒` pada periode tertutup dan catatan singkat di pesan.
- Jika belum ada baris `Tagihan` sama sekali → balas "Belum ada tagihan. Jalankan backfill atau cek `/setting`."
- `/rekap` hanya menghitung **total**, bukan per kantong. Rincian kantong ada di `/kas` dan `TutupBukuAlokasi` — lihat §10.

### 3.12 Daftar KK

`/daftar` menampilkan **semua KK aktif**, bukan hanya yang menunggak. Berbeda dari `/tunggakan` yang hanya menampilkan penunggak teratas.

Argumen:

| Pemakaian | Arti |
|---|---|
| `/daftar` | semua KK aktif, tunggakan s.d. periode berjalan |
| `/daftar 2026-11` | batasi tunggakan s.d. November 2026 |
| `/daftar tagihan` | urut tunggakan terbesar |
| `/daftar nama` | urut nama kepala keluarga |
| `/daftar semua` | ikut tampilkan KK `Pindah` dengan penanda |
| `/daftar semua tagihan` | kombinasi filter dan urutan |

Kolom:

| Kolom | Sumber |
|---|---|
| `No` | `Keluarga.no_rumah` |
| `Kepala Keluarga` | `Keluarga.nama_kk` |
| `Jiwa` | jumlah `Anggota` aktif milik KK |
| `Tunggakan` | Σ `Tagihan.nominal` status `belum` s.d. periode batas |

Aturan:

- `pastikanTagihan` dipanggil untuk periode berjalan (dan periode batas bila diberikan).
- KK dengan tunggakan 0 ditampilkan dengan tanda `-`, bukan `Rp 0`.
- Urutan default memakai **natural sort** nomor rumah (`A2` sebelum `A10`).
- Maksimal 25 baris per pesan; header diulang dan diberi penanda `(1/2)`.
- Pesan dikirim dengan `parse_mode = HTML` dan blok `<pre>` agar kolom rata; karakter `&`, `<`, `>` pada nama di-escape.
- Hanya admin, karena memuat data keuangan warga.
- Baris penutup menampilkan jumlah KK, total jiwa, dan total tunggakan.
- Angka per KK harus identik dengan `/tunggakan`, `/rekap`, dan `/tutupbuku` karena memakai sumber `Tagihan` yang sama.

### 3.13 Alokasi iuran & kantong kas

Pembagian satu pembayaran iuran ke kantong:

1. Baca `AlokasiIuran`; validasi kode unik, cocok `^[a-z0-9]{1,8}$`, dan tepat satu baris `sisa = TRUE`.
2. `sisa_nominal = tarif periode − Σ nominal non-sisa`.
3. Jika `sisa_nominal < 0` → tolak pembayaran dengan pesan "alokasi tetap melebihi tarif periode".
4. Hasil pembagian = daftar `{ kode, nominal }`; kantong bernominal 0 dilewati, kecuali `sisa` tetap dicatat bila nilainya > 0.

`hitungPembagian(nominal)` dipakai oleh `/bayar`, `/set`, dan `/alokasi`.

Aturan `Kas`:

- Satu pembayaran iuran → beberapa baris `Kas`, satu per kantong, dengan `ref = BYR-<YYYYMM>-<id_kk>`.
- Idempoten: sebelum menulis, cek `ref` + `alokasi`; jika sudah ada, lewati. Ini mencegah dobel saat webhook retry.
- `/tambahkas <jenis>#<alokasi>#<nominal>#<keterangan>`:
  - `alokasi` wajib untuk `masuk` dan `keluar`;
  - `keluar` ditolak jika `nominal > saldo kantong` saat itu.
- `/pindahkas <asal>#<tujuan>#<nominal>#<keterangan>`:
  - tolak jika `asal = tujuan` atau saldo asal kurang;
  - tulis dua baris: `pindah_keluar` dari asal dan `pindah_masuk` ke tujuan, dengan `ref = TRF-<timestamp>`.
- `/kas` menampilkan saldo per kantong + total; `/kas <kode>` menampilkan mutasi satu kantong.
- `/alokasi` menampilkan konfigurasi pembagian dan total tarif aktif.

### 3.14 Migrasi Kas lama

`migrasiKasAlokasi(dryRun)`:

1. Pastikan kolom `alokasi` dan `ref` ada; jika belum, tambahkan di kanan tanpa menggeser kolom lama.
2. Setiap baris tanpa `alokasi` diisi `kasrt`.
3. `ref` kosong diisi `LEGACY-<nomor baris>` agar unik.
4. Log jumlah baris yang diperbarui.
5. Idempoten: baris yang sudah punya `alokasi` tidak diubah.

Setelah migrasi, seluruh saldo kas lama berada di kantong `kasrt`. Jika perlu dibagi, gunakan `/pindahkas`.

## 4. Command & contoh pesan

| Command | Contoh | Akses |
|---|---|---|
| `/setting` | — | admin |
| `/set <kunci> <nilai> [periode]` | `/set iuran_bulanan 60000` | admin |
| `/tarif` | — | admin |
| `/kas` | total + saldo tiap kantong | semua |
| `/kas <kode>` | mutasi satu kantong | semua |
| `/alokasi` | daftar pembagian iuran | semua |
| `/tambahkas <jenis>#<alokasi>#<nominal>#<ket>` | `/tambahkas keluar#kamsih#400000#Honor satpam` | admin |
| `/pindahkas <asal>#<tujuan>#<nominal>#<ket>` | `/pindahkas kasrt#dkmt#100000#Surplus` | admin |
| `/tambahkk Nama#No HP#No Rumah#Alamat#Catatan` | `/tambahkk Budi#0812#A1#Jl. Melati 1#` | admin |
| `/tambahanggota <id_kk>#Nama#Hubungan#L/P#YYYY-MM-DD` | `/tambahanggota KK-001#Rina#Istri#P#1988-09-02` | admin |
| `/warga` | — | semua |
| `/warga <id_kk/no_rumah/nama>` | `/warga A1` | semua |
| `/tagihan <identifier>` | `/tagihan KK-003` | admin |
| `/bayar <identifier> <periode...>` | `/bayar KK-001 2026-09 2026-10` | admin |
| `/tunggakan [periode]` | `/tunggakan` (s.d. periode berjalan) | admin |
| `/tunggakan <identifier>` | `/tunggakan A1` | admin |
| `/rekap` | bulan berjalan | admin |
| `/rekap <YYYY-MM>` | `/rekap 2026-11` | admin |
| `/rekap <YYYY>` | `/rekap 2026` (s.d. bulan berjalan) | admin |
| `/rekap <YYYY-MM> <YYYY-MM>` | `/rekap 2026-01 2026-11` | admin |
| `/daftar` | semua KK aktif + tunggakan | admin |
| `/daftar <YYYY-MM>` | batasi tunggakan s.d. periode | admin |
| `/daftar tagihan\|nama` | ubah urutan | admin |
| `/daftar semua` | ikut tampilkan KK Pindah | admin |
| `/tutupbuku <YYYY-MM>` | `/tutupbuku 2026-10` | admin |
| `/tutupbuku <YYYY>` | `/tutupbuku 2026` | admin |

`/tambahwarga` lama **tidak** di-alias-kan karena formatnya bertabrakan dengan format baru (5 field bisa berarti dua hal berbeda). Command lama dibalas: "⚠️ `/tambahwarga` sudah diganti. Gunakan `/tambahkk ...`".

`/tambahkas` berubah format dari `/tambahkas jenis#nominal#keterangan` menjadi `/tambahkas jenis#alokasi#nominal#keterangan`. Format lama dibalas dengan contoh format baru agar tidak salah kantong.

### Contoh balasan `/warga`

```
👥 DATA WARGA PAKRT

🏠 Kepala Keluarga: 45 KK
🧑‍🤝‍🧑 Total Jiwa: 168 orang
📊 Rata-rata: 3,7 jiwa/KK
⚧ L: 84 · P: 84
```

### Contoh balasan `/warga A1`

```
🏠 KK-001 — A1
👤 Budi Santoso (Kepala Keluarga)
📞 0812...
📍 Jl. Melati 1
📅 Mulai iuran: 2026-01
✅ Status: Aktif

Anggota (3):
• Budi Santoso — Kepala Keluarga (L, 1985)
• Rina — Istri (P, 1988)
• Dimas — Anak (L, 2014)

⚠️ Rumah A1 juga dihuni: KK-002 (Siti Aminah)
```

### Contoh balasan `/tunggakan KK-003`

```
⏳ TUNGGAKAN KK-003 — Budi Santoso (A12)

Belum dibayar: 5 bulan
• 2026-01   Rp 50.000
• 2026-02   Rp 50.000
• 2026-03   Rp 50.000
• 2026-04   Rp 50.000
• 2026-05   Rp 50.000
--------------------------------
💰 Total tunggakan: Rp 250.000

Ketik /bayar KK-003 2026-01 2026-02 ... untuk mencatat pembayaran.
```

### Contoh balasan `/tunggakan` (ringkasan semua KK)

```
📊 TUNGGAKAN IURAN — s.d. 2026-11

🏠 KK wajib iuran: 50
✅ Sudah bayar: 38 KK
⏳ Belum bayar: 12 KK
👥 Jiwa terdampak: 44 orang
💰 Potensi tertunda: Rp 720.000

Belum bayar (10 teratas):
• KK-003 A12 Budi — Rp 250.000
• KK-007 A7 Siti — Rp 60.000
...
```

### Contoh balasan `/bayar`

```
✅ Pembayaran iuran dicatat

👤 Budi Santoso (KK-001 / A1)
📅 Periode: 2026-09, 2026-10
💰 Tarif: Rp 50.000 / Rp 60.000
💵 Total: Rp 110.000

Pembagian kantong:
• kasrt   Kas RT                 Rp  20.000
• dkmt    Dana Kematian          Rp  10.000
• kamsih  Keamanan & Kebersihan  Rp  80.000
```

### Contoh balasan `/kas`

```
💰 KAS RT — s.d. 17/11/2026

kode   kantong                         saldo
─────────────────────────────────────────────
kasrt  Kas RT                          Rp 1.250.000
dkmt   Dana Kematian                   Rp   850.000
kamsih Keamanan & Kebersihan           Rp   400.000
─────────────────────────────────────────────
TOTAL                                  Rp 2.500.000

📥 Masuk Nov: Rp 3.000.000
📤 Keluar Nov: Rp   500.000
```

### Contoh balasan `/alokasi`

```
🧩 ALOKASI IURAN — Rp 50.000 / KK

kode     kantong                 nominal
─────────────────────────────────────────
kasrt    Kas RT                  Rp  5.000  (sisa)
dkmt     Dana Kematian           Rp  5.000
kamsih   Keamanan & Kebersihan   Rp 40.000
─────────────────────────────────────────
TOTAL                            Rp 50.000

Ketik kode kantong di /kas, /tambahkas, dan /pindahkas.
```

### Contoh balasan `/pindahkas`

```
✅ Dana berhasil dipindahkan

Dari  : kasrt — Kas RT
Ke    : dkmt — Dana Kematian
Jumlah: Rp 100.000
Sisa kasrt: Rp 1.150.000
```

### Contoh balasan `/rekap` (bulanan)

```
📊 REKAP IURAN — NOVEMBER 2026

🎯 Target: Rp 3.000.000  (50 KK × Rp 60.000)
✅ Terbayar: Rp 2.280.000  (38 KK · 76%)
⏳ Tunggakan: Rp 720.000  (12 KK · 24%)
👥 Jiwa terdampak: 44 orang
🕊️ Dibebaskan: 1 KK

Progres: ████████░░░░ 76%

Penunggak teratas:
• KK-003 A12 Budi — Rp 250.000 (5 bulan)
• KK-007 A7 Siti — Rp 120.000 (2 bulan)
```

### Contoh balasan `/rekap` (tahunan)

```
📊 REKAP IURAN — 2026 (Jan–Nov)

🎯 Target: Rp 33.000.000
✅ Terbayar: Rp 30.120.000  (91%)
⏳ Tunggakan: Rp 2.880.000  (9%)

Per bulan:
Jan 🔒  48/50 KK   Rp 2.400.000 / Rp 2.500.000
Feb 🔒  50/50 KK   Rp 2.500.000 / Rp 2.500.000
...
Nov     38/50 KK   Rp 2.280.000 / Rp 3.000.000

Tunggakan lama (>1 bulan): 7 KK · Rp 1.900.000

🔒 = periode sudah tutup buku. Angka rekap adalah kondisi terkini dari Tagihan.
```

### Contoh balasan `/daftar`

```
📋 DAFTAR KK — s.d. NOVEMBER 2026

No   Kepala Keluarga          Jiwa  Tunggakan
──────────────────────────────────────────────
A1   Budi Santoso             3     Rp 250.000
A2   Siti Aminah              4     -
A3   Ahmad Fauzi              2     Rp 60.000
A10  Rina Wati               5     Rp 120.000

45 KK · 168 jiwa
Total tunggakan: Rp 2.880.000
```

Pesan panjang dipecah otomatis (split per baris, batas aman ~3500 karakter).

## 5. Perubahan kode (`kode.gs`)

### 5.1 Konstanta baru

```js
const SHEET_SETTING = "Setting";
const SHEET_KELUARGA = "Keluarga";
const SHEET_ANGGOTA = "Anggota";
const SHEET_TARIF = "TarifIuran";
const SHEET_ALOKASI = "AlokasiIuran";
const SHEET_TAGIHAN = "Tagihan";
const SHEET_KAS = "Kas";
const SHEET_TUTUP_BUKU = "TutupBuku";
const SHEET_TUTUP_BUKU_ALOKASI = "TutupBukuAlokasi";

const CMD_SETTING = "/setting";
const CMD_SET = "/set";
const CMD_TARIF = "/tarif";
const CMD_ALOKASI = "/alokasi";
const CMD_KAS = "/kas";
const CMD_TAMBAHKAS = "/tambahkas";
const CMD_PINDAHKAS = "/pindahkas";
const CMD_TAMBAHKK = "/tambahkk";
const CMD_TAMBAHANGGOTA = "/tambahanggota";
const CMD_TAGIHAN = "/tagihan";
const CMD_BAYAR = "/bayar";
const CMD_TUNGGAKAN = "/tunggakan";
const CMD_REKAP = "/rekap";
const CMD_DAFTAR = "/daftar";
const CMD_TUTUPBUKU = "/tutupbuku";

const TAGIHAN_BELUM = "belum";
const TAGIHAN_LUNAS = "lunas";
const TAGIHAN_BEBAS = "bebas";
const TAGIHAN_BATAL = "batal";

const ALOKASI_DEFAULT = "kasrt";
const JENIS_MASUK = "masuk";
const JENIS_KELUAR = "keluar";
const JENIS_PINDAH_MASUK = "pindah_masuk";
const JENIS_PINDAH_KELUAR = "pindah_keluar";

const DEFAULT_SETTINGS = {
    iuran_bulanan: 50000,
    jatuh_tempo_hari: 10,
    nama_rt: "RT 001",
    reminder_aktif: false,
    iuran_mulai_default: "",
    backfill_mulai: "2026-01",
};

// Sheet yang dihapus saat mode "reset"
const SHEET_SKEMA = [
    "Setting", "Keluarga", "Anggota", "TarifIuran", "AlokasiIuran",
    "Tagihan", "TutupBuku", "TutupBukuAlokasi",
];

// Sheet data yang dipertahankan saat "reset", hanya dihapus pada "fresh"
const SHEET_DATA = ["Kas", "Pengumuman"];

const SHEET_SCHEMA = {
    Setting: ["kunci", "nilai", "tipe", "keterangan"],
    Keluarga: ["id_kk", "no_rumah", "nama_kk", "no_hp", "alamat", "status", "mulai_iuran", "catatan"],
    Anggota: ["id_kk", "nama", "hubungan", "jenis_kelamin", "tanggal_lahir", "status", "catatan"],
    TarifIuran: ["berlaku_mulai", "nominal", "keterangan"],
    AlokasiIuran: ["kode", "nama", "nominal", "sisa", "keterangan"],
    Tagihan: ["periode", "id_kk", "no_rumah", "nama_kk", "nominal", "status", "tanggal_bayar", "dicatat_oleh", "catatan"],
    Kas: ["tanggal", "keterangan", "jenis", "nominal", "alokasi", "ref", "dicatat_oleh"],
    TutupBuku: ["periode", "jenis", "tarif", "total_kk", "total_jiwa", "total_tagihan", "total_terbayar", "total_masuk", "total_keluar", "saldo_awal", "saldo_akhir", "ditutup_oleh", "ditutup_pada"],
    TutupBukuAlokasi: ["periode", "kode", "saldo_awal", "masuk", "keluar", "pindah_masuk", "pindah_keluar", "saldo_akhir"],
    Pengumuman: ["timestamp", "kategori", "isi", "pengirim"],
};
```

### 5.2 Fungsi baru

```js
// Setting
getSettings(), getSetting(kunci), setSetting(kunci, nilai, opsi)

// Periode
parsePeriode(input)        // { periode, jenis, start, end, tahun }
periodeSekarang()          // "2026-11"
daftarPeriodeDari(mulai, akhir)

// Tarif & alokasi
getTarifUntukPeriode(periode)
getAlokasiAktif(), validasiAlokasi(), hitungPembagian(nominal)
migrasiKasAlokasi(dryRun)

// Kas multi-kantong
getSaldoKantong(kode), getSaldoSemuaKantong()
tambahKasManual(jenis, alokasi, nominal, keterangan, oleh)
pindahKas(asal, tujuan, nominal, keterangan, oleh)
getMutasiKantong(kode, dari, sampai)
getTutupBukuAlokasi(periode), tulisTutupBukuAlokasi(periode, data)

// Keluarga & anggota
generateIdKK()
tambahKeluarga(data, oleh)          // tulis Keluarga + baris Kepala Keluarga di Anggota
tambahAnggota(idKK, data, oleh)     // validasi tepat satu kepala keluarga
getKeluarga(), getKeluargaAktif(), getKeluargaBillable(periode)
getAnggota(idKK), getAnggotaAktif(idKK)
getJumlahJiwa(periode)
cariKeluarga(identifier)            // id_kk -> no_rumah unik -> nama unik
migrasiWarga(dryRun)                // migrasi sheet Warga lama

// Tagihan
pastikanTagihan(periode)            // generate idempoten untuk KK billable
backfillTagihan(dari, sampai)
getTagihanKK(idKK, dari, sampai)
getTagihanPeriode(periode)
hitungTunggakanKK(idKK, sampaiPeriode), hitungTunggakan(sampaiPeriode)
catatPembayaran(keluarga, periodeList, oleh)  // update Tagihan + tulis Kas
sesuaikanTarifPeriode(periode, nominal)       // update baris 'belum' saat tarif berubah

// Rekap
hitungRekapRentang(dariPeriode, sampaiPeriode) // { perPeriode, total, penunggak }
formatRekapBulanan(rekap), formatRekapTahunan(rekap), progressBar(persen)

// Daftar KK
getDaftarKK({ sampaiPeriode, urut, sertakanNonaktif })
formatDaftarKK(rows, meta)     // tabel <pre> + header/total
sortNoRumah(a, b)              // natural sort nomor rumah
escapeHtml(text)

// Tutup buku
isPeriodeTertutup(periode), hitungRekapPeriode(periode), tutupBuku(periode, oleh)

// Setup
setupSheets(opsi)           // { mode: "safe"|"reset"|"fresh", backup, dryRun, backfill }
backupSpreadsheet(ss), terapkanSchema(sheet, header)
seedSettings(), seedTarifAwal(), seedAlokasiDefault()
initSheets(), resetSheetSkema(), resetSheetSkemaDryRun()
resetSemuaSheet(), resetSemuaSheetDryRun()
backfillTagihanBulanan(), backupSekarang()
```

### 5.3 Handler baru & handler yang berubah

Baru: `handleSetting`, `handleSet`, `handleTarif`, `handleAlokasi`, `handlePindahKas`, `handleTambahKK`, `handleTambahAnggota`, `handleTagihan`, `handleBayar`, `handleTunggakan`, `handleRekap`, `handleDaftar`, `handleTutupBuku`.

Berubah: `handleKas`, `handleTambahKas`, `handleWarga` (rincian di 5.5).

Semua didaftarkan di `PREFIX_HANDLERS` dengan key lowercase.

### 5.4 Refactor `processItem`

Ganti pencocokan `startsWith` menjadi **token pertama persis**:

```js
const token = cleanText.split(/\s+/)[0].toLowerCase();
const handler = PREFIX_HANDLERS[token];
```

Alasan:

- `/setting` saat ini ikut tertangkap `/set` karena urutan `startsWith`.
- `/kasfoo` saat ini dianggap `/kas`.

Dampak: key `PREFIX_HANDLERS` dibuat lowercase; sesuaikan `processItem.test.js`.

### 5.5 Perubahan handler lama

- `handleWarga`: total KK + total jiwa + statistik L/P (dari `Anggota`), deteksi anggota yatim; dukung `/warga <identifier>` untuk detail.
- `handleTambahWarga`: dibalas sebagai command usang → arahkan ke `/tambahkk`.
- `handleTambahKas`: format baru `jenis#alokasi#nominal#keterangan`; validasi kode kantong, saldo tidak boleh minus, dan tolak transaksi di periode yang sudah ditutup.
- `handleKas`: saldo per kantong + total, ringkasan masuk/keluar periode berjalan, dukung `/kas <kode>` dan `/kas <YYYY-MM>`.
- `handlePindahKas`: dua baris `pindah_keluar`/`pindah_masuk` dengan `ref` sama.
- `handleTutupBuku`: tulis `TutupBuku` + `TutupBukuAlokasi` dan validasi jumlah saldo kantong = saldo total.
- `handleStart`: daftar command baru + catatan "iuran hanya lewat `/bayar`" dan "pengeluaran wajib menyebut kantong".
- `module.exports`: ekspor semua fungsi/handler baru + konstanta status/jenis.

### 5.6 Inisialisasi & reset sheet (`setupSheets`)

Dijalankan manual dari editor Apps Script (lihat 5.8). Tiga mode:

| Mode | Menghapus | Membuat/segarkan | Kapan dipakai |
|---|---|---|---|
| `safe` (default) | tidak | sheet yang belum ada + schema | pertama kali / tambah sheet baru |
| `reset` | 8 sheet skema | ya, dari nol | skema berubah, data lama sudah diamankan |
| `fresh` | semua sheet terkelola (termasuk `Kas` & `Pengumuman`) | ya | mulai dari nol, backup wajib |

Klasifikasi sheet:

- **Sheet skema** (dihapus saat `reset`): `Setting`, `Keluarga`, `Anggota`, `TarifIuran`, `AlokasiIuran`, `Tagihan`, `TutupBuku`, `TutupBukuAlokasi`.
- **Sheet data** (dipertahankan saat `reset`): `Kas`, `Pengumuman`. Kolom baru pada `Kas` ditambahkan lewat `migrasiKasAlokasi`, bukan dengan menghapus sheet.
- **Sheet legacy** (tidak pernah disentuh): `Warga` / `Warga_lama`.

Jika `opsi.dryRun === true`, fungsi hanya mencatat rencana (sheet yang akan dibuat/dihapus, seed, backfill) ke Logger lalu berhenti tanpa mengubah apa pun.

Langkah `setupSheets`:

1. Validasi `SPREADSHEET_ID` tidak kosong; jika kosong, hentikan dengan pesan jelas.
2. Jika `mode != safe` dan `backup != false` → `backupSpreadsheet(ss)`:
   `DriveApp.getFileById(SPREADSHEET_ID).makeCopy("pakrt-backup-YYYYMMDD-HHmm")`.
   Catat ID file backup ke Logger.
3. `ss.setSpreadsheetTimeZone("Asia/Jakarta")` dan set locale `id_ID`.
4. Buat sheet sementara `_init_temp` agar spreadsheet tidak pernah kosong
   (Google Sheets menolak menghapus sheet terakhir).
5. Hapus sheet sesuai mode (lihat tabel).
6. Buat sheet yang belum ada berdasarkan `SHEET_SCHEMA`, lalu `terapkanSchema`:
   - header baris 1: bold, background, freeze;
   - format teks `@`: `periode`, `berlaku_mulai`, `mulai_iuran`, `tanggal_lahir`;
   - format angka `#,##0`: `nominal`, `tarif`, `total_*`, `saldo_*`;
   - format tanggal `dd/mm/yyyy hh:mm`: `tanggal`, `timestamp`, `tanggal_bayar`, `ditutup_pada`;
   - data validation: `Setting.tipe`, `Keluarga.status`, `Anggota.hubungan`,
     `Anggota.jenis_kelamin`, `Anggota.status`, `Tagihan.status`,
     `AlokasiIuran.sisa` (`TRUE|FALSE`), `Kas.jenis`
     (`masuk|keluar|pindah_masuk|pindah_keluar`);
   - proteksi kolom kunci: `Setting.kunci`, `Keluarga.id_kk`, `Tagihan.periode`,
     `Tagihan.id_kk`, `AlokasiIuran.kode`;
   - lebar kolom proporsional.
7. Hapus `_init_temp`.
8. Seed `Setting` default, satu baris `TarifIuran` awal, dan `AlokasiIuran` default
   (`kasrt` penampung sisa, `dkmt`, `kamsih`) — hanya jika sheet masih kosong.
9. Jika `opsi.backfill === true` → `backfillTagihan(getSetting("backfill_mulai"), periodeSekarang())`.
10. `SpreadsheetApp.flush()`, lalu `Logger.log` ringkasan: mode, sheet dibuat,
    sheet dihapus, file backup.

Keamanan:

- `reset` **tidak** menghapus `Kas` dan `Pengumuman`; kolom baru pada `Kas` ditambahkan
  oleh `migrasiKasAlokasi()`. `fresh` yang menghapus semuanya (dengan backup).
- `Warga`/`Warga_lama` tidak pernah dihapus oleh inisialisasi, supaya migrasi tetap
  bisa dijalankan atau diulang.
- Hentikan webhook/polling sebelum reset agar tidak ada penulisan saat sheet dihapus.
- Mode `safe` tidak memperbaiki header yang bergeser; hanya log peringatan dan saran `reset`.
- Backup membutuhkan izin Drive; otorisasi muncul saat pertama dijalankan.

### 5.7 Migrasi data lama

**`migrasiWarga(dryRun)`**

1. Baca sheet `Warga` lama.
2. Untuk setiap baris: buat `Keluarga` baru (`id_kk` otomatis, `status = Aktif`,
   `mulai_iuran` = setting default), lalu buat baris `Anggota` dengan
   `hubungan = Kepala Keluarga` dari data yang sama.
3. Idempoten: lewati baris yang sudah punya KK dengan `no_rumah` + `nama_kk` sama.
4. `dryRun = true` hanya mencatat rencana ke Logger tanpa menulis.
5. Setelah sukses, rename sheet `Warga` → `Warga_lama`.
6. Log ringkasan: jumlah KK dibuat, jumlah dilewati, jumlah error.

**`migrasiKasAlokasi(dryRun)`**

1. Pastikan kolom `alokasi` dan `ref` ada di `Kas`; jika belum, tambahkan di kanan tanpa menggeser kolom lama.
2. Semua baris tanpa `alokasi` diisi `kasrt`.
3. `ref` kosong diisi `LEGACY-<nomor baris>`.
4. `dryRun = true` hanya mencatat jumlah baris yang akan diubah.
5. Log ringkasan: jumlah baris diperbarui, jumlah dilewati.

Urutan yang benar:

```
setupSheets({ mode: "reset" })   // skema bersih; Kas, Pengumuman, Warga tetap aman
migrasiKasAlokasi(true)          // tinjau rencana
migrasiKasAlokasi()              // isi kolom alokasi/ref pada Kas lama
migrasiWarga(true)               // tinjau rencana
migrasiWarga()                   // impor KK + kepala keluarga ke sheet baru
backfillTagihan("2026-01", periodeSekarang())
```

Catatan: migrasi tidak bisa menebak anggota keluarga. Setelah migrasi, pengurus
menambahkan anggota via `/tambahanggota` atau langsung di sheet.

### 5.8 Menjalankan dari editor Apps Script

Tidak ada menu spreadsheet dan tidak ada command bot. Semua lewat fungsi bernama yang dipilih dari dropdown "Select function" di editor, lalu **Run**.

| Fungsi | Aksi | Menghapus data? |
|---|---|---|
| `initSheets()` | setara `setupSheets({ mode: "safe" })` | tidak |
| `resetSheetSkemaDryRun()` | log rencana reset skema | tidak |
| `resetSheetSkema()` | backup + hapus 8 sheet skema + buat ulang | ya, dengan backup otomatis |
| `resetSemuaSheetDryRun()` | log rencana reset total | tidak |
| `resetSemuaSheet()` | backup + hapus semua sheet terkelola + buat ulang | ya, dengan backup otomatis |
| `migrasiKasAlokasiDryRun()` | log rencana migrasi kolom Kas | tidak |
| `migrasiKasAlokasi()` | isi `alokasi`/`ref` Kas lama | tidak, hanya menambah kolom/nilai |
| `migrasiWarga()` | impor `Warga` lama ke `Keluarga` + `Anggota` | tidak, hanya menambah baris |
| `backfillTagihanBulanan()` | generate tagihan dari `backfill_mulai` s.d. periode berjalan | tidak, idempoten |
| `backupSekarang()` | hanya membuat salinan file ke Drive | tidak |

Wrapper:

```js
function initSheets() {
    return setupSheets({ mode: "safe" });
}

function resetSheetSkemaDryRun() {
    return setupSheets({ mode: "reset", dryRun: true });
}

function resetSheetSkema() {
    return setupSheets({ mode: "reset", backup: true });
}

function resetSemuaSheetDryRun() {
    return setupSheets({ mode: "fresh", dryRun: true });
}

function resetSemuaSheet() {
    return setupSheets({ mode: "fresh", backup: true });
}

function backfillTagihanBulanan() {
    return backfillTagihan(getSetting("backfill_mulai"), periodeSekarang());
}

function migrasiKasAlokasiDryRun() {
    return migrasiKasAlokasi(true);
}

function migrasiWargaDryRun() {
    return migrasiWarga(true);
}

function backupSekarang() {
    return backupSpreadsheet(SpreadsheetApp.openById(SPREADSHEET_ID));
}
```

`dryRun` pada `setupSheets` hanya mencatat rencana ke Logger: sheet yang akan dihapus, dibuat, dan baris seed — tanpa mengubah apa pun.

Urutan aman saat pertama kali:

1. `backupSekarang()` — opsional tapi disarankan.
2. `resetSheetSkemaDryRun()` — cek daftar sheet di log.
3. `resetSheetSkema()` — reset skema + backup otomatis.
4. `migrasiKasAlokasiDryRun()` lalu `migrasiKasAlokasi()` — tambah kolom kantong pada Kas lama.
5. `migrasiWargaDryRun()` lalu `migrasiWarga()`.
6. `backfillTagihanBulanan()`.

Tanpa menu, tidak ada `onOpen` atau installable trigger yang perlu dipasang, jadi cocok untuk project standalone yang memakai `openById`.

## 6. Tahapan implementasi

- [ ] **Tahap 1 — Fondasi setting**
  - `getSettings`, `getSetting`, `setSetting`
  - `handleSetting`, `handleSet`, `handleTarif`
  - Refactor `processItem` ke token matching
  - `SHEET_SCHEMA`, `setupSheets` mode `safe/reset/fresh` + `dryRun`, `terapkanSchema`
  - `backupSpreadsheet`, `seedSettings`, `seedTarifAwal`, `seedAlokasiDefault`
  - Wrapper editor: `initSheets`, `resetSheetSkema`, `resetSheetSkemaDryRun`, `resetSemuaSheet`, `resetSemuaSheetDryRun`, `migrasiKasAlokasiDryRun`, `migrasiWargaDryRun`, `backfillTagihanBulanan`, `backupSekarang`
- [ ] **Tahap 2 — Tarif per periode**
  - `parsePeriode`, `periodeSekarang`, `getTarifUntukPeriode`
  - Integrasi `/set iuran_bulanan` → upsert `TarifIuran` + `sesuaikanTarifPeriode`
  - Tolak perubahan tarif untuk periode tertutup
- [ ] **Tahap 3 — Keluarga & anggota**
  - Sheet `Keluarga` + `Anggota`, `generateIdKK` dengan lock
  - `tambahKeluarga` (atomik: KK + kepala keluarga), `tambahAnggota` (validasi satu kepala)
  - `cariKeluarga` + resolusi ambigu
  - `/tambahkk`, `/tambahanggota`, `/warga`, `/warga <identifier>`
  - `migrasiWarga` + `handleTambahWarga` usang
- [ ] **Tahap 4 — Ledger tagihan & kas multi-kantong**
  - Sheet `Tagihan`, `pastikanTagihan`, `backfillTagihan`
  - `getTagihanKK`, `getTagihanPeriode`, `hitungTunggakan`
  - `catatPembayaran`, `/bayar`, `/tunggakan`, `/tagihan`
  - Sheet `AlokasiIuran` + `getAlokasiAktif`, `validasiAlokasi`, `hitungPembagian`
  - `catatPembayaran` menulis satu baris `Kas` per kantong dengan `ref` sama
  - `getSaldoKantong`, `getSaldoSemuaKantong`, `tambahKasManual`, `pindahKas`
  - `/kas`, `/kas <kode>`, `/alokasi`, `/pindahkas`, format baru `/tambahkas`
  - `migrasiKasAlokasi` + soft lock `handleTambahKas`
- [ ] **Tahap 5 — Rekap, daftar, & tutup buku**
  - `hitungRekapRentang`, `formatRekapBulanan`, `formatRekapTahunan`, `progressBar`
  - `handleRekap` untuk bulan, tahun, dan rentang
  - `getDaftarKK`, `formatDaftarKK`, `sortNoRumah`, `escapeHtml`
  - `handleDaftar` dengan filter `aktif/semua`, urutan `rumah/tagihan/nama`, paging 25 baris
  - `hitungRekapPeriode`, `tutupBuku`, `isPeriodeTertutup`
  - Rekap dari `Tagihan`: `total_kk`, `total_jiwa`, `total_tagihan`, `total_terbayar`
  - Snapshot `TutupBukuAlokasi` per kantong + validasi total
  - `handleTutupBuku` bulanan + tahunan
  - Ringkasan periode berjalan di `/kas`
- [ ] **Tahap 6 — Dokumentasi & test**
  - Update README (struktur sheet, command, aturan `/bayar`, migrasi, backfill)
  - Update `/start`
  - Semua test baru hijau + coverage

## 7. Rencana test

| File | Fokus |
|---|---|
| `tests/getSettings.test.js` | konversi angka/boolean/teks, fallback default, kunci kosong |
| `tests/setupSheets.test.js` | mode `safe` tidak menghapus, `reset` menghapus 8 sheet skema dan mempertahankan `Kas`/`Pengumuman`/`Warga`, `fresh` menghapus semua, `dryRun` tidak menulis/menghapus, sheet sementara mencegah spreadsheet kosong, seed hanya saat kosong |
| `tests/terapkanSchema.test.js` | header, format teks/angka/tanggal, validasi, proteksi kolom kunci |
| `tests/backupSpreadsheet.test.js` | salinan dibuat dengan nama `pakrt-backup-*`, mode `safe` tidak memicu backup |
| `tests/hitungPembagian.test.js` | 50.000 → 5.000/5.000/40.000, tarif 60.000 menggeser kantong sisa, alokasi tetap melebihi tarif ditolak, tepat satu `sisa`, kode invalid (huruf besar/spasi/>8 karakter) ditolak |
| `tests/migrasiKasAlokasi.test.js` | kolom ditambahkan tanpa menggeser kolom lama, baris lama jadi `kasrt`, `ref` legacy terisi, idempoten |
| `tests/parsePeriode.test.js` | `2026-10`, `2026`, input invalid, batas awal/akhir bulan |
| `tests/getTarifUntukPeriode.test.js` | baris terbaru ≤ periode, fallback setting, periode sebelum tarif pertama |
| `tests/handleSet.test.js` | non-admin ditolak, kunci tak dikenal, validasi angka, upsert tarif, update tagihan `belum` |
| `tests/tambahKeluarga.test.js` | id_kk berurutan, KK + kepala keluarga dibuat bersamaan, no_rumah duplikat diizinkan |
| `tests/tambahAnggota.test.js` | id_kk wajib ada, kepala keluarga kedua ditolak, jenis kelamin/tanggal valid |
| `tests/cariKeluarga.test.js` | prioritas id_kk, no_rumah unik, nama unik, kasus ambigu |
| `tests/handleWarga.test.js` (update) | total KK vs total jiwa, anggota nonaktif tidak dihitung, anggota yatim dilaporkan |
| `tests/migrasiWarga.test.js` | idempoten, dry run tidak menulis, rename sheet lama |
| `tests/pastikanTagihan.test.js` | idempoten, hanya KK billable, tarif per periode benar, KK pindah tidak dapat baris baru |
| `tests/backfillTagihan.test.js` | Jan–Nov 2026 terbentuk, ulang tidak menggandakan, periode tanpa tarif ditangani |
| `tests/handleBayar.test.js` | status tagihan jadi lunas, satu baris Kas per kantong dengan `ref` sama, duplikat ditolak, KK tidak billable, multi-periode, identifier ambigu, idempoten saat retry |
| `tests/pindahKas.test.js` | dua baris `pindah_keluar`/`pindah_masuk`, total kas tidak berubah, saldo asal kurang ditolak, asal = tujuan ditolak |
| `tests/hitungTunggakan.test.js` | Jan–Mei belum bayar = 5×50.000, tagihan lama tetap ada walau KK pindah, pembayaran telat tidak mengubah snapshot |
| `tests/hitungRekapRentang.test.js` | target/terbayar/tunggakan per bulan, `batal` dikecualikan, `bebas` dihitung KK, penunggak teratas urut nominal, rentang dibatasi |
| `tests/handleRekap.test.js` | default bulan berjalan, argumen `YYYY-MM`, `YYYY`, dua argumen rentang, non-admin ditolak, penanda periode tertutup |
| `tests/getDaftarKK.test.js` | hanya KK aktif secara default, `semua` menyertakan Pindah, natural sort A2 sebelum A10, tunggakan 0 jadi `-`, total jiwa benar |
| `tests/handleDaftar.test.js` | urutan `tagihan`/`nama`, filter periode, paging 25 baris, escape HTML pada nama, non-admin ditolak |
| `tests/tutupBuku.test.js` | tolak dobel, tolak non-admin, saldo berantai, `total_kk`/`total_terbayar` dari `Tagihan`, `TutupBukuAlokasi` per kantong, jumlah saldo kantong = saldo total, tahunan menolak bulan belum tutup |
| `tests/handleKas.test.js` (update) | saldo per kantong + total, masuk/keluar periode berjalan, `/kas <kode>`, format `/tambahkas` baru |
| `tests/handleAlokasi.test.js` | daftar kantong, total tarif, penanda sisa, non-admin untuk perubahan |
| `tests/processItem.test.js` (update) | token matching, `/setting` vs `/set`, `/kasfoo` tidak match |

Helper: tambah `getRange(row, col).setValue()` dan `getLastColumn()` pada `tests/helpers/mockSheet.js` (untuk update baris `Setting` dan `Tagihan`), serta `insertSheet`, `deleteSheet`, `getSheets`, `setName` pada mock spreadsheet untuk test `setupSheets`.

## 8. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Tagihan dobel saat generate | Cek `id_kk` + `periode` sebelum menulis; `backfillTagihan` idempoten |
| Tagihan lama berubah saat KK pindah | Baris `Tagihan` tidak pernah dihapus/dihitung ulang |
| Tarif naik di tengah bulan | Hanya baris `belum` yang disesuaikan; `lunas` tetap |
| KK dobel di rumah yang sama | Diizinkan by design; `id_kk` jadi pembeda |
| Dua baris "Kepala Keluarga" dalam satu KK | Ditolak `tambahAnggota`; validasi ulang saat `/warga` |
| `nama_kk` tidak sinkron dengan baris kepala keluarga | Ditulis otomatis saat KK dibuat; drift hanya lewat edit manual |
| Anggota yatim (id_kk hilang) | Diabaikan dari hitungan, dilaporkan ke admin |
| KK pindah tapi masih ditagih | Generate hanya untuk KK aktif; baris lama tetap sebagai riwayat |
| Iuran tercatat dobel | Satu pintu `/bayar`; status tagihan dicek; keterangan `Kas` berstandar |
| Tarif berubah setelah tutup buku | Snapshot `TutupBuku` tidak berubah; `/set` ditolak untuk periode tertutup |
| Lupa tutup buku berbulan-bulan | Tagihan tetap tercatat; tutup tahun menolak sampai bulan lengkap |
| Rekap periode tertutup berbeda dari snapshot | `/rekap` = kondisi terkini (termasuk pelunasan telat), `TutupBuku` = kondisi saat ditutup; beri penanda `🔒` dan catatan di pesan |
| Rentang rekap terlalu panjang | Batasi 24 periode; `pastikanTagihan` hanya sampai periode berjalan |
| Daftar KK melebihi batas pesan Telegram | Paging 25 baris, header diulang, penanda `(1/2)` |
| Nama KK mengandung karakter HTML | `escapeHtml` sebelum masuk blok `<pre>` |
| Reset tidak sengaja menghapus data | Dijalankan manual dari editor; tersedia versi `resetSheetSkemaDryRun`/`resetSemuaSheetDryRun`; backup file otomatis; `Kas`/`Pengumuman`/`Warga` dipertahankan |
| Spreadsheet kosong saat hapus sheet terakhir | Sheet sementara `_init_temp` dibuat sebelum penghapusan |
| Bot menulis saat reset berjalan | Hentikan webhook/polling sebelum reset, deploy ulang setelah selesai |
| Backup gagal karena izin Drive | Hentikan proses reset dan tampilkan error; jalankan `backupSekarang()` manual lebih dulu |
| Saldo kantong minus | `/tambahkas keluar` dan `/pindahkas` ditolak jika melebihi saldo kantong |
| Alokasi tetap melebihi tarif | `/set` dan `/bayar` ditolak; tampilkan Σ tetap vs tarif |
| Pindah dana terhitung pemasukan/pengeluaran | `jenis` khusus `pindah_*` dikecualikan dari `total_masuk`/`total_keluar` |
| Saldo kantong tidak sama dengan saldo total | Validasi saat `tutupBuku`; batalkan penulisan dan laporkan selisih |
| Kas lama tidak punya kantong | `migrasiKasAlokasi` mengisi `kasrt`; idempoten |
| Header bergeser di sheet lama | Mode `safe` hanya memberi peringatan; perbaikan lewat `reset` |
| Zona waktu menggeser periode | Simpan periode sebagai teks; set spreadsheet `Asia/Jakarta` |
| Pesan Telegram > 4096 karakter | Helper pemecah pesan per baris |
| Id_kk duplikat saat request bersamaan | `LockService` di `generateIdKK` |

## 9. Langkah manual setelah implementasi

1. Hentikan bot sementara: `deleteWebhook(true)` atau `stopPollingTrigger()`.
2. Di editor Apps Script, jalankan `backupSekarang()` — opsional tapi disarankan.
3. Jalankan `resetSheetSkemaDryRun()`, cek daftar sheet yang akan dihapus/dibuat di Execution log.
4. Jalankan `resetSheetSkema()` — backup otomatis lalu sheet `Setting`, `Keluarga`, `Anggota`, `TarifIuran`, `AlokasiIuran`, `Tagihan`, `TutupBuku`, `TutupBukuAlokasi` dibuat bersih; `Kas`, `Pengumuman`, `Warga` tetap ada.
5. Jalankan `migrasiKasAlokasiDryRun()` lalu `migrasiKasAlokasi()` — kolom kantong pada `Kas` lama terisi `kasrt`.
6. Jalankan `migrasiWargaDryRun()` lalu `migrasiWarga()`.
7. Isi `Setting` (nama RT, tarif, jatuh tempo, `backfill_mulai`), `TarifIuran` awal, dan `AlokasiIuran` (kantong + nominal + kolom `sisa`).
8. Lengkapi anggota keluarga via `/tambahanggota` atau langsung di sheet `Anggota`.
9. Tinjau `Keluarga.status` dan `mulai_iuran` untuk warga lama/pindahan.
10. Jika saldo awal perlu dipecah ke kantong lain, gunakan `/pindahkas`.
11. Jalankan `backfillTagihanBulanan()`.
12. Deploy ulang Web App → `setWebhook(true)`.
13. Uji `/setting`, `/warga`, `/tambahkk`, `/tambahanggota`, `/tagihan`, `/alokasi`, `/kas`, `/bayar`, `/tunggakan`, `/rekap`, `/daftar`, `/pindahkas`, `/tutupbuku 2026-10`.
14. Perbarui README sesuai struktur final.

## 10. Di luar scope (tahap lanjut)

- Pembayaran sebagian/cicilan (`status = sebagian`).
- Pembebasan iuran per KK otomatis (`bebas` masih manual di sheet).
- Pengingat otomatis jatuh tempo (`reminder_aktif` + trigger harian).
- `/tagihulang <periode>` untuk regenerate tagihan yang sudah dibuat.
- `/cekkas` audit snapshot vs `Kas` dan `/cekkk` audit konsistensi KK–anggota.
- Rekap iuran per kantong (`/rekap <kode>`): saat ini `/rekap` hanya total, rincian kantong lewat `/kas` dan `TutupBukuAlokasi`.
- Statistik usia dari `tanggal_lahir` (kelompok balita/anak/dewasa/lansia).
- Ekspor rekap tahunan ke PDF/Sheets baru.
