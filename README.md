# pakrt

Bot yang membantu urusan pak RT. Menggunakan Telegram dan Google Sheet.

## Prasyarat

- Node.js + npm
- Akun Google (Google Sheets + Google Apps Script)
- Bot Telegram (token dari [@BotFather](https://t.me/BotFather))

## Konfigurasi

Isi konstanta di `kode.gs`:

- `SPREADSHEET_ID` — ID Google Spreadsheet
- `TELEGRAM_TOKEN` — token bot Telegram
- `WEBHOOK_URL` — URL deploy Web App (diisi setelah deploy)
- `ADMIN_IDS` — array ID Telegram pengurus yang boleh input kas & pengumuman
- `GROUP_CHAT_ID` (opsional) — ID grup warga untuk auto-broadcast pengumuman

## Struktur Google Sheet

- `Kas`: `tanggal | keterangan | jenis (Masuk/Keluar) | nominal`
- `Warga`: baris data warga (header + data)
- `Pengumuman`: `timestamp | kategori | isi | pengirim`

## Cara deploy webhook

1. Deploy `kode.gs` sebagai Web App di Google Apps Script.
2. Jalankan `setWebhook()` atau set manual via URL Telegram.
3. Uji endpoint dengan `example.sh`.

## Daftar perintah

| Perintah | Keterangan | Contoh |
|---|---|---|
| `/start` | Sambutan & daftar perintah | `/start` |
| `/kas` | Rekap posisi kas RT | `/kas` |
| `/warga` | Jumlah warga terdaftar | `/warga` |
| `/pengumuman` | 5 pengumuman terbaru | `/pengumuman` |
| `/tambahkas [masuk/keluar] [nominal] [keterangan]` | Catat transaksi kas (admin) | `/tambahkas masuk 50000 Iuran Budi` |
| `/buatpengumuman [Kategori] [Isi pesan]` | Buat & broadcast pengumuman (admin) | `/buatpengumuman Info Halo warga` |
| `/admin` | (Belum aktif) | `/admin` |

## Menjalankan unit test

```bash
npm install
npm test
# dengan coverage:
npm run test:coverage
```

Test berada di folder `tests/` dan menggunakan Jest dengan mock global Google Apps Script.

## Struktur kode

- `core.gs` — infrastruktur bersama (admin, spreadsheet, telegram, idempotency, polling)
- `userHandlers.gs` — handler user: start, kas, warga, pengumuman
- `adminHandlers.gs` — handler admin: tambahkas, tambahwarga, buatpengumuman, admin
- `main.gs` — konstanta, dispatch, doPost/doGet, polling setup

## Troubleshooting

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
EOF
echo done