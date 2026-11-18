// ==========================================
// USER HANDLERS
// ==========================================

function handleStart(chatId, text, senderName, userId) {
    const replyText = "Halo, *" + senderName + "*! Selamat datang di bot layanan warga **Pakrt** 🏠.\n\n" +
        "Silakan gunakan perintah berikut:\n" +
        "/kas - Cek posisi kas RT terakhir\n" +
        "/pengumuman - Lihat pengumuman warga terbaru\n" +
        "/warga - Cek jumlah warga terdaftar\n\n" +
        "_Perintah Pengurus:_\n" +
        "/tambahkas jenis#nominal#keterangan\n" +
        "/buatpengumuman Kategori#Isi pesan\n" +
        "/tambahwarga Nama#No HP#No Rumah#Jenis Kelamin#Alamat#Catatan";

    sendTelegramMessage(chatId, replyText);
}

function handleKas(chatId, text, senderName, userId) {
    let replyText = "";
    const sheet = getSpreadsheet("Kas");

    if (!sheet) {
        replyText = "⚠️ Tab 'Kas' belum dibuat di Google Sheets.";
    } else {
        const rows = sheet.getDataRange().getValues();
        if (rows.length <= 1) {
            replyText = "⚠️ Belum ada catatan transaksi kas yang dimasukkan.";
        } else {
            let totalMasuk = 0;
            let totalKeluar = 0;

            for (let i = 1; i < rows.length; i++) {
                let jenis = String(rows[i][2]).trim().toLowerCase();
                let nominal = Number(rows[i][3]) || 0;
                if (jenis === "masuk") totalMasuk += nominal;
                if (jenis === "keluar") totalKeluar += nominal;
            }

            let saldoAkhir = totalMasuk - totalKeluar;

            let transaksiTerakhirText = "\n\n📋 *3 Transaksi Terakhir:*\n";
            const startIdx = Math.max(1, rows.length - 3);
            for (let i = startIdx; i < rows.length; i++) {
                let tgl = new Date(rows[i][0]).toLocaleDateString('id-ID');
                let ket = rows[i][1];
                let jns = rows[i][2];
                let nom = Number(rows[i][3]) || 0;
                let tanda = jns.toLowerCase() === "masuk" ? "+" : "-";
                transaksiTerakhirText += `• ${tgl} | ${ket} (${tanda}Rp ${nom.toLocaleString('id-ID')})\n`;
            }

            replyText = `💰 *REKAPITULASI POSISI KAS RT*\n\n` +
                `📥 Total Pemasukan: *Rp ${totalMasuk.toLocaleString('id-ID')}*\n` +
                `📤 Total Pengeluaran: *Rp ${totalKeluar.toLocaleString('id-ID')}*\n` +
                `-----------------------------------\n` +
                `💎 *Saldo Kas Saat Ini: Rp ${saldoAkhir.toLocaleString('id-ID')}*` +
                transaksiTerakhirText;
        }
    }

    Logger.log('reply ' + replyText);
    sendTelegramMessage(chatId, replyText);
}

function handleWarga(chatId, text, senderName, userId) {
    let replyText = "";
    const sheet = getSpreadsheet("Warga");
    const totalWarga = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
    replyText = `👥 Total warga terdaftar di sistem Pakrt: *${totalWarga} Kepala Keluarga*.`;

    sendTelegramMessage(chatId, replyText);
}

function handlePengumuman(chatId, text, senderName, userId) {
    let replyText = "";
    const sheet = getSpreadsheet("Pengumuman");

    if (!sheet) {
        replyText = "⚠️ Tab 'Pengumuman' belum dibuat di Google Sheets.";
    } else {
        const rows = sheet.getDataRange().getValues();
        if (rows.length <= 1) {
            replyText = "📢 Belum ada pengumuman penting saat ini.";
        } else {
            replyText = `📢 *PENGUMUMAN WARGA TERBARU*\n\n`;
            const startIdx = Math.max(1, rows.length - 5);
            for (let i = rows.length - 1; i >= startIdx; i--) {
                let tgl = new Date(rows[i][0]).toLocaleDateString('id-ID');
                let kat = rows[i][1];
                let isi = rows[i][2];
                replyText += `▪️ *[${kat}]* (${tgl})\n${isi}\n\n`;
            }
        }
    }

    sendTelegramMessage(chatId, replyText);
}

// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    const core = (typeof require !== "undefined") ? require("./core.gs") : null;
    if (core) {
        Object.keys(core).forEach((k) => { if (typeof global !== "undefined") global[k] = core[k]; });
    }
    module.exports = { handleStart, handleKas, handleWarga, handlePengumuman };
}
