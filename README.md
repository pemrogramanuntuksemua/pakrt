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
EOF
echo done