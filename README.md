# pakrt

Bot Telegram + Google Sheets untuk membantu urusan RT: iuran bulanan per KK, kas multi-kantong, tunggakan, rekap, dan tutup buku.

## Prasyarat

- Node.js + npm (untuk unit test)
- Akun Google (Google Sheets + Google Apps Script)
- Bot Telegram (token dari [@BotFather](https://t.me/BotFather))

## Konfigurasi

Isi konstanta di bagian atas `kode.gs`:

- `SPREADSHEET_ID` — ID Google Spreadsheet
- `TELEGRAM_TOKEN` — token bot Telegram
- `WEBHOOK_URL` — URL deploy Web App (diisi setelah deploy)
- `ADMIN_IDS` — array ID Telegram pengurus inti (hardcoded). Admin tambahan dikelola lewat `/admin` dan disimpan pada setting `admin_tambahan`.
- `GROUP_CHAT_ID` (opsional) — ID grup warga untuk auto-broadcast pengumuman

## Struktur Google Sheet

Semua tab dibuat otomatis oleh `initSheets()` / `setupSheets()`.

| Tab | Kolom |
|---|---|
| `Setting` | `kunci, nilai, tipe, keterangan` |
| `Keluarga` | `id_kk, no_rumah, nama_kk, no_hp, alamat, status, mulai_iuran, catatan` |
| `Anggota` | `id_kk, nama, hubungan, jenis_kelamin, tanggal_lahir, status, catatan` |
| `TarifIuran` | `berlaku_mulai, nominal, keterangan` |
| `AlokasiIuran` | `kode, nama, nominal, sisa, keterangan` |
| `Tagihan` | `periode, id_kk, no_rumah, nama_kk, nominal, status, tanggal_bayar, dicatat_oleh, catatan` |
| `Kas` | `tanggal, keterangan, jenis, nominal, alokasi, ref, dicatat_oleh` |
| `TutupBuku` | `periode, jenis, tarif, total_kk, total_jiwa, total_tagihan, total_terbayar, total_masuk, total_keluar, saldo_awal, saldo_akhir, ditutup_oleh, ditutup_pada` |
| `TutupBukuAlokasi` | `periode, kode, saldo_awal, masuk, keluar, pindah_masuk, pindah_keluar, saldo_akhir` |
| `TelegramUser` | `id_telegram, username, nama, id_kk, peran, status, diminta_pada, diverifikasi_oleh, diverifikasi_pada` |
| `Pengumuman` | `timestamp, kategori, isi, pengirim` |

### Aturan data

- **KK vs anggota.** `Keluarga` adalah unit penagihan/admin; `Anggota` dihitung sebagai jumlah jiwa. Satu rumah boleh punya lebih dari satu KK. `id_kk` adalah kunci utama; `no_rumah` hanya atribut.
- **Kepala keluarga** otomatis dibuat sebagai baris `Anggota` dengan `hubungan = Kepala Keluarga` saat `/tambahkk`.
- **Tagihan per KK**, bukan per orang. Riwayat tarif disimpan di `TarifIuran.berlaku_mulai`; tarif berlaku = baris terbaru dengan periode ≤ periode tagihan.
- **`Tagihan` adalah sumber kebenaran.** Baris historis tidak pernah dihitung ulang atau dihapus. Perubahan tarif hanya menyentuh tagihan berstatus `belum`; yang sudah `lunas` tidak diubah.
- **Status tagihan:** `belum`, `lunas`, plus cadangan `bebas` dan `batal`. Tidak ada pembayaran sebagian.
- **`/bayar` satu-satunya jalur pencatatan iuran.** Perintah ini mengubah `Tagihan` menjadi `lunas` dan menulis satu baris `Kas` per kantong dengan `ref = BYR-<YYYYMM>-<idKK tanpa tanda hubung>` (idempoten per `ref` + `alokasi`).
- **Kas multi-kantong.** Setiap kantong punya nominal tetap; tepat satu kantong bertanda `sisa = TRUE` menampung selisih. Kode kantong huruf kecil/angka, maksimal 8 karakter (default: `kasrt`, `dkmt`, `kamsih`).
- **Baris `Kas` lama** tanpa `alokasi` dianggap masuk ke `kasrt` (lihat migrasi).
- **Tutup buku** menyimpan snapshot `TutupBuku` + `TutupBukuAlokasi`. Jumlah saldo akhir semua kantong harus sama dengan saldo akhir total. Tutup buku tahunan ditolak sampai 12 bulan pada tahun itu ditutup.
- **Keterkaitan Telegram ↔ KK** disimpan di tab `TelegramUser` (bukan kolom di `Keluarga`), karena satu akun Telegram boleh mewakili beberapa KK. Status: `menunggu`, `aktif`, `ditolak`, `dicabut`. Baris `ditolak`/`dicabut` dipakai ulang saat akun mengajukan lagi. Lihat bagian [Keterkaitan akun Telegram ↔ KK](#keterkaitan-akun-telegram--kk).

### Setting awal

| Kunci | Default | Keterangan |
|---|---|---|
| `iuran_bulanan` | `50000` | Tarif iuran default per KK |
| `jatuh_tempo_hari` | `10` | Tanggal jatuh tempo |
| `nama_rt` | `RT 001` | Nama RT |
| `reminder_aktif` | `false` | Pengingat otomatis (belum aktif) |
| `iuran_mulai_default` | `2026-01` | Periode mulai iuran KK baru |
| `backfill_mulai` | `2026-01` | Periode awal backfill tagihan |
| `maks_telegram_per_kk` | `2` | Maks akun Telegram (menunggu + aktif) per KK; `0` = tanpa batas |
| `maks_kk_per_telegram` | `5` | Maks KK aktif per akun Telegram; `0` = tanpa batas |
| `admin_tambahan` | _(kosong)_ | ID Telegram admin tambahan, dipisah koma. Ubah lewat `/admin`, bukan `/set` |

## Inisialisasi & reset

Perintah ini **hanya dijalankan dari editor Apps Script**, tidak lewat menu, `onOpen`, atau bot.

| Fungsi | Kegunaan |
|---|---|
| `setupSheets({ mode: "safe" })` / `initSheets()` | Membuat tab yang belum ada, mengisi setting/tarif/alokasi awal. Data lama aman. |
| `setupSheets({ mode: "reset", dryRun: true })` / `resetSheetSkemaDryRun()` | Melihat rencana reset tanpa mengubah apa pun. |
| `setupSheets({ mode: "reset", backup: true })` / `resetSheetSkema()` | Backup seluruh file ke Drive, lalu hapus & buat ulang **sheet skema** saja. |
| `setupSheets({ mode: "fresh", backup: true })` / `resetSemuaSheet()` | Sama seperti reset, tetapi juga menghapus `Kas` dan `Pengumuman`. |

- Mode `reset` / `fresh` selalu membuat backup ke Drive lebih dulu (`backup: false` hanya untuk keperluan uji).
- Sheet skema yang dihapus saat reset: `Setting`, `Keluarga`, `Anggota`, `TarifIuran`, `AlokasiIuran`, `Tagihan`, `TutupBuku`, `TutupBukuAlokasi`, `TelegramUser`.
- Data yang dipertahankan saat reset: `Kas`, `Pengumuman`, dan `Warga`/`Warga_lama`.
- `setupSheets` juga menerima `{ spreadsheet }` atau `{ spreadsheetId }`; `{ backfill: true }` langsung membuat tagihan dari `backfill_mulai` sampai bulan berjalan.
- `backupSekarang()` membuat backup manual.

## Migrasi dari data lama

Jalankan berurutan dari editor:

1. `migrasiWargaDryRun()` — cek jumlah baris `Warga` yang akan dipindah ke `Keluarga` + `Anggota`.
2. `migrasiWarga()` — memindahkan data. Tab lama di-rename menjadi `Warga_lama`.
3. `migrasiKasAlokasiDryRun()` — cek baris `Kas` yang akan diisi `alokasi`/`ref`.
4. `migrasiKasAlokasi()` — menambah kolom `alokasi` & `ref`, mengisi `kasrt` dan `LEGACY-<baris>` pada data lama.
5. `backfillTagihanBulanan()` — membuat tagihan dari `backfill_mulai` sampai bulan berjalan untuk KK aktif.

## Cara deploy webhook

1. Deploy `kode.gs` sebagai Web App di Google Apps Script.
2. Jalankan `setWebhook()` atau set manual via URL Telegram.
3. Uji endpoint dengan `example.sh` / buka URL `/exec` di browser (harus tampil `OK`).

## Daftar perintah

### Untuk semua warga

| Perintah | Keterangan | Contoh |
|---|---|---|
| `/start` | Sambutan & daftar perintah | `/start` |
| `/kas` | Saldo kas total & per kantong | `/kas` |
| `/kas <kode>` | 10 mutasi terakhir satu kantong | `/kas kasrt` |
| `/kas <YYYY-MM>` | Saldo akhir bulan tertentu | `/kas 2026-03` |
| `/alokasi` | Pembagian iuran ke kantong | `/alokasi` |
| `/warga` | Jumlah KK aktif & jiwa | `/warga` |
| `/warga <id_kk/no_rumah/nama>` | Kartu KK; detail penuh pengurus via DM, akun terhubung melihat nama anggota via DM | `/warga KK-001` |
| `/gabung <id_kk/no_rumah/nama>` | Ajukan keterkaitan akun Telegram ke KK (hanya lewat DM) | `/gabung KK-001` |
| `/saya` | Cek KK & status keterkaitan akun ini (hanya lewat DM) | `/saya` |
| `/tagihan` | Tagihan KK yang terhubung (hanya lewat DM) | `/tagihan` |
| `/tagihan <id_kk>` | Tagihan salah satu KK yang terhubung | `/tagihan KK-001` |
| `/tunggakan` | Tunggakan KK yang terhubung (hanya lewat DM) | `/tunggakan` |
| `/tunggakan <id_kk>` | Tunggakan salah satu KK yang terhubung | `/tunggakan KK-001` |
| `/pengumuman` | 5 pengumuman terbaru | `/pengumuman` |

### Khusus pengurus (`ADMIN_IDS`)

| Perintah | Keterangan | Contoh |
|---|---|---|
| `/setting` | Daftar pengaturan | `/setting` |
| `/set <kunci> <nilai> [periode]` | Ubah pengaturan; `iuran_bulanan` menyesuaikan tarif | `/set iuran_bulanan 65000 2026-05` |
| `/tarif` | Riwayat & tarif berlaku | `/tarif` |
| `/tambahkk Nama#No HP#No Rumah#Alamat#Catatan` | Tambah KK + kepala keluarga | `/tambahkk Budi#0812#A1#Jl. Mawar#` |
| `/tambahanggota id_kk#Nama#Hubungan#L/P#YYYY-MM-DD#Catatan` | Tambah anggota | `/tambahanggota KK-001#Rina#Istri#P#2010-05-01` |
| `/tagihan <id_kk/no_rumah/nama>` | Rincian tagihan & tunggakan KK mana pun | `/tagihan KK-001` |
| `/bayar <id> [YYYY-MM ...]` | Catat iuran (satu-satunya jalur resmi) | `/bayar KK-001 2026-03 2026-04` |
| `/tunggakan [id\|YYYY-MM]` | Ringkasan tunggakan (global atau per KK) | `/tunggakan` |
| `/verifikasi <id_kk\|id_telegram>` | Setujui pengajuan keterkaitan akun | `/verifikasi KK-001` |
| `/tolak <id_kk\|id_telegram>` | Tolak pengajuan keterkaitan akun | `/tolak 123456789` |
| `/cabut <id_kk\|id_telegram>` | Putuskan akun dari KK | `/cabut KK-001` |
| `/rekap [YYYY-MM\|YYYY] [YYYY-MM]` | Target vs terbayar | `/rekap 2026-01 2026-03` |
| `/daftar [semua\|tagihan\|nama\|rumah] [halaman]` | Daftar KK & tunggakan | `/daftar tagihan` |
| `/tambahkas jenis#alokasi#nominal#keterangan` | Kas masuk/keluar manual | `/tambahkas keluar#kamsih#400000#Honor satpam` |
| `/pindahkas asal#tujuan#nominal#keterangan` | Pindah dana antar kantong | `/pindahkas kasrt#dkmt#10000#Surplus` |
| `/tutupbuku <YYYY-MM\|YYYY>` | Tutup buku bulanan/tahunan | `/tutupbuku 2026-03` |
| `/buatpengumuman Kategori#Isi pesan` | Simpan & broadcast pengumuman | `/buatpengumuman Info#Kerja bakti Minggu` |
| `/admin` | Daftar admin inti & tambahan | `/admin` |
| `/admin tambah <id_telegram>` | Tambah admin tambahan (khusus admin inti) | `/admin tambah 123456789` |
| `/admin hapus <id_telegram>` | Hapus admin tambahan (khusus admin inti) | `/admin hapus 123456789` |

Catatan:

- `/tambahwarga` sudah **diganti** (bukan alias) dan akan mengarahkan ke `/tambahkk` + `/tambahanggota`.
- Format lama `/tambahkas masuk#50000#Keterangan` akan ditolak dengan pesan perubahan format karena kantong wajib disebut.
- Periode yang sudah ditutup bersifat read-only: `/bayar`, `/tambahkas`, `/pindahkas`, dan perubahan tarif ditolak. `/rekap` menandai periode tertutup dengan 🔒.
- Admin tambahan punya akses perintah pengurus yang sama, tetapi hanya admin inti (`ADMIN_IDS`) yang bisa menambah/menghapusnya. `/set admin_tambahan` sengaja ditolak dan diarahkan ke `/admin`.

## Keterkaitan akun Telegram ↔ KK

Tidak ada SMS gateway. Verifikasi akun dilakukan manual oleh pengurus lewat Telegram.

### Alur pendaftaran

1. Warga mengirim `/gabung <id_kk>` **lewat DM bot** (contoh: `/gabung KK-001`). Bisa juga memakai `no_rumah` atau `nama_kk`.
2. Sistem menulis baris `TelegramUser` berstatus `menunggu` lalu mengirim DM berisi identitas pemohon ke **semua admin** (`ADMIN_IDS` + admin tambahan). Kegagalan kirim notifikasi hanya dicatat di log, tidak membatalkan pengajuan.
3. Pengurus menjalankan `/verifikasi <id_kk>` (atau `/verifikasi <id_telegram>`) untuk menyetujui, atau `/tolak <...>` untuk menolak. Pemohon menerima DM hasilnya.
4. Setelah `aktif`, warga bisa memakai `/saya`, `/tagihan`, dan `/tunggakan`.

### Aturan & batas

- **Status:** `menunggu` → `aktif` / `ditolak`; akun aktif bisa menjadi `dicabut`.
- **Kuota akun per KK** (`maks_telegram_per_kk`, default `2`): menghitung baris `menunggu` + `aktif`. Baris `ditolak`/`dicabut` tidak dihitung.
- **Kuota KK per akun** (`maks_kk_per_telegram`, default `5`): hanya menghitung keterkaitan `aktif`. Satu akun tetap boleh mengajukan KK baru selama kuota belum penuh.
- Nilai `0` berarti **tanpa batas** untuk kedua kuota.
- **Ajukan ulang:** pengajuan untuk pasangan akun + KK yang sama bersifat idempoten. Baris `ditolak`/`dicabut` dipakai ulang dan dikembalikan ke `menunggu`, bukan membuat baris baru.
- **Ambigu:** bila satu KK punya lebih dari satu pengajuan `menunggu`, `/verifikasi <id_kk>` dan `/tolak <id_kk>` akan meminta `id_telegram` agar tidak salah akun.
- **Pencabutan:** `/cabut <id_kk>` memutus semua akun aktif pada KK tersebut, sedangkan `/cabut <id_telegram>` memutus semua KK untuk akun itu.
- KK berstatus selain `Aktif` tidak bisa dihubungkan.

### Privasi di grup

- `/gabung`, `/saya`, `/tagihan`, dan `/tunggakan` untuk warga **hanya berjalan di DM**. Di grup, bot hanya membalas arahan untuk mengirim lewat DM.
- Pesan grup tidak pernah memuat `id_telegram` atau `no_hp`.
- `/warga <id_kk>` menampilkan detail penuh (No HP, alamat, mulai iuran, tunggakan, anggota) **hanya untuk pengurus dan hanya lewat DM**. Akun terhubung non-admin mendapat kartu ringkas + nama anggota aktif, juga hanya di DM. Di grup, semua pengguna hanya melihat kartu ringkas tanpa nama; akun belum terhubung mendapat arahan `/gabung`.
- Perilaku pengurus tidak berubah: `/tagihan` dan `/tunggakan` tanpa argumen tetap menampilkan data semua KK.

## Menjalankan unit test

```bash
npm install
npm test
# dengan coverage:
npm run test:coverage
```

Test berada di folder `tests/` dan menggunakan Jest dengan mock global Google Apps Script.

## Troubleshooting

### Perintah tidak dibalas sama sekali

1. Cek Apps Script → Executions/Logs untuk pesan `Error: ... returned code 400 ... can't parse entities`.
2. Bot otomatis mengirim ulang pesan sebagai teks biasa bila Markdown gagal, tetapi log tetap mencatat error aslinya untuk perbaikan format.
3. Pastikan perintah dikirim tanpa suffix `@namabot`; bentuk `/perintah@namabot` belum dinormalisasi.

### Bot membalas lebih dari 1x / pending_update_count tidak turun

1. Cek `getWebhookInfo` (pending_update_count, last_error_message).
2. Cek Apps Script → Executions (error/timeout).
3. Bersihkan pending updates:
   - Jalankan `setWebhook(true)` di Apps Script (mendaftarkan webhook + drop pending).
   - Atau panggil URL: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEBHOOK_URL>&drop_pending_updates=true`
   - Alternatif: `deleteWebhook(true)` lalu `setWebhook()`.
4. Pastikan pakai URL Web App `/exec` (bukan `/dev`) dan `doPost` mengembalikan 200 OK.
5. `doPost` mengembalikan HTML (bukan JSON) agar Telegram ACK dan pending count turun.
6. Debug ACK-only: set Script Property `ACK_ONLY=true`, kirim pesan, cek pending turun. Jika turun, masalah ada di proses (Sheet/Token). Set `ACK_ONLY=false` untuk normal.
7. Health check: buka URL Web App `/exec` di browser → harus tampil `OK`.
8. Deploy ulang setiap perubahan kode (New deployment), lalu `setWebhook(true)` dengan URL `/exec`.

## Polling (alternatif webhook)

Jika webhook bermasalah karena redirect, gunakan polling:

1. Jalankan `setupPollingTrigger()` di Apps Script (membuat trigger tiap 1 menit dan menonaktifkan webhook).
2. Cek trigger di Apps Script → Triggers.
3. Untuk menghentikan: jalankan `stopPollingTrigger()`.

Catatan: latensi hingga 1 menit; `pollTelegram()` dapat dijalankan manual untuk uji.
