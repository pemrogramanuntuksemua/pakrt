function isRegisteredUser(userId) {
  if (isAdmin(userId)) return true;
  try {
    return getTelegramUserRows().some((t) => t.id_telegram === str(userId));
  } catch (e) {
    return false;
  }
}

function getUserKkCodes(userId) {
  try {
    const rows = getTelegramUserRows().filter((t) => t.id_telegram === str(userId));
    const aktif = rows.filter((t) => t.status === TELEGRAM_AKTIF);
    const sumber = aktif.length ? aktif : rows;
    const codes = [];
    sumber.forEach((t) => {
      if (t.id_kk && codes.indexOf(t.id_kk) < 0) codes.push(t.id_kk);
    });
    return codes;
  } catch (e) {
    return [];
  }
}

function handleStart(chatId, text, senderName, userId) {
  const nama = escMd(senderName);
  let replyText = "Halo, *" + nama + "*! Selamat datang di bot layanan warga *Pakrt* 🏠.\n\n";
  if (!isRegisteredUser(userId)) {
    replyText +=
      "Akun Anda belum terdaftar. Silakan daftar terlebih dahulu:\n" +
      "`/gabung <id_kk>` - Ajukan keterkaitan akun ke KK (lewat DM)\n" +
      "`/saya` - Cek status keterkaitan akun\n\n" +
      "_Contoh: /gabung KK-001_";
    const pesan = replyText.replace(/`/g, "");
    sendTelegramMessage(chatId, pesan, userId);
    return;
  }
  replyText += "Pilih menu:\n" + "`/untukwarga` - Menu untuk warga\n" + "`/untukadmin` - Menu untuk admin\n";
  if (isAdmin(userId)) {
    replyText += "`/system` - Menu system (root admin)\n";
  }
  const pesan = replyText.replace(/`/g, "");
  sendTelegramMessage(chatId, pesan, userId);
}

function handleUntukWarga(chatId, text, senderName, userId) {
  try {
    const codes = getUserKkCodes(userId);
    const kkCode = codes.length ? codes[0] : "";
    const suffix = kkCode ? " " + kkCode : "";
    let replyText =
      "📋 *MENU WARGA*\n\n" +
      "`/kas` - Saldo kas total & per kantong\n" +
      "`/warga` - Jumlah KK & jiwa\n" +
      (kkCode ? "`/warga_" + kkCode + "` - Kartu KK & anggota\n" : "") +
      (kkCode ? "`/tagihan_" + kkCode + "` - Tagihan KK Anda\n" : "") +
      (kkCode ? "`/tunggakan_" + kkCode + "` - Tunggakan KK Anda\n" : "") +
      "`/pengumuman` - Pengumuman warga terbaru\n";
    const pesan = replyText.replace(/`/g, "");
    sendTelegramMessage(chatId, pesan, userId);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleUntukAdmin(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId, userId);
    return;
  }
  try {
    const replyText =
      "👮 *MENU ADMIN*\n\n" +
      "*Uang/Kas/Iuran:*\n" +
      "`/bayar <id_kk/no_rumah/nama> <periode...>` - Catat iuran\n" +
      "`/daftar [semua]` - Daftar KK & tunggakan\n" +
      "`/pindahkas asal#tujuan#nominal#keterangan`\n" +
      "`/rekap [periode]` - Target vs terbayar\n" +
      "`/tagihan <id_kk/no_rumah/nama>` - Rincian tagihan\n" +
      "`/tambahkas jenis#alokasi#nominal#keterangan`\n" +
      "`/tarif` - Riwayat tarif iuran\n" +
      "`/tunggakan` - Ringkasan tunggakan\n" +
      "`/tutupbuku <YYYY-MM|YYYY>` - Tutup buku\n\n" +
      "*Warga/KK:*\n" +
      "`/editanggota id_kk#Nama#kolom=nilai` - Ubah data anggota\n" +
      "`/tambahanggota id_kk#Nama#Hubungan#L/P#YYYY-MM-DD`\n" +
      "`/tambahkk Nama#No HP#No Rumah#Alamat#Catatan`\n\n" +
      "*Administrasi Akun/Pengumuman:*\n" +
      "`/buatpengumuman Kategori#Isi pesan`\n" +
      "`/cabut <id_kk|id_telegram>` - Putuskan akun dari KK\n" +
      "`/cabutkk <id_kk>` - Nonaktifkan KK & anggotanya\n" +
      "`/tolak <id_kk|id_telegram>` - Tolak pengajuan akun\n" +
      "`/verifikasi <id_kk|id_telegram>` - Setujui pengajuan akun\n\n" +
      "`/start` - Kembali ke menu awal\n";
    const pesan = replyText.replace(/`/g, "");
    sendTelegramMessage(chatId, pesan, userId);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleWarga(chatId, text, senderName, userId) {
  try {
    const arg = teksPerintah(text, CMD_WARGA);
    if (arg) {
      const kk = cariKeluarga(arg);
      const admin = isAdmin(userId);
      const diDm = isPrivateChat(chatId);
      const anggota = getAnggota(kk.id_kk);
      if (admin && diDm) {
        const baris = anggota.map(
          (a) =>
            "• " + escMd(a.nama) + " — " + escMd(a.hubungan) +
            (a.jenis_kelamin ? " (" + a.jenis_kelamin + ")" : "") +
            (a.tanggal_lahir ? " · " + a.tanggal_lahir : "")
        );
        const reply =
          "👤 *" + escMd(kk.nama_kk) + "* (" + kk.id_kk + ")\n" +
          "🏠 No rumah: " + escMd(kk.no_rumah) + "\n" +
          "📞 No HP: " + escMd(kk.no_hp || "-") + "\n" +
          "📍 " + escMd(kk.alamat || "-") + "\n" +
          "📅 Mulai iuran: " + (kk.mulai_iuran || "-") + "\n" +
          "📌 Status: " + escMd(kk.status) + "\n" +
          "💰 Tunggakan: *" + fmtRp(hitungTunggakanKK(kk.id_kk)) + "*\n\n" +
          "👥 *Anggota (" + anggota.length + "):*\n" +
          (baris.length ? baris.join("\n") : "• (belum ada data anggota)");
        sendTelegramMessage(chatId, reply, userId);
        return;
      }
      const terhubung = !admin && isKkTerhubung(userId, kk.id_kk);
      const anggotaAktif = getAnggotaAktif(kk.id_kk);
      let teks =
        "👤 *" + escMd(kk.nama_kk) + "* (" + kk.id_kk + ")\n" +
        "🏠 No rumah: " + escMd(kk.no_rumah) + "\n" +
        "📌 Status: " + escMd(kk.status) + "\n" +
        "👥 Jumlah anggota: " + anggotaAktif.length + "\n\n";
      if (terhubung && diDm) {
        teks +=
          "*Anggota:*\n" +
          (anggotaAktif.length
            ? anggotaAktif.map((a) => "• " + escMd(a.nama) + " — " + escMd(a.hubungan) + (a.tanggal_lahir ? " (" + formatTanggalMDY(a.tanggal_lahir) + ")" : "")).join("\n")
            : "• (belum ada data anggota)") +
          "\n\nKetik /tagihan atau /tunggakan untuk rincian iuran KK Anda.";
      } else if (admin || terhubung) {
        teks +=
          "_Detail lengkap hanya ditampilkan lewat DM. " +
          "Ketik /warga " + kk.id_kk + " di DM bot._";
      } else {
        teks +=
          "*Anggota:*\n" +
          (anggotaAktif.length
            ? anggotaAktif.map((a) => "• " + escMd(a.nama) + " — " + escMd(a.hubungan)).join("\n")
            : "• (belum ada data anggota)") +
          "\n\n_Detail lengkap hanya untuk pengurus. " +
          "Ketik /gabung " + kk.id_kk + " lewat DM untuk mengajukan akses._";
      }
      sendTelegramMessage(chatId, teks, userId);
      return;
    }
    const aktif = getKeluargaAktif();
    const ids = {};
    const semuaIds = {};
    getKeluarga().forEach((k) => {
      semuaIds[k.id_kk] = true;
    });
    aktif.forEach((k) => {
      ids[k.id_kk] = true;
    });
    let jiwa = 0;
    let laki = 0;
    let perempuan = 0;
    let yatim = 0;
    bacaTabel(SHEET_ANGGOTA).rows.forEach((a) => {
      const id = str(a.id_kk);
      const aktifAnggota = str(a.status).toLowerCase() === "aktif";
      if (!id) return;
      if (!semuaIds[id]) {
        if (aktifAnggota) yatim++;
        return;
      }
      if (!ids[id]) return;
      if (!aktifAnggota) return;
      jiwa++;
      if (str(a.jenis_kelamin).toUpperCase() === "L") laki++;
      if (str(a.jenis_kelamin).toUpperCase() === "P") perempuan++;
    });
    const reply =
      "👥 *WARGA PAKRT*\n\n" +
      "• KK aktif: *" + aktif.length + "*\n" +
      "• Total jiwa: *" + jiwa + "*\n" +
      "• Laki-laki: " + laki + " · Perempuan: " + perempuan + "\n" +
      (yatim ? "• ⚠️ Anggota tanpa KK: " + yatim + "\n" : "") +
      "\nKetik /daftar untuk rincian per KK.";
    sendTelegramMessage(chatId, reply, userId);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handlePengumuman(chatId, text, senderName, userId) {
  let replyText = "";
  const sheet = getSpreadsheet(SHEET_PENGUMUMAN);
  if (!sheet) {
    replyText = "⚠️ Tab 'Pengumuman' belum dibuat di Google Sheets.";
  } else {
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      replyText = "📢 Belum ada pengumuman penting saat ini.";
    } else {
      replyText = "📢 *PENGUMUMAN WARGA TERBARU*\n\n";
      const startIdx = Math.max(1, rows.length - 5);
      for (let i = rows.length - 1; i >= startIdx; i--) {
        const tgl = formatTanggal(rows[i][0]);
        replyText += "▪️ *[" + rows[i][1] + "]* (" + tgl + ")\n" + rows[i][2] + "\n\n";
      }
    }
  }
  sendTelegramMessage(chatId, replyText, userId);
}

function handleTagihan(chatId, text, senderName, userId) {
  try {
    const admin = isAdmin(userId);
    if (!admin && !isPrivateChat(chatId)) {
      sendTelegramMessage(chatId, "🔒 Perintah ini hanya bisa dipakai lewat DM bot.", userId);
      return;
    }
    const arg = teksPerintah(text, CMD_TAGIHAN);
    const terhubung = getKkTerhubung(userId);
    if (!arg && terhubung.length) {
      if (terhubung.length === 1) {
        kirimTagihanKK(chatId, cariKeluarga(terhubung[0].id_kk));
        return;
      }
      ringkasanKkTerhubung(chatId, terhubung);
      return;
    }
    if (!arg) {
      if (admin) {
        sendTelegramMessage(chatId, "⚠️ Gunakan: `/tagihan <id_kk/no_rumah/nama>`", userId);
        return;
      }
      if (!terhubung.length) {
        sendTelegramMessage(
          chatId,
          "ℹ️ Akun Anda belum terhubung ke KK mana pun.\n\n" +
            "Ajukan dengan `/gabung <id_kk>` (contoh: `/gabung KK-001`)."
        );
        return;
      }
    }
    const kk = cariKeluarga(arg);
    if (!admin && !isKkTerhubung(userId, kk.id_kk)) {
      sendTelegramMessage(
        chatId,
        "⛔ Anda hanya bisa melihat tagihan KK yang terhubung dengan akun ini."
      );
      return;
    }
    kirimTagihanKK(chatId, kk);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleTunggakan(chatId, text, senderName, userId) {
  try {
    const admin = isAdmin(userId);
    if (!admin && !isPrivateChat(chatId)) {
      sendTelegramMessage(chatId, "🔒 Perintah ini hanya bisa dipakai lewat DM bot.", userId);
      return;
    }
    const arg = teksPerintah(text, CMD_TUNGGAKAN);
    const terhubung = getKkTerhubung(userId);
    if (!arg && terhubung.length) {
      if (terhubung.length === 1) {
        kirimTunggakanKK(chatId, cariKeluarga(terhubung[0].id_kk));
        return;
      }
      ringkasanKkTerhubung(chatId, terhubung);
      return;
    }
    if (!admin) {
      if (!terhubung.length) {
        sendTelegramMessage(
          chatId,
          "ℹ️ Akun Anda belum terhubung ke KK mana pun.\n\n" +
            "Ajukan dengan `/gabung <id_kk>` (contoh: `/gabung KK-001`)."
        );
        return;
      }
      if (arg) {
        const kkSendiri = cariKeluarga(arg);
        if (!isKkTerhubung(userId, kkSendiri.id_kk)) {
          sendTelegramMessage(
            chatId,
            "⛔ Anda hanya bisa melihat tunggakan KK yang terhubung dengan akun ini."
          );
          return;
        }
        kirimTunggakanKK(chatId, kkSendiri);
        return;
      }
    }
    const p = parsePeriode(arg);
    if (arg && !p) {
      kirimTunggakanKK(chatId, cariKeluarga(arg));
      return;
    }
    const batas = p && p.bulanan ? p.periode : periodeSekarang();
    const semua = getTagihan().filter(
      (t) => t.status === TAGIHAN_BELUM && bandingPeriode(t.periode, batas) <= 0
    );
    const perKK = {};
    semua.forEach((t) => {
      if (!perKK[t.id_kk]) {
        perKK[t.id_kk] = { nama: t.nama_kk, no: t.no_rumah, total: 0, bulan: 0 };
      }
      perKK[t.id_kk].total += t.nominal;
      perKK[t.id_kk].bulan += 1;
    });
    const daftar = Object.keys(perKK)
      .map((id) => ({ id: id, ...perKK[id] }))
      .sort((a, b) => b.total - a.total);
    const total = daftar.reduce((t, d) => t + d.total, 0);
    sendTelegramMessage(
      chatId,
      "📊 *TUNGGAKAN IURAN* — s.d. " + labelPeriode(batas) + "\n\n" +
        "Total: *" + fmtRp(total) + "*\n" +
        "KK menunggak: *" + daftar.length + "*\n\n" +
        "*Teratas:*\n" +
        (daftar.length
          ? daftar.slice(0, 5).map(
              (d) => "• " + d.id + " " + escMd(d.no) + " " + escMd(d.nama) +
                " — " + fmtRp(d.total) + " (" + d.bulan + " bln)"
            ).join("\n")
          : "• Tidak ada tunggakan 🎉")
    );
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleGabung(chatId, text, senderName, userId, username) {
  try {
    if (!isPrivateChat(chatId)) {
      sendTelegramMessage(
        chatId,
        "🔒 Pendaftaran hanya lewat DM bot.\nKirim `/gabung <id_kk>` ke bot secara pribadi."
      );
      return;
    }
    const arg = teksPerintah(text, CMD_GABUNG);
    if (!arg) {
      sendTelegramMessage(
        chatId,
        "⚠️ Gunakan: `/gabung <id_kk/no_rumah/nama>`\nContoh: `/gabung KK-001`"
      );
      return;
    }
    const hasil = ajukanKeterkaitan(userId, username, senderName, arg);
    const kk = hasil.keluarga;
    if (hasil.sudah) {
      if (hasil.status === TELEGRAM_AKTIF) {
        sendTelegramMessage(
          chatId,
          "ℹ️ Akun ini sudah terhubung ke *" + kk.id_kk + "* (" + escMd(kk.nama_kk) + ").\n" +
            "Ketik /tagihan atau /tunggakan."
        );
      } else {
        sendTelegramMessage(
          chatId,
          "⏳ Pengajuan untuk *" + kk.id_kk + "* masih menunggu verifikasi pengurus."
        );
      }
      return;
    }
    sendTelegramMessage(
      chatId,
      "✅ *Pengajuan terkirim*\n\n" +
        "🆔 KK: *" + kk.id_kk + "*\n" +
        "👤 " + escMd(kk.nama_kk) + " · 🏠 " + escMd(kk.no_rumah) + "\n\n" +
        "Pengurus akan memverifikasi. Setelah disetujui, Anda bisa memakai /tagihan dan /tunggakan."
    );
    notifPengajuanAdmin(hasil, username, senderName);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleSaya(chatId, text, senderName, userId) {
  try {
    if (!isPrivateChat(chatId)) {
      sendTelegramMessage(chatId, "🔒 Perintah ini hanya bisa dipakai lewat DM bot.", userId);
      return;
    }
    const semua = getTelegramUserRows().filter((t) => t.id_telegram === str(userId));
    if (!semua.length) {
      sendTelegramMessage(
        chatId,
        "ℹ️ Akun ini belum terhubung ke KK mana pun.\n\n" +
          "Ajukan dengan `/gabung <id_kk>` (contoh: `/gabung KK-001`)."
      );
      return;
    }
    const keluarga = getKeluarga();
    const aktif = semua.filter((t) => t.status === TELEGRAM_AKTIF);
    const baris = semua.map((t) => {
      const kk = keluarga.filter((k) => k.id_kk === t.id_kk)[0];
      const label =
        t.status === TELEGRAM_AKTIF ? "✅ aktif" :
        t.status === TELEGRAM_MENUNGGU ? "⏳ menunggu" :
        t.status === TELEGRAM_DITOLAK ? "❌ ditolak" : "⛔ dicabut";
      return (
        "• *" + t.id_kk + "* " +
        (kk ? escMd(kk.no_rumah) + " " + escMd(kk.nama_kk) : "(KK tidak ditemukan)") +
        " — " + label
      );
    });
    sendTelegramMessage(
      chatId,
      "👤 *Akun Telegram Anda*\n" +
        "🆔 `" + str(userId) + "`\n\n" +
        baris.join("\n") +
        (aktif.length
          ? "\n\nKetik /tagihan atau /tunggakan."
          : "\n\nMenunggu verifikasi pengurus.")
    );
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleKas(chatId, text, senderName, userId) {
  try {
    const sheet = getSpreadsheet(SHEET_KAS);
    if (!sheet) {
      sendTelegramMessage(chatId, "⚠️ Tab 'Kas' belum dibuat di Google Sheets.", userId);
      return;
    }
    const arg = teksPerintah(text, CMD_KAS);
    const cacheKey = "kas:" + kasCacheVersion() + ":" + (arg || "default");
    const cached = cacheGet(cacheKey);
    if (cached) {
      sendTelegramMessage(chatId, cached, userId);
      return;
    }
    const p = parsePeriode(arg);
    let replyText = "";
    if (arg && p && p.bulanan) {
      const kas = hitungKasPeriode(p.periode);
      const saldoList = kas.perKantong.map((d) => ({ kode: d.kode, nama: d.nama, saldo: d.saldo_akhir }));
      replyText = formatSaldoKas(
        "KAS RT — " + labelPeriode(p.periode),
        saldoList,
        kas.totalSaldoAkhir,
        kas.totalMasuk,
        kas.totalKeluar
      );
    } else if (arg) {
      const kode = arg.toLowerCase();
      const daftar = getAlokasiAktif();
      const alokasi = daftar.filter((a) => a.kode === kode)[0];
      if (!alokasi) {
        throw new Error("Kantong '" + kode + "' tidak dikenal. Lihat /alokasi.");
      }
      const mutasi = getMutasiKantong(kode).slice(-10);
      const baris = mutasi.map(
        (j) =>
          "• " + formatTanggal(j.tanggal) + " " +
          (j.jenis === JENIS_KELUAR || j.jenis === JENIS_PINDAH_KELUAR ? "−" : "+") +
          fmtRp(j.nominal) + "  " + escMd(j.keterangan)
      );
      replyText =
        "👛 *" + escMd(alokasi.nama) + "* (`" + kode + "`)\n" +
        "Saldo: *" + fmtRp(getSaldoKantong(kode)) + "*\n\n" +
        "*10 mutasi terakhir:*\n" +
        (baris.length ? baris.join("\n") : "• belum ada mutasi");
    } else {
      const kas = hitungKasPeriode(periodeSekarang());
      const saldoList = getSaldoSemuaKantong();
      const total = saldoList.reduce((t, s) => t + s.saldo, 0);
      replyText =
        formatSaldoKas(
          "KAS RT — s.d. " + formatTanggal(new Date()),
          saldoList,
          total,
          kas.totalMasuk,
          kas.totalKeluar
        ) + "\n\nKetik `/kas <kode>` untuk mutasi kantong.";
    }
    cachePut(cacheKey, replyText, 60);
    sendTelegramMessage(chatId, replyText, userId);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

function handleSystem(chatId, text, senderName, userId) {
  if (!isAdminInti(userId)) {
    tolakAdmin(chatId, userId);
    return;
  }
  try {
    const replyText =
      "🛠️ *MENU SYSTEM*\n\n" +
      "`/setting` - Daftar pengaturan\n" +
      "`/set <kunci> <nilai> [periode]` - Ubah pengaturan\n" +
      "`/admin` - Daftar admin inti & tambahan\n" +
      "`/admin tambah <id_telegram>` - Tambah admin\n" +
      "`/admin hapus <id_telegram>` - Hapus admin tambahan\n\n" +
      "`/start` - Kembali ke menu awal\n";
    const pesan = replyText.replace(/`/g, "");
    sendTelegramMessage(chatId, pesan, userId);
  } catch (e) {
    balasError(chatId, e, userId);
  }
}

// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    const core = (typeof require !== "undefined") ? require("./core.gs") : null;
    if (core) Object.keys(core).forEach((k) => { if (typeof global !== "undefined") global[k] = core[k]; });
    module.exports = {
        handleStart, handleKas, handleWarga, handlePengumuman, handleGabung, handleSaya, handleTagihan, handleTunggakan, handleUntukWarga, handleUntukAdmin, handleSystem,
    };
}
