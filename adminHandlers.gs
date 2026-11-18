// ==========================================
// ADMIN HANDLERS
// ==========================================

function handleTambahKas(chatId, text, senderName, userId) {
    let replyText = "";

    if (!isAdmin(userId)) {
        sendTelegramMessage(chatId, "⛔ *Akses Ditolak!*\n\nPerintah ini khusus untuk Bendahara atau Pengurus RT.");
        return;
    }

    const textClean = text.replace("/tambahkas", "").trim();
    const parts = textClean.split("#").map((p) => p.trim());
    const jenis = (parts[0] || "").toLowerCase();
    const nominalStr = parts[1] || "";
    const keterangan = parts.length >= 3 ? parts.slice(2).join("#").trim() : "Tanpa Keterangan";
    const nominal = Number(nominalStr);

    if (jenis !== "masuk" && jenis !== "keluar" || isNaN(nominal) || nominal <= 0 || !nominalStr) {
        replyText = `⚠️ Format salah atau nominal bukan angka.\nContoh: \`/tambahkas masuk#50000#Iuran Budi\``;
    } else {
        const sheet = getSpreadsheet("Kas");
        if (!sheet) {
            sendTelegramMessage(chatId, "⚠️ Tab 'Kas' belum dibuat di Google Sheets.");
            return;
        }
        const tanggalHariIni = new Date();

        sheet.appendRow([tanggalHariIni, keterangan, jenis.charAt(0).toUpperCase() + jenis.slice(1), nominal]);

        const emoji = jenis === "masuk" ? "📥" : "📤";
        replyText = `✅ *Kas Berhasil Dicatat!*\n\n${emoji} Jenis: *${jenis.toUpperCase()}*\n💰 Nominal: *Rp ${nominal.toLocaleString('id-ID')}*\n📝 Keterangan: *${keterangan}*`;
    }

    sendTelegramMessage(chatId, replyText);
}

function handleTambahWarga(chatId, text, senderName, userId) {
    let replyText = "";

    if (!isAdmin(userId)) {
        sendTelegramMessage(chatId, "⛔ *Akses Ditolak!*\n\nPerintah ini khusus untuk Pengurus RT.");
        return;
    }

    const textClean = text.replace("/tambahwarga", "").trim();
    const parts = textClean.split("#").map((p) => p.trim());
    const nama = parts[0] || "";
    const noHp = parts[1] || "";
    const noRumah = parts[2] || "";
    const jenisKelamin = parts[3] || "";
    const alamat = parts[4] || "";
    const catatan = parts.slice(5).join("#").trim();

    if (!nama || !noHp || !noRumah || !jenisKelamin || !alamat) {
        replyText = `⚠️ *Format Salah!*\nGunakan: \`/tambahwarga Nama#No HP#No Rumah#Jenis Kelamin#Alamat#Catatan\``;
    } else {
        const sheet = getSpreadsheet("Warga");
        if (!sheet) {
            sendTelegramMessage(chatId, "⚠️ Tab 'Warga' belum dibuat di Google Sheets.");
            return;
        }

        sheet.appendRow([nama, noHp, noRumah, jenisKelamin, alamat, catatan]);

        replyText = `✅ *Warga Berhasil Ditambahkan!*\n\n` +
            `👤 Nama: *${nama}*\n` +
            `📞 No HP: *${noHp}*\n` +
            `🏠 No Rumah: *${noRumah}*\n` +
            `⚧ Jenis Kelamin: *${jenisKelamin}*\n` +
            `📍 Alamat: *${alamat}*\n` +
            `📝 Catatan: *${catatan || "-"}*`;
    }

    sendTelegramMessage(chatId, replyText);
}

function handleBuatPengumuman(chatId, text, senderName, userId) {
    let replyText = "";

    if (!isAdmin(userId)) {
        sendTelegramMessage(chatId, "⛔ *Akses Ditolak!*\n\nPerintah ini khusus untuk Pengurus RT.");
        return;
    }

    const textClean = text.replace("/buatpengumuman", "").trim();
    const parts = textClean.split("#").map((p) => p.trim());
    const kategori = parts[0] || "";
    const isiPesan = parts.slice(1).join("#").trim();

    if (!kategori || !isiPesan) {
        replyText = `⚠️ *Format Salah!*\nGunakan: \`/buatpengumuman Kategori#Isi Pesan\``;
    } else {
        const sheet = getSpreadsheet("Pengumuman");
        if (!sheet) {
            sendTelegramMessage(chatId, "⚠️ Tab 'Pengumuman' belum dibuat di Google Sheets.");
            return;
        }
        const timestamp = new Date();

        sheet.appendRow([timestamp, kategori, isiPesan, senderName]);

        if (GROUP_CHAT_ID && GROUP_CHAT_ID !== "") {
            const broadcastText = `📢 *PENGUMUMAN RT*\n\n🏷️ Kategori: *${kategori}*\n📝 ${isiPesan}\n\n_Disampaikan oleh Pengurus_`;
            sendTelegramMessage(GROUP_CHAT_ID, broadcastText);
        }

        replyText = `✅ *Pengumuman Berhasil Disimpan & Disebar!*\n\n🏷️ Kategori: *${kategori}*\n📝 ${isiPesan}`;
    }

    sendTelegramMessage(chatId, replyText);
}

function handleAdmin(chatId, text, senderName, userId) {
    sendTelegramMessage(chatId, 'Fungsi Admin Belum Berfungsi');
}

// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    const core = (typeof require !== "undefined") ? require("./core.gs") : null;
    if (core) {
        Object.keys(core).forEach((k) => { if (typeof global !== "undefined") global[k] = core[k]; });
    }
    module.exports = { handleTambahKas, handleTambahWarga, handleBuatPengumuman, handleAdmin };
}
